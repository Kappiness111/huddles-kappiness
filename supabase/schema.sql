-- Kappiness · Huddles — one row per completed experience.
-- Matches buildSubmission() in src/services/submissions.js. Run in the Supabase SQL editor.

create table if not exists public.attendee_submissions (
  id                    uuid primary key,              -- the session id
  receipt_number        text not null unique,
  full_name             text not null check (char_length(full_name) between 2 and 80),
  email                 text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  phone                 text,
  consent               boolean not null,              -- data collection consent
  consent_email         boolean not null default false, -- recommendation email consent
  website_language      text not null,                 -- en | ml | hi
  book_language         text,
  movie_language        text,
  mind_lab_responses    jsonb not null default '{}'::jsonb, -- what was chosen; no scores, no labels
  mind_lab_completed    boolean not null default false,
  quiz_answers          jsonb not null,                -- [{ question_id, choice }]
  personality_type      text not null,
  preference_scores     jsonb not null,                -- { genre: 0..1 }
  recommended_book      jsonb,                         -- { id, source, title, original_title, author, year, language, isbn, link }
  recommended_movie     jsonb,                         -- { id, source, title, original_title, year, language, link }
  email_send_count      integer not null default 0,    -- maintained by the email Edge Function
  email_sent_at         timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists attendee_submissions_created_at_idx on public.attendee_submissions (created_at);

-- ── Row Level Security ──────────────────────────────────────────────────────────────
-- The stall uses the public anon key and may only INSERT, never read, update or delete.
-- So no attendee can ever see another attendee's record. Staff read data in the dashboard;
-- Edge Functions use the service role key, which exists ONLY as a function secret.
alter table public.attendee_submissions enable row level security;

drop policy if exists "stall can insert submissions" on public.attendee_submissions;
create policy "stall can insert submissions"
  on public.attendee_submissions
  for insert
  to anon
  with check (consent = true and email_send_count = 0 and email_sent_at is null);

revoke select, update, delete on public.attendee_submissions from anon, authenticated;

-- ── Retention ───────────────────────────────────────────────────────────────────────
-- Personal data is kept for 90 days after the event, then deleted automatically.
create or replace function public.purge_old_submissions(retain interval default interval '90 days')
returns integer
language sql
security definer
set search_path = public
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
-- delete from public.attendee_submissions where lower(email) = lower('person@example.com');
