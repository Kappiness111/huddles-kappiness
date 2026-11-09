
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
