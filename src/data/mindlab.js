// THE MIND LAB — the only thinking game: exactly three short challenges.
// Text (questions, options, feedback, explanations) lives in the locale files under `mindlab.*`.
//
// It is kept SEPARATE from the This-or-That preference scoring: nothing here feeds the
// recommendations, no score or label is shown, and responses are stored only as what was chosen.
import { hashString } from '../lib/ids.js'

/** Challenge 1 · A Different Perspective. No option is "wrong"; `considered` marks the
 *  response that best avoids assumptions, and every option has its own reflective note. */
export const PERSPECTIVE_BANK = [
  { id: 'p1', options: ['a', 'b', 'c', 'd'], considered: 'b' },
  { id: 'p2', options: ['a', 'b', 'c', 'd'], considered: 'b' },
]

/** Challenge 2 · Pattern Recognition. Each puzzle states its rule as a function, so the answer is
 *  computed — never typed by hand — and `scripts/verify-mindlab.mjs` checks it against the options. */
export const PATTERN_BANK = [
  { id: 'n1', seq: [2, 6, 12, 20, 30], rule: (s) => s.at(-1) + (s.at(-1) - s.at(-2) + 2), options: [36, 40, 42, 48] },
  { id: 'n2', seq: [3, 5, 9, 17, 33], rule: (s) => 2 * s.at(-1) - 1, options: [49, 57, 65, 66] },
  { id: 'n3', seq: [1, 1, 2, 3, 5, 8], rule: (s) => s.at(-1) + s.at(-2), options: [11, 12, 13, 15] },
  { id: 'n4', seq: [1, 4, 9, 16, 25], rule: (s) => (s.length + 1) ** 2, options: [30, 34, 36, 49] },
  { id: 'n5', seq: [2, 3, 5, 7, 11, 13], rule: () => 17, options: [15, 17, 19, 21] },
  { id: 'n6', seq: [4, 9, 19, 39, 79], rule: (s) => 2 * s.at(-1) + 1, options: [119, 158, 159, 160] },
  { id: 'n7', seq: [1, 2, 6, 24, 120], rule: (s) => s.at(-1) * (s.length + 1), options: [240, 600, 720, 840] },
  { id: 'n8', seq: [7, 10, 16, 25, 37], rule: (s) => s.at(-1) + (s.at(-1) - s.at(-2) + 3), options: [49, 50, 52, 55] },
]
export const patternAnswer = (p) => p.rule(p.seq)

/** Challenge 3 · The Decision Room. Subjective: no universal right answer. */
export const DECISION_BANK = [
  { id: 'd1', options: ['a', 'b', 'c', 'd'] },
  { id: 'd2', options: ['a', 'b', 'c', 'd'] },
]

export const CHALLENGES = ['perspective', 'pattern', 'decision']

/** Deterministic per-session selection: one item from each bank. */
export function pickMindLab(sessionId) {
  const h = hashString(sessionId)
  return {
    perspective: PERSPECTIVE_BANK[h % PERSPECTIVE_BANK.length].id,
    pattern: PATTERN_BANK[(h >>> 4) % PATTERN_BANK.length].id,
    decision: DECISION_BANK[(h >>> 9) % DECISION_BANK.length].id,
  }
}

export const findPattern = (id) => PATTERN_BANK.find((p) => p.id === id)
export const findPerspective = (id) => PERSPECTIVE_BANK.find((p) => p.id === id)
export const findDecision = (id) => DECISION_BANK.find((p) => p.id === id)
