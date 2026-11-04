// Attendee submission data model + Supabase adapter.
// The stall uses the PUBLIC anon key, and row-level security (supabase/schema.sql) lets it INSERT
// only — it can never read any record back. Without Supabase env vars nothing is stored anywhere
// (not even localStorage) and the app says so instead of pretending.

import { QUIZ } from '../data/quiz.js'
import { config, isSupabaseConfigured } from './config.js'

export const SUBMISSIONS_TABLE = 'attendee_submissions'

const recRecord = (x) =>
  x && {
    id: x.id,
    source: x.source,
    title: x.title,
    original_title: x.originalTitle ?? x.nativeTitle ?? null,
    author: x.author ?? null,
    year: x.year ?? null,
    language: x.language,
    isbn: x.isbn ?? null,
    link: x.link ?? null,
  }

/** Pure: builds one attendee's record from the experience state. */
export function buildSubmission(state) {
  const { sessionId, receiptNo, completedAt, attendee, uiLang, prefs, mindLab, quizAnswers, result, picks } = state
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
    // What was chosen in each challenge — no scores, no labels.
    mind_lab_responses: mindLab.responses,
    mind_lab_completed: mindLab.completed,
    quiz_answers: QUIZ.filter((q) => quizAnswers[q.id]).map((q) => ({ question_id: q.id, choice: quizAnswers[q.id] })),
    personality_type: result.personality.id,
    preference_scores: Object.fromEntries(Object.entries(result.profile.genres).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
    recommended_book: recRecord(picks.book),
    recommended_movie: recRecord(picks.movie),
    created_at: completedAt,
  }
}

/** @returns {Promise<{status: 'saved'|'not-configured'|'error', message?: string}>} */
export async function saveSubmission(record) {
  if (!isSupabaseConfigured) return { status: 'not-configured' }
  try {
    const res = await fetch(`${config.supabaseUrl}/rest/v1/${SUBMISSIONS_TABLE}`, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(record),
    })
    if (!res.ok) return { status: 'error', message: `${res.status} ${await res.text()}` }
    return { status: 'saved' }
  } catch (e) {
    return { status: 'error', message: e.message }
  }
}
