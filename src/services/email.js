// Email delivery. The browser NEVER talks to Resend directly — it POSTs to the
// `send-recommendation-email` Edge Function (supabase/functions/), which verifies the request
// against the stored submission, renders the email and sends it with Resend.
//
// All email wording is translated here from the locale files (`email.*`), so the email arrives in
// the attendee's chosen language without the backend needing its own translations.

import { config, functionHeaders, isEmailConfigured } from './config.js'
import { translate } from '../i18n/index.jsx'
import { LANGUAGE_NATIVE } from '../i18n/languages.js'

const pick = (x) =>
  x && {
    title: x.title,
    originalTitle: x.originalTitle ?? x.nativeTitle ?? null,
    author: x.author ?? null,
    year: x.year ?? null,
    language: x.language,
    languageName: LANGUAGE_NATIVE[x.language] ?? x.language,
    description: x.description ?? '',
    // The Edge Function whitelists image hosts, and maps bundled /media/... covers onto SITE_URL.
    cover: x.cover ?? null,
    link: x.link ?? null,
    source: x.source,
  }

export function buildEmailPayload({ attendee, uiLang, receiptNo, sessionId, result, picks }) {
  const t = (k, v) => translate(uiLang, k, v)
  const first = attendee.name.split(' ')[0]
  const p = result.personality
  return {
    submissionId: sessionId,
    receiptNo,
    to: attendee.email,
    consentEmail: attendee.consentEmail,
    language: uiLang,
    personality: { id: p.id, ...translate(uiLang, `personalities.${p.id}`) },
    book: pick(picks.book),
    movie: pick(picks.movie),
    copy: {
      subject: t('email.subject', { name: first }),
      preheader: t('email.preheader'),
      greeting: t('email.greeting', { name: first }),
      intro: t('email.intro'),
      identity: t('email.identity'),
      read: t('email.read'),
      watch: t('email.watch'),
      by: t('email.by', { author: '{author}' }),
      inLang: t('email.inLang', { lang: '{lang}' }),
      previewBook: t('email.previewBook'),
      filmDetails: t('email.filmDetails'),
      closing: t('email.closing'),
      signoff: t('email.signoff'),
      footer: t('email.footer'),
    },
  }
}

/** @returns {Promise<{status: 'sent'|'not-configured'|'error', message?: string}>} */
export async function sendRecommendationEmail(payload) {
  if (!isEmailConfigured) return { status: 'not-configured' }
  try {
    const res = await fetch(config.emailEndpoint, {
      method: 'POST',
      headers: functionHeaders(config.emailEndpoint),
      body: JSON.stringify(payload),
    })
    if (!res.ok) return { status: 'error', message: `${res.status} ${await res.text().catch(() => '')}` }
    return { status: 'sent' }
  } catch (e) {
    return { status: 'error', message: e.message }
  }
}
