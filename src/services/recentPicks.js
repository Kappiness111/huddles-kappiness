// Remembers which books and films were handed out recently, so the next visitor is steered towards a
// different, equally good story instead of everyone leaving with the same one.
//
// Two sources, merged:
//   1. Shared (every phone): the `recent_recommendations()` database function returns the TITLES of
//      the latest saved picks. Titles only, no names, emails or ids (see supabase/migrations/).
//   2. This device: the last 40 picks in localStorage (normalised titles only, no personal data).
// Either can be missing (no Supabase, offline, storage blocked, Node tests): it then quietly does less.

import { isSupabaseConfigured } from './config.js'
import { getSupabase } from './supabaseClient.js'

const KEY = 'kappiness.recentPicks'
const MAX = 40
const SHARED_LIMIT = 60
const SHARED_TIMEOUT_MS = 2500
const SHARED_TTL_MS = 60_000

/** Same normalisation for every source, so a Google Books copy and a shelf copy count as one title. */
export const titleKey = (title = '') => String(title).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

function readLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

const localList = (kind) => {
  const list = readLocal()[kind]
  return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
}

let shared = null // { at, data: { book: [...keys], movie: [...keys] } }
let sharedPromise = null

/** Fetches the shared list at most once a minute; never waits longer than 2.5 s and never throws. */
function loadShared() {
  if (!isSupabaseConfigured) return Promise.resolve({})
  if (shared && Date.now() - shared.at < SHARED_TTL_MS) return Promise.resolve(shared.data)
  sharedPromise ??= (async () => {
    try {
      const supabase = await getSupabase()
      const call = supabase.rpc('recent_recommendations', { p_limit: SHARED_LIMIT })
      const timeout = new Promise((resolve) => setTimeout(() => resolve({ error: { message: 'timeout' } }), SHARED_TIMEOUT_MS))
      const { data, error } = await Promise.race([call, timeout])
      if (error) throw new Error(error.message)
      const strings = (list) => (Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [])
      const keys = (list) => strings(list).map(titleKey)
      shared = { at: Date.now(), data: { book: keys(data?.book), movie: keys(data?.movie), identity: strings(data?.identity) } }
      return shared.data
    } catch (e) {
      console.info('[kappiness] shared recent picks unavailable:', e.message)
      // Don't retry (and wait up to 2.5 s) for every visitor: try again in a minute.
      shared = { at: Date.now(), data: shared?.data ?? {} }
      return shared.data
    } finally {
      sharedPromise = null
    }
  })()
  return sharedPromise
}

// ── Story identities ──
// So the next visitor never gets the same identity as the last one (see pickPersonality).
const IDENTITY_KEY = 'kappiness.recentIdentities'

/** Starts the shared lookup early (e.g. when the Mind Lab opens), so it's ready when the quiz ends. */
export const warmRecent = () => loadShared()

/** Identities handed out recently, most recent first: this device's first, then other phones'. */
export function recentIdentities() {
  let local = []
  try {
    const v = JSON.parse(localStorage.getItem(IDENTITY_KEY))
    if (Array.isArray(v)) local = v.filter((x) => typeof x === 'string')
  } catch {
    /* storage blocked */
  }
  return [...new Set([...local, ...(shared?.data?.identity ?? [])])].slice(0, 6)
}

/** Call once per visitor with the identity they were given. */
export function rememberIdentity(id) {
  if (shared?.data?.identity) shared.data.identity = [id, ...shared.data.identity.filter((x) => x !== id)]
  try {
    const v = JSON.parse(localStorage.getItem(IDENTITY_KEY))
    const list = Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x !== id) : []
    localStorage.setItem(IDENTITY_KEY, JSON.stringify([id, ...list].slice(0, 6)))
  } catch {
    /* storage blocked: the shared list still gives variety */
  }
}

/** Call once per visitor with the picks that went on their receipt: { book, movie }. */
export function rememberPicks(picks) {
  try {
    const all = readLocal()
    for (const [kind, item] of Object.entries(picks)) {
      if (!item?.title) continue
      const k = titleKey(item.title)
      all[kind] = [k, ...localList(kind).filter((x) => x !== k)].slice(0, MAX)
      // Our own pick counts straight away, before the next shared refresh.
      if (shared?.data?.[kind]) shared.data[kind] = [k, ...shared.data[kind].filter((x) => x !== k)]
    }
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage blocked: variety then comes from the shared list and per-visitor search pages */
  }
}

/**
 * Resolves to a 0–1 penalty function for one kind: 1 for the most recently handed-out title,
 * fading towards 0 further back. Finders subtract it (weighted) from the match score.
 */
export async function recencyPenalty(kind) {
  const fromShared = (await loadShared())[kind] ?? []
  // Interleave the two lists so both the stall device and everyone else's phones count.
  const local = localList(kind)
  const merged = []
  for (let i = 0; i < Math.max(fromShared.length, local.length); i++) {
    for (const k of [fromShared[i], local[i]]) if (k && !merged.includes(k)) merged.push(k)
  }
  const span = Math.max(merged.length, MAX)
  const pos = new Map(merged.map((k, i) => [k, i]))
  return (item) => {
    const i = pos.get(titleKey(item.title))
    return i === undefined ? 0 : 1 - i / span
  }
}
