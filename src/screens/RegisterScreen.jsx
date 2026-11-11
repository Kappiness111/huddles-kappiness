
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import Motif from '../illustrations/Motif.jsx'
import { useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Letters in any script, including Malayalam/Hindi
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u

function validate(v) {
  const e = {}

  const name = v.name.trim()

  if (
    [...name].filter((c) => /\p{L}/u.test(c)).length < 2 ||
    !NAME_RE.test(name)
  ) {
    e.name = 'name'
  }

  if (!EMAIL_RE.test(v.email.trim())) {
    e.email = 'email'
  }

  // Phone number is mandatory
  const digits = v.phone.replace(/\D/g, '')

  if (
    !v.phone.trim() ||
    digits.length < 7 ||
    digits.length > 15 ||
    /[^\d\s+()-]/.test(v.phone)
  ) {
    e.phone = 'phone'
  }

  if (!v.consentData) {
    e.consentData = 'consent'
  }

  if (!v.consentEmail) {
    e.consentEmail = 'emailConsent'
  }

  return e
}

export default function RegisterScreen() {
  const { state, setAttendee, go } = useExperience()
  const { t } = useI18n()

  const [v, setV] = useState(state.attendee)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [privacy, setPrivacy] = useState(false)

  const errors = validate(v)

  const err = (k) =>
    (submitted || touched[k]) && errors[k]
      ? t(`register.errors.${errors[k]}`)
      : null

  const set = (k) => (e) =>
    setV((s) => ({
      ...s,
      [k]:
        e.target.type === 'checkbox'
          ? e.target.checked
          : e.target.value,
    }))

  const blur = (k) => () =>
    setTouched((s) => ({ ...s, [k]: true }))

  const submit = (e) => {
    e.preventDefault()
    setSubmitted(true)

    if (Object.keys(errors).length) {
      requestAnimationFrame(() =>
        document.querySelector('[aria-invalid="true"]')?.focus()
      )
      return
    }

    setAttendee({
      ...v,
      name: v.name.trim().replace(/\s+/g, ' '),
      email: v.email.trim(),
      phone: v.phone.trim(),
    })

    go('mindlab')
  }

  return (
    <div className="min-h-dvh bg-cream">
      <TopBar />

      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:pt-16">
        <div>
          <p className="eyebrow text-terracotta">
            {t('register.kicker')}
          </p>

          <h1 className="display mt-3 text-[clamp(2rem,8vw,3.6rem)] text-ink [&:lang(ml)]:text-[clamp(1.45rem,5.6vw,2.8rem)]">
            {t('register.title')}
          </h1>

          <p className="mt-4 max-w-md text-espresso/75">
            {t('register.why')}
          </p>

          <Motif
            name="page"
            accent="#A65D36"
            className="mt-10 hidden w-40 text-espresso/70 lg:block"
          />
        </div>

        <form onSubmit={submit} noValidate className="max-w-xl">
          <Field
            id="name"
            label={t('register.name')}
            error={err('name')}
          >
            <input
              id="name"
              value={v.name}
              onChange={set('name')}
              onBlur={blur('name')}
              placeholder={t('register.namePh')}
              autoComplete="name"
              enterKeyHint="next"
              maxLength={60}
              aria-invalid={Boolean(err('name'))}
              aria-describedby="name-err"
              className={inputCls}
            />
          </Field>

          <Field
            id="email"
            label={t('register.email')}
            error={err('email')}
          >
            <input
              id="email"
              type="email"
              inputMode="email"
              value={v.email}
              onChange={set('email')}
              onBlur={blur('email')}
              placeholder={t('register.emailPh')}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              aria-invalid={Boolean(err('email'))}
              aria-describedby="email-err"
              className={inputCls}
            />
          </Field>

          <Field
            id="phone"
            label={t('register.phone')}
            error={err('phone')}
          >
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              value={v.phone}
              onChange={set('phone')}
              onBlur={blur('phone')}
              placeholder={t('register.phonePh')}
              autoComplete="tel"
              enterKeyHint="done"
              aria-invalid={Boolean(err('phone'))}
              aria-describedby="phone-err"
              className={inputCls}
            />
          </Field>

          <div className="mt-8 space-y-4">
            <Consent
              id="consentData"
              checked={v.consentData}
              onChange={set('consentData')}
              label={t('register.consentData')}
              error={err('consentData')}
            />

            <Consent
              id="consentEmail"
              checked={v.consentEmail}
              onChange={set('consentEmail')}
              label={t('register.consentEmail')}
              error={err('consentEmail')}
            />
          </div>

          <div className="mt-6 border-t hairline">
            <button
              type="button"
              onClick={() => setPrivacy((p) => !p)}
              aria-expanded={privacy}
              className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-espresso/80"
            >
              {t('register.privacyToggle')}

              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${
                  privacy ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence initial={false}>
              {privacy && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pb-3 text-sm text-espresso/70"
                >
                  {t('register.privacyBody')}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => go('welcome')}
            >
              {t('common.back')}
            </Button>

            <Button
              type="submit"
              size="lg"
              className="flex-1 sm:flex-none sm:px-10"
            >
              {t('register.submit')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}

const inputCls =
  'w-full bg-transparent pb-2.5 pt-1 text-xl text-ink placeholder:text-espresso/30 focus:outline-none [font-family:var(--font-display)]'

function Field({ id, label, hint, error, children }) {
  return (
    <div className="mt-7 first:mt-0">
      <label
        htmlFor={id}
        className="eyebrow flex items-baseline gap-2 text-espresso/60"
      >
        {label}

        {hint && (
          <span className="normal-case tracking-normal text-espresso/40">
            · {hint}
          </span>
        )}
      </label>

      <div
        className={`mt-1 border-b transition-colors focus-within:border-terracotta ${
          error ? 'border-terracotta' : 'border-espresso/25'
        }`}
      >
        {children}
      </div>

      <ErrorLine id={`${id}-err`} msg={error} />
    </div>
  )
}

function Consent({ id, checked, onChange, label, error }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-err`}
          className="peer sr-only"
        />

        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta ${
            checked
              ? 'border-espresso bg-espresso text-cream'
              : error
                ? 'border-terracotta'
                : 'border-espresso/40'
          }`}
          aria-hidden="true"
        >
          {checked && (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          )}
        </span>

        <span className="text-[0.95rem] leading-snug text-espresso/85">
          {label}
        </span>
      </label>

      <ErrorLine id={`${id}-err`} msg={error} />
    </div>
  )
}

function ErrorLine({ id, msg }) {
  return (
    <p
      id={id}
      role={msg ? 'alert' : undefined}
      className="text-sm font-medium text-terracotta"
    >
      {msg && <span className="mt-1.5 block">{msg}</span>}
    </p>
  )
}
