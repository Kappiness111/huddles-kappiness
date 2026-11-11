-- Kappiness · Huddles: lets every phone see which books and films were handed out recently, so the
-- next visitor is steered to a different, equally good story instead of everyone getting the same one.
-- Apply with `supabase db push` (or paste into the SQL editor). It is safe to re-run.
--
-- Returns titles and story-identity ids only ({ "book": [...], "movie": [...], "identity": [...] },
-- most recent first). No names, emails, ids or timestamps leave the table, so the anon key still
-- cannot read anything about a visitor.

create or replace function public.recent_recommendations(p_limit integer default 60)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with lim as (select least(greatest(coalesce(p_limit, 60), 1), 100) as n)
  select jsonb_build_object(
    'book', coalesce((
      select jsonb_agg(t) from (
        select recommended_book ->> 'title' as t
          from public.attendee_submissions
         where recommended_book ? 'title' and created_at > now() - interval '30 days'
         order by created_at desc
         limit (select n from lim)
      ) b), '[]'::jsonb),
    'movie', coalesce((
      select jsonb_agg(t) from (
        select recommended_movie ->> 'title' as t
          from public.attendee_submissions
         where recommended_movie ? 'title' and created_at > now() - interval '30 days'
         order by created_at desc
         limit (select n from lim)
      ) m), '[]'::jsonb),
    -- The last few story identities, so the next visitor gets a different one.
    'identity', coalesce((
      select jsonb_agg(t) from (
        select personality_type as t
          from public.attendee_submissions
         where created_at > now() - interval '30 days'
         order by created_at desc
         limit 6
      ) i), '[]'::jsonb)
  );
$$;

revoke all on function public.recent_recommendations(integer) from public, anon, authenticated;
grant execute on function public.recent_recommendations(integer) to anon, authenticated, service_role;
