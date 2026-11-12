
import { renderReceiptEmail } from './receipt-email.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RECEIPT_RE = /^KAP-[0-9]{6}-[2-9A-HJ-NP-Z]{4}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_BODY = 2048

const OUTCOMES = {
  not_found: [404, true],
  in_progress: [409, true],
  email_mismatch: [403, false],
  no_consent: [403, false],
  expired: [410, false],
  limit_reached: [429, false],
  recipient_limit: [429, false],
}

export function corsHeaders(origin, allowed) {
  const list = String(allowed || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)

  const allow =
    !list.length || list.includes('*')
      ? '*'
      : list.includes(origin)
        ? origin
        : list[0]

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/**
 * `sendEmail(msg)` delivers one claimed receipt (see delivery.js) and resolves to
 *   { ok: true, id, provider } or { ok: false, error, retryable?, quota?, ambiguous? }.
 * `afterSend(msg, sent)` runs after a confirmed send has been recorded (Google Sheet logging);
 * its failure never changes the recorded result and never causes a resend.
 * `configured()` says whether any provider is set up (default: the original Apps Script check).
 */
export function createHandler({
  env,
  claim,
  finish,
  sendEmail,
  afterSend = null,
  configured = () => Boolean(env('APPS_SCRIPT_URL') && env('APPS_SCRIPT_SECRET')),
  log = console,
}) {
  return async function handle(req) {
    const cors = corsHeaders(
      req.headers.get('origin') ?? '',
      env('ALLOWED_ORIGIN'),
    )

    const json = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
        },
      })

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: cors })
    }

    if (req.method !== 'POST') {
      return json(405, {
        ok: false,
        error: 'method_not_allowed',
        retryable: false,
      })
    }

    if (!configured()) {
      return json(503, {
        ok: false,
        error: 'not_configured',
        retryable: false,
      })
    }

    let p

    try {
      const raw = await req.text()

      if (raw.length > MAX_BODY) {
        return json(413, {
          ok: false,
          error: 'too_large',
          retryable: false,
        })
      }

      p = JSON.parse(raw)
    } catch {
      return json(400, {
        ok: false,
        error: 'invalid_json',
        retryable: false,
      })
    }

    const submissionId = String(p?.submissionId ?? '')
    const receiptNo = String(p?.receiptNo ?? '')
    const email = String(p?.email ?? '').trim().toLowerCase()

    if (!UUID_RE.test(submissionId) || !RECEIPT_RE.test(receiptNo)) {
      return json(400, {
        ok: false,
        error: 'invalid_submission',
        retryable: false,
      })
    }

    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return json(400, {
        ok: false,
        error: 'invalid_email',
        retryable: false,
      })
    }

    let claimed

    try {
      claimed = await claim({
        p_id: submissionId,
        p_receipt_number: receiptNo,
        p_email: email,
        p_grant_consent: p.consentEmail === true,
      })
    } catch (e) {
      log.error('[email] claim failed', e?.message ?? e)

      return json(500, {
        ok: false,
        error: 'database_error',
        retryable: true,
      })
    }

    const outcome = claimed?.outcome

    if (outcome === 'already_sent') {
      return json(200, {
        ok: true,
        status: 'already_sent',
      })
    }

    if (outcome !== 'claimed') {
      const [status, retryable] = OUTCOMES[outcome] ?? [500, true]

      return json(status, {
        ok: false,
        error: outcome ?? 'unknown',
        retryable,
      })
    }

    const row = claimed.submission

    let message

    try {
      message = renderReceiptEmail(row, {
        siteUrl: env('SITE_URL'),
      })
    } catch (e) {
      log.error('[email] render failed', row.id, e?.message ?? e)

      await finish({
        p_id: row.id,
        p_attempt: row.email_attempts,
        p_ok: false,
        p_error: `render: ${e?.message ?? e}`,
      }).catch(() => {})

      return json(500, {
        ok: false,
        error: 'render_failed',
        retryable: false,
      })
    }

    const book = row.recommended_book || {}
    const movie = row.recommended_movie || {}
    const identity = row.story_identity || {}

    let sent

    const sendArgs = {
      to: row.email,
      subject: message.subject,
      html: message.html,
      text: message.text,

      // Saved visitor and receipt details for Google Sheets.
      submissionId: row.id,
      receiptNo: row.receipt_number,
      name: row.full_name,
      phone: row.phone,
      date: row.completed_at,
      story: identity.description || '',
      storyIdentity: identity.title || '',
      recommendedBook: book.title || '',
      recommendedMovie: movie.title || '',

      // Prevent duplicate processing of the same attempt.
      idempotencyKey: `kappiness-${row.id}-${row.email_attempts}`,
    }

    try {
      sent = await sendEmail(sendArgs)
    } catch (e) {
      sent = {
        ok: false,
        error: e?.message ?? String(e),
      }
    }

    try {
      await finish({
        p_id: row.id,
        p_attempt: row.email_attempts,
        p_ok: sent.ok,
        p_message_id: sent.id ?? null,
        p_error: sent.ok ? null : String(sent.error ?? 'unknown error').slice(0, 500),
      })
    } catch (e) {
      log.error('[email] finish failed', row.id, e?.message ?? e)
    }

    if (!sent.ok) {
      log.error('[email] send failed', row.id, sent.provider ?? '', sent.error)

      // Daily limit: retrying won't help today. Ambiguous: the email may already be on its way,
      // so the website must not offer a retry that could send it twice.
      if (sent.quota) return json(429, { ok: false, error: 'daily_limit', retryable: false })
      if (sent.ambiguous) return json(502, { ok: false, error: 'delivery_unknown', retryable: false })

      return json(502, {
        ok: false,
        error: 'send_failed',
        retryable: sent.retryable !== false,
      })
    }

    if (sent.fallback) log.error('[email] sent via fallback', row.id, sent.provider, sent.note)

    // Sheet logging for providers that don't log themselves. Already recorded as sent above,
    // so a logging failure is only reported; it can never trigger another email.
    if (afterSend) {
      try {
        await afterSend(sendArgs, sent)
      } catch (e) {
        log.error('[email] after-send logging failed', row.id, e?.message ?? e)
      }
    }

    return json(200, {
      ok: true,
      status: 'sent',
      provider: sent.provider ?? null,
    })
  }
}
