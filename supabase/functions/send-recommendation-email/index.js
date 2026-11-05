// Supabase Edge Function (Deno): emails the visitor their saved Story Receipt with Resend.
//
// Secrets (set with `supabase secrets set ...`, never in the frontend):
//   RESEND_API_KEY   Resend API key
//   RESEND_FROM      e.g. "Kappiness <stories@your-domain.com>" (a domain verified in Resend)
//   SITE_URL         public site URL incl. base path, for the logo and bundled covers,
//                    e.g. https://kappiness111.github.io/huddles-kappiness
//   ALLOWED_ORIGIN   optional, comma-separated site origins for CORS (default "*")
//   RESEND_REPLY_TO  optional reply-to address (deletion requests arrive here)
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Request:  POST { submissionId, receiptNo, email, consentEmail }
// Response: { ok: true, status: 'sent' | 'already_sent' }  or  { ok: false, error, retryable }
// Abuse protection lives in the database function claim_submission_email(). See the migration.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createHandler, sendWithResend } from './handler.js'

const env = (k) => Deno.env.get(k) ?? ''

const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

const rpc = async (fn, args) => {
  const { data, error } = await db.rpc(fn, args)
  if (error) throw new Error(`${fn}: ${error.message}`)
  return data
}

Deno.serve(
  createHandler({
    env,
    claim: (args) => rpc('claim_submission_email', args),
    finish: (args) => rpc('finish_submission_email', args),
    sendEmail: (msg) => sendWithResend(env('RESEND_API_KEY'), msg),
  }),
)
