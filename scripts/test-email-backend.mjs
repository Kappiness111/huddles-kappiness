// `npm run test:backend`: end-to-end check of the visitor → save → email flow, with no Supabase project.
//
// • Loads the REAL frontend modules through Vite (recommendation engine, book/film finders, buildSubmission,
//   saveSubmission, sendReceiptEmail) and the REAL @supabase/supabase-js client.
// • Points them at a local fake Supabase: PostgREST inserts go to an in-memory table, and function calls are
//   routed into the REAL Edge Function handler + provider router (handler.js, delivery.js, gmail.js,
//   apps-script.js) with a fake Gmail API and a fake Apps Script. The claim logic here is a stand-in;
//   the real SQL is tested by `npm run test:sql`. Provider details are unit-tested by `npm run test:providers`.
// • Writes rendered email previews (en / ml / hi) so the design can be checked in a browser.
//
// External book/film APIs are blocked, so the finders use the bundled shelf (deterministic).

import http from 'node:http'
import { writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer as createVite } from 'vite'
import { createHandler, corsHeaders } from '../supabase/functions/send-recommendation-email/handler.js'
import { renderReceiptEmail } from '../supabase/functions/send-recommendation-email/receipt-email.js'
import { createGmailSender } from '../supabase/functions/send-recommendation-email/gmail.js'
import { createAppsScript } from '../supabase/functions/send-recommendation-email/apps-script.js'
import { createDelivery, GMAIL_ID_PREFIX } from '../supabase/functions/send-recommendation-email/delivery.js'

let pass = 0
let fail = 0
const ok = (cond, msg, extra = '') => {
  cond ? pass++ : fail++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}${!cond && extra ? `  → ${extra}` : ''}`)
}

// ── Fake Supabase ─────────────────────────────────────────────────────────────────
const table = new Map()

// ── Fake Google (OAuth token + Gmail API) and fake Apps Script ──
const fakeEnv = {
  EMAIL_PROVIDER: 'gmail_api',
  GMAIL_CLIENT_ID: 'test-client',
  GMAIL_CLIENT_SECRET: 'test-secret',
  GMAIL_REFRESH_TOKEN: 'test-refresh',
  GMAIL_SENDER: 'infokappiness@gmail.com',
  APPS_SCRIPT_URL: 'https://script.example/macros/s/SEND/exec',
  APPS_SCRIPT_SECRET: 'test-apps-secret',
  APPS_SCRIPT_LOG_URL: 'https://script.example/macros/s/LOG/exec',
  SITE_URL: 'https://kappiness111.github.io/huddles-kappiness',
}
const env = (k) => fakeEnv[k] ?? ''
const gmailSent = [] // decoded messages Gmail accepted
const gmailPlan = [] // scripted responses for the next Gmail sends ('timeout' | status code)
const appsSent = [] // emails the Apps Script sent
const sheetLog = [] // logging-only calls
const asJson = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const fromB64 = (x, url = false) => Buffer.from(url ? x.replace(/-/g, '+').replace(/_/g, '/') : x, 'base64').toString('utf8')
function decodeMime(raw) {
  const msg = fromB64(raw, true)
  const [head, ...rest] = msg.split('\r\n\r\n')
  const header = (n) => new RegExp(`^${n}: (.*)$`, 'mi').exec(head.replace(/\r\n /g, ''))?.[1] ?? ''
  const words = (v) => v.replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_, b) => fromB64(b))
  const boundary = /boundary="([^"]+)"/.exec(head)[1]
  const part = (type) => {
    const p = rest.join('\r\n\r\n').split(`--${boundary}`).find((x) => x.includes(`Content-Type: ${type}`))
    return fromB64(p.split('\r\n\r\n')[1].replace(/\s+/g, ''))
  }
  return { from: words(header('From')), to: header('To'), subject: words(header('Subject')), html: part('text/html'), text: part('text/plain') }
}
const providerFetch = async (url, init) => {
  if (url === 'https://oauth2.googleapis.com/token') return asJson(200, { access_token: 'test-access', expires_in: 3600 })
  if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
    await new Promise((r) => setTimeout(r, 20))
    const step = gmailPlan.shift()
    if (step === 'timeout') return new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))))
    if (step === 429) return asJson(429, { error: { code: 429, message: 'Too many requests: User-rate limit exceeded (Mail sending)' } })
    if (step) return asJson(step, { error: { code: step, message: 'simulated' } })
    gmailSent.push(decodeMime(JSON.parse(init.body).raw))
    return asJson(200, { id: `gm-${gmailSent.length}` })
  }
  if (url === fakeEnv.APPS_SCRIPT_URL) {
    appsSent.push(JSON.parse(init.body))
    return asJson(200, { success: true })
  }
  if (url === fakeEnv.APPS_SCRIPT_LOG_URL) {
    sheetLog.push(JSON.parse(init.body))
    return asJson(200, { success: true })
  }
  throw new Error(`unexpected provider url ${url}`)
}
const fast = { sleep: async () => {}, sendTimeoutMs: 200 }
// A fresh router (its Gmail pause after a sending-limit error is per instance, like a function instance).
const newDelivery = () =>
  createDelivery({
    env,
    gmail: createGmailSender({ env, fetch: providerFetch, ...fast }),
    appsScript: createAppsScript({ env, fetch: providerFetch }),
    // Same rule as index.js: Gmail sends recorded as sent (the database is the persistent counter).
    gmailSentLast24h: async () => [...table.values()].filter((r) => r.email_status === 'sent' && String(r.email_message_id).startsWith(GMAIL_ID_PREFIX)).length,
    log: { error: () => {} },
  })
let delivery = newDelivery()

const handler = createHandler({
  env,
  log: { error: () => {} },
  claim: async ({ p_id, p_receipt_number, p_email, p_grant_consent }) => {
    const r = table.get(p_id)
    if (!r || r.receipt_number !== p_receipt_number) return { outcome: 'not_found' }
    if (r.email !== p_email.trim().toLowerCase()) return { outcome: 'email_mismatch' }
    if (r.email_status === 'sent') return { outcome: 'already_sent' }
    if (r.email_status === 'sending') return { outcome: 'in_progress' }
    if (!(r.consent_email || p_grant_consent)) return { outcome: 'no_consent' }
    if (r.email_attempts >= 3) return { outcome: 'limit_reached' }
    Object.assign(r, { email_status: 'sending', email_attempts: r.email_attempts + 1, consent_email: true })
    return { outcome: 'claimed', submission: structuredClone(r) }
  },
  finish: async ({ p_id, p_attempt, p_ok, p_message_id, p_error }) => {
    const r = table.get(p_id)
    if (r.email_status === 'sending' && r.email_attempts === p_attempt)
      Object.assign(r, { email_status: p_ok ? 'sent' : 'failed', email_message_id: p_ok ? p_message_id : r.email_message_id, email_last_error: p_ok ? null : p_error })
  },
  sendEmail: (msg) => delivery.send(msg),
  afterSend: (msg, sent) => delivery.afterSend(msg, sent),
  configured: () => delivery.configured(),
})

const server = http.createServer(async (req, res) => {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = Buffer.concat(chunks).toString()
  const url = new URL(req.url, 'http://localhost')
  const send = (status, obj, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
    res.end(obj === undefined ? '' : JSON.stringify(obj))
  }

  if (url.pathname === '/rest/v1/attendee_submissions' && req.method === 'POST') {
    if (req.headers.apikey !== 'test-anon') return send(401, { message: 'no apikey' })
    const row = JSON.parse(body)
    if (table.has(row.id)) return send(409, { code: '23505', message: 'duplicate key value violates unique constraint "attendee_submissions_pkey"' })
    if ([...table.values()].some((r) => r.receipt_number === row.receipt_number))
      return send(409, { code: '23505', message: 'duplicate key value violates unique constraint "attendee_submissions_receipt_number_key"' })
    table.set(row.id, { ...row, email: row.email.toLowerCase(), email_status: 'pending', email_attempts: 0, created_at: new Date().toISOString() })
    return send(201)
  }
  if (url.pathname.startsWith('/functions/v1/send-recommendation-email')) {
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)]))
    const r = await handler(new Request(`http://localhost${req.url}`, { method: req.method, headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body }))
    res.writeHead(r.status, Object.fromEntries(r.headers))
    return res.end(await r.text())
  }
  send(404, { message: 'not found' })
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

// Block external APIs so the finders fall back to the bundled shelf (and hide the expected "offline" logs).
const realWarn = console.warn
console.warn = (...a) => (/offline \(test\)/.test(a.join(' ')) ? undefined : realWarn(...a))
const realFetch = globalThis.fetch
globalThis.fetch = (input, init) => {
  const u = typeof input === 'string' ? input : input.url
  return u.startsWith(base) ? realFetch(input, init) : Promise.reject(new Error('offline (test)'))
}

process.env.VITE_SUPABASE_URL = base
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon'
process.env.VITE_EMAIL_ENABLED = 'true'
const vite = await createVite({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } })
const load = (p) => vite.ssrLoadModule(p)

try {
  const { computeResult } = await load('/src/lib/recommendationEngine.js')
  const { QUIZ } = await load('/src/data/quiz.js')
  const { findBooks } = await load('/src/services/books.js')
  const { findMovies } = await load('/src/services/movies.js')
  const { buildSubmission, saveSubmission } = await load('/src/services/submissions.js')
  const { sendReceiptEmail } = await load('/src/services/email.js')
  const { newId, receiptNumber } = await load('/src/lib/ids.js')

  // ── 1. Existing recommendation engine, unchanged ──
  const answers = Object.fromEntries(QUIZ.map((q, i) => [q.id, i % 3 ? 'a' : 'b']))
  const result = computeResult({ answers })
  ok(result.personality?.id && Object.keys(result.profile.genres).length > 0, `recommendation engine → identity "${result.personality.id}"`)

  const makeState = async ({ uiLang = 'en', bookLang = 'ml', movieLang = 'ml', email = 'asha.menon@example.com' } = {}) => {
    const sessionId = newId()
    const books = await findBooks({ profile: result.profile, personality: result.personality, lang: bookLang, seed: sessionId, uiLang })
    const movies = await findMovies({ profile: result.profile, personality: result.personality, lang: movieLang, seed: sessionId, uiLang })
    return {
      sessionId,
      receiptNo: receiptNumber(new Date()),
      completedAt: new Date().toISOString(),
      uiLang,
      attendee: { name: 'Asha Menon', email, phone: '', consentData: true, consentEmail: true },
      prefs: { book: bookLang, movie: movieLang },
      quizAnswers: answers,
      result,
      picks: { book: books.items[0], movie: movies.items[0] },
    }
  }

  // ── 2. Submission record built from the real picks ──
  const state = await makeState()
  const rec = buildSubmission(state)
  ok(state.picks.book && state.picks.movie, `finders → book "${state.picks.book?.title}", film "${state.picks.movie?.title}"`)
  ok(rec.id === state.sessionId && rec.receipt_number === state.receiptNo, 'record keeps the session id + receipt number')
  ok(rec.full_name === 'Asha Menon' && rec.email === 'asha.menon@example.com' && rec.consent === true && rec.consent_email === true, 'record has visitor + consent')
  ok(rec.quiz_answers.length === QUIZ.length, `record has all ${QUIZ.length} quiz answers`)
  ok(rec.personality_type === result.personality.id && rec.story_identity.title && rec.story_identity.description, `record has story identity "${rec.story_identity.title}"`)
  ok(Object.keys(rec.preference_scores).length > 5, 'record has preference scores')
  const b = rec.recommended_book
  const m = rec.recommended_movie
  ok(b.title === state.picks.book.title && b.author && b.language === 'ml' && b.language_name, `book: ${b.title} · ${b.author} · ${b.language_name}`)
  ok(/\/media\/books\/[a-z0-9-]+\.jpg$/.test(b.cover), `book cover stored (${b.cover})`)
  ok(m.title === state.picks.movie.title && m.year && m.language === 'ml' && /\/media\/movies\//.test(m.cover), `film: ${m.title} (${m.year}) · ${m.genre ?? 'no genre'} · poster stored`)
  ok(rec.email_copy.title && rec.email_copy.date && rec.email_copy.message.includes('Asha'), 'record has the receipt wording for the email')
  ok(!('created_at' in rec) && rec.completed_at, 'created_at is left to the database')

  // ── 3. Saving ──
  ok((await saveSubmission(rec)).status === 'saved', 'saveSubmission → saved (via supabase-js)')
  ok((await saveSubmission(rec)).status === 'saved' && table.size === 1, 'saving the same record again is idempotent (no duplicate row)')
  const clash = buildSubmission({ ...(await makeState()), receiptNo: rec.receipt_number })
  ok((await saveSubmission(clash)).status === 'receipt-taken', 'receipt-number collision with another visitor is detected')

  // ── 4. Email via the Gmail API: fail → retry → sent → no duplicate ──
  const req = { submissionId: rec.id, receiptNo: rec.receipt_number, email: 'Asha.Menon@example.com', consentEmail: true }
  fakeEnv.EMAIL_FALLBACK = 'off'
  gmailPlan.push(503, 503, 503)
  let r = await sendReceiptEmail(req)
  ok(r.status === 'error', `Gmail unavailable (503 ×3, no fallback) → status "error", retry offered [${r.message}]`)
  ok(table.get(rec.id).email_status === 'failed' && /gmail_api: http 503/.test(table.get(rec.id).email_last_error), 'failed attempt recorded with provider + error status')
  delete fakeEnv.EMAIL_FALLBACK
  r = await sendReceiptEmail(req)
  ok(r.status === 'sent' && gmailSent.length === 1 && appsSent.length === 0, 'retry → sent via the Gmail API (Apps Script not used)')
  ok(table.get(rec.id).email_status === 'sent' && table.get(rec.id).email_message_id === 'gmail:gm-1', 'recorded as sent with the Gmail message id (gmail:…)')
  ok(sheetLog.length === 1 && sheetLog[0].action === 'log' && sheetLog[0].receiptNo === rec.receipt_number && sheetLog[0].recommendedBook === b.title && sheetLog[0].storyIdentity === rec.story_identity.title, 'Google Sheet row logged via the logging-only deployment (receipt, identity, picks)')
  ok(gmailSent[0].html === renderReceiptEmail(table.get(rec.id), { siteUrl: fakeEnv.SITE_URL }).html, 'email is rendered from the saved row (identical on every attempt)')
  r = await sendReceiptEmail(req)
  ok(r.status === 'sent' && gmailSent.length === 1 && sheetLog.length === 1, 'asking again after success sends nothing new')
  r = await sendReceiptEmail({ ...req, email: 'someone.else@example.com' })
  ok(r.status === 'blocked', 'different email address → blocked (not retryable)')
  r = await sendReceiptEmail({ ...req, submissionId: newId() })
  ok(r.status === 'error', 'unknown submission → error (website re-saves before retrying)')

  // concurrent requests (double tap / auto-send + tap)
  const fresh = async (email) => {
    const st = await makeState({ email })
    const row = buildSubmission(st)
    await saveSubmission(row)
    return { row, req: { submissionId: row.id, receiptNo: row.receipt_number, email, consentEmail: true } }
  }
  const two = await fresh('ravi@example.com')
  const before = gmailSent.length
  const both = await Promise.all([sendReceiptEmail(two.req), sendReceiptEmail(two.req)])
  ok(gmailSent.length - before === 1 && both.some((x) => x.status === 'sent'), `two simultaneous requests → exactly one email (${both.map((x) => x.status).join(', ')})`)

  // ambiguous: Gmail may have accepted it → never fall back, never offer a retry
  const amb = await fresh('meera@example.com')
  gmailPlan.push('timeout')
  const appsBefore = appsSent.length
  r = await sendReceiptEmail(amb.req)
  ok(r.status === 'blocked' && appsSent.length === appsBefore, 'Gmail timeout → not retryable and NO Apps Script fallback (no duplicate receipt)')
  ok(table.get(amb.row.id).email_status === 'failed' && /timeout/.test(table.get(amb.row.id).email_last_error), 'ambiguous result is never marked as sent')

  // persistent safety cap: counted from the database
  fakeEnv.GMAIL_DAILY_CAP = String([...table.values()].filter((x) => String(x.email_message_id).startsWith('gmail:')).length)
  const capped = await fresh('nikhil@example.com')
  const gBefore = gmailSent.length
  r = await sendReceiptEmail(capped.req)
  ok(r.status === 'sent' && gmailSent.length === gBefore && appsSent.length === appsBefore + 1, `daily safety cap reached (${fakeEnv.GMAIL_DAILY_CAP} in 24h) → Gmail skipped, sent by the Apps Script fallback`)
  ok(table.get(capped.row.id).email_message_id.startsWith('apps_script:') && sheetLog.length === gmailSent.length, 'fallback send recorded as apps_script:…; Sheet logged once per Gmail send, never for Apps Script sends (the script logs its own row)')
  fakeEnv.EMAIL_FALLBACK = 'off'
  const capped2 = await fresh('tara@example.com')
  r = await sendReceiptEmail(capped2.req)
  ok(r.status === 'blocked' && gmailSent.length === gBefore, 'cap reached with fallback off → "daily limit", not retryable, Gmail not called')
  delete fakeEnv.GMAIL_DAILY_CAP
  delete fakeEnv.EMAIL_FALLBACK

  // Gmail's own sending limit → Apps Script fallback
  const quota = await fresh('arjun@example.com')
  gmailPlan.push(429)
  r = await sendReceiptEmail(quota.req)
  ok(r.status === 'sent' && appsSent.length === appsBefore + 2 && appsSent.at(-1).receiptNo === quota.row.receipt_number, 'Gmail sending limit (429) → sent once by the Apps Script fallback')

  // provider switch: EMAIL_PROVIDER=apps_script → the original path, no frontend change
  delivery = newDelivery()
  fakeEnv.EMAIL_PROVIDER = 'apps_script'
  const sw = await fresh('lekha@example.com')
  const gb = gmailSent.length
  r = await sendReceiptEmail(sw.req)
  ok(r.status === 'sent' && gmailSent.length === gb && appsSent.at(-1).to === 'lekha@example.com', 'EMAIL_PROVIDER=apps_script → original Apps Script provider sends it')
  ok(appsSent.at(-1).idempotencyKey === `kappiness-${sw.row.id}-1` && appsSent.at(-1).token === fakeEnv.APPS_SCRIPT_SECRET, 'Apps Script request unchanged (token + idempotency key)')
  fakeEnv.EMAIL_PROVIDER = 'gmail_api'

  // ── 5. What was emailed (Gmail API message) ──
  const sent = gmailSent[0]
  ok(sent.to === '<asha.menon@example.com>' && sent.from === 'Kappiness <infokappiness@gmail.com>', 'sent to the saved address, from "Kappiness <infokappiness@gmail.com>"')
  ok(sent.subject === renderReceiptEmail(table.get(rec.id), { siteUrl: fakeEnv.SITE_URL }).subject, 'subject is the existing receipt subject')
  for (const needle of ['Asha', rec.receipt_number, rec.story_identity.title, b.title, b.author, m.title, 'Kappiness · Huddles', 'HUDDLES GLOBAL × KAPPINESS']) {
    ok(sent.html.includes(needle.replace(/&/g, '&amp;').replace(/'/g, '&#39;')), `email contains "${needle}"`)
  }
  ok(sent.html.includes(`${fakeEnv.SITE_URL}${b.cover.slice(b.cover.indexOf('/media/'))}`), 'book cover → absolute SITE_URL image')
  ok(sent.html.includes(`${fakeEnv.SITE_URL}/brand/kappiness-logo-transparent.png`), 'Kappiness logo included (same file as the on-screen receipt)')
  ok(sent.text.includes(b.title) && sent.text.includes(rec.receipt_number), 'plain-text alternative included')

  // ── 6. Handler hardening ──
  const call = (init) => handler(new Request('http://x/fn', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://kappiness111.github.io' }, ...init }))
  ok((await call({ method: 'OPTIONS' })).headers.get('access-control-allow-headers').includes('x-client-info'), 'CORS preflight allows supabase-js headers')
  ok((await call({ body: '{bad' })).status === 400, 'invalid JSON → 400')
  ok((await call({ body: JSON.stringify({ ...req, email: 'not-an-email' }) })).status === 400, 'invalid email → 400')
  ok((await call({ body: JSON.stringify({ ...req, receiptNo: "x' or 1=1" }) })).status === 400, 'malformed receipt number → 400')
  ok((await call({ body: 'x'.repeat(5000) })).status === 413, 'oversized body → 413')
  ok(corsHeaders('https://evil.example', 'https://kappiness111.github.io')['Access-Control-Allow-Origin'] === 'https://kappiness111.github.io', 'ALLOWED_ORIGIN restricts CORS')
  const noKey = createHandler({ env: () => '', claim: null, finish: null, sendEmail: null })
  ok((await noKey(new Request('http://x', { method: 'POST', body: '{}' }))).status === 503, 'no provider configured → 503 not_configured')
  const xss = renderReceiptEmail({ ...table.get(rec.id), full_name: '<script>alert(1)</script>', recommended_book: { ...b, cover: 'https://evil.example/x.jpg', link: 'javascript:alert(1)' } }, { siteUrl: fakeEnv.SITE_URL })
  ok(!xss.html.includes('<script>') && !xss.html.includes('javascript:'), 'HTML escaped; javascript: links dropped')
  // Since "Enhance image URL resolution for email receipts", any public https image is allowed; unsafe forms are still dropped.
  const { imageUrl } = await import('../supabase/functions/send-recommendation-email/receipt-email.js')
  ok(['javascript:alert(1)', 'data:image/png;base64,AAA', 'https://u:p@x.example/a.jpg', '//evil.example/a.jpg'].every((c) => imageUrl(c, fakeEnv.SITE_URL) === null), 'unsafe image URLs (javascript:, data:, credentials, protocol-relative) dropped')

  // ── 7. Previews for a few recommendation languages (the interface itself is English-only) ──
  const outDir = join(tmpdir(), 'kappiness-email-preview')
  mkdirSync(outDir, { recursive: true })
  for (const lang of ['en', 'ml', 'hi']) {
    const s = await makeState({ bookLang: lang, movieLang: lang })
    const row = { ...buildSubmission(s), created_at: new Date().toISOString() }
    const { html, subject } = renderReceiptEmail(row, { siteUrl: 'http://localhost:4173/huddles-kappiness' })
    writeFileSync(join(outDir, `receipt-email-${lang}.html`), html)
    ok(html.includes(row.story_identity.title.replace(/'/g, '&#39;')) && subject.length > 0, `${lang} email renders (${subject})`)
  }
  console.log(`\nPreviews: ${outDir}  (run \`npm run build && npm run preview\` so the covers load)`)
} finally {
  await vite.close()
  server.close()
  globalThis.fetch = realFetch
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
