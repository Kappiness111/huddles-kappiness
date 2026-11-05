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
  { id: 'p3', options: ['a', 'b', 'c', 'd'], considered: 'b' },
  { id: 'p4', options: ['a', 'b', 'c', 'd'], considered: 'c' },
  { id: 'p5', options: ['a', 'b', 'c', 'd'], considered: 'd' },
  { id: 'p6', options: ['a', 'b', 'c', 'd'], considered: 'b' },
  { id: 'p7', options: ['a', 'b', 'c', 'd'], considered: 'c' },
  { id: 'p8', options: ['a', 'b', 'c', 'd'], considered: 'a' },
  { id: 'p9', options: ['a', 'b', 'c', 'd'], considered: 'c' },
  { id: 'p10', options: ['a', 'b', 'c', 'd'], considered: 'b' },
  { id: 'p11', options: ['a', 'b', 'c', 'd'], considered: 'c' },
  { id: 'p12', options: ['a', 'b', 'c', 'd'], considered: 'd' },
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
  { id: 'n9', seq: [7, 14, 21, 28, 35], rule: (s) => s.at(-1) + (s.at(-1) - s.at(-2)), options: [40, 42, 45, 49] },
  { id: 'n10', seq: [1, 8, 27, 64, 125], rule: (s) => (s.length + 1) ** 3, options: [150, 196, 216, 225] },
  { id: 'n11', seq: [100, 91, 82, 73, 64], rule: (s) => s.at(-1) + (s.at(-1) - s.at(-2)), options: [53, 55, 56, 57] },
  { id: 'n12', seq: [1, 3, 9, 27, 81], rule: (s) => s.at(-1) * 3, options: [162, 189, 243, 324] },
  { id: 'n13', seq: [1, 4, 2, 5, 3, 6], rule: (s) => s.at(-1) + (s.length % 2 === 1 ? 3 : -2), options: [4, 7, 8, 9] },
  { id: 'n14', seq: [96, 48, 24, 12, 6], rule: (s) => s.at(-1) / 2, options: [2, 3, 4, 6] },
  { id: 'n15', seq: [1, 1, 2, 4, 7, 13], rule: (s) => s.slice(-3).reduce((a, b) => a + b, 0), options: [20, 22, 24, 26] },
  { id: 'n16', seq: [2, 10, 4, 20, 6, 30], rule: (s) => s.at(-2) + (s.length % 2 === 0 ? 2 : 10), options: [8, 12, 36, 40] },
  { id: 'n17', seq: [3, 6, 8, 16, 18, 36], rule: (s) => (s.length % 2 === 1 ? s.at(-1) * 2 : s.at(-1) + 2), options: [38, 40, 54, 72] },
  { id: 'n18', seq: [1, 2, 6, 15, 31], rule: (s) => s.at(-1) + s.length ** 2, options: [47, 52, 56, 63] },
]
export const patternAnswer = (p) => p.rule(p.seq)

/** Challenge 3 · The Decision Room. Subjective: no universal right answer. */
export const DECISION_BANK = [
  { id: 'd1', options: ['a', 'b', 'c', 'd'] },
  { id: 'd2', options: ['a', 'b', 'c', 'd'] },
  { id: 'd3', options: ['a', 'b', 'c', 'd'] },
  { id: 'd4', options: ['a', 'b', 'c', 'd'] },
  { id: 'd5', options: ['a', 'b', 'c', 'd'] },
  { id: 'd6', options: ['a', 'b', 'c', 'd'] },
  { id: 'd7', options: ['a', 'b', 'c', 'd'] },
  { id: 'd8', options: ['a', 'b', 'c', 'd'] },
  { id: 'd9', options: ['a', 'b', 'c', 'd'] },
  { id: 'd10', options: ['a', 'b', 'c', 'd'] },
  { id: 'd11', options: ['a', 'b', 'c', 'd'] },
  { id: 'd12', options: ['a', 'b', 'c', 'd'] },
]

export const CHALLENGES = ['perspective', 'pattern', 'decision']

const BANKS = { perspective: PERSPECTIVE_BANK, pattern: PATTERN_BANK, decision: DECISION_BANK }

// Final avalanche step (MurmurHash3 fmix32) so the three salted hashes are independent of each other.
function mix(h) {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/**
 * Per-visitor selection: one item from each bank. The seed is a fresh random UUID, so every
 * visitor (on any phone) gets an independent pick. Each bank is hashed with its own salt so the
 * three picks don't move together. `previous` is the last visitor's picks on this device: those
 * items are skipped, so back-to-back visitors at the stall never see the same question.
 * lib/mindLabSession.js keeps the result for the whole visit, including across a page refresh.
 */
export function pickMindLab(sessionId, previous = {}) {
  return Object.fromEntries(
    CHALLENGES.map((kind) => {
      const bank = BANKS[kind]
      const pool = bank.length > 1 ? bank.filter((x) => x.id !== previous[kind]) : bank
      return [kind, pool[mix(hashString(`${kind}:${sessionId}`)) % pool.length].id]
    }),
  )
}

export const findPattern = (id) => PATTERN_BANK.find((p) => p.id === id)
export const findPerspective = (id) => PERSPECTIVE_BANK.find((p) => p.id === id)
export const findDecision = (id) => DECISION_BANK.find((p) => p.id === id)
