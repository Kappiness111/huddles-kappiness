import { useState } from 'react'
import { ArrowRight, BookOpen, Clapperboard } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import { useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'
import { BOOK_LANGUAGES, LANGUAGE_NATIVE, MOVIE_LANGUAGES } from '../i18n/languages.js'

/** A ruled list of languages — native script first, the name in the UI language beneath. */
export function LanguageList({ label, icon: IconCmp, options, value, onChange }) {
  const { t } = useI18n()
  return (
    <fieldset>
      <legend className="eyebrow flex items-center gap-2 text-espresso/60">
        <IconCmp className="h-4 w-4" aria-hidden="true" />
        {label}
      </legend>
      <div className="mt-3 border-t hairline" role="radiogroup" aria-label={label}>
        {options.map((code) => {
          const on = value === code
          const local = t(`langNames.${code}`)
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(code)}
              className={`flex min-h-14 w-full items-center justify-between gap-4 border-b hairline px-1 text-left transition-colors ${on ? 'text-ink' : 'text-espresso/60 hover:text-espresso'}`}
            >
              <span className="flex items-baseline gap-3">
                <span lang={code} className="display text-[1.35rem]">
                  {LANGUAGE_NATIVE[code]}
                </span>
                {local !== LANGUAGE_NATIVE[code] && <span className="text-sm">{local}</span>}
              </span>
              <span className={`grid h-5 w-5 place-items-center rounded-full border ${on ? 'border-terracotta' : 'border-espresso/30'}`} aria-hidden="true">
                {on && <span className="h-2.5 w-2.5 rounded-full bg-terracotta" />}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function PrefsScreen() {
  const { state, loadRecs, go } = useExperience()
  const { t } = useI18n()
  const [book, setBook] = useState(state.prefs.book ?? state.uiLang)
  const [movie, setMovie] = useState(state.prefs.movie ?? state.uiLang)

  return (
    <div className="min-h-dvh bg-cream">
      <TopBar />
      <main className="mx-auto max-w-5xl px-5 pb-14 pt-6 sm:px-8 sm:pt-12">
        <p className="eyebrow text-terracotta">{t('prefs.kicker')}</p>
        <h1 className="display mt-3 max-w-2xl text-[clamp(2rem,8vw,3.6rem)] text-ink">{t('prefs.title')}</h1>
        <p className="mt-3 max-w-xl text-espresso/70">{t('prefs.sub')}</p>

        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-14">
          <LanguageList label={t('prefs.book')} icon={BookOpen} options={BOOK_LANGUAGES} value={book} onChange={setBook} />
          <LanguageList label={t('prefs.movie')} icon={Clapperboard} options={MOVIE_LANGUAGES} value={movie} onChange={setMovie} />
        </div>

        <Button
          size="lg"
          onClick={() => {
            loadRecs({ book, movie })
            go('book')
          }}
          className="mt-12 w-full sm:w-auto sm:px-10"
        >
          {t('prefs.cta')}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </main>
    </div>
  )
}
