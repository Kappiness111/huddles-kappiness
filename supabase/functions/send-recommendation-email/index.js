
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createHandler } from './handler.js'

const env = (key) => Deno.env.get(key) ?? ''

const db = createClient(
  env('SUPABASE_URL'),
  env('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
)

const rpc = async (fn, args) => {
  const { data, error } = await db.rpc(fn, args)

  if (error) {
    throw new Error(`${fn}: ${error.message}`)
  }

  return data
}

// Send the prepared receipt email through Google Apps Script.
const sendWithAppsScript = async (msg) => {
  const scriptUrl = env('APPS_SCRIPT_URL')
  const secret = env('APPS_SCRIPT_SECRET')

  if (!scriptUrl || !secret) {
    throw new Error('Google Apps Script configuration is missing')
  }

  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: secret,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      idempotencyKey: msg.idempotencyKey,
    }),
  })

  const result = await response.json()

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.error || 'Google Apps Script failed to send the email',
    )
  }

  return result
}

Deno.serve(
  createHandler({
    env,
    claim: (args) => rpc('claim_submission_email', args),
    finish: (args) => rpc('finish_submission_email', args),
    sendEmail: sendWithAppsScript,
  }),
)
