// Supabase Edge Function (Deno) — a narrow TMDB proxy so the TMDB token never reaches the browser.
//
// Secrets: TMDB_READ_TOKEN (TMDB "API Read Access Token"), ALLOWED_ORIGIN (optional, for CORS).
// The frontend calls {SUPABASE_URL}/functions/v1/tmdb/<path>?<query>.
// Only the four read-only endpoints the app needs are forwarded.

const ALLOWED = /^\/(discover\/movie|search\/movie|genre\/movie\/list|movie\/\d+)$/

const env = (k) => Deno.env.get(k) ?? ''
const cors = () => ({
  'Access-Control-Allow-Origin': env('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() })
  if (req.method !== 'GET') return new Response('method not allowed', { status: 405, headers: cors() })
  if (!env('TMDB_READ_TOKEN')) return new Response('tmdb not configured', { status: 500, headers: cors() })

  const url = new URL(req.url)
  const path = url.pathname.replace(/^.*\/tmdb/, '') || '/'
  if (!ALLOWED.test(path)) return new Response('not allowed', { status: 403, headers: cors() })

  const qs = new URLSearchParams(url.search)
  qs.delete('api_key')
  qs.set('include_adult', 'false')

  const res = await fetch(`https://api.themoviedb.org/3${path}?${qs}`, {
    headers: { Authorization: `Bearer ${env('TMDB_READ_TOKEN')}`, accept: 'application/json' },
  })
  return new Response(res.body, {
    status: res.status,
    headers: { ...cors(), 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  })
})
