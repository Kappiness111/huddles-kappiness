// Email delivery of the Story Receipt. The browser NEVER talks to Resend directly. It asks the
// `send-recommendation-email` Edge Function (supabase/functions/) to send the receipt for a
// submission that has ALREADY been saved. The function renders the email from that saved row,
// so a retry always sends exactly the receipt the visitor saw and never re-runs recommendations.
//
// The receipt wording is translated here from the locale files and saved with the submission
// (`email_copy`), so the email arrives in the visitor's chosen language without the backend
// needing its own translations.

import { isEmailConfigured } from './config.js'
import { getSupabase } from './supabaseClient.js'
import { translate } from '../i18n/index.jsx'
import { formatReceiptDate } from '../lib/receiptDate.js'

export const EMAIL_FUNCTION = 'send-recommendation-email'

/** Pure: the receipt + email wording in the visitor's language (stored as `email_copy`). */
export function buildEmailCopy({ attendee, uiLang, completedAt }) {
  const t = (k, v) => translate(uiLang, k, v)
  const first = attendee.name.split(' ')[0]
  return {
    subject: t('email.subject', { name: first }),
    preheader: t('email.preheader'),
    greeting: t('email.greeting', { name: first }),
    intro: t('email.intro'),
    // The same strings the on-screen receipt uses (Receipt.jsx).
    original: t('receipt.original'),
    title: t('receipt.title'),
    no: t('receipt.no'),
    nameLabel: t('receipt.name'),
    dateLabel: t('receipt.date'),
    date: formatReceiptDate(completedAt, uiLang),
    personality: t('receipt.personality'),
    read: t('receipt.read'),
    watch: t('receipt.watch'),
    inLang: t('receipt.inLang', { lang: '{lang}' }),
    message: t('receipt.message', { name: first }),
    tagline: t('receipt.footer'),
    thanks: t('receipt.thanks'),
    keep: t('receipt.keep'),
    previewBook: t('email.previewBook'),
    filmDetails: t('email.filmDetails'),
    signoff: t('email.signoff'),
    legal: t('email.footer'),
  }
}

/**
 * Ask the Edge Function to email the saved receipt.
 * @returns {Promise<{status: 'sent'|'not-configured'|'error'|'blocked', message?: string}>}
 *   'error' can be retried; 'blocked' cannot (limit reached, expired, mismatch...).
 */
export async function sendReceiptEmail({ submissionId, receiptNo, email, consentEmail }) {
  if (!isEmailConfigured) return { status: 'not-configured' }
  try {
    const supabase = await getSupabase()
    const { data, error } = await supabase.functions.invoke(EMAIL_FUNCTION, {
      body: { submissionId, receiptNo, email, consentEmail },
      timeout: 20000,
    })
    if (!error) return data?.ok ? { status: 'sent' } : { status: 'error', message: data?.error ?? 'unexpected response' }

    // Non-2xx: read the function's { error, retryable } body if there is one.
    let body = null
    try {
      body = await error.context?.json?.()
    } catch {
      /* not JSON */
    }
    const message = body?.error ?? error.message
    if (body?.error === 'not_configured') return { status: 'not-configured', message }
    return { status: body?.retryable === false ? 'blocked' : 'error', message }
  } catch (e) {
    return { status: 'error', message: e.message }
  }
}
