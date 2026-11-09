import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { computeResult } from '../lib/recommendationEngine.js'
import { newId, receiptNumber } from '../lib/ids.js'
import { buildSubmission, saveSubmission } from '../services/submissions.js'
import { findBooks } from '../services/books.js'
import { findMovies, ensureOverview } from '../services/movies.js'
import { sendReceiptEmail } from '../services/email.js'
import { isEmailConfigured } from '../services/config.js'
import { currentMindLabPicks, nextMindLabPicks } from '../lib/mindLabSession.js'
import { DEFAULT_UI_LANGUAGE } from '../i18n/languages.js'
import { currentQuizSet, nextQuizSet } from '../lib/questionSet.js'
import { DEFAULT_UI_LANGUAGE } from '../i18n/languages.js'
import { currentQuizSet, nextQuizSet } from '../lib/questionSet.js'

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
// interface language, which goes back to the default for the next person. `quizSet` is the
// predefined question set this visitor answers (see lib/questionSet.js). `mindLabPicks` are this
// visitor's three Mind Lab question ids, kept across a page refresh (see lib/mindLabSession.js).
function freshState(quizSet, mindLabPicks) {
  const sessionId = newId()
  return {
    sessionId,
    receiptNo: receiptNumber(new Date()),
    uiLang: DEFAULT_UI_LANGUAGE,
    step: 'welcome',
    attendee: { name: '', email: '', phone: '', consentData: false, consentEmail: false },
    // The Mind Lab is kept apart from preference scoring: it never feeds recommendations.
    mindLab: { picks: mindLabPicks, responses: {}, completed: false },
    quizSet,
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
      return { ...state, result: computeResult({ answers: state.quizAnswers, quizSet: state.quizSet }), step: 'reveal' }
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
    case 'SET_RECEIPT_NO':
      return { ...state, receiptNo: a.receiptNo }
    case 'SAVE_STATUS':
      return { ...state, saveStatus: a.status }
    case 'EMAIL_STATUS':
      return { ...state, emailStatus: a.status }
    case 'RESET':
      return freshState(a.quizSet, a.mindLabPicks)
    default:
      return state
  }
}

/** The item currently shown for a recommendation kind. */
// eslint-disable-next-line react-refresh/only-export-components
export const currentPick = (rec) => rec.items[rec.index] ?? null

const ExperienceContext = createContext(null)

export function ExperienceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => freshState(currentQuizSet(), currentMindLabPicks()))

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

  // ── Saving + emailing the receipt ────────────────────────────────────────────────
  // The record is built ONCE when the receipt appears (see the effect below) and kept here, so
  // every save retry and email retry uses exactly the receipt the visitor saw.
  const recordRef = useRef(null) // { sid, record }
  const savingRef = useRef(null) // { sid, promise } while a save is in flight
  const savedRef = useRef(null) // sid whose record is confirmed saved
  const sendingRef = useRef(null) // sid whose email request is in flight

  /** Save this session's record (once). Concurrent callers share one attempt. */
  const persist = useCallback(() => {
    const sid = stateRef.current.sessionId
    const entry = recordRef.current
    if (!entry || entry.sid !== sid) return Promise.resolve('error')
    if (savedRef.current === sid) return Promise.resolve('saved')
    if (savingRef.current?.sid === sid) return savingRef.current.promise

    const run = async () => {
      guarded(sid, { type: 'SAVE_STATUS', status: 'pending' })
      let res
      for (let tries = 0; tries < 4; tries++) {
        res = await saveSubmission(entry.record)
        if (res.status !== 'receipt-taken') break
        // Another visitor already has this receipt number: issue a fresh one before anything is printed or emailed.
        const receiptNo = receiptNumber(new Date())
        entry.record = { ...entry.record, receipt_number: receiptNo }
        guarded(sid, { type: 'SET_RECEIPT_NO', receiptNo })
      }
      if (res.status === 'receipt-taken') res = { status: 'error', message: 'could not allocate a unique receipt number' }
      if (res.status === 'not-configured') console.info('[kappiness] no database configured; record not stored', entry.record)
      if (res.status === 'error') console.error('[kappiness] submission not saved:', res.message)
      if (res.status === 'saved') savedRef.current = sid
      guarded(sid, { type: 'SAVE_STATUS', status: res.status })
      return res.status
    }
    const promise = run()
    savingRef.current = { sid, promise }
    promise.finally(() => {
      if (savingRef.current?.promise === promise) savingRef.current = null
    })
    return promise
  }, [guarded])

  /** Email the saved receipt. Safe to call repeatedly: it saves first if needed and never sends twice. */
  const sendEmail = useCallback(async () => {
    const s = stateRef.current
    const sid = s.sessionId
    const entry = recordRef.current
    if (!entry || entry.sid !== sid || sendingRef.current === sid || s.emailStatus === 'sent') return
    if (!isEmailConfigured) {
      dispatch({ type: 'EMAIL_STATUS', status: 'not-configured' })
      return
    }
    sendingRef.current = sid
    dispatch({ type: 'EMAIL_STATUS', status: 'sending' })
    try {
      const saved = await persist() // the submission must exist before the email is requested
      const res =
        saved === 'saved'
          ? await sendReceiptEmail({
              submissionId: sid,
              receiptNo: entry.record.receipt_number,
              email: entry.record.email,
              consentEmail: stateRef.current.attendee.consentEmail,
            })
          : { status: saved === 'not-configured' ? 'not-configured' : 'error', message: 'submission not saved' }
      if (res.status === 'error' || res.status === 'blocked') console.error('[kappiness] email not sent:', res.message)
      guarded(sid, { type: 'EMAIL_STATUS', status: res.status })
    } finally {
      if (sendingRef.current === sid) sendingRef.current = null
    }
  }, [persist, guarded])

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
      reset: () => dispatch({
        type: 'RESET',
        quizSet: nextQuizSet(stateRef.current.quizSet),
        mindLabPicks: nextMindLabPicks(stateRef.current.mindLab.picks),
      }),
      sendEmail,
    }),
    [loadRec, sendEmail],
  )

  // Reaching the receipt completes the experience: build and save ONE record per session, then
  // (if the visitor asked for email) send the receipt once the save has succeeded.
  const savedFor = useRef(null)
  useEffect(() => {
    if (state.step !== 'receipt' || !state.result || savedFor.current === state.sessionId) return
    savedFor.current = state.sessionId
    const at = new Date().toISOString()
    dispatch({ type: 'COMPLETE', at })
    const s = stateRef.current
    const record = buildSubmission({ ...s, completedAt: at, picks: { book: currentPick(s.recs.book), movie: currentPick(s.recs.movie) } })
    recordRef.current = { sid: s.sessionId, record }
    persist()
    if (s.attendee.consentEmail) sendEmail()
  }, [state.step, state.result, state.sessionId, persist, sendEmail])

  const value = useMemo(() => ({ state, ...actions }), [state, actions])
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useExperience() {
  const ctx = useContext(ExperienceContext)
  if (!ctx) throw new Error('useExperience must be used inside <ExperienceProvider>')
  return ctx
}
