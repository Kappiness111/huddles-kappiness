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
