// Privacy guard for a shared stall device: after inactivity, warn, then wipe the session.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useExperience } from '../../state/ExperienceContext.jsx'
import { useI18n } from '../../i18n/index.jsx'
import Button from '../ui/Button.jsx'
import Cup from '../../illustrations/Cup.jsx'

const IDLE_MS = 150_000
const COUNTDOWN_S = 20

export default function IdleGuard() {
  const { state, reset } = useExperience()
  const { t } = useI18n()
  const [warning, setWarning] = useState(false)
  const [left, setLeft] = useState(COUNTDOWN_S)
  const timer = useRef(null)
  const active = state.step !== 'welcome'

  useEffect(() => {
    if (!active) return
    const arm = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setLeft(COUNTDOWN_S)
        setWarning(true)
      }, IDLE_MS)
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }))
    arm()
    return () => {
      clearTimeout(timer.current)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [active, state.step])

  useEffect(() => {
    if (!warning) return
    if (left <= 0) {
      setWarning(false)
      reset()
      return
    }
    const id = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [warning, left, reset])

  return (
    <AnimatePresence>
      {warning && active && (
        <motion.div className="no-print fixed inset-0 z-50 grid place-items-center bg-ink/60 p-5 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alertdialog" aria-labelledby="idle-title">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm rounded-3xl bg-paper p-7 text-center">
            <Cup mood="smile" className="mx-auto w-16" />
            <h2 id="idle-title" className="display mt-3 text-3xl">
              {t('idle.title')}
            </h2>
            <p className="mt-2 text-espresso/75">{t('idle.body', { n: left })}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Button size="lg" onClick={() => setWarning(false)}>
                {t('idle.stay')}
              </Button>
              <Button variant="ghost" onClick={() => { setWarning(false); reset() }}>
                {t('idle.reset')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
