import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { computeResult } from '../lib/recommendationEngine.js'
import { newId, receiptNumber } from '../lib/ids.js'
import { buildSubmission, saveSubmission } from '../services/submissions.js'
import { findBooks } from '../services/books.js'
import { findMovies, ensureOverview } from '../services/movies.js'
import { buildEmailPayload, sendRecommendationEmail } from '../services/email.js'
import { pickMindLab } from '../data/mindlab.js'
import { DEFAULT_UI_LANGUAGE } from '../i18n/languages.js'

const EMPTY_REC = { status: 'idle', items: [], index: 0, requested: null, actual: null, offline: false, wrapped: false }
const FINDERS = { book: findBooks, movie: findMovies }

/** Live covers (Open Library → archive.org) can take seconds; wait briefly so the pick appears whole. */
function preloadCover(src, timeout = 2500) {
  if (!src) return Promise.resolve()
  return new Promise((resolve) => {
    const img = new Image()
    const done = () => resolve()
    img.onload = done
    img.onerror = done
    setTimeout(done, timeout)
    img.src = src
  })
}

// Every new attendee gets a brand-new state object. Nothing is carried over — including the
// interface language, which goes back to the default for the next person.
function freshState() {
  const sessionId = newId()
  return {
    sessionId,
    receiptNo: receiptNumber(new Date()),
    uiLang: DEFAULT_UI_LANGUAGE,
    step: 'welcome',
    attendee: { name: '', email: '', phone: '', consentData: false, consentEmail: false },
    // The Mind Lab is kept apart from preference scoring: it never feeds recommendations.
    mindLab: { picks: pickMindLab(sessionId), responses: {}, completed: false },
    quizAnswers: {},
    result: null,
    prefs: { book: null, movie: null },
    recs: { book: { ...EMPTY_REC }, movie: { ...EMPTY_REC } },
    completedAt: null,
    saveStatus: null,
    emailStatus: null,
  }
}

function reducer(state, a) {
  switch (a.type) {
    case 'GO':
      return { ...state, step: a.step }
    case 'SET_LANG':
      return { ...state, uiLang: a.lang }
    case 'SET_ATTENDEE':
      return { ...state, attendee: { ...state.attendee, ...a.attendee } }
    case 'MINDLAB_RESPONSE':
      return { ...state, mindLab: { ...state.mindLab, responses: { ...state.mindLab.responses, [a.challenge]: a.response } } }
    case 'MINDLAB_DONE':
      return { ...state, mindLab: { ...state.mindLab, completed: true } }
    case 'QUIZ_ANSWER':
      return { ...state, quizAnswers: { ...state.quizAnswers, [a.id]: a.side } }
    case 'FINISH_QUIZ':
      return { ...state, result: computeResult({ answers: state.quizAnswers }), step: 'reveal' }
    case 'SET_PREF':
      return { ...state, prefs: { ...state.prefs, [a.kind]: a.lang } }
    case 'REC':
      return { ...state, recs: { ...state.recs, [a.kind]: { ...state.recs[a.kind], ...a.patch } } }
    case 'NEXT_REC': {
      const r = state.recs[a.kind]
      if (r.items.length < 2) return state
      const index = (r.index + 1) % r.items.length
      return { ...state, recs: { ...state.recs, [a.kind]: { ...r, index, wrapped: index === 0 } } }
    }
    case 'COMPLETE':
      return state.completedAt ? state : { ...state, completedAt: a.at }
    case 'SAVE_STATUS':
      return { ...state, saveStatus: a.status }
    case 'EMAIL_STATUS':
      return { ...state, emailStatus: a.status }
    case 'RESET':
      return freshState()
    default:
      return state
  }
}

/** The item currently shown for a recommendation kind. */
// eslint-disable-next-line react-refresh/only-export-components
export const currentPick = (rec) => rec.items[rec.index] ?? null

const ExperienceContext = createContext(null)

export function ExperienceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, freshState)

  // Async results must never land in the next attendee's session.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })
  const guarded = useCallback((sid, action) => {
    if (stateRef.current.sessionId === sid) dispatch(action)
  }, [])

  /** (Re)load one recommendation kind in a given language. Quiz answers are never touched. */
  const loadRec = useCallback(
    async (kind, lang) => {
      const s = stateRef.current
      const sid = s.sessionId
      dispatch({ type: 'SET_PREF', kind, lang })
      dispatch({ type: 'REC', kind, patch: { ...EMPTY_REC, status: 'loading' } })
      try {
        const r = await FINDERS[kind]({ profile: s.result.profile, personality: s.result.personality, seed: sid, uiLang: s.uiLang, lang })
        await preloadCover(r.items[0]?.cover)
        if (r.items[1]?.cover) new Image().src = r.items[1].cover
        guarded(sid, { type: 'REC', kind, patch: { status: r.items.length ? 'ready' : 'error', ...r, index: 0 } })
      } catch (e) {
        console.error(`[${kind}]`, e)
        guarded(sid, { type: 'REC', kind, patch: { status: 'error' } })
      }
    },
    [guarded],
  )

  // Fill in an English overview if TMDB has none in the attendee's language.
  const movieRec = state.recs.movie
  useEffect(() => {
    const m = currentPick(movieRec)
    if (!m || m.source !== 'tmdb' || m.description) return
    const sid = stateRef.current.sessionId
    ensureOverview(m).then((filled) => {
      if (filled === m) return
      const items = movieRec.items.map((x) => (x.id === m.id ? filled : x))
      guarded(sid, { type: 'REC', kind: 'movie', patch: { items } })
    })
  }, [movieRec, guarded])

  const actions = useMemo(
    () => ({
      go: (step) => dispatch({ type: 'GO', step }),
      setLang: (lang) => dispatch({ type: 'SET_LANG', lang }),
      setAttendee: (attendee) => dispatch({ type: 'SET_ATTENDEE', attendee }),
      recordMindLab: (challenge, response) => dispatch({ type: 'MINDLAB_RESPONSE', challenge, response }),
      completeMindLab: () => dispatch({ type: 'MINDLAB_DONE' }),
      answerQuiz: (id, side) => dispatch({ type: 'QUIZ_ANSWER', id, side }),
      finishQuiz: () => dispatch({ type: 'FINISH_QUIZ' }),
      loadRecs: (prefs) => Promise.all([loadRec('book', prefs.book), loadRec('movie', prefs.movie)]),
      loadRec,
      nextRec: (kind) => dispatch({ type: 'NEXT_REC', kind }),
      reset: () => dispatch({ type: 'RESET' }),
      sendEmail: async () => {
        const s = stateRef.current
        const sid = s.sessionId
        dispatch({ type: 'EMAIL_STATUS', status: 'sending' })
        const res = await sendRecommendationEmail(
          buildEmailPayload({ ...s, picks: { book: currentPick(s.recs.book), movie: currentPick(s.recs.movie) } }),
        )
        guarded(sid, { type: 'EMAIL_STATUS', status: res.status })
      },
    }),
    [loadRec, guarded],
  )

  // Reaching the receipt completes the experience: save ONE record per session.
  const savedFor = useRef(null)
  useEffect(() => {
    if (state.step !== 'receipt' || !state.result || savedFor.current === state.sessionId) return
    savedFor.current = state.sessionId
    const at = new Date().toISOString()
    dispatch({ type: 'COMPLETE', at })
    const s = stateRef.current
    const record = buildSubmission({ ...s, completedAt: at, picks: { book: currentPick(s.recs.book), movie: currentPick(s.recs.movie) } })
    const sid = s.sessionId
    dispatch({ type: 'SAVE_STATUS', status: 'pending' })
    saveSubmission(record).then((res) => {
      if (res.status === 'not-configured') console.info('[kappiness] no database configured; record not stored', record)
      if (res.status === 'error') console.error('[kappiness] submission not saved:', res.message)
      guarded(sid, { type: 'SAVE_STATUS', status: res.status })
    })
  }, [state.step, state.result, state.sessionId, guarded])

  const value = useMemo(() => ({ state, ...actions }), [state, actions])
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useExperience() {
  const ctx = useContext(ExperienceContext)
  if (!ctx) throw new Error('useExperience must be used inside <ExperienceProvider>')
  return ctx
}
