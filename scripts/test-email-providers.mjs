// `npm run test:providers`: unit tests for the email providers (supabase/functions/send-recommendation-email/
// gmail.js, apps-script.js, delivery.js) against fake Google and Apps Script endpoints. No network, no email.
import { base64url, buildMime, createGmailSender, encodeHeader } from '../supabase/functions/send-recommendation-email/gmail.js'
import { createAppsScript } from '../supabase/functions/send-recommendation-email/apps-script.js'
import { createDelivery } from '../supabase/functions/send-recommendation-email/delivery.js'

let pass = 0
let fail = 0
const ok = (cond, msg, extra = '') => {
  cond ? pass++ : fail++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}${!cond && extra ? `  → ${extra}` : ''}`)
}

// ── Helpers ──
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const SECRETS = { GMAIL_CLIENT_ID: 'cid-123', GMAIL_CLIENT_SECRET: 'csecret-SHOULD-NOT-LEAK', GMAIL_REFRESH_TOKEN: 'rtoken-SHOULD-NOT-LEAK', GMAIL_SENDER: 'infokappiness@gmail.com' }
const APPS = { APPS_SCRIPT_URL: 'https://script.google.com/macros/s/SEND/exec', APPS_SCRIPT_SECRET: 'apps-secret', APPS_SCRIPT_LOG_URL: 'https://script.google.com/macros/s/LOG/exec' }
const envOf = (o) => (k) => o[k] ?? ''
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

const fromB64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
const decodeWords = (v) => v.replace(/\r\n /g, '').replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_, b) => Buffer.from(b, 'base64').toString('utf8'))
/** Parses our multipart/alternative message: headers + decoded text and html parts. */
function parseMime(raw) {
  const msg = fromB64(raw)
  const [head, ...rest] = msg.split('\r\n\r\n')
  const headers = {}
  for (const line of head.replace(/\r\n /g, ' ').split('\r\n')) {
    const i = line.indexOf(':')
    headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim()
  }
  const boundary = /boundary="([^"]+)"/.exec(headers['content-type'])?.[1]
  const parts = {}
  for (const p of rest.join('\r\n\r\n').split(`--${boundary}`)) {
    const [ph, body] = p.split('\r\n\r\n')
    const type = /Content-Type: (text\/\w+)/.exec(ph ?? '')?.[1]
    if (type && body) parts[type] = Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8')
  }
  return { msg, headers, subject: decodeWords(headers.subject ?? ''), parts }
}

/** A scripted fake fetch: `plan` is a list of responders for the Gmail send endpoint. */
function fakeGoogle({ plan = [], token = () => json(200, { access_token: 'at-1', expires_in: 3600 }) } = {}) {
  const calls = { token: [], send: [], other: [] }
  const fetch = async (url, init = {}) => {
    if (url === TOKEN_URL) {
      calls.token.push(init.body)
      return token(calls.token.length, init)
    }
    if (url === SEND_URL) {
      calls.send.push({ auth: init.headers?.Authorization, raw: JSON.parse(init.body).raw })
      const step = plan.shift() ?? (() => json(200, { id: `msg-${calls.send.length}` }))
      return step(init)
    }
    calls.other.push(url)
    throw new Error(`unexpected url ${url}`)
  }
  return { fetch, calls }
}
const never = (init) =>
  new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
const gmailErr = (status, message, reason) => () => json(status, { error: { code: status, message, errors: reason ? [{ reason }] : [] } })
const sample = {
  to: 'asha@example.com',
  subject: 'Asha, your Kappiness story picks ✦ കഥ',
  html: '<p>Hello <b>Asha</b> · ആടുജീവിതം · <img src="https://kappiness111.github.io/x.png"></p>',
  text: 'Hello Asha · ആടുജീവിതം\nReceipt KAP-261112-7F3Q',
  submissionId: '11111111-1111-4111-8111-111111111111',
  receiptNo: 'KAP-261112-7F3Q',
  name: 'Asha Menon',
  phone: '',
  date: '2026-11-12T10:00:00Z',
  story: 'You read to think.',
  storyIdentity: 'The Intellectual Wanderer',
  recommendedBook: 'Aadujeevitham',
  recommendedMovie: 'Kumbalangi Nights',
  idempotencyKey: 'kappiness-11111111-1111-4111-8111-111111111111-1',
}
const fast = { sleep: async () => {}, sendTimeoutMs: 50, tokenTimeoutMs: 50 }

// ── 1. Encoding ──
{
  const enc = base64url('ആ?>~ÿ')
  ok(!/[+/=]/.test(enc) && fromB64(enc) === 'ആ?>~ÿ', 'base64url: URL-safe alphabet, no padding, UTF-8 round trip')
  ok(encodeHeader('Plain subject') === 'Plain subject', 'ASCII header left as is')
  const long = 'കഥ '.repeat(40)
  const words = encodeHeader(long)
  ok(words.split('\r\n ').every((w) => w.length <= 75) && decodeWords(words) === long.trim(), 'non-ASCII header → RFC 2047 words, each ≤ 75 chars, decodes exactly')

  const raw = base64url(buildMime({ fromName: 'Kappiness', from: 'infokappiness@gmail.com', to: sample.to, replyTo: 'infokappiness@gmail.com', subject: sample.subject, text: sample.text, html: sample.html }))
  const m = parseMime(raw)
  ok(decodeWords(m.headers.from) === 'Kappiness <infokappiness@gmail.com>' && m.headers.to === '<asha@example.com>' && m.headers['reply-to'] === '<infokappiness@gmail.com>', 'From / To / Reply-To headers')
  ok(m.subject === sample.subject, 'subject survives encoding (emoji + Malayalam)')
  ok(m.headers['mime-version'] === '1.0' && /^multipart\/alternative; boundary="/.test(m.headers['content-type']), 'MIME-Version + multipart/alternative')
  ok(m.parts['text/plain'] === sample.text && m.parts['text/html'] === sample.html, 'plain-text and HTML parts decode to the exact content')
  ok(m.msg.split('\r\n').every((l) => l.length <= 998) && !/[^\r]\n/.test(m.msg), 'CRLF line endings, no line over 998 characters')
  const inj = parseMime(base64url(buildMime({ from: 'a@b.co', to: 'x@y.co\r\nBcc: evil@z.co', subject: 'Hi\r\nBcc: evil@z.co', text: '', html: '' })))
  ok(!('bcc' in inj.headers), 'CR/LF in headers cannot inject a Bcc header')
}

// ── 2. Gmail sender ──
{
  // success + token caching + refresh on expiry
  let clock = 0
  const g = fakeGoogle()
  const s = createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, now: () => clock, ...fast })
  ok(s.configured(), 'configured when all four GMAIL_* secrets are set')
  ok(!createGmailSender({ env: envOf({ ...SECRETS, GMAIL_REFRESH_TOKEN: '' }) }).configured(), 'not configured without a refresh token')
  let r = await s.send(sample)
  ok(r.ok && r.id === 'msg-1', 'success → accepted with Gmail message id')
  ok(g.calls.send[0].auth === 'Bearer at-1', 'send uses the access token as a Bearer token')
  const form = new URLSearchParams(g.calls.token[0])
  ok(form.get('grant_type') === 'refresh_token' && form.get('refresh_token') === SECRETS.GMAIL_REFRESH_TOKEN && form.get('client_id') === SECRETS.GMAIL_CLIENT_ID, 'token refresh posts the refresh token to oauth2.googleapis.com/token')
  ok(parseMime(g.calls.send[0].raw).parts['text/html'] === sample.html, 'the exact receipt HTML is what Gmail receives')
  await s.send(sample)
  ok(g.calls.token.length === 1, 'access token is cached between sends')
  clock += 3600 * 1000
  await s.send(sample)
  ok(g.calls.token.length === 2, 'expired access token is refreshed automatically')
}
{
  // 401 on send → refresh once → success
  const g = fakeGoogle({ plan: [gmailErr(401, 'Invalid Credentials', 'authError')] })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast }).send(sample)
  ok(r.ok && g.calls.token.length === 2 && g.calls.send.length === 2, '401 → token refreshed once and the send retried → accepted')
}
{
  // refresh token revoked / wrong client
  const g = fakeGoogle({ token: () => json(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }) })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast }).send(sample)
  ok(!r.ok && r.outcome === 'auth' && r.error.includes('invalid_grant') && g.calls.send.length === 0, 'invalid_grant → auth failure, nothing sent')
  ok(!r.error.includes('SHOULD-NOT-LEAK') && !r.error.includes('cid-123'), 'auth error never contains the client secret, refresh token or client id')
}
{
  // daily sending limit
  const g = fakeGoogle({ plan: [gmailErr(429, 'Too many requests: User-rate limit exceeded (Mail sending). Retry after 2099-01-01T00:00:00.000Z', 'rateLimitExceeded')] })
  const s = createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast })
  let r = await s.send(sample)
  ok(!r.ok && r.outcome === 'quota' && g.calls.send.length === 1, 'Gmail sending limit (429 Mail sending) → quota, not retried')
  r = await s.send(sample)
  ok(!r.ok && r.outcome === 'quota' && g.calls.send.length === 1, 'after a sending-limit error, Gmail is not called again until the retry time')
}
{
  // transient errors: backoff and retry
  const sleeps = []
  const g = fakeGoogle({ plan: [gmailErr(503, 'Service unavailable'), gmailErr(429, 'Too many concurrent requests for user')] })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast, sleep: async (ms) => sleeps.push(ms) }).send(sample)
  ok(r.ok && g.calls.send.length === 3 && sleeps.join() === '1000,2000', '503 then 429 (rate) → retried after 1 s and 2 s → accepted')
}
{
  const g = fakeGoogle({ plan: [gmailErr(503, 'x'), gmailErr(503, 'x'), gmailErr(503, 'x')] })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast }).send(sample)
  ok(!r.ok && r.outcome === 'rejected' && g.calls.send.length === 3, '503 three times → definite failure after 2 retries (no endless retry)')
}
{
  const g = fakeGoogle({ plan: [gmailErr(500, 'Backend Error', 'backendError'), gmailErr(500, 'x'), gmailErr(500, 'x')] })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast }).send(sample)
  ok(!r.ok && r.outcome === 'ambiguous', '500 that persists → ambiguous (Gmail may have sent it)')
}
{
  const g = fakeGoogle({ plan: [gmailErr(400, 'Invalid To header', 'invalidArgument')] })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast }).send(sample)
  ok(!r.ok && r.outcome === 'rejected' && g.calls.send.length === 1, '400 → definite failure, not retried')
}
{
  const g = fakeGoogle({ plan: [never] })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast }).send(sample)
  ok(!r.ok && r.outcome === 'ambiguous' && /timeout/.test(r.error) && g.calls.send.length === 1, 'timeout waiting for Gmail → ambiguous, not retried')
}
{
  const g = fakeGoogle({ plan: [() => Promise.reject(new TypeError('connection reset'))] })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast }).send(sample)
  ok(!r.ok && r.outcome === 'ambiguous' && g.calls.send.length === 1, 'network error during send → ambiguous, not retried')
}
{
  const g = fakeGoogle({ token: (n, init) => never(init) })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast }).send(sample)
  ok(!r.ok && r.outcome === 'rejected' && g.calls.send.length === 0, 'token endpoint timeout → definite failure (nothing was sent)')
}
{
  const g = fakeGoogle({ plan: [() => json(200, {})] })
  const r = await createGmailSender({ env: envOf(SECRETS), fetch: g.fetch, ...fast }).send(sample)
  ok(!r.ok && r.outcome === 'ambiguous', '200 without a message id → ambiguous (never marked as sent)')
}

// ── 3. Apps Script provider ──
function fakeApps({ send = () => json(200, { success: true }), log = () => json(200, { success: true }) } = {}) {
  const calls = { send: [], log: [] }
  const fetch = async (url, init) => {
    if (url === APPS.APPS_SCRIPT_URL) {
      calls.send.push(JSON.parse(init.body))
      return send()
    }
    if (url === APPS.APPS_SCRIPT_LOG_URL) {
      calls.log.push(JSON.parse(init.body))
      return log()
    }
    throw new Error(`unexpected url ${url}`)
  }
  return { fetch, calls }
}
{
  const a = fakeApps()
  const s = createAppsScript({ env: envOf(APPS), fetch: a.fetch })
  const r = await s.send(sample)
  const b = a.calls.send[0]
  const fields = ['token', 'to', 'subject', 'html', 'text', 'submissionId', 'receiptNo', 'name', 'phone', 'date', 'story', 'storyIdentity', 'recommendedBook', 'recommendedMovie', 'idempotencyKey']
  ok(r.ok && r.id === sample.idempotencyKey, 'Apps Script send → success')
  ok(fields.every((f) => f in b) && Object.keys(b).length === fields.length && b.token === 'apps-secret', 'Apps Script request body is unchanged (same fields the existing script reads)')
  const fail = await createAppsScript({ env: envOf(APPS), fetch: fakeApps({ send: () => json(200, { success: false, error: 'Service invoked too many times for one day: email.' }) }).fetch }).send(sample)
  ok(!fail.ok && /too many times/.test(fail.error), 'Apps Script error is reported')
}

// ── 4. Provider selection, fallback, cap, logging ──
function rig({ env = {}, plan = [], token, appsSend, appsLog, count = async () => 0 } = {}) {
  const g = fakeGoogle({ plan, token })
  const a = fakeApps({ send: appsSend, log: appsLog })
  const errors = []
  const e = envOf({ ...SECRETS, ...APPS, ...env })
  const d = createDelivery({
    env: e,
    gmail: createGmailSender({ env: e, fetch: g.fetch, ...fast }),
    appsScript: createAppsScript({ env: e, fetch: a.fetch }),
    gmailSentLast24h: count,
    log: { error: (...x) => errors.push(x.join(' ')) },
  })
  return { d, g, a, errors }
}
{
  const { d, g, a } = rig()
  const r = await d.send(sample)
  ok(d.provider() === 'apps_script' && r.ok && r.provider === 'apps_script' && g.calls.send.length === 0 && a.calls.send.length === 1, 'EMAIL_PROVIDER unset → original Apps Script path only (safe default)')
  ok(r.id === `apps_script:${sample.idempotencyKey}`, 'Apps Script sends are recorded with an apps_script: id')
}
{
  const { d, g, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api' } })
  const r = await d.send(sample)
  ok(r.ok && r.provider === 'gmail_api' && r.id === 'gmail:msg-1' && a.calls.send.length === 0, 'EMAIL_PROVIDER=gmail_api → Gmail sends, Apps Script does not')
  await d.afterSend(sample, r)
  const l = a.calls.log[0]
  ok(a.calls.log.length === 1 && l.action === 'log' && l.logOnly === true && l.receiptNo === sample.receiptNo && l.messageId === 'gmail:msg-1' && l.provider === 'gmail_api', 'Gmail send → Sheet row logged through the logging-only deployment')
  ok(a.calls.send.length === 0 && g.calls.send.length === 1, 'logging never sends a second email')
}
{
  const { d, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api' } })
  const r = await d.send(sample)
  await d.afterSend({ ...sample }, r)
  await d.afterSend(sample, { ok: true, provider: 'apps_script', id: 'apps_script:x' })
  ok(a.calls.log.length === 1, 'Apps Script sends are not logged twice (the script logs its own row)')
}
{
  const { d, a, errors } = rig({ env: { EMAIL_PROVIDER: 'gmail_api', APPS_SCRIPT_LOG_URL: '' } })
  await d.afterSend(sample, await d.send(sample))
  ok(a.calls.send.length === 0 && a.calls.log.length === 0 && errors.some((x) => /LOG_URL not set/.test(x)), 'no APPS_SCRIPT_LOG_URL → logging skipped and reported, never sent to the sending deployment')
}
{
  const { d, a, errors } = rig({ env: { EMAIL_PROVIDER: 'gmail_api', APPS_SCRIPT_LOG_URL: APPS.APPS_SCRIPT_URL } })
  await d.afterSend(sample, await d.send(sample))
  ok(a.calls.send.length === 0 && errors.some((x) => /refusing/.test(x)), 'APPS_SCRIPT_LOG_URL pointing at the sending deployment is refused (would email twice)')
}
{
  const { d, errors } = rig({ env: { EMAIL_PROVIDER: 'gmail_api' }, appsLog: () => json(500, { success: false, error: 'sheet locked' }) })
  let threw = false
  try {
    await d.afterSend(sample, await d.send(sample))
  } catch {
    threw = true
  }
  ok(!threw && errors.some((x) => /sheet locked/.test(x)), 'a Sheet logging failure is reported but never throws')
}
{
  const { d, g, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api' }, token: () => json(400, { error: 'invalid_grant' }) })
  const r = await d.send(sample)
  ok(r.ok && r.provider === 'apps_script' && r.fallback && g.calls.send.length === 0 && a.calls.send.length === 1, 'Gmail auth failure (definite) → Apps Script fallback sends it')
}
{
  const { d, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api' }, plan: [gmailErr(429, 'User-rate limit exceeded (Mail sending)')] })
  const r = await d.send(sample)
  ok(r.ok && r.provider === 'apps_script' && a.calls.send.length === 1, 'Gmail sending limit → Apps Script fallback')
}
{
  const { d, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api' }, plan: [never] })
  const r = await d.send(sample)
  ok(!r.ok && r.ambiguous && r.retryable === false && a.calls.send.length === 0, 'Gmail timeout (ambiguous) → NO fallback, not retryable (no duplicate receipt)')
}
{
  const { d, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api' }, plan: [gmailErr(500, 'x'), gmailErr(500, 'x'), gmailErr(500, 'x')] })
  const r = await d.send(sample)
  ok(!r.ok && r.ambiguous && a.calls.send.length === 0, 'Gmail 500 (ambiguous) → NO fallback')
}
{
  const { d, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api', EMAIL_FALLBACK: 'off' }, plan: [gmailErr(429, 'User-rate limit exceeded (Mail sending)')] })
  const r = await d.send(sample)
  ok(!r.ok && r.quota && r.retryable === false && a.calls.send.length === 0, 'EMAIL_FALLBACK=off + sending limit → daily limit, not retryable')
}
{
  const { d, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api', EMAIL_FALLBACK: 'off' }, plan: [gmailErr(503, 'x'), gmailErr(503, 'x'), gmailErr(503, 'x')] })
  const r = await d.send(sample)
  ok(!r.ok && r.retryable === true && !r.quota && a.calls.send.length === 0, 'EMAIL_FALLBACK=off + Gmail unavailable → retryable failure')
}
{
  const { d, g, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api' }, count: async () => 450 })
  const r = await d.send(sample)
  ok(r.ok && r.provider === 'apps_script' && g.calls.send.length === 0 && a.calls.send.length === 1, 'safety cap (450 in 24h, default) reached → Gmail not called, Apps Script fallback')
}
{
  const { d, g } = rig({ env: { EMAIL_PROVIDER: 'gmail_api', GMAIL_DAILY_CAP: '600' }, count: async () => 450 })
  const r = await d.send(sample)
  ok(r.ok && r.provider === 'gmail_api' && g.calls.send.length === 1, 'GMAIL_DAILY_CAP is configurable')
}
{
  const { d, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api', EMAIL_FALLBACK: 'off' }, count: async () => 999 })
  const r = await d.send(sample)
  ok(!r.ok && r.quota && r.retryable === false && a.calls.send.length === 0, 'cap reached with fallback off → daily limit, not retryable')
}
{
  const { d, g, errors } = rig({ env: { EMAIL_PROVIDER: 'gmail_api' }, count: async () => {
    throw new Error('db down')
  } })
  const r = await d.send(sample)
  ok(r.ok && r.provider === 'gmail_api' && g.calls.send.length === 1 && errors.some((x) => /send count/.test(x)), 'send count unreadable → still sends (Gmail enforces its own limit), and reports it')
}
{
  const { d, a } = rig({ env: { EMAIL_PROVIDER: 'gmail_api', GMAIL_REFRESH_TOKEN: '' } })
  const r = await d.send(sample)
  ok(d.configured() && r.ok && r.provider === 'apps_script' && a.calls.send.length === 1, 'Gmail selected but not configured → Apps Script fallback')
}
{
  const empty = createDelivery({ env: envOf({ EMAIL_PROVIDER: 'gmail_api' }), gmail: createGmailSender({ env: envOf({}) }), appsScript: createAppsScript({ env: envOf({}) }), gmailSentLast24h: async () => 0 })
  ok(!empty.configured(), 'nothing configured → configured() is false (function answers not_configured)')
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
