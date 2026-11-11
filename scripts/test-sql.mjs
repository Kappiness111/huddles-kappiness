// `npm run test:sql`: applies the Supabase migrations to PGlite (real Postgres, in WASM, no
// Docker or Supabase project needed) with Supabase-like roles, then checks row-level security,
// the server-managed fields and the email claim logic used by the Edge Function.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

const dir = new URL('../supabase/migrations/', import.meta.url)
const sql = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n')
const db = new PGlite()
let pass = 0, fail = 0
const ok = (cond, msg) => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`) }
const tryq = async (q, params) => { try { return { rows: (await db.query(q, params)).rows } } catch (e) { return { error: e.message } } }

// Supabase roles + default privileges (Supabase grants table/function access to these roles by default).
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`)
await db.exec(sql)
ok(true, 'migration applied')
await db.exec(sql)
ok(true, 'migration is re-runnable')

const row = (over = {}) => ({
  id: '11111111-1111-4111-8111-111111111111', receipt_number: 'KAP-261104-7F3Q', full_name: 'Asha Menon', email: ' Asha@Example.com ',
  phone: null, consent: true, consent_email: true, website_language: 'en', book_language: 'ml', movie_language: 'ml',
  mind_lab_responses: '{}', mind_lab_completed: true, quiz_answers: '[{"question_id":"q1","choice":"a"}]', personality_type: 'quiet-dreamer',
  story_identity: '{"id":"quiet-dreamer","title":"The Quiet Dreamer"}', preference_scores: '{"fantasy":0.8}',
  recommended_book: '{"title":"Randamoozham"}', recommended_movie: '{"title":"Premam"}', email_copy: '{}', completed_at: new Date().toISOString(), ...over,
})
const insert = (r) => {
  const keys = Object.keys(r)
  return tryq(`insert into public.attendee_submissions (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')})`, keys.map((k) => r[k]))
}

// ── anon ──
await db.exec('set role anon')
let r = await insert(row({ created_at: '2099-01-01T00:00:00Z', email_status: 'sent', email_attempts: 99 }))
ok(!r.error, `anon can insert (${r.error ?? 'ok'})`)
r = await tryq('select * from public.attendee_submissions')
ok(r.error?.includes('permission denied'), `anon cannot select: ${r.error}`)
r = await tryq(`update public.attendee_submissions set full_name='x'`)
ok(r.error?.includes('permission denied'), 'anon cannot update')
r = await tryq('delete from public.attendee_submissions')
ok(r.error?.includes('permission denied'), 'anon cannot delete')
r = await insert(row({ id: '22222222-2222-4222-8222-222222222222', receipt_number: 'KAP-261104-AAAA', consent: false }))
ok(r.error?.includes('row-level security'), 'anon insert without consent is rejected by RLS')
r = await insert(row({ receipt_number: 'KAP-261104-BBBB' }))
ok(r.error?.includes('attendee_submissions_pkey'), 'duplicate session id → pkey violation (client treats as already saved)')
r = await insert(row({ id: '33333333-3333-4333-8333-333333333333' }))
ok(r.error?.includes('receipt_number'), `duplicate receipt number → names receipt_number: ${r.error}`)
r = await insert(row({ id: '44444444-4444-4444-8444-444444444444', receipt_number: 'BAD' }))
ok(r.error?.includes('check constraint'), 'malformed receipt number rejected')
r = await insert(row({ id: '55555555-5555-4555-8555-555555555555', receipt_number: 'KAP-261104-CCCC', email_copy: JSON.stringify({ x: 'y'.repeat(20000) }) }))
ok(r.error?.includes('json_size'), 'oversized json rejected')
r = await tryq(`select public.claim_submission_email('11111111-1111-4111-8111-111111111111','KAP-261104-7F3Q','asha@example.com')`)
ok(r.error?.includes('permission denied'), 'anon cannot call claim_submission_email')
r = await tryq(`select public.purge_old_submissions()`)
ok(r.error?.includes('permission denied'), 'anon cannot call purge_old_submissions')
r = await tryq(`select public.recent_recommendations(10) as v`)
ok(!r.error && JSON.stringify(r.rows?.[0]?.v) === '{"book":["Randamoozham"],"movie":["Premam"],"identity":["quiet-dreamer"]}', `anon gets recent titles only: ${r.error ?? JSON.stringify(r.rows?.[0]?.v)}`)
await db.exec('reset role')

// Trigger forced the server-managed fields.
r = await tryq(`select email, created_at, email_status, email_attempts from public.attendee_submissions where id='11111111-1111-4111-8111-111111111111'`)
const s = r.rows[0]
ok(s.email === 'asha@example.com', 'email normalised to lower case')
ok(Math.abs(new Date(s.created_at) - Date.now()) < 60000, 'created_at forced to server time (client sent 2099)')
ok(s.email_status === 'pending' && s.email_attempts === 0, 'email state forced to pending/0 (client sent sent/99)')

// ── service_role (the Edge Function) ──
await db.exec('set role service_role')
const claim = async (email = 'asha@example.com', receipt = 'KAP-261104-7F3Q', id = '11111111-1111-4111-8111-111111111111', grant = false) =>
  (await db.query(`select public.claim_submission_email($1,$2,$3,$4) as r`, [id, receipt, email, grant])).rows[0].r
const finish = (attempt, okv, err = null) =>
  db.query(`select public.finish_submission_email('11111111-1111-4111-8111-111111111111',$1,$2,$3,$4)`, [attempt, okv, okv ? 're_123' : null, err])

ok((await claim('asha@example.com', 'KAP-261104-ZZZZ')).outcome === 'not_found', 'wrong receipt number → not_found')
ok((await claim('someone@else.com')).outcome === 'email_mismatch', 'other email → email_mismatch')
let c = await claim(' ASHA@example.com ')
ok(c.outcome === 'claimed' && c.submission.email_attempts === 1 && c.submission.story_identity.title === 'The Quiet Dreamer', 'first claim → claimed with stored receipt data')
ok(!('phone' in c.submission) && !('quiz_answers' in c.submission), 'claim returns only what the email needs')
ok((await claim()).outcome === 'in_progress', 'second concurrent claim → in_progress (no duplicate send)')
await finish(1, false, 'resend 500')
c = await claim()
ok(c.outcome === 'claimed' && c.submission.email_attempts === 2, 'retry after failure → claimed (attempt 2)')
await finish(1, true) // stale attempt number must not apply
r = (await db.query(`select email_status from public.attendee_submissions`)).rows[0]
ok(r.email_status === 'sending', 'finish for a stale attempt is ignored')
await finish(2, true)
r = (await db.query(`select email_status, email_sent_at, email_message_id, email_last_error from public.attendee_submissions`)).rows[0]
ok(r.email_status === 'sent' && r.email_sent_at && r.email_message_id === 're_123' && r.email_last_error === null, 'finish ok → sent')
ok((await claim()).outcome === 'already_sent', 'after sent → already_sent (never sends twice)')

// limits / consent / expiry on fresh rows
await db.exec('reset role')
await db.exec(`insert into public.attendee_submissions (id, receipt_number, full_name, email, consent, consent_email, website_language, quiz_answers, personality_type, story_identity, preference_scores)
  values ('66666666-6666-4666-8666-666666666666','KAP-261104-DDDD','Ravi K','ravi@example.com',true,false,'en','[]','x','{}','{}')`)
await db.exec('set role service_role')
const id6 = '66666666-6666-4666-8666-666666666666'
ok((await claim('ravi@example.com', 'KAP-261104-DDDD', id6)).outcome === 'no_consent', 'no email consent → no_consent')
c = await claim('ravi@example.com', 'KAP-261104-DDDD', id6, true)
ok(c.outcome === 'claimed', 'consent granted on receipt screen → claimed, consent recorded')
await db.exec('reset role')
await db.exec(`update public.attendee_submissions set email_status='failed', email_attempts=3 where id='${id6}'`)
await db.exec('set role service_role')
ok((await claim('ravi@example.com', 'KAP-261104-DDDD', id6)).outcome === 'limit_reached', '3 attempts used → limit_reached')
await db.exec('reset role')
await db.exec(`update public.attendee_submissions set email_attempts=0, created_at=now()-interval '25 hours' where id='${id6}'`)
await db.exec('set role service_role')
ok((await claim('ravi@example.com', 'KAP-261104-DDDD', id6)).outcome === 'expired', 'older than 24h → expired')
await db.exec('reset role')
await db.exec(`update public.attendee_submissions set created_at=now(), email_status='sending', email_claimed_at=now()-interval '3 minutes' where id='${id6}'`)
await db.exec('set role service_role')
ok((await claim('ravi@example.com', 'KAP-261104-DDDD', id6)).outcome === 'claimed', 'stuck "sending" past 2-minute lease → can be retried')

// per-recipient cap across rows
await db.exec('reset role')
for (let i = 0; i < 5; i++)
  await db.exec(`insert into public.attendee_submissions (id, receipt_number, full_name, email, consent, consent_email, website_language, quiz_answers, personality_type, story_identity, preference_scores)
    values ('77777777-7777-4777-8777-77777777777${i}','KAP-261104-EEE${'23456'[i]}','Spam Target','victim@example.com',true,true,'en','[]','x','{}','{}');
    update public.attendee_submissions set email_status='sent', email_sent_at=now() where id='77777777-7777-4777-8777-77777777777${i}'`)
await db.exec(`insert into public.attendee_submissions (id, receipt_number, full_name, email, consent, consent_email, website_language, quiz_answers, personality_type, story_identity, preference_scores)
  values ('88888888-8888-4888-8888-888888888888','KAP-261104-FFFF','Spam Target','victim@example.com',true,true,'en','[]','x','{}','{}')`)
await db.exec('set role service_role')
ok((await claim('victim@example.com', 'KAP-261104-FFFF', '88888888-8888-4888-8888-888888888888')).outcome === 'recipient_limit', '5 emails to one address in 24h → recipient_limit')
r = await tryq('select public.purge_old_submissions()')
ok(!r.error, 'service role can run retention purge')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
