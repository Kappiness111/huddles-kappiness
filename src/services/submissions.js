// Attendee submission data model + Supabase adapter.
// The stall uses the PUBLIC anon/publishable key, and row-level security (supabase/migrations/)
// lets it INSERT only. It can never read any record back. Without Supabase env vars nothing is
// stored anywhere (not even localStorage) and the app says so instead of pretending.

import { QUIZ } from '../data/quiz.js'
import { translate } from '../i18n/index.jsx'
import { LANGUAGE_NATIVE } from '../i18n/languages.js'
import { isSupabaseConfigured } from './config.js'
import { getSupabase } from './supabaseClient.js'
import { buildEmailCopy } from './email.js'

export const SUBMISSIONS_TABLE = 'attendee_submissions'

/** One recommendation exactly as the receipt shows it (cover/poster, original title, genre…). */
const recRecord = (x) =>
  x && {
    id: x.id,
    source: x.source,
    title: x.title,
    // Same rule as Receipt.jsx's <Pick>.
    original_title: x.nativeTitle ?? (x.originalTitle && x.originalTitle !== x.title ? x.originalTitle : null),
    author: x.author ?? null,
    year: x.year ?? null,
    language: x.language,
    language_name: LANGUAGE_NATIVE[x.language] ?? x.language,
    genre: x.genreLabel || null,
    format: x.format ?? null, // 'film' | 'series' for watch picks
    cover: x.cover ?? null, // https URL from Google Books / Open Library / TMDB, or the bundled /media/... path
    link: x.link ?? null,
    isbn: x.isbn ?? null,
    description: x.description ? String(x.description).slice(0, 1200) : null,
  }

/** Pure: builds one attendee's record from the experience state. */
export function buildSubmission(state) {
  const { sessionId, receiptNo, completedAt, attendee, uiLang, prefs, mindLab, quizAnswers, result, picks } = state
  const p = result.personality
  return {
    id: sessionId,
    receipt_number: receiptNo,
    full_name: attendee.name.trim(),
    email: attendee.email.trim().toLowerCase(),
    phone: attendee.phone.trim() || null,
    consent: attendee.consentData,
    consent_email: attendee.consentEmail,
    website_language: uiLang,
    book_language: prefs.book,
    movie_language: prefs.movie,
    // What was chosen in each Mind Lab scenario: { inner: { id, choice }, … }
    mind_lab_responses: mindLab?.responses ?? {},
    mind_lab_completed: Boolean(mindLab?.completed),
    quiz_answers: QUIZ.filter((q) => quizAnswers[q.id]).map((q) => ({ question_id: q.id, choice: quizAnswers[q.id] })),
    personality_type: p.id,
    story_identity: {
      id: p.id,
      title: translate(uiLang, `personalities.${p.id}.title`),
      tagline: translate(uiLang, `personalities.${p.id}.tagline`),
      description: translate(uiLang, `personalities.${p.id}.description`),
    },
    preference_scores: Object.fromEntries(Object.entries(result.profile.genres).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
    recommended_book: recRecord(picks.book),
    recommended_movie: recRecord(picks.movie),
    email_copy: buildEmailCopy({ attendee, uiLang, completedAt }),
    completed_at: completedAt, // created_at is set by the database
  }
}

/**
 * @returns {Promise<{status: 'saved'|'not-configured'|'receipt-taken'|'error', message?: string}>}
 *   'receipt-taken': another visitor already has this receipt number; issue a new one and save again.
 */
export async function saveSubmission(record) {
  if (!isSupabaseConfigured) return { status: 'not-configured' }
  try {
    const supabase = await getSupabase()
    // No .select(): the anon role may insert but never read rows back.
    const { error } = await supabase.from(SUBMISSIONS_TABLE).insert(record)
    if (!error) return { status: 'saved' }
    if (error.code === '23505') {
      // Unique violation. On the receipt number it's a different visitor's row; on the primary key
      // it's this exact session, already saved by an earlier attempt whose response was lost.
      if (/receipt_number/.test(`${error.message} ${error.details ?? ''}`)) return { status: 'receipt-taken' }
      return { status: 'saved' }
    }
    return { status: 'error', message: `${error.code ?? ''} ${error.message}`.trim() }
  } catch (e) {
    return { status: 'error', message: e.message }
  }
}
