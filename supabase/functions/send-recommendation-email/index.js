
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

      // Email content
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,

      // Visitor and receipt details
      submissionId: msg.submissionId,
      receiptNo: msg.receiptNo,
      name: msg.name,
      phone: msg.phone,
      date: msg.date,
      story: msg.story,
      storyIdentity: msg.storyIdentity,
      recommendedBook: msg.recommendedBook,
      recommendedMovie: msg.recommendedMovie,

      // Duplicate protection
      idempotencyKey: msg.idempotencyKey,
    }),
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.error || `Apps Script request failed: ${response.status}`,
    )
  }

  return {
    ok: true,
    id: msg.idempotencyKey,
  }
}

Deno.serve(
  createHandler({
    env,
    claim: (args) => rpc('claim_submission_email', args),
    finish: (args) => rpc('finish_submission_email', args),
    sendEmail: sendWithAppsScript,
  }),
)
