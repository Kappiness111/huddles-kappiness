// This or That — the ONLY preference quiz. Text lives in the locale files under `quiz.<id>`.
// Each option adds weight to genre dimensions and storytelling traits.
// `motif` picks the abstract editorial line-art drawn behind the option (see Motif.jsx).
//
// Several predefined QUESTION SETS exist so visitors at the stall don't all see the same
// questions. Every set is a parallel form: question k of each set asks a different scenario but
// measures the same contrast with the SAME weights as slot k below, so any set produces a
// profile the recommendation engine scores identically.

const SLOTS = [
  {
    // 1. Emotional depth vs a new perspective
    a: { motif: 'ripple', genres: { drama: 3, relationships: 2, romance: 1 }, traits: { heart: 2 } },
    b: { motif: 'prism', genres: { psychological: 2, philosophy: 2, scifi: 1 }, traits: { mind: 2 } },
  },
  {
    // 2. Beautiful prose vs challenging ideas
    a: { motif: 'page', genres: { literary: 3, romance: 1, historical: 1 }, traits: { calm: 1, dreamy: 1 } },
    b: { motif: 'lattice', genres: { philosophy: 3, scifi: 1, psychological: 1 }, traits: { mind: 2 } },
  },
  {
    // 3. Relationships vs psychology
    a: { motif: 'orbit', genres: { relationships: 3, romance: 2, drama: 1 }, traits: { heart: 2 } },
    b: { motif: 'maze', genres: { psychological: 3, mystery: 1, thriller: 1 }, traits: { mind: 1, grounded: 1 } },
  },
  {
    // 4. Character drama vs psychological thriller
    a: { motif: 'portrait', genres: { drama: 3, literary: 1, contemporary: 1 }, traits: { heart: 1, grounded: 1 } },
    b: { motif: 'spiral', genres: { thriller: 3, psychological: 2, mystery: 2 }, traits: { bold: 1, mind: 1 } },
    interlude: 'i1',
  },
  {
    // 5. The past vs the future
    a: { motif: 'arch', genres: { historical: 3, literary: 1, romance: 1 }, traits: { calm: 1, grounded: 1 } },
    b: { motif: 'horizon', genres: { scifi: 3, adventure: 1, philosophy: 1 }, traits: { dreamy: 1, bold: 1 } },
  },
  {
    // 6. Realism vs imagination
    a: { motif: 'window', genres: { contemporary: 3, drama: 1, relationships: 1 }, traits: { grounded: 2 } },
    b: { motif: 'moon', genres: { fantasy: 3, scifi: 1, adventure: 1 }, traits: { dreamy: 2 } },
  },
  {
    // 7. Slow and layered vs fast and unpredictable
    a: { motif: 'layers', genres: { literary: 2, historical: 1, drama: 1, selfDiscovery: 1 }, traits: { calm: 2 } },
    b: { motif: 'zigzag', genres: { thriller: 2, adventure: 2, mystery: 1 }, traits: { bold: 2 } },
    interlude: 'i2',
  },
  {
    // 8. Personal transformation vs society
    a: { motif: 'seed', genres: { selfDiscovery: 3, drama: 1 }, traits: { heart: 1, calm: 1 } },
    b: { motif: 'crowd', genres: { philosophy: 2, contemporary: 2, historical: 1 }, traits: { mind: 1, grounded: 1 } },
  },
  {
    // 9. Hopeful ending vs open ending
    a: { motif: 'sunrise', genres: { selfDiscovery: 2, romance: 1, contemporary: 1 }, traits: { heart: 1, dreamy: 1 } },
    b: { motif: 'door', genres: { literary: 2, psychological: 1, mystery: 1, philosophy: 1 }, traits: { mind: 1, calm: 1 } },
  },
  {
    // 10. A love story vs a journey into the unknown
    a: { motif: 'threads', genres: { romance: 3, relationships: 2 }, traits: { heart: 2 } },
    b: { motif: 'compass', genres: { adventure: 3, fantasy: 2, mystery: 1 }, traits: { bold: 2 } },
  },
]

// Set id → question-id prefix. Set A keeps the original ids (q1…q10).
const PREFIX = { A: 'q', B: 'b', C: 'c', D: 'd', E: 'e', F: 'f', G: 'g', H: 'h' }

export const SET_IDS = Object.keys(PREFIX)

export const QUESTION_SETS = Object.fromEntries(
  SET_IDS.map((set) => [set, SLOTS.map((slot, i) => ({ id: `${PREFIX[set]}${i + 1}`, ...slot }))]),
)

/** Every question of every set (lookup by id, e.g. when recording answers). */
export const QUIZ = SET_IDS.flatMap((set) => QUESTION_SETS[set])

export const SLOT_COUNT = SLOTS.length

/**
 * A visitor's quiz is a MIX: for each of the 10 slots, one question from any of the sets. The code
 * is one set letter per slot, e.g. "CAHBDEFGAB" (8^10 ≈ a billion different quizzes). Because every
 * set is a parallel form with the same weights per slot, any mix is scored exactly like a full set.
 * A single letter (e.g. "A") still means that whole set.
 */
export function questionsFor(code = 'A') {
  const letters = code.length === 1 ? code.repeat(SLOT_COUNT) : code
  return SLOTS.map((_, i) => (QUESTION_SETS[letters[i]] ?? QUESTION_SETS.A)[i])
}

export const isQuizCode = (code) =>
  typeof code === 'string' && (code.length === 1 || code.length === SLOT_COUNT) && [...code].every((c) => SET_IDS.includes(c))
