import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import Motif from '../illustrations/Motif.jsx'
import { useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'
import { profileLine } from '../lib/why.js'

const BREW_MS = 2700

export default function RevealScreen() {
  const { state, go } = useExperience()
  const i18n = useI18n()
  const { t } = i18n
  const [brewing, setBrewing] = useState(true)
  const [line, setLine] = useState(0)
  const lines = t('reveal.brewing')

  useEffect(() => {
    const a = setInterval(() => setLine((l) => Math.min(l + 1, lines.length - 1)), BREW_MS / lines.length)
    const b = setTimeout(() => setBrewing(false), BREW_MS)
    return () => {
      clearInterval(a)
      clearTimeout(b)
    }
  }, [lines.length])

  const { personality: p, interests, profile } = state.result
  const tone = p.tone
  const first = state.attendee.name.split(' ')[0]

  return (
    <div className="grain min-h-dvh" style={{ background: tone.bg, color: tone.ink }}>
      <TopBar dark />
      <AnimatePresence mode="wait">
        {brewing ? (
          <motion.main key="brew" exit={{ opacity: 0 }} className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center" role="status">
            <Motif name={tone.motif} accent={tone.accent} animate strokeWidth={1.2} className="w-28 opacity-80" />
            <div className="mt-8 h-px w-40 overflow-hidden bg-current/20">
              <motion.div className="h-full bg-current" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: BREW_MS / 1000, ease: 'easeInOut' }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.p key={line} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="display mt-6 text-2xl italic">
                {lines[line]}
              </motion.p>
            </AnimatePresence>
          </motion.main>
        ) : (
          <motion.main key="reveal" className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-14 pt-6 sm:px-8 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto aspect-square w-[min(62vw,17rem)] lg:w-full lg:max-w-md">
              <div className="absolute inset-0 rounded-full border border-current/20" />
              <div className="absolute inset-[8%] rounded-full border border-current/10" />
              <Motif name={tone.motif} accent={tone.accent} strokeWidth={1.1} className="absolute inset-[18%]" />
            </motion.div>

            <div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="eyebrow opacity-70">
                {t('reveal.youAre', { name: first })}
              </motion.p>
              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="display mt-3 text-[clamp(2.6rem,11vw,5.6rem)] [&:lang(ml)]:text-[clamp(1.8rem,7.4vw,4rem)] [&:lang(hi)]:text-[clamp(2.2rem,9vw,4.8rem)]">
                {t(`personalities.${p.id}.title`)}
              </motion.h1>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }}>
                <p className="display mt-4 text-[clamp(1.2rem,4.4vw,1.7rem)] italic" style={{ color: tone.accent }}>
                  {t(`personalities.${p.id}.tagline`)}
                </p>
                <p className="mt-5 max-w-xl text-[1.05rem] opacity-85">
                  {t(`personalities.${p.id}.description`)} {profileLine(i18n, interests)}
                </p>

                <div className="mt-8 max-w-xl border-t border-current/20 pt-5">
                  <p className="eyebrow opacity-60">{t('reveal.strongest')}</p>
                  <ul className="mt-3 space-y-3">
                    {interests.map((g, k) => (
                      <li key={g} className="grid grid-cols-[minmax(0,1fr)_6rem_2.5rem] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_2.5rem]">
                        <span className="font-semibold">{t(`genres.${g}`)}</span>
                        <span className="h-px bg-current/15">
                          <motion.span
                            className="block h-[3px] -translate-y-px"
                            style={{ background: tone.accent }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(12, Math.round(profile.genres[g] * 100))}%` }}
                            transition={{ delay: 1 + k * 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </span>
                        <span className="text-right font-mono text-xs tabular-nums opacity-70">{Math.round(profile.genres[g] * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-6 text-xs opacity-55">{t('reveal.disclaimer')}</p>
                <Button variant="light" size="lg" onClick={() => go('prefs')} className="mt-8 w-full sm:w-auto sm:px-10">
                  {t('reveal.cta')}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </motion.div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  )
}
