// Assigns each visitor their own mix of This-or-That questions: for each of the 10 slots, one
// question from one of the 8 parallel sets (see questionsFor in data/quiz.js).
//
// Every phone that scans the QR code runs its own copy of the app, so the choice is made locally
// with a cryptographically random pick — visitors starting at the same moment are spread across
// the sets rather than all receiving the same one. (Without a shared server counter two phones can
// still land on the same set by chance; it can never be the same for everyone.)
//
// Only the set letter is kept in this tab's sessionStorage, so a refresh keeps the same questions.
// No personal data is stored.

import { SET_IDS, SLOT_COUNT, isQuizCode } from '../data/quiz.js'

const KEY = 'kappiness.quizSet'

function randomIndex(n) {
  const b = new Uint32Array(1)
  crypto.getRandomValues(b)
  return b[0] % n
}

/** The mix for this tab's current visitor: the stored one (after a refresh), or a new random mix. */
export function currentQuizSet() {
  try {
    const stored = sessionStorage.getItem(KEY)
    if (isQuizCode(stored) && stored.length === SLOT_COUNT) return stored
  } catch {
    /* storage blocked — fall through to a fresh pick */
  }
  return nextQuizSet()
}

/**
 * A new visitor: a fresh random mix. Every slot avoids the previous visitor's question, so
 * back-to-back visitors on this device never share a single question.
 */
export function nextQuizSet(previous = '') {
  const prev = previous.length === 1 ? previous.repeat(SLOT_COUNT) : previous
  const set = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const pool = SET_IDS.filter((s) => s !== prev[i])
    return pool[randomIndex(pool.length)]
  }).join('')
  try {
    sessionStorage.setItem(KEY, set)
  } catch {
    /* storage blocked — the set still lasts for the in-memory session */
  }
  return set
}
