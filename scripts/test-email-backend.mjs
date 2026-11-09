// `npm run test:backend`: end-to-end check of the visitor → save → email flow, with no Supabase project.
//
// • Loads the REAL frontend modules through Vite (recommendation engine, book/film finders, buildSubmission,
//   saveSubmission, sendReceiptEmail) and the REAL @supabase/supabase-js client.
// • Points them at a local fake Supabase: PostgREST inserts go to an in-memory table, and function calls are
//   routed into the REAL Edge Function handler (supabase/functions/send-recommendation-email/handler.js) with a
//   fake Resend. The claim logic here is a stand-in; the real SQL is tested by `npm run test:sql`.
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

let pass = 0
let fail = 0
const ok = (cond, msg, extra = '') => {
  cond ? pass++ : fail++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}${!cond && extra ? `  → ${extra}` : ''}`)
}

// ── Fake Supabase ─────────────────────────────────────────────────────────────────
const table = new Map()
const resendCalls = []
let resendFailNext = 0

const fakeEnv = { RESEND_API_KEY: 're_test', RESEND_FROM: 'Kappiness <stories@example.com>', SITE_URL: 'https://kappiness111.github.io/huddles-kappiness' }
const handler = createHandler({
  env: (k) => fakeEnv[k] ?? '',
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
  finish: async ({ p_id, p_attempt, p_ok, p_message_id }) => {
    const r = table.get(p_id)
    if (r.email_status === 'sending' && r.email_attempts === p_attempt) Object.assign(r, { email_status: p_ok ? 'sent' : 'failed', email_message_id: p_message_id })
  },
  sendEmail: async (msg) => {
    resendCalls.push(msg)
    await new Promise((res) => setTimeout(res, 30))
    if (resendFailNext > 0) {
      resendFailNext--
      return { ok: false, error: 'resend 500: simulated outage' }
    }
    return { ok: true, id: `re_${resendCalls.length}` }
  },
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
      mindLab: { responses: { perspective: 'b' }, completed: true },
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

  // ── 4. Email: fail → retry → sent → no duplicate ──
  const req = { submissionId: rec.id, receiptNo: rec.receipt_number, email: 'Asha.Menon@example.com', consentEmail: true }
  resendFailNext = 1
  let r = await sendReceiptEmail(req)
  ok(r.status === 'error', `Resend outage → status "error" (retry offered) [${r.message}]`)
  ok(table.get(rec.id).email_status === 'failed', 'failed attempt recorded')
  r = await sendReceiptEmail(req)
  ok(r.status === 'sent', 'retry → sent')
  ok(resendCalls.length === 2 && resendCalls[0].idempotencyKey !== resendCalls[1].idempotencyKey, 'each attempt has its own Resend idempotency key')
  ok(resendCalls[1].html === resendCalls[0].html, 'retry email is identical to the first attempt (rendered from the saved row)')
  r = await sendReceiptEmail(req)
  ok(r.status === 'sent' && resendCalls.length === 2, 'asking again after success sends nothing new')
  r = await sendReceiptEmail({ ...req, email: 'someone.else@example.com' })
  ok(r.status === 'blocked', 'different email address → blocked (not retryable)')
  r = await sendReceiptEmail({ ...req, submissionId: newId() })
  ok(r.status === 'error', 'unknown submission → error (website re-saves before retrying)')

  // concurrent requests (double tap / auto-send + tap)
  const state2 = await makeState({ email: 'ravi@example.com' })
  const rec2 = buildSubmission(state2)
  await saveSubmission(rec2)
  const before = resendCalls.length
  const req2 = { submissionId: rec2.id, receiptNo: rec2.receipt_number, email: 'ravi@example.com', consentEmail: true }
  const both = await Promise.all([sendReceiptEmail(req2), sendReceiptEmail(req2)])
  ok(resendCalls.length - before === 1 && both.some((x) => x.status === 'sent'), `two simultaneous requests → exactly one email (${both.map((x) => x.status).join(', ')})`)

  // ── 5. What was emailed ──
  const sent = resendCalls[1]
  ok(sent.to === 'asha.menon@example.com' && sent.from === fakeEnv.RESEND_FROM, 'sent to the saved address, from RESEND_FROM')
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
  ok((await noKey(new Request('http://x', { method: 'POST', body: '{}' }))).status === 503, 'missing Resend secrets → 503 not_configured')
  const xss = renderReceiptEmail({ ...table.get(rec.id), full_name: '<script>alert(1)</script>', recommended_book: { ...b, cover: 'https://evil.example/x.jpg', link: 'javascript:alert(1)' } }, { siteUrl: fakeEnv.SITE_URL })
  ok(!xss.html.includes('<script>') && !xss.html.includes('evil.example') && !xss.html.includes('javascript:'), 'HTML escaped; unknown image/link hosts dropped')

  // ── 7. Previews in every interface language ──
  const outDir = join(tmpdir(), 'kappiness-email-preview')
  mkdirSync(outDir, { recursive: true })
  for (const lang of ['en', 'ml', 'hi']) {
    const s = await makeState({ uiLang: lang, bookLang: lang === 'hi' ? 'hi' : 'ml', movieLang: lang === 'hi' ? 'hi' : 'ml' })
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
