// The Supabase JS client, created on first use with the PUBLIC anon/publishable key only.
// Loaded lazily so the kiosk's first paint never waits on it, and not at all when Supabase isn't configured.
// No auth session is used or stored: the stall never signs in, and nothing goes into localStorage.

import { config, isSupabaseConfigured } from './config.js'

let clientPromise = null

/** @returns {Promise<import('@supabase/supabase-js').SupabaseClient | null>} */
export function getSupabase() {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  clientPromise ??= import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    )
    .catch((e) => {
      clientPromise = null // let a later call try again (e.g. a flaky stall network)
      throw e
    })
  return clientPromise
}
