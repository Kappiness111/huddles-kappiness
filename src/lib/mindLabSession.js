// Keeps each visitor's three Mind Lab questions (one per section) fixed for their whole visit.
//
// The picks are chosen once per visitor (see pickMindLab in data/mindlab.js) and kept in this tab's
// sessionStorage, so refreshing the page and registering again shows the SAME three questions.
// A visitor reset (Start over, Start a new experience, inactivity, the thank-you timer) replaces
// them with new picks that differ from the previous visitor's.
//
// Only the three question ids are stored (e.g. {"perspective":"p4",…}). No personal data.

import { CHALLENGES, findDecision, findPattern, findPerspective, pickMindLab } from '../data/mindlab.js'
import { newId } from './ids.js'

const KEY = 'kappiness.mindLabPicks'
const FIND = { perspective: findPerspective, pattern: findPattern, decision: findDecision }

/** Stored picks are trusted only if every section names a question that still exists. */
function isValid(picks) {
  return Boolean(picks) && CHALLENGES.every((kind) => typeof picks[kind] === 'string' && FIND[kind](picks[kind]))
}

function store(picks) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(picks))
  } catch {
    /* storage blocked — the picks still last for the in-memory session */
  }
  return picks
}

/** A new visitor: fresh random picks, avoiding the previous visitor's questions. */
export function nextMindLabPicks(previous) {
  return store(pickMindLab(newId(), previous))
}

/** The current visitor's picks: the stored ones (after a refresh), or a new selection. */
export function currentMindLabPicks() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY))
    if (isValid(stored)) return { perspective: stored.perspective, pattern: stored.pattern, decision: stored.decision }
  } catch {
    /* nothing stored, unreadable or blocked — fall through to a fresh pick */
  }
  return nextMindLabPicks()
}
