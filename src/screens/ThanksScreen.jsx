import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import Landscape from '../illustrations/Landscape.jsx'
import Cup from '../illustrations/Cup.jsx'
import Logo from '../components/ui/Logo.jsx'
import Button from '../components/ui/Button.jsx'
import { useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'

const AUTO_RESET_S = 45

export default function ThanksScreen() {
  const { reset } = useExperience()
  const { t } = useI18n()
  const [left, setLeft] = useState(AUTO_RESET_S)

  useEffect(() => {
    if (left <= 0) {
      reset()
      return
    }
    const id = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [left, reset])

  return (
    <div className="relative min-h-dvh overflow-hidden bg-dusk text-cream">
      <Landscape variant="dusk" className="absolute inset-0" />
      {/* soft scrim so the words always read clearly over the sky */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-dusk via-dusk/80 to-transparent md:h-[86%] md:via-dusk/90" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-2xl flex-col items-center px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] text-center">
        <Logo className="h-9" onDark />
        <div className="flex flex-1 flex-col items-center pt-[9dvh]">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="display text-[clamp(2.2rem,9vw,4.4rem)] [&:lang(ml)]:text-[clamp(1.8rem,7vw,3.4rem)]">
            {t('thanks.title')}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="mt-5 max-w-md text-cream/80">
            {t('thanks.body')}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-6">
            <Cup mood="joy" className="w-16" />
          </motion.div>
        </div>
        <div className="flex w-full flex-col items-center gap-3">
          <Button variant="light" size="lg" onClick={reset} autoFocus className="w-full max-w-sm">
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            {t('thanks.cta')}
          </Button>
          <p className="text-xs text-cream/70">{t('thanks.reset', { n: left })}</p>
        </div>
      </div>
    </div>
  )
}
