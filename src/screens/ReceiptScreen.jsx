import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, FileDown, Mail, Printer, RefreshCw } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import Receipt from '../components/receipt/Receipt.jsx'
import { PRINT_FORMATS, printReceipt } from '../lib/print.js'
import { currentPick, useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'

export default function ReceiptScreen() {
  const { state, go, sendEmail, setAttendee } = useExperience()
  const { t } = useI18n()
  const [format, setFormat] = useState('thermal')
  const [hint, setHint] = useState(null)
  const printRef = useRef(null)

  const data = useMemo(() => ({ ...state, picks: { book: currentPick(state.recs.book), movie: currentPick(state.recs.movie) } }), [state])
  const first = state.attendee.name.split(' ')[0]

  const doPrint = async (fmt, pdf = false) => {
    setHint(pdf ? t('receipt.pdfHint') : null)
    // The print copy must use the layout for the paper being printed (PDF is always A5).
    if (fmt !== format) setFormat(fmt)
    await new Promise((r) => setTimeout(r, pdf ? 700 : 80))
    await printReceipt(fmt, printRef.current)
  }

  return (
    <div className="min-h-dvh bg-cream">
      <TopBar label={t('receipt.kicker')} />
      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-5 pb-14 pt-6 sm:px-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div className="lg:order-2 lg:pt-6">
          <p className="eyebrow text-terracotta">{t('receipt.kicker')}</p>
          <h1 className="display mt-3 text-[clamp(2rem,7.6vw,3.4rem)] text-ink">{t('receipt.ready', { name: first })}</h1>
          <p className="mt-3 max-w-md text-espresso/70">{t('receipt.sub')}</p>

          <fieldset className="mt-8">
            <legend className="eyebrow text-espresso/55">{t('receipt.paper')}</legend>
            <div className="mt-2 grid grid-cols-2 border-y hairline">
              {Object.keys(PRINT_FORMATS).map((id, i) => {
                const on = format === id
                return (
                  <label key={id} className={`flex min-h-16 cursor-pointer flex-col justify-center px-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-terracotta ${i ? 'border-l hairline' : ''} ${on ? 'bg-paper' : ''}`}>
                    <input type="radio" name="format" value={id} checked={on} onChange={() => setFormat(id)} className="sr-only" />
                    <span className={`font-semibold ${on ? 'text-ink' : 'text-espresso/60'}`}>{t(`receipt.${id}`)}</span>
                    <span className="text-xs text-espresso/50">{t(`receipt.${id}Detail`)}</span>
                    {on && <motion.span layoutId="paper-bar" className="mt-1.5 h-0.5 w-8 bg-terracotta" />}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" onClick={() => doPrint(format)}>
              <Printer className="h-5 w-5" aria-hidden="true" />
              {t('receipt.print')}
            </Button>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button variant="outline" onClick={() => doPrint('a5', true)}>
                <FileDown className="h-4 w-4" aria-hidden="true" />
                {t('receipt.pdf')}
              </Button>
              <EmailButton state={state} sendEmail={sendEmail} t={t} />
            </div>
          </div>

          <AnimatePresence>
            {hint && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-sm text-espresso/70" role="status">
                {hint}
              </motion.p>
            )}
          </AnimatePresence>
          <EmailStatus state={state} setAttendee={setAttendee} sendEmail={sendEmail} t={t} />

          <div className="mt-10 flex justify-end border-t hairline pt-5">
            <Button variant="accent" onClick={() => go('thanks')}>
              {t('receipt.finish')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex justify-center lg:order-1">
          <motion.div key={format} initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-full overflow-hidden drop-shadow-[0_24px_30px_rgba(51,35,31,.18)]">
            <div className="rcpt-preview flex justify-center">
              <Receipt data={data} variant={format} notchBg="var(--color-cream)" />
            </div>
          </motion.div>
        </div>
      </main>

      {createPortal(
        <div className="print-root" ref={printRef}>
          <Receipt data={data} variant={format} notchBg="#fff" />
        </div>,
        document.body,
      )}
    </div>
  )
}

function EmailButton({ state, sendEmail, t }) {
  const s = state.emailStatus
  const disabled = s === 'sending' || s === 'sent' || s === 'blocked' || !state.attendee.consentEmail
  return (
    <Button variant="outline" onClick={sendEmail} disabled={disabled}>
      {s === 'sent' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
      {s === 'sending' ? t('receipt.emailSending') : t('receipt.email')}
    </Button>
  )
}

/** Honest delivery states — never claims an email was sent unless the backend confirmed it. */
function EmailStatus({ state, setAttendee, sendEmail, t }) {
  const s = state.emailStatus
  const email = state.attendee.email
  if (!state.attendee.consentEmail)
    return (
      <div className="mt-4 border-l-2 border-amber pl-4 text-sm">
        <p className="text-espresso/75">{t('receipt.emailNeedsConsent')}</p>
        <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-[#A65D36]" onChange={(e) => setAttendee({ consentEmail: e.target.checked })} />
          {t('receipt.emailAllow', { email })}
        </label>
      </div>
    )
  if (s === 'sent')
    return (
      <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-moss" role="status">
        <Check className="h-4 w-4" aria-hidden="true" /> {t('receipt.emailSent', { email })}
      </p>
    )
  if (s === 'error')
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm" role="status">
        <span className="font-semibold text-terracotta">{t('receipt.emailFailed')}</span>
        <button type="button" onClick={sendEmail} className="inline-flex min-h-10 items-center gap-1.5 font-semibold underline underline-offset-4">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> {t('receipt.emailRetry')}
        </button>
      </div>
    )
  // The server refused for good (send limit reached, request expired…): retrying won't help.
  if (s === 'blocked')
    return (
      <p className="mt-4 text-sm font-semibold text-terracotta" role="status">
        {t('receipt.emailFailed')}
      </p>
    )
  if (s === 'not-configured')
    return (
      <p className="mt-4 text-sm text-espresso/70" role="status">
        {t('receipt.emailNotConfigured')}
      </p>
    )
  return null
}
