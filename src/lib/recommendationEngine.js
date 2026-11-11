// Scoring-based personality + ranking engine (pure functions, no I/O).
//
// 1. Every quiz answer (This or That, plus the three Mind Lab scenarios) adds weights to the genre
//    dimensions and 6 trait dimensions.
// 2. Each dimension is normalised by the most it could score across the visitor's question set.
// 3. Personality = best weighted affinity match.
// 4. Items (API or curated) are ranked by cosine similarity between the attendee's genre
//    vector and the item's genre vector, plus quality signals supplied by the caller.
// 5. The engine also records WHICH answers drove each genre, so "why it matches" text can
//    quote the attendee's real choices.

import { GENRES, TRAITS } from '../data/genres.js'
import { QUESTION_SETS, questionsFor } from '../data/quiz.js'
import { PERSONALITIES } from '../data/personalities.js'
import { mindLabQuestions } from '../data/mindlab.js'
import { hashString } from './ids.js'

const zero = (keys) => Object.fromEntries(keys.map((k) => [k, 0]))
// This or That questions have sides a/b; Mind Lab scenarios have a–d.
const sidesOf = (q) => ['a', 'b', 'c', 'd'].filter((k) => q[k])

function maxPossible(questions, keys, field) {
  const max = zero(keys)
  for (const q of questions) for (const k of keys) max[k] += Math.max(...sidesOf(q).map((s) => q[s][field][k] ?? 0))
  return max
}
// Normalisation ceilings per combination of questions (each visitor is scored only on their own).
const MAX = new Map()
function maxFor(questions) {
  const key = questions.map((q) => q.id).join(',')
  if (!MAX.has(key)) MAX.set(key, { genres: maxPossible(questions, GENRES, 'genres'), traits: maxPossible(questions, TRAITS, 'traits') })
  return MAX.get(key)
}

/** Normalised (0–1) genre + trait scores, plus the answers behind each genre. */
export function buildProfile(answers, questions = QUESTION_SETS.A) {
  const { genres: MAX_GENRES, traits: MAX_TRAITS } = maxFor(questions)
  const raw = { genres: zero(GENRES), traits: zero(TRAITS) }
  const drivers = Object.fromEntries(GENRES.map((g) => [g, []]))
  for (const q of questions) {
    const side = answers[q.id]
    if (!side) continue
    const opt = q[side]
    for (const [k, v] of Object.entries(opt.genres)) {
      raw.genres[k] += v
      drivers[k].push({ questionId: q.id, side, weight: v, labelKey: `${q.labelPrefix ?? `quiz.${q.id}`}.${side}.label` })
    }
    for (const [k, v] of Object.entries(opt.traits)) raw.traits[k] += v
  }
  for (const g of GENRES) drivers[g].sort((a, b) => b.weight - a.weight)
  const norm = (keys, src, max) => Object.fromEntries(keys.map((k) => [k, max[k] ? src[k] / max[k] : 0]))
  return { genres: norm(GENRES, raw.genres, MAX_GENRES), traits: norm(TRAITS, raw.traits, MAX_TRAITS), drivers }
}

function affinityScore(affinity, profile) {
  let sum = 0
  let weight = 0
  for (const [k, w] of Object.entries(affinity)) {
    sum += w * (profile.genres[k] ?? profile.traits[k] ?? 0)
    weight += w
  }
  return weight ? sum / weight : 0
}

// A runner-up identity is only used if it fits at least this well relative to the best match.
const FAIR_FIT = 0.8

/**
 * The visitor's story identity: their best affinity match, with variety between visitors.
 * `avoid` lists identities handed out recently (most recent first). The previous visitor's identity
 * is never repeated: the next-best match is used instead. Older recent ones are skipped only when a
 * runner-up still fits well (≥ 80 % of the best score), so nobody gets an identity that isn't theirs.
 */
export function pickPersonality(profile, avoid = []) {
  const ranked = [...PERSONALITIES]
    .map((p) => ({ p, s: affinityScore(p.affinity, profile) * (p.balance ?? 1) }))
    .sort((a, b) => b.s - a.s)
  const best = ranked[0]
  const [previous, ...older] = avoid
  const candidates = ranked.filter(({ p }) => p.id !== previous)
  const fresh = candidates.find(({ p, s }) => !older.includes(p.id) && s >= best.s * FAIR_FIT)
  return (fresh ?? candidates[0] ?? best).p
}

export function topGenres(profile, n = 3) {
  return Object.entries(profile.genres)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .filter(([, v]) => v > 0)
    .map(([g]) => g)
}

export function cosine(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  for (const g of GENRES) {
    const x = a[g] ?? 0
    const y = b[g] ?? 0
    dot += x * y
    na += x * x
    nb += y * y
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

/** Personality's genre vector, used for a small consistency bonus. */
export function personalityGenres(personality) {
  return Object.fromEntries(GENRES.map((g) => [g, personality.affinity[g] ?? 0]))
}

/** Taste match between attendee and an item: 0–~1.15. */
export function tasteScore(profile, personality, itemGenres) {
  return cosine(profile.genres, itemGenres) + 0.15 * cosine(personalityGenres(personality), itemGenres)
}

/**
 * Orders scored candidates. The strongest few (up to 5, within 0.08 of the best) are rotated by a
 * hash of the session id, so identical answers can still yield different, equally good picks:
 * never pure randomness, and never a weak match pushed to the front.
 */
export function orderCandidates(scored, seed) {
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  if (sorted.length < 2) return sorted.map((s) => s.item)
  const top = sorted[0].score
  const ties = sorted.filter((s) => top - s.score <= 0.08).slice(0, 5)
  const rest = sorted.slice(ties.length)
  const h = hashString(seed)
  const rotated = ties.map((_, i) => ties[(i + h) % ties.length])
  return [...rotated, ...rest].map((s) => s.item)
}

/**
 * Gentle variety for mixed-language lists: keeps the first pick, then re-orders the next ones so
 * the same language (and, for watch picks, the same format) doesn't fill every slot. Each item
 * already chosen in a language costs the next one 0.05 of match score, so a clearly better match
 * still wins. Only the top `window` items are touched.
 */
export function diversify(items, window = 16) {
  if (items.length < 3) return items
  const head = items.slice(0, window)
  const out = [head.shift()]
  const seen = (key, value) => out.filter((x) => x[key] === value).length
  while (head.length) {
    let best = 0
    let bestScore = -Infinity
    head.forEach((x, i) => {
      const s = (x.match ?? 0) - 0.05 * seen('language', x.language) - 0.04 * seen('format', x.format)
      if (s > bestScore) [best, bestScore] = [i, s]
    })
    out.push(head.splice(best, 1)[0])
  }
  return [...out, ...items.slice(window)]
}

/** Genres an item shares most strongly with the attendee (for "why it matches"). */
export function sharedGenres(profile, itemGenres, n = 2) {
  return Object.keys(itemGenres)
    .map((g) => [g, (profile.genres[g] ?? 0) * itemGenres[g]])
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0)
    .slice(0, n)
    .map(([g]) => g)
}

/** The attendee's own answers that pushed a genre up most (max `n`). */
export function answersBehind(profile, genre, n = 2) {
  return (profile.drivers[genre] ?? []).slice(0, n)
}

export function computeResult({ answers, quizSet = 'A', mindLab, avoid = [] }) {
  const lab = mindLabQuestions(mindLab?.picks, mindLab?.responses)
  const questions = [...questionsFor(quizSet), ...lab.questions]
  const profile = buildProfile({ ...answers, ...lab.answers }, questions)
  return { profile, personality: pickPersonality(profile, avoid), interests: topGenres(profile, 3) }
}
