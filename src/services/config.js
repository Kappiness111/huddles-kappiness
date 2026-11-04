// All external configuration comes from Vite env vars (see .env.example).
// Nothing secret belongs here: anything prefixed VITE_ ships to the browser.
// Secrets (Resend key, TMDB token, Supabase service role) live ONLY in Supabase Edge Function
// secrets — see supabase/functions/.

const env = import.meta.env
const trim = (s) => (s || '').replace(/\/$/, '')

const supabaseUrl = trim(env.VITE_SUPABASE_URL)
const functionsBase = supabaseUrl ? `${supabaseUrl}/functions/v1` : ''

export const config = {
  supabaseUrl,
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || '',

  // Google Books browser key (public by design; restrict it by HTTP referrer). Optional.
  googleBooksKey: env.VITE_GOOGLE_BOOKS_API_KEY || '',

  // TMDB goes through the `tmdb` Edge Function, which adds the secret token server-side.
  // Set VITE_TMDB_ENABLED=true once the function is deployed (or point VITE_TMDB_PROXY_URL elsewhere).
  tmdbProxyUrl: trim(env.VITE_TMDB_PROXY_URL) || (env.VITE_TMDB_ENABLED === 'true' && functionsBase ? `${functionsBase}/tmdb` : ''),
  // Local testing only — exposes the token to anyone who opens the site.
  tmdbDevToken: env.VITE_TMDB_READ_TOKEN || '',

  // Email goes through the `send-recommendation-email` Edge Function (Resend, server-side).
  emailEndpoint:
    trim(env.VITE_EMAIL_ENDPOINT) || (env.VITE_EMAIL_ENABLED === 'true' && functionsBase ? `${functionsBase}/send-recommendation-email` : ''),
}

export const isTmdbConfigured = Boolean(config.tmdbProxyUrl || config.tmdbDevToken)
export const isEmailConfigured = Boolean(config.emailEndpoint)
export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey)

/** Headers for calling our own Supabase Edge Functions (the anon key is public). */
export function functionHeaders(url) {
  const h = { 'Content-Type': 'application/json' }
  if (config.supabaseAnonKey && url.startsWith(config.supabaseUrl)) {
    h.apikey = config.supabaseAnonKey
    h.Authorization = `Bearer ${config.supabaseAnonKey}`
  }
  return h
}

/** fetch with a timeout, so a slow API at the stall never freezes the experience. */
export async function fetchJson(url, { timeout = 8000, ...init } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}
