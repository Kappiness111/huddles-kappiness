// Gmail API sender (users.messages.send) for the Story Receipt, authenticated with an OAuth 2.0
// refresh token for the sending account. Plain JavaScript with injected `fetch`, so it runs in the
// Supabase Edge Runtime (Deno) and in the Node test suite alike.
//
// Secrets (Supabase Edge Function secrets, never in the frontend):
//   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER (the account's address)
//   GMAIL_SENDER_NAME  optional display name (default "Kappiness")
//   EMAIL_REPLY_TO     optional Reply-To address
//
// Every result says whether Gmail definitely did NOT accept the message, or whether that is unknown:
//   { ok: true, id }                                        accepted (Gmail returned a message id)
//   { ok: false, outcome: 'rejected' | 'auth' | 'quota' }   definitely not sent (safe to use a fallback)
//   { ok: false, outcome: 'ambiguous' }                     may have been sent (never fall back / resend)
// Error strings never contain tokens or secrets.

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

// ── Encoding ─────────────────────────────────────────────────────────────────────

const utf8 = (s) => new TextEncoder().encode(String(s))

function base64(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** base64url (RFC 4648 §5) of a string's UTF-8 bytes, without padding, as Gmail's `raw` field expects. */
export function base64url(s) {
  return base64(utf8(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** base64 wrapped at 76 characters (RFC 2045) for a MIME body part. */
const base64Body = (s) => base64(utf8(s)).replace(/.{76}/g, '$&\r\n')

// Header values must never carry CR/LF (header injection).
const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim()

/**
 * RFC 2047 encoded-words for a header value. Plain ASCII is left as is; anything else becomes
 * one or more `=?UTF-8?B?…?=` words, split between characters so each stays under 75 characters.
 */
export function encodeHeader(value) {
  const s = oneLine(value)
  if (/^[\x20-\x7e]*$/.test(s)) return s
  const words = []
  let chunk = ''
  for (const ch of s) {
    if (utf8(chunk + ch).length > 45) {
      words.push(chunk)
      chunk = ''
    }
    chunk += ch
  }
  if (chunk) words.push(chunk)
  return words.map((w) => `=?UTF-8?B?${base64(utf8(w))}?=`).join('\r\n ')
}

const address = (name, email) => (name ? `${encodeHeader(name)} <${oneLine(email)}>` : `<${oneLine(email)}>`)

/** A complete RFC 2822 / MIME message: multipart/alternative with a plain-text and an HTML part. */
export function buildMime({ fromName, from, to, replyTo, subject, text, html, boundary }) {
  const b = boundary ?? `kappiness-${crypto.randomUUID()}`
  const headers = [
    `From: ${address(fromName, from)}`,
    `To: <${oneLine(to)}>`,
    replyTo ? `Reply-To: <${oneLine(replyTo)}>` : null,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${b}"`,
  ].filter(Boolean)
  const part = (type, body) => [`--${b}`, `Content-Type: ${type}; charset="UTF-8"`, 'Content-Transfer-Encoding: base64', '', base64Body(body)].join('\r\n')
  return [...headers, '', part('text/plain', text ?? ''), part('text/html', html ?? ''), `--${b}--`, ''].join('\r\n')
}

// ── Sending ──────────────────────────────────────────────────────────────────────

class TimeoutError extends Error {}

async function fetchWithTimeout(fetchFn, url, init, ms) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetchFn(url, { ...init, signal: ctrl.signal })
  } catch (e) {
    if (ctrl.signal.aborted) throw new TimeoutError('timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// Gmail's own sending limit ("Too many requests: User-rate limit exceeded (Mail sending)") or the
// project's API daily limit: retrying won't help for hours, so stop.
const isQuota = (status, reason, message) =>
  (status === 429 && /mail sending/i.test(message)) || reason === 'dailyLimitExceeded' || /sending limit/i.test(message)

// Short-lived rate limits and server errors that Google says to retry with backoff.
const isRetryable = (status, reason) =>
  status === 429 || status >= 500 || (status === 403 && ['rateLimitExceeded', 'userRateLimitExceeded'].includes(reason))

/** When Gmail says to try again: Retry-After header (seconds or date) or "Retry after <ISO date>" in the message. */
function retryAt(res, message, now) {
  const h = res.headers?.get?.('retry-after')
  if (h) {
    const secs = Number(h)
    const t = Number.isFinite(secs) ? now + secs * 1000 : Date.parse(h)
    if (Number.isFinite(t)) return t
  }
  const m = /retry after (\S+)/i.exec(message)
  const t = m ? Date.parse(m[1]) : NaN
  return Number.isFinite(t) ? t : null
}

export function createGmailSender({
  env,
  fetch: fetchFn = globalThis.fetch,
  now = () => Date.now(),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  tokenTimeoutMs = 6000,
  sendTimeoutMs = 9000,
  maxRetries = 2,
} = {}) {
  let token = null // { value, expiresAt }
  let tokenRequest = null
  let pausedUntil = 0 // after a sending-limit error, don't hammer Gmail (per function instance)

  const configured = () => ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'GMAIL_SENDER'].every((k) => env(k))

  /** A cached access token, refreshed from the refresh token when missing or about to expire. */
  async function accessToken(force = false) {
    if (!force && token && token.expiresAt - 60_000 > now()) return token.value
    tokenRequest ??= (async () => {
      let res
      try {
        res = await fetchWithTimeout(
          fetchFn,
          TOKEN_URL,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: env('GMAIL_CLIENT_ID'),
              client_secret: env('GMAIL_CLIENT_SECRET'),
              refresh_token: env('GMAIL_REFRESH_TOKEN'),
              grant_type: 'refresh_token',
            }).toString(),
          },
          tokenTimeoutMs,
        )
      } catch (e) {
        // Nothing was sent yet, so this is a definite failure.
        throw Object.assign(new Error(`gmail_api: token request failed (${e instanceof TimeoutError ? 'timeout' : 'network'})`), { outcome: 'rejected' })
      }
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.access_token) {
        // Only Google's error code (e.g. invalid_grant) is reported, never the request or response secrets.
        const code = typeof body.error === 'string' ? body.error : `http_${res.status}`
        const outcome = res.status >= 500 ? 'rejected' : 'auth'
        throw Object.assign(new Error(`gmail_api: token refresh failed (${code})`), { outcome })
      }
      token = { value: body.access_token, expiresAt: now() + (Number(body.expires_in) || 3600) * 1000 }
      return token.value
    })().finally(() => {
      tokenRequest = null
    })
    return tokenRequest
  }

  async function send(msg) {
    if (pausedUntil > now()) return { ok: false, outcome: 'quota', error: 'gmail_api: sending limit reached earlier; paused' }

    let raw
    try {
      raw = base64url(
        buildMime({
          fromName: env('GMAIL_SENDER_NAME') || 'Kappiness',
          from: env('GMAIL_SENDER'),
          to: msg.to,
          replyTo: env('EMAIL_REPLY_TO') || null,
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        }),
      )
    } catch (e) {
      return { ok: false, outcome: 'rejected', error: `gmail_api: could not build message (${e?.message ?? e})` }
    }

    let refreshed = false
    for (let attempt = 0; ; attempt++) {
      let bearer
      try {
        bearer = await accessToken(refreshed)
      } catch (e) {
        return { ok: false, outcome: e.outcome ?? 'rejected', error: e.message }
      }

      let res
      try {
        res = await fetchWithTimeout(
          fetchFn,
          SEND_URL,
          { method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) },
          sendTimeoutMs,
        )
      } catch (e) {
        // The request may have reached Gmail and been accepted: never resend or fall back.
        return { ok: false, outcome: 'ambiguous', error: `gmail_api: no response (${e instanceof TimeoutError ? 'timeout' : 'network error'})` }
      }

      if (res.ok) {
        const body = await res.json().catch(() => null)
        if (body?.id) return { ok: true, id: String(body.id) }
        return { ok: false, outcome: 'ambiguous', error: 'gmail_api: accepted without a message id' }
      }

      const err = (await res.json().catch(() => ({})))?.error ?? {}
      const reason = err.errors?.[0]?.reason ?? err.status ?? ''
      const message = String(err.message ?? '').slice(0, 160)
      const detail = `gmail_api: http ${res.status}${reason ? ` ${reason}` : ''}${message ? `: ${message}` : ''}`

      if (res.status === 401 && !refreshed) {
        refreshed = true // the access token was rejected: refresh it once and try again
        token = null
        continue
      }
      if (res.status === 401) return { ok: false, outcome: 'auth', error: detail }
      if (isQuota(res.status, reason, message)) {
        pausedUntil = retryAt(res, message, now()) ?? now() + 60 * 60 * 1000
        return { ok: false, outcome: 'quota', error: detail }
      }
      if (isRetryable(res.status, reason) && attempt < maxRetries) {
        await sleep(1000 * 2 ** attempt) // 1 s, then 2 s
        continue
      }
      // 500/502/504 ("unexpected server error") can't rule out that the message went out.
      const unsure = [500, 502, 504].includes(res.status)
      return { ok: false, outcome: unsure ? 'ambiguous' : 'rejected', error: detail }
    }
  }

  return { configured, send }
}
