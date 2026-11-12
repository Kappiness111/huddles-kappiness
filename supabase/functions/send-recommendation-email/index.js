// Supabase Edge Function (Deno): emails the visitor their saved Story Receipt.
//
// Providers (see delivery.js): the Gmail API (gmail.js) and the original Google Apps Script
// Web App (apps-script.js). EMAIL_PROVIDER picks one; unset keeps the original Apps Script path.
// The claim/finish database functions (duplicate protection, attempt limits, 24h window) are unchanged.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (automatic), APPS_SCRIPT_URL, APPS_SCRIPT_SECRET,
// APPS_SCRIPT_LOG_URL, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER,
// GMAIL_SENDER_NAME, EMAIL_REPLY_TO, EMAIL_PROVIDER, EMAIL_FALLBACK, GMAIL_DAILY_CAP, SITE_URL,
// ALLOWED_ORIGIN.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createHandler } from './handler.js'
import { createGmailSender } from './gmail.js'
import { createAppsScript } from './apps-script.js'
import { createDelivery, GMAIL_ID_PREFIX } from './delivery.js'

const env = (key) => Deno.env.get(key) ?? ''

const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const rpc = async (fn, args) => {
  const { data, error } = await db.rpc(fn, args)

  if (error) {
    throw new Error(`${fn}: ${error.message}`)
  }

  return data
}

/** Gmail API sends recorded as sent in the last 24 hours (persistent, across all function instances). */
async function gmailSentLast24h() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await db
    .from('attendee_submissions')
    .select('id', { count: 'exact', head: true })
    .gte('email_sent_at', since)
    .like('email_message_id', `${GMAIL_ID_PREFIX}%`)
  if (error) throw new Error(error.message)
  return count ?? 0
}

const delivery = createDelivery({
  env,
  gmail: createGmailSender({ env }),
  appsScript: createAppsScript({ env }),
  gmailSentLast24h,
})

Deno.serve(
  createHandler({
    env,
    claim: (args) => rpc('claim_submission_email', args),
    finish: (args) => rpc('finish_submission_email', args),
    sendEmail: delivery.send,
    afterSend: delivery.afterSend,
    configured: delivery.configured,
  }),
)
