// THE MIND LAB — the only thinking game. Intro → 3 challenges (one at a time) → completion.
// No scores, no labels; nothing here affects the recommendations.
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import Cup from '../illustrations/Cup.jsx'
import Motif from '../illustrations/Motif.jsx'
import { CHALLENGES, findDecision, findPattern, findPerspective, patternAnswer } from '../data/mindlab.js'
import { useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'

const LETTERS = ['A', 'B', 'C', 'D']
const LAB_BG = {
  backgroundColor: '#1E2A29',
  backgroundImage:
    'linear-gradient(rgb(245 235 221 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(245 235 221 / 0.045) 1px, transparent 1px)',
  backgroundSize: '28px 28px',
}
const MOTIF = { perspective: 'orbit', pattern: 'lattice', decision: 'door' }

export default function MindLabScreen() {
  const { state, recordMindLab, completeMindLab, go } = useExperience()
  const { t } = useI18n()
  const [stage, setStage] = useState(state.mindLab.completed ? 'done' : 'intro')
  const [i, setI] = useState(0)

  const next = () => {
    if (i + 1 < CHALLENGES.length) setI(i + 1)
    else {
      completeMindLab()
      setStage('done')
    }
  }

  return (
    <div className="min-h-dvh text-cream" style={LAB_BG}>
      <TopBar dark label={t('mindlab.title')} />
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.main key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-3xl flex-col justify-center px-5 pb-12 pt-6 sm:px-8">
            <p className="eyebrow text-amber">{t('mindlab.kicker')}</p>
            <h1 className="display mt-3 text-[clamp(2.8rem,12vw,6rem)] [&:lang(ml)]:text-[clamp(2.2rem,9vw,4.6rem)]">{t('mindlab.title')}</h1>
            <p className="display mt-3 text-[clamp(1.3rem,4.6vw,2rem)] italic text-cream/85">{t('mindlab.tagline')}</p>
            <p className="mt-5 max-w-lg text-cream/65">{t('mindlab.intro')}</p>
            <ol className="mt-9 border-t border-cream/15">
              {CHALLENGES.map((c, k) => (
                <li key={c} className="flex items-center gap-4 border-b border-cream/15 py-4">
                  <span className="font-mono text-sm text-amber">0{k + 1}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{t(`mindlab.categories.${c}.name`)}</span>
                    <span className="block text-sm text-cream/55">{t(`mindlab.categories.${c}.area`)}</span>
                  </span>
                  <Motif name={MOTIF[c]} accent="#D9A45B" className="w-10 text-cream/60" />
                </li>
              ))}
            </ol>
            <Button variant="light" size="lg" onClick={() => setStage('play')} className="mt-9 w-full sm:w-auto sm:self-start sm:px-10">
              {t('mindlab.begin')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </motion.main>
        )}

        {stage === 'play' && (
          <Challenge
            key={CHALLENGES[i]}
            index={i}
            kind={CHALLENGES[i]}
            itemId={state.mindLab.picks[CHALLENGES[i]]}
            onRecord={(r) => recordMindLab(CHALLENGES[i], r)}
            onNext={next}
          />
        )}

        {stage === 'done' && (
          <motion.main key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-2xl flex-col items-center justify-center px-6 pb-12 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
              <Cup mood="joy" className="w-24" />
            </motion.div>
            <h1 className="display mt-8 text-[clamp(2.1rem,8.5vw,4rem)] [&:lang(ml)]:text-[clamp(1.55rem,6vw,3rem)]">{t('mindlab.doneTitle')}</h1>
            <p className="display mt-4 text-[clamp(1.15rem,4vw,1.6rem)] italic text-cream/75">{t('mindlab.doneSub')}</p>
            <Button variant="accent" size="lg" onClick={() => go('quiz')} className="mt-10 w-full sm:w-auto sm:px-10">
              {t('mindlab.doneCta')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}

function Challenge({ index, kind, itemId, onRecord, onNext }) {
  const { t } = useI18n()
  const [choice, setChoice] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  let options, situation, question, considered, answer, base
  if (kind === 'pattern') {
    const p = findPattern(itemId)
    answer = patternAnswer(p)
    options = p.options.map(String)
    question = t('mindlab.pattern.question')
    base = p
  } else {
    const item = kind === 'perspective' ? findPerspective(itemId) : findDecision(itemId)
    const k = `mindlab.${kind}.${itemId}`
    options = item.options
    situation = t(`${k}.situation`)
    question = t(`${k}.question`)
    considered = item.considered
  }
  const label = (o) => (kind === 'pattern' ? o : t(`mindlab.${kind}.${itemId}.${o}.label`))

  const submit = () => {
    setSubmitted(true)
    onRecord(
      kind === 'pattern'
        ? { id: itemId, choice: Number(choice), correct: Number(choice) === answer }
        : { id: itemId, choice },
    )
  }

  const total = CHALLENGES.length
  return (
    <motion.main initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-3xl px-5 pb-14 pt-5 sm:px-8 sm:pt-10">
      {/* Progress */}
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow text-amber">{t('mindlab.challenge', { n: String(index + 1).padStart(2, '0'), total: String(total).padStart(2, '0') })}</p>
        <div className="flex w-28 gap-1.5" aria-hidden="true">
          {Array.from({ length: total }, (_, k) => (
            <span key={k} className={`h-0.5 flex-1 ${k < index ? 'bg-amber' : k === index ? 'bg-cream' : 'bg-cream/20'}`} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-start justify-between gap-6">
        <div>
          <p className="display text-xl italic text-amber">{t(`mindlab.categories.${kind}.name`)}</p>
          <p className="mt-1 text-sm text-cream/55">{t(`mindlab.categories.${kind}.area`)}</p>
        </div>
        <Motif name={MOTIF[kind]} accent="#D9A45B" className="w-14 shrink-0 text-cream/50 sm:w-20" />
      </div>

      {situation && <p className="mt-6 max-w-2xl text-lg text-cream/80">{situation}</p>}
      {kind === 'pattern' && (
        <p className="display mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[clamp(2.2rem,9vw,3.6rem)] tabular-nums">
          {base.seq.map((n, k) => (
            <span key={k} className="text-cream">
              {n}
              <span className="text-cream/30">,</span>
            </span>
          ))}
          <span className="italic text-amber">{submitted ? answer : '?'}</span>
        </p>
      )}
      <h2 className="display mt-6 text-[clamp(1.5rem,5.6vw,2.3rem)]">{question}</h2>

      {/* Options as a ruled list, not cards */}
      <div className={`mt-6 border-t border-cream/15 ${kind === 'pattern' ? 'grid grid-cols-2 sm:grid-cols-4' : ''}`} role="radiogroup" aria-label={question}>
        {options.map((o, k) => {
          const on = choice === o
          const isAnswer = kind === 'pattern' && Number(o) === answer
          const isConsidered = considered === o
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={submitted}
              onClick={() => setChoice(o)}
              className={`group relative flex min-h-16 w-full items-center gap-4 border-b border-cream/15 px-1 py-3.5 text-left transition-colors ${
                kind === 'pattern' ? 'even:border-l sm:border-l sm:first:border-l-0' : ''
              } ${on ? 'bg-cream/[0.07]' : 'hover:bg-cream/[0.04]'} ${submitted && !on && !isAnswer && !isConsidered ? 'opacity-45' : ''}`}
            >
              {on && <motion.span layoutId={`bar-${kind}`} className="absolute inset-y-0 left-0 w-0.5 bg-amber" />}
              <span className={`pl-3 font-mono text-xs ${on ? 'text-amber' : 'text-cream/45'}`}>{LETTERS[k]}</span>
              <span className={`flex-1 ${kind === 'pattern' ? 'display text-2xl tabular-nums' : 'text-[1.02rem] leading-snug'}`}>{label(o)}</span>
              {submitted && (isAnswer || (on && kind !== 'pattern')) && (
                <Check className={`mr-2 h-4 w-4 shrink-0 ${isAnswer ? 'text-amber' : 'text-cream/60'}`} aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div key="submit" exit={{ opacity: 0 }} className="mt-8 flex justify-end">
            <Button variant="light" size="lg" onClick={submit} disabled={choice === null} className="w-full sm:w-auto sm:px-10">
              {t('mindlab.submit')}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="fb" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mt-8" role="status">
            <Feedback kind={kind} itemId={itemId} choice={choice} answer={answer} considered={considered} />
            <Button variant="light" size="lg" onClick={onNext} className="mt-8 w-full sm:w-auto sm:px-10" autoFocus>
              {t('mindlab.continue')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  )
}

function Feedback({ kind, itemId, choice, answer, considered }) {
  const { t } = useI18n()
  if (kind === 'pattern') {
    const right = Number(choice) === answer
    return (
      <div className="border-l-2 border-amber pl-5">
        <p className="display text-2xl">{right ? t('mindlab.pattern.correct') : t('mindlab.pattern.close')}</p>
        {!right && <p className="mt-1 font-semibold text-amber">{t('mindlab.pattern.answerIs', { answer })}</p>}
        <p className="mt-3 max-w-2xl text-cream/75">{t(`mindlab.pattern.explain.${itemId}`)}</p>
      </div>
    )
  }
  const k = `mindlab.${kind}.${itemId}`
  const heading = kind === 'decision' ? t('mindlab.decision.note') : choice === considered ? t('mindlab.perspective.considered') : t('mindlab.perspective.another')
  return (
    <div className="border-l-2 border-amber pl-5">
      <p className="eyebrow text-amber">{heading}</p>
      <p className="mt-2 max-w-2xl text-[1.05rem] text-cream/90">{t(`${k}.${choice}.note`)}</p>
      {kind === 'perspective' && choice !== considered && (
        <p className="mt-3 max-w-2xl text-cream/70">
          <span className="font-semibold text-cream/85">{t(`${k}.${considered}.label`)}</span> {t(`${k}.${considered}.note`)}
        </p>
      )}
      <p className="display mt-4 max-w-2xl text-lg italic text-cream/75">{kind === 'decision' ? t('mindlab.decision.explain') : t(`${k}.explain`)}</p>
    </div>
  )
}
