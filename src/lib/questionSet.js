// Assigns each visitor one predefined question set (A, B, C, …).
//
// Every phone that scans the QR code runs its own copy of the app, so the choice is made locally
// with a cryptographically random pick — visitors starting at the same moment are spread across
// the sets rather than all receiving the same one. (Without a shared server counter two phones can
// still land on the same set by chance; it can never be the same for everyone.)
//
// Only the set letter is kept in this tab's sessionStorage, so a refresh keeps the same questions.
// No personal data is stored.

import { SET_IDS } from '../data/quiz.js'

const KEY = 'kappiness.quizSet'

function randomIndex(n) {
  const b = new Uint32Array(1)
  crypto.getRandomValues(b)
  return b[0] % n
}

/** The set for this tab's current visitor: the stored one, or a new random pick. */
export function currentQuizSet() {
  try {
    const stored = sessionStorage.getItem(KEY)
    if (SET_IDS.includes(stored)) return stored
  } catch {
    /* storage blocked — fall through to a fresh pick */
  }
  return nextQuizSet()
}

/** A new visitor: pick a set different from `previous` (so back-to-back visitors differ). */
export function nextQuizSet(previous) {
  const pool = SET_IDS.filter((s) => s !== previous)
  const set = pool[randomIndex(pool.length)]
  try {
    sessionStorage.setItem(KEY, set)
  } catch {
    /* storage blocked — the set still lasts for the in-memory session */
  }
  return set
}
