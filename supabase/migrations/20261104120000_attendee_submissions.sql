-- Kappiness · Huddles: one row per completed experience, plus the state of its emailed Story Receipt.
-- Matches buildSubmission() in src/services/submissions.js.
-- Apply with `supabase db push` (or paste into the SQL editor). It is safe to re-run.

-- ── Table ───────────────────────────────────────────────────────────────────────────
create table if not exists public.attendee_submissions (
  id                  uuid primary key,                   -- the session id (generated in the browser)
  receipt_number      text not null unique check (receipt_number ~ '^KAP-[0-9]{6}-[2-9A-HJ-NP-Z]{4}$'),
  full_name           text not null check (char_length(full_name) between 2 and 80),
  email               text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  phone               text check (char_length(phone) <= 32),
  consent             boolean not null,                   -- data collection consent
  consent_email       boolean not null default false,     -- email delivery consent
  website_language    text not null check (char_length(website_language) <= 8),  -- en | ml | hi
  book_language       text check (char_length(book_language) <= 8),
  movie_language      text check (char_length(movie_language) <= 8),

  mind_lab_responses  jsonb not null default '{}'::jsonb, -- what was chosen; no scores, no labels
  mind_lab_completed  boolean not null default false,
  quiz_answers        jsonb not null check (jsonb_typeof(quiz_answers) = 'array'),  -- [{ question_id, choice }]
  personality_type    text not null,                      -- story identity id, e.g. 'quiet-dreamer'
  story_identity      jsonb not null,                     -- { id, title, tagline, description } as shown on the receipt
  preference_scores   jsonb not null,                     -- { genre: 0..1 } from the recommendation engine

  -- { id, source, title, original_title, author, year, language, language_name, genre, cover, link, isbn, description }
  recommended_book    jsonb,
  recommended_movie   jsonb,

  -- The receipt wording in the attendee's language, so the email reproduces the on-screen receipt exactly.
  email_copy          jsonb not null default '{}'::jsonb,

  completed_at        timestamptz,                        -- browser clock, informational only
  created_at          timestamptz not null default now(), -- server clock, forced by trigger below

  -- Email delivery state. Server-managed: the trigger resets these on insert and only the
  -- Edge Function (service role) can change them afterwards.
  email_status        text not null default 'pending' check (email_status in ('pending', 'sending', 'sent', 'failed')),
  email_attempts      integer not null default 0,
  email_claimed_at    timestamptz,
  email_sent_at       timestamptz,
  email_message_id    text,                               -- Resend email id
  email_last_error    text,

  -- Keep anonymous inserts small.
  constraint attendee_submissions_json_size check (
    pg_column_size(mind_lab_responses) < 4096 and pg_column_size(quiz_answers) < 4096 and
    pg_column_size(story_identity) < 4096 and pg_column_size(preference_scores) < 4096 and
    coalesce(pg_column_size(recommended_book), 0) < 8192 and coalesce(pg_column_size(recommended_movie), 0) < 8192 and
    pg_column_size(email_copy) < 8192
  )
);

create index if not exists attendee_submissions_created_at_idx on public.attendee_submissions (created_at);
create index if not exists attendee_submissions_email_sent_idx on public.attendee_submissions (email, email_sent_at);

-- ── Server-managed fields ───────────────────────────────────────────────────────────
-- Whatever the browser sends, the server decides the timestamp and the email state. This stops a
-- crafted insert from back/forward-dating a row (to dodge the 24h email window) or pre-marking it sent.
create or replace function public.attendee_submissions_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email            := lower(btrim(new.email));
  new.created_at       := now();
  new.email_status     := 'pending';
  new.email_attempts   := 0;
  new.email_claimed_at := null;
  new.email_sent_at    := null;
  new.email_message_id := null;
  new.email_last_error := null;
  return new;
end;
$$;

drop trigger if exists attendee_submissions_before_insert on public.attendee_submissions;
create trigger attendee_submissions_before_insert
  before insert on public.attendee_submissions
  for each row execute function public.attendee_submissions_before_insert();

-- ── Row Level Security ──────────────────────────────────────────────────────────────
-- The website uses the public anon/publishable key and may only INSERT, never read, update or
-- delete. So no visitor can see another visitor's record, and not even their own after submitting.
-- Staff read data in the Supabase dashboard. The Edge Function uses the service role key,
-- which exists ONLY as a function secret on Supabase's servers.
alter table public.attendee_submissions enable row level security;

revoke all on table public.attendee_submissions from anon, authenticated;
grant insert on table public.attendee_submissions to anon, authenticated;

drop policy if exists "stall can insert submissions" on public.attendee_submissions;
create policy "stall can insert submissions"
  on public.attendee_submissions
  for insert
  to anon, authenticated
  with check (consent = true);

-- ── Email delivery (called only by the send-recommendation-email Edge Function) ─────
-- Atomically verifies a send request and claims the row, so two requests at the same moment
-- (a double tap, an auto-send plus a manual tap) can never send two emails.
create or replace function public.claim_submission_email(
  p_id uuid,
  p_receipt_number text,
  p_email text,
  p_grant_consent boolean default false
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r public.attendee_submissions;
  max_attempts  constant integer  := 3;                     -- per submission (initial send + retries)
  max_age       constant interval := interval '24 hours';   -- emails only shortly after the visit
  lease         constant interval := interval '2 minutes';  -- a stuck 'sending' can be retried after this
  per_recipient constant integer  := 5;                     -- sent emails per address per 24h, across rows
  recent integer;
begin
  select * into r
    from public.attendee_submissions
   where id = p_id and receipt_number = p_receipt_number
     for update;

  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if r.email <> lower(btrim(coalesce(p_email, ''))) then return jsonb_build_object('outcome', 'email_mismatch'); end if;
  if r.email_status = 'sent' then return jsonb_build_object('outcome', 'already_sent'); end if;
  if r.email_status = 'sending' and r.email_claimed_at > now() - lease then
    return jsonb_build_object('outcome', 'in_progress');
  end if;
  if not (r.consent_email or coalesce(p_grant_consent, false)) then return jsonb_build_object('outcome', 'no_consent'); end if;
  if r.created_at < now() - max_age then return jsonb_build_object('outcome', 'expired'); end if;
  if r.email_attempts >= max_attempts then return jsonb_build_object('outcome', 'limit_reached'); end if;

  select count(*) into recent
    from public.attendee_submissions
   where email = r.email and email_sent_at > now() - interval '24 hours';
  if recent >= per_recipient then return jsonb_build_object('outcome', 'recipient_limit'); end if;

  update public.attendee_submissions
     set email_status     = 'sending',
         email_attempts   = email_attempts + 1,
         email_claimed_at = now(),
         consent_email    = true
   where id = p_id
  returning * into r;

  return jsonb_build_object(
    'outcome', 'claimed',
    'submission', jsonb_build_object(
      'id', r.id,
      'receipt_number', r.receipt_number,
      'full_name', r.full_name,
      'email', r.email,
      'website_language', r.website_language,
      'personality_type', r.personality_type,
      'story_identity', r.story_identity,
      'recommended_book', r.recommended_book,
      'recommended_movie', r.recommended_movie,
      'email_copy', r.email_copy,
      'email_attempts', r.email_attempts,
      'created_at', r.created_at
    )
  );
end;
$$;

-- Records the outcome of the attempt claimed above. It only applies to that exact attempt.
create or replace function public.finish_submission_email(
  p_id uuid,
  p_attempt integer,
  p_ok boolean,
  p_message_id text default null,
  p_error text default null
)
returns void
language sql
set search_path = ''
as $$
  update public.attendee_submissions
     set email_status     = case when p_ok then 'sent' else 'failed' end,
         email_sent_at    = case when p_ok then now() else email_sent_at end,
         email_message_id = case when p_ok then left(p_message_id, 200) else email_message_id end,
         email_last_error = case when p_ok then null else left(p_error, 500) end
   where id = p_id and email_status = 'sending' and email_attempts = p_attempt;
$$;

revoke all on function public.claim_submission_email(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.finish_submission_email(uuid, integer, boolean, text, text) from public, anon, authenticated;
grant execute on function public.claim_submission_email(uuid, text, text, boolean) to service_role;
grant execute on function public.finish_submission_email(uuid, integer, boolean, text, text) to service_role;
revoke all on function public.attendee_submissions_before_insert() from public, anon, authenticated;

-- ── Retention ───────────────────────────────────────────────────────────────────────
-- Personal data is kept for 90 days after the event, then deleted automatically.
create or replace function public.purge_old_submissions(retain interval default interval '90 days')
returns integer
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.attendee_submissions where created_at < now() - retain returning 1
  )
  select count(*)::int from gone;
$$;
revoke all on function public.purge_old_submissions(interval) from public, anon, authenticated;

-- Schedule it daily (enable the pg_cron extension in Database → Extensions first):
-- select cron.schedule('purge-kappiness-submissions', '15 3 * * *', $$select public.purge_old_submissions()$$);

-- To honour an individual deletion request:
-- delete from public.attendee_submissions where email = lower('person@example.com');
