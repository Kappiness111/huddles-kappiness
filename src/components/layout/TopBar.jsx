import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import Button from '../ui/Button.jsx'
import { LanguageMenu } from '../ui/LanguagePicker.jsx'
import { useExperience } from '../../state/ExperienceContext.jsx'
import { useI18n } from '../../i18n/index.jsx'

/** Thin top bar: logo · step label · language menu · start over (with confirmation). */
export default function TopBar({ dark = false, label }) {
  const { state, reset, setLang } = useExperience()
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)

  return (
    <header className={`no-print relative z-30 ${dark ? 'text-cream' : 'text-espresso'}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 pt-[max(10px,env(safe-area-inset-top))] sm:px-8">
        <Logo className="h-8 sm:h-9" onDark={dark} />
        {label && <p className={`eyebrow hidden flex-1 text-center md:block ${dark ? 'text-cream/60' : 'text-espresso/55'}`}>{label}</p>}
        <div className="flex items-center">
          <LanguageMenu value={state.uiLang} onChange={setLang} label={t('lang.choose')} dark={dark} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setConfirming((c) => !c)}
              aria-label={t('common.startOver')}
              className={`grid h-11 w-11 place-items-center rounded-full transition-colors ${dark ? 'hover:bg-cream/10' : 'hover:bg-espresso/5'}`}
            >
              <RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
            <AnimatePresence>
              {confirming && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl bg-paper p-5 text-espresso shadow-[0_18px_40px_-16px_rgba(36,25,21,.45)] ring-1 ring-espresso/10"
                  role="dialog"
                  aria-label={t('common.restartTitle')}
                >
                  <p className="display text-xl">{t('common.restartTitle')}</p>
                  <p className="mt-1 text-sm text-espresso/70">{t('common.restartBody')}</p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={reset} className="flex-1">
                      {t('common.restartYes')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirming(false)} className="flex-1">
                      {t('common.cancel')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
