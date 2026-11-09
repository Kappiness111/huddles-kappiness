// THIS OR THAT — the only preference quiz. One question per screen, an editorial split of two
// panels. The palette pairing changes from question to question so no two screens feel the same.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import Motif from '../illustrations/Motif.jsx'
import { questionsFor } from '../data/quiz.js'
import { useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'

const ADVANCE_MS = 650
const INTERLUDE_MS = 1900

// [this, that] panel tones — warm light against a deep counterpart.
const PAIRS = [
  [{ bg: '#FBF6EE', ink: '#33231F', accent: '#A65D36' }, { bg: '#33231F', ink: '#F5EBDD', accent: '#D9A45B' }],
  [{ bg: '#E8D0B0', ink: '#33231F', accent: '#A65D36' }, { bg: '#2F3A4F', ink: '#F5EBDD', accent: '#D9A45B' }],
  [{ bg: '#F5EBDD', ink: '#33231F', accent: '#4F5D47' }, { bg: '#4F5D47', ink: '#F5EBDD', accent: '#E8D0B0' }],
  [{ bg: '#EFD9BD', ink: '#33231F', accent: '#33231F' }, { bg: '#A65D36', ink: '#FBF6EE', accent: '#33231F' }],
  [{ bg: '#FBF6EE', ink: '#33231F', accent: '#B87945' }, { bg: '#1E2A29', ink: '#F5EBDD', accent: '#D9A45B' }],
]

export default function QuizScreen() {
  const { state, answerQuiz, finishQuiz, go } = useExperience()
  const { t } = useI18n()
  const answers = state.quizAnswers
  // This visitor's own mix of questions — fixed for the whole session.
  const QUIZ = useMemo(() => questionsFor(state.quizSet), [state.quizSet])
  const TOTAL = QUIZ.length
  const [index, setIndex] = useState(() => {
    const i = QUIZ.findIndex((x) => !answers[x.id])
    return i === -1 ? TOTAL - 1 : i
  })
  const [dir, setDir] = useState(1)
  const [interlude, setInterlude] = useState(null)
  // The two genres this answer pushed up most, shown as a quick "+ Mystery + Thriller" pop.
  const [boost, setBoost] = useState(null)
  const timer = useRef(null)
  const q = QUIZ[index]
  const choice = answers[q.id]
  const pair = PAIRS[index % PAIRS.length]

  useEffect(() => () => clearTimeout(timer.current), [])

  const advance = useCallback(
    (from) => {
      if (from >= TOTAL - 1) return finishQuiz()
      const move = () => {
        setDir(1)
        setIndex(from + 1)
      }
      const inter = QUIZ[from].interlude
      if (inter) {
        setInterlude(inter)
        timer.current = setTimeout(() => {
          setInterlude(null)
          move()
        }, INTERLUDE_MS)
      } else move()
    },
    [finishQuiz, QUIZ, TOTAL],
  )

  const choose = (side) => {
    if (interlude) return
    clearTimeout(timer.current)
    answerQuiz(q.id, side)
    const top = Object.entries(q[side].genres).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([g]) => g)
    setBoost({ key: `${q.id}-${side}-${Date.now()}`, genres: top })
    const from = index
    timer.current = setTimeout(() => advance(from), ADVANCE_MS)
  }

  const back = () => {
    clearTimeout(timer.current)
    setInterlude(null)
    if (index === 0) return go('mindlab')
    setDir(-1)
    setIndex(index - 1)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <TopBar label={t('quiz.kicker')} />

      <div className="mx-auto w-full max-w-6xl px-5 pt-4 sm:px-8">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm tabular-nums text-espresso/70">{t('quiz.question', { n: String(index + 1).padStart(2, '0'), total: TOTAL })}</span>
          <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={Object.keys(answers).length} aria-label={t('quiz.kicker')}>
            {QUIZ.map((x, i) => (
              <span key={x.id} className={`h-[3px] flex-1 rounded-full transition-colors duration-500 ${answers[x.id] ? 'bg-terracotta' : i === index ? 'bg-espresso/45' : 'bg-espresso/12'}`} />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.main
          key={q.id}
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-5 pt-5 sm:px-8 sm:pt-8"
        >
          <h1 id="quiz-q" className="display max-w-3xl text-[clamp(1.9rem,7.4vw,3.6rem)] text-ink">
            {t(`quiz.${q.id}.prompt`)}
          </h1>

          <div className="relative mt-5 grid flex-1 grid-rows-2 gap-2 md:mt-8 md:grid-cols-2 md:grid-rows-1 md:gap-3" role="radiogroup" aria-labelledby="quiz-q">
            {['a', 'b'].map((side, k) => {
              const tone = pair[k]
              const on = choice === side
              const dim = choice && !on
              return (
                <motion.button
                  key={side}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choose(side)}
                  animate={{ opacity: dim ? 0.42 : 1 }}
                  whileTap={{ scale: 0.99 }}
                  className="grain group relative flex min-h-[24dvh] flex-col justify-between overflow-hidden rounded-[1.25rem] p-5 text-left transition-shadow sm:p-7 md:min-h-[50dvh]"
                  style={{ background: tone.bg, color: tone.ink, boxShadow: on ? `inset 0 0 0 2px ${tone.accent}` : 'none' }}
                >
                  <span className="relative z-10 flex items-center justify-between">
                    <span className="font-mono text-xs opacity-60">{side === 'a' ? 'A' : 'B'}</span>
                    {on && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: tone.accent, color: tone.bg }}>
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </motion.span>
                    )}
                  </span>
                  <Motif
                    name={q[side].motif}
                    accent={tone.accent}
                    className="pointer-events-none absolute right-4 top-1/2 w-[32%] max-w-44 -translate-y-1/2 opacity-80 transition-transform duration-700 group-hover:rotate-3 [&:lang(ml)]:opacity-35 md:right-8 md:top-[38%] md:w-[42%]"
                  />
                  <span className="relative z-10 max-w-[74%] md:max-w-[80%] [&:lang(ml)]:max-w-full">
                    <span className="display block text-[clamp(1.45rem,5.4vw,2.4rem)] [&:lang(ml)]:text-[clamp(1.15rem,4.4vw,1.9rem)]">{t(`quiz.${q.id}.${side}.label`)}</span>
                    <span className="mt-1.5 block text-sm opacity-70 sm:text-base">{t(`quiz.${q.id}.${side}.sub`)}</span>
                  </span>
                </motion.button>
              )
            })}
            <AnimatePresence>
              {boost && (
                <motion.div
                  key={boost.key}
                  initial={{ opacity: 0, y: 14, scale: 0.9 }}
                  animate={{ opacity: 1, y: -6, scale: 1 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  onAnimationComplete={() => setTimeout(() => setBoost((b) => (b?.key === boost.key ? null : b)), 500)}
                  className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2"
                  aria-hidden="true"
                >
                  {boost.genres.map((g) => (
                    <span key={g} className="rounded-full bg-espresso px-3.5 py-1.5 text-sm font-semibold text-cream shadow-[0_10px_24px_-10px_rgba(36,25,21,.6)]">
                      + {t(`genres.${g}`)}
                    </span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <span className="display pointer-events-none absolute left-1/2 top-1/2 z-10 grid h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 place-items-center whitespace-nowrap rounded-full bg-cream px-3 text-lg italic leading-none text-espresso ring-1 ring-espresso/15 md:h-14 md:min-w-14" aria-hidden="true">
              {t('quiz.or')}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={back}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('common.back')}
            </Button>
            <p className="hidden text-sm text-espresso/55 sm:block">{t('quiz.hint')}</p>
            <Button onClick={() => advance(index)} disabled={!choice}>
              {index === TOTAL - 1 ? t('quiz.reveal') : t('common.next')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </motion.main>
      </AnimatePresence>

      <AnimatePresence>
        {interlude && (
          <motion.div className="fixed inset-0 z-40 grid place-items-center bg-cream px-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} role="status">
            <div className="max-w-xl">
              <Motif name="ripple" accent="#A65D36" animate className="mx-auto w-20 text-espresso/50" />
              <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }} className="display mt-8 text-[clamp(1.8rem,7vw,3rem)] italic text-ink">
                {t(`quiz.interludes.${interlude}`)}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
