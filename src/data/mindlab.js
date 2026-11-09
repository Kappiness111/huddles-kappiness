// THE MIND LAB: three short personality scenarios, one from each section, with no right answers.
// Every option carries genre and trait weights, so the Mind Lab feeds the recommendation profile
// alongside This or That (see mindLabQuestions() and lib/recommendationEngine.js).
// Text (situations, questions, options, notes) lives in the locale file under `mindlab.*`.
// Generated from one spec so the text and the weights always line up.
import { hashString } from '../lib/ids.js'

export const CHALLENGES = ['inner', 'instinct', 'decision']
export const OPTION_KEYS = ['a', 'b', 'c', 'd']

export const BANKS = {
  inner: [
    { id: 'i1', a: { genres: { relationships: 2, romance: 1, drama: 1 }, traits: { heart: 2 } }, b: { genres: { fantasy: 2, literary: 1, adventure: 1 }, traits: { dreamy: 2 } }, c: { genres: { adventure: 2, selfDiscovery: 2 }, traits: { bold: 1, dreamy: 1 } }, d: { genres: { philosophy: 2, psychological: 1, literary: 1 }, traits: { mind: 2 } } },
    { id: 'i2', a: { genres: { drama: 2, relationships: 2 }, traits: { heart: 2 } }, b: { genres: { mystery: 2, psychological: 2 }, traits: { mind: 1, grounded: 1 } }, c: { genres: { adventure: 2, fantasy: 1, scifi: 1 }, traits: { dreamy: 2 } }, d: { genres: { selfDiscovery: 2, contemporary: 2 }, traits: { calm: 1, heart: 1 } } },
    { id: 'i3', a: { genres: { romance: 3, historical: 1 }, traits: { heart: 2 } }, b: { genres: { mystery: 3, thriller: 1 }, traits: { mind: 1, bold: 1 } }, c: { genres: { historical: 3, literary: 1 }, traits: { calm: 1, grounded: 1 } }, d: { genres: { philosophy: 2, selfDiscovery: 2 }, traits: { mind: 1, calm: 1 } } },
    { id: 'i4', a: { genres: { contemporary: 2, literary: 1, drama: 1 }, traits: { calm: 2 } }, b: { genres: { scifi: 2, philosophy: 1, fantasy: 1 }, traits: { dreamy: 2 } }, c: { genres: { thriller: 2, mystery: 2 }, traits: { bold: 1, mind: 1 } }, d: { genres: { drama: 2, romance: 1, selfDiscovery: 1 }, traits: { heart: 1, dreamy: 1 } } },
    { id: 'i5', a: { genres: { contemporary: 2, relationships: 2 }, traits: { heart: 1, grounded: 1 } }, b: { genres: { drama: 2, selfDiscovery: 2 }, traits: { heart: 1, bold: 1 } }, c: { genres: { adventure: 3, thriller: 1 }, traits: { bold: 2 } }, d: { genres: { philosophy: 2, scifi: 1, psychological: 1 }, traits: { mind: 2 } } },
    { id: 'i6', a: { genres: { relationships: 2, romance: 1, drama: 1 }, traits: { heart: 2 } }, b: { genres: { adventure: 2, mystery: 1, scifi: 1 }, traits: { bold: 1, mind: 1 } }, c: { genres: { fantasy: 2, literary: 1, romance: 1 }, traits: { dreamy: 2 } }, d: { genres: { philosophy: 2, psychological: 1, literary: 1 }, traits: { mind: 1, calm: 1 } } },
    { id: 'i7', a: { genres: { romance: 2, literary: 2 }, traits: { heart: 1, dreamy: 1 } }, b: { genres: { mystery: 3, thriller: 1 }, traits: { mind: 2 } }, c: { genres: { fantasy: 2, scifi: 2 }, traits: { dreamy: 2 } }, d: { genres: { selfDiscovery: 2, historical: 1, contemporary: 1 }, traits: { grounded: 2 } } },
    { id: 'i8', a: { genres: { romance: 2, relationships: 2 }, traits: { heart: 2 } }, b: { genres: { psychological: 2, literary: 1, drama: 1 }, traits: { mind: 2 } }, c: { genres: { contemporary: 2, adventure: 1, relationships: 1 }, traits: { bold: 2 } }, d: { genres: { fantasy: 2, romance: 1, selfDiscovery: 1 }, traits: { dreamy: 2 } } },
    { id: 'i9', a: { genres: { historical: 3, adventure: 1 }, traits: { calm: 1, mind: 1 } }, b: { genres: { adventure: 2, selfDiscovery: 2 }, traits: { bold: 1, calm: 1 } }, c: { genres: { relationships: 3, romance: 1 }, traits: { heart: 2 } }, d: { genres: { scifi: 3, contemporary: 1 }, traits: { dreamy: 1, bold: 1 } } },
    { id: 'i10', a: { genres: { romance: 2, drama: 2 }, traits: { heart: 2 } }, b: { genres: { mystery: 2, psychological: 2 }, traits: { mind: 2 } }, c: { genres: { selfDiscovery: 3, philosophy: 1 }, traits: { dreamy: 1, heart: 1 } }, d: { genres: { scifi: 2, philosophy: 2 }, traits: { mind: 1, dreamy: 1 } } },
  ],
  instinct: [
    { id: 's1', a: { genres: { relationships: 2, fantasy: 1, drama: 1 }, traits: { heart: 1, dreamy: 1 } }, b: { genres: { mystery: 2, thriller: 2 }, traits: { mind: 1, bold: 1 } }, c: { genres: { scifi: 2, philosophy: 1, adventure: 1 }, traits: { dreamy: 2 } }, d: { genres: { literary: 2, selfDiscovery: 1, contemporary: 1 }, traits: { calm: 2 } } },
    { id: 's2', a: { genres: { adventure: 3, thriller: 1 }, traits: { bold: 2 } }, b: { genres: { historical: 2, mystery: 2 }, traits: { mind: 1, grounded: 1 } }, c: { genres: { relationships: 2, adventure: 1, romance: 1 }, traits: { heart: 2 } }, d: { genres: { psychological: 2, mystery: 1, drama: 1 }, traits: { mind: 2 } } },
    { id: 's3', a: { genres: { relationships: 2, drama: 2 }, traits: { heart: 2 } }, b: { genres: { psychological: 3, drama: 1 }, traits: { mind: 2 } }, c: { genres: { thriller: 2, mystery: 2 }, traits: { bold: 1, mind: 1 } }, d: { genres: { selfDiscovery: 2, literary: 1, contemporary: 1 }, traits: { calm: 2 } } },
    { id: 's4', a: { genres: { contemporary: 2, relationships: 1, adventure: 1 }, traits: { bold: 1, heart: 1 } }, b: { genres: { literary: 2, historical: 2 }, traits: { calm: 2 } }, c: { genres: { scifi: 2, thriller: 1, psychological: 1 }, traits: { mind: 1, bold: 1 } }, d: { genres: { romance: 3, drama: 1 }, traits: { heart: 1, dreamy: 1 } } },
    { id: 's5', a: { genres: { adventure: 2, selfDiscovery: 2 }, traits: { bold: 1, dreamy: 1 } }, b: { genres: { relationships: 2, contemporary: 2 }, traits: { heart: 1, grounded: 1 } }, c: { genres: { mystery: 2, historical: 1, psychological: 1 }, traits: { mind: 2 } }, d: { genres: { literary: 2, drama: 1, philosophy: 1 }, traits: { calm: 2 } } },
    { id: 's6', a: { genres: { fantasy: 2, adventure: 1, romance: 1 }, traits: { dreamy: 1, bold: 1 } }, b: { genres: { selfDiscovery: 2, contemporary: 1, adventure: 1 }, traits: { bold: 1, grounded: 1 } }, c: { genres: { romance: 3, relationships: 1 }, traits: { heart: 2 } }, d: { genres: { philosophy: 2, scifi: 1, psychological: 1 }, traits: { mind: 2 } } },
    { id: 's7', a: { genres: { contemporary: 2, drama: 1, psychological: 1 }, traits: { grounded: 2 } }, b: { genres: { adventure: 3, mystery: 1 }, traits: { bold: 2 } }, c: { genres: { relationships: 3, contemporary: 1 }, traits: { heart: 2 } }, d: { genres: { literary: 2, selfDiscovery: 1, philosophy: 1 }, traits: { calm: 2 } } },
    { id: 's8', a: { genres: { thriller: 2, mystery: 2 }, traits: { bold: 2 } }, b: { genres: { psychological: 2, fantasy: 1, mystery: 1 }, traits: { mind: 1, dreamy: 1 } }, c: { genres: { relationships: 2, drama: 2 }, traits: { heart: 2 } }, d: { genres: { contemporary: 3, relationships: 1 }, traits: { calm: 1, grounded: 1 } } },
    { id: 's9', a: { genres: { drama: 2, psychological: 1, contemporary: 1 }, traits: { heart: 1, mind: 1 } }, b: { genres: { historical: 3, literary: 1 }, traits: { calm: 2 } }, c: { genres: { relationships: 3, romance: 1 }, traits: { heart: 2 } }, d: { genres: { literary: 2, fantasy: 1, philosophy: 1 }, traits: { dreamy: 2 } } },
    { id: 's10', a: { genres: { adventure: 2, thriller: 2 }, traits: { bold: 2 } }, b: { genres: { mystery: 3, scifi: 1 }, traits: { mind: 2 } }, c: { genres: { relationships: 2, romance: 1, drama: 1 }, traits: { heart: 2 } }, d: { genres: { fantasy: 2, adventure: 1, selfDiscovery: 1 }, traits: { dreamy: 1, bold: 1 } } },
  ],
  decision: [
    { id: 'd1', a: { genres: { relationships: 2, historical: 1, drama: 1 }, traits: { heart: 2 } }, b: { genres: { selfDiscovery: 2, literary: 2 }, traits: { calm: 1, mind: 1 } }, c: { genres: { romance: 2, drama: 2 }, traits: { heart: 1, dreamy: 1 } }, d: { genres: { contemporary: 2, philosophy: 2 }, traits: { grounded: 2 } } },
    { id: 'd2', a: { genres: { selfDiscovery: 2, adventure: 2 }, traits: { bold: 2 } }, b: { genres: { relationships: 3, drama: 1 }, traits: { heart: 2 } }, c: { genres: { contemporary: 2, drama: 2 }, traits: { grounded: 2 } }, d: { genres: { philosophy: 2, fantasy: 1, romance: 1 }, traits: { dreamy: 2 } } },
    { id: 'd3', a: { genres: { psychological: 3, drama: 1 }, traits: { mind: 2 } }, b: { genres: { selfDiscovery: 2, drama: 2 }, traits: { heart: 1, calm: 1 } }, c: { genres: { mystery: 2, thriller: 2 }, traits: { bold: 1, mind: 1 } }, d: { genres: { relationships: 3, romance: 1 }, traits: { heart: 2 } } },
    { id: 'd4', a: { genres: { historical: 3, romance: 1 }, traits: { dreamy: 1, calm: 1 } }, b: { genres: { scifi: 3, adventure: 1 }, traits: { bold: 1, dreamy: 1 } }, c: { genres: { relationships: 2, historical: 1, drama: 1 }, traits: { heart: 2 } }, d: { genres: { contemporary: 2, selfDiscovery: 2 }, traits: { grounded: 2 } } },
    { id: 'd5', a: { genres: { thriller: 2, psychological: 2 }, traits: { bold: 2 } }, b: { genres: { contemporary: 2, romance: 1, relationships: 1 }, traits: { heart: 1, grounded: 1 } }, c: { genres: { literary: 2, philosophy: 2 }, traits: { mind: 1, calm: 1 } }, d: { genres: { drama: 2, selfDiscovery: 2 }, traits: { heart: 1, dreamy: 1 } } },
    { id: 'd6', a: { genres: { romance: 3, relationships: 1 }, traits: { heart: 2 } }, b: { genres: { scifi: 3, philosophy: 1 }, traits: { dreamy: 1, mind: 1 } }, c: { genres: { selfDiscovery: 3, philosophy: 1 }, traits: { calm: 1, heart: 1 } }, d: { genres: { mystery: 3, thriller: 1 }, traits: { mind: 1, bold: 1 } } },
    { id: 'd7', a: { genres: { adventure: 2, relationships: 1, contemporary: 1 }, traits: { bold: 1, heart: 1 } }, b: { genres: { psychological: 3, mystery: 1 }, traits: { mind: 2 } }, c: { genres: { literary: 3, selfDiscovery: 1 }, traits: { calm: 1, dreamy: 1 } }, d: { genres: { scifi: 3, historical: 1 }, traits: { mind: 1, dreamy: 1 } } },
    { id: 'd8', a: { genres: { drama: 2, relationships: 2 }, traits: { heart: 2 } }, b: { genres: { psychological: 2, philosophy: 2 }, traits: { mind: 2 } }, c: { genres: { contemporary: 2, adventure: 1, relationships: 1 }, traits: { bold: 2 } }, d: { genres: { selfDiscovery: 2, romance: 1, drama: 1 }, traits: { dreamy: 1, heart: 1 } } },
    { id: 'd9', a: { genres: { drama: 2, relationships: 2 }, traits: { heart: 2 } }, b: { genres: { mystery: 2, psychological: 2 }, traits: { mind: 2 } }, c: { genres: { adventure: 2, thriller: 1, contemporary: 1 }, traits: { bold: 2 } }, d: { genres: { philosophy: 3, selfDiscovery: 1 }, traits: { calm: 1, mind: 1 } } },
    { id: 'd10', a: { genres: { romance: 2, relationships: 2 }, traits: { heart: 2 } }, b: { genres: { adventure: 3, selfDiscovery: 1 }, traits: { bold: 2 } }, c: { genres: { philosophy: 3, literary: 1 }, traits: { mind: 1, calm: 1 } }, d: { genres: { contemporary: 3, relationships: 1 }, traits: { heart: 1, grounded: 1 } } },
  ],
}

export const findMindLab = (kind, id) => BANKS[kind]?.find((x) => x.id === id)

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
 * Per-visitor selection: one scenario from each section. The seed is a fresh random UUID, so every
 * visitor gets an independent pick. `previous` is the last visitor's picks on this device: those are
 * skipped, so back-to-back visitors at the stall never see the same scenario.
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

/**
 * This visitor's three scenarios as scoring questions (same shape as a This-or-That question, with
 * four sides) plus their answers, ready for buildProfile().
 */
export function mindLabQuestions(picks = {}, responses = {}) {
  const questions = []
  const answers = {}
  for (const kind of CHALLENGES) {
    const item = findMindLab(kind, picks[kind])
    if (!item) continue
    const id = `ml-${item.id}`
    questions.push({ ...item, id, labelPrefix: `mindlab.${kind}.${item.id}` })
    const choice = responses[kind]?.choice
    if (OPTION_KEYS.includes(choice)) answers[id] = choice
  }
  return { questions, answers }
}
