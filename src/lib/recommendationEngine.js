// Scoring-based personality + ranking engine (pure functions, no I/O).
//
// 1. Every quiz answer adds weights to 10 genre dimensions and 6 trait dimensions.
// 2. Each dimension is normalised by the most it could score across the quiz.
// 3. Personality = best weighted affinity match.
// 4. Items (API or curated) are ranked by cosine similarity between the attendee's genre
//    vector and the item's genre vector, plus quality signals supplied by the caller.
// 5. The engine also records WHICH answers drove each genre, so "why it matches" text can
//    quote the attendee's real choices.

import { GENRES, TRAITS } from '../data/genres.js'
import { QUIZ } from '../data/quiz.js'
import { PERSONALITIES } from '../data/personalities.js'
import { hashString } from './ids.js'

const zero = (keys) => Object.fromEntries(keys.map((k) => [k, 0]))

function maxPossible(keys, field) {
  const max = zero(keys)
  for (const q of QUIZ) for (const k of keys) max[k] += Math.max(q.a[field][k] ?? 0, q.b[field][k] ?? 0)
  return max
}
const MAX_GENRES = maxPossible(GENRES, 'genres')
const MAX_TRAITS = maxPossible(TRAITS, 'traits')

/** Normalised (0–1) genre + trait scores, plus the answers behind each genre. */
export function buildProfile(answers) {
  const raw = { genres: zero(GENRES), traits: zero(TRAITS) }
  const drivers = Object.fromEntries(GENRES.map((g) => [g, []]))
  for (const q of QUIZ) {
    const side = answers[q.id]
    if (!side) continue
    const opt = q[side]
    for (const [k, v] of Object.entries(opt.genres)) {
      raw.genres[k] += v
      drivers[k].push({ questionId: q.id, side, weight: v })
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

export function pickPersonality(profile) {
  return [...PERSONALITIES].sort((a, b) => affinityScore(b.affinity, profile) - affinityScore(a.affinity, profile))[0]
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
 * Orders scored candidates. Near-ties (within 0.025) are broken by a hash of the session id so
 * identical answers can still yield different, equally good picks — never pure randomness.
 */
export function orderCandidates(scored, seed) {
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  if (sorted.length < 2) return sorted.map((s) => s.item)
  const top = sorted[0].score
  const ties = sorted.filter((s) => top - s.score <= 0.025)
  const rest = sorted.slice(ties.length)
  const h = hashString(seed)
  const rotated = ties.map((_, i) => ties[(i + h) % ties.length])
  return [...rotated, ...rest].map((s) => s.item)
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

export function computeResult({ answers }) {
  const profile = buildProfile(answers)
  return { profile, personality: pickPersonality(profile), interests: topGenres(profile, 3) }
}
