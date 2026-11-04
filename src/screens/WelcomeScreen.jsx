import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Landscape from '../illustrations/Landscape.jsx'
import Cup from '../illustrations/Cup.jsx'
import Logo from '../components/ui/Logo.jsx'
import Button from '../components/ui/Button.jsx'
import { LanguageSegments } from '../components/ui/LanguagePicker.jsx'
import { useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'
import { ESTIMATED_MINUTES } from '../state/steps.js'

const rise = (i) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.15 + i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
})

export default function WelcomeScreen() {
  const { state, go, setLang } = useExperience()
  const { t } = useI18n()
  const steps = t('welcome.steps')

  return (
    <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Copy column */}
      <div className="flex min-h-dvh flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] sm:px-10 lg:px-16 lg:py-12">
        <motion.div {...rise(0)} className="flex items-center justify-between">
          <Logo className="h-9 sm:h-10" />
          <span className="eyebrow text-espresso/55">{t('welcome.time', { n: ESTIMATED_MINUTES })}</span>
        </motion.div>

        {/* Arch-framed illustration (mobile + tablet) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-5 w-full max-w-md lg:hidden"
        >
          <Landscape className="h-[30dvh] min-h-48 rounded-t-full [@media(max-height:700px)]:h-[24dvh]" />
          <Cup mood="smile" className="absolute bottom-2 left-[14%] w-12 sm:w-14" />
        </motion.div>

        <div className="flex flex-1 flex-col justify-center py-6 lg:py-0">
          <motion.p {...rise(1)} className="eyebrow text-terracotta">
            {t('welcome.kicker')}
          </motion.p>
          <motion.h1 {...rise(2)} className="display mt-3 max-w-[15ch] text-[clamp(2.3rem,9.6vw,4.9rem)] text-ink [&:lang(ml)]:max-w-[17ch] [&:lang(ml)]:text-[clamp(1.85rem,7.2vw,3.6rem)]">
            {t('welcome.title')}
          </motion.h1>
          <motion.p {...rise(3)} className="mt-4 max-w-md text-[1.05rem] text-espresso/80 sm:text-lg">
            {t('welcome.sub')}
          </motion.p>
          <motion.p {...rise(3)} className="mt-3 hidden max-w-md text-sm text-espresso/60 lg:block">
            {t('welcome.about')}
          </motion.p>

          <motion.div {...rise(4)} className="mt-7 max-w-md">
            <p className="eyebrow mb-2 text-espresso/55">{t('lang.choose')}</p>
            <LanguageSegments value={state.uiLang} onChange={setLang} label={t('lang.choose')} />
          </motion.div>

          <motion.div {...rise(5)} className="mt-7 flex max-w-md flex-col gap-4">
            <Button size="lg" variant="accent" onClick={() => go('register')} className="w-full sm:w-auto sm:self-start sm:px-10">
              {t('welcome.cta')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
            <ol className="flex flex-wrap gap-x-5 gap-y-1">
              {steps.map((s, i) => (
                <li key={s} className="eyebrow text-espresso/50">
                  <span className="text-terracotta">0{i + 1}</span> {s}
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </div>

      {/* Full-height illustration (desktop) */}
      <div className="relative hidden p-6 lg:block">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} className="relative h-full">
          <Landscape className="h-full rounded-t-[999px] rounded-b-[2rem]" />
          <Cup mood="smile" className="absolute bottom-10 left-[16%] w-20" />
        </motion.div>
      </div>
    </div>
  )
}
