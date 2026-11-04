// Shared pieces for the book and film screens: loading, notices, and the editorial detail layout.
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ExternalLink, Info, RefreshCw, Star } from 'lucide-react'
import Button from '../ui/Button.jsx'
import CoverImage from '../media/CoverImage.jsx'
import Motif from '../../illustrations/Motif.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { LANGUAGE_NATIVE } from '../../i18n/languages.js'

export function RecLoading({ motif = 'page' }) {
  const { t } = useI18n()
  const lines = t('rec.loading')
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % lines.length), 1400)
    return () => clearInterval(id)
  }, [lines.length])
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center" role="status">
      <motion.div animate={{ rotate: [0, 4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
        <Motif name={motif} className="w-20 opacity-70" />
      </motion.div>
      <div className="mt-8 h-px w-40 overflow-hidden bg-current/20">
        <motion.div className="h-full w-1/3 bg-current" animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="display mt-5 text-xl italic">
          {lines[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

/** Honest notices: language fallback, offline shelf, wrapped "find another". */
function Notice({ rec }) {
  const { t } = useI18n()
  const msgs = []
  if (rec.actual && rec.requested && rec.actual !== rec.requested)
    msgs.push(t('rec.fallbackLang', { wanted: t(`langNames.${rec.requested}`), actual: t(`langNames.${rec.actual}`) }))
  else if (rec.offline) msgs.push(t('rec.offline'))
  if (rec.wrapped) msgs.push(t('rec.wrapped'))
  if (!msgs.length) return null
  return (
    <p className="mt-6 flex gap-2.5 text-sm opacity-75" role="status">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{msgs.join(' ')}</span>
    </p>
  )
}

/** Inline language switch — reloads only this recommendation, never the quiz answers. */
function LangSwitch({ value, options, onChange, dark }) {
  const { t } = useI18n()
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="opacity-60">{t('rec.changeLang')}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-10 rounded-full border px-3 pr-8 font-semibold ${dark ? 'border-cream/25 bg-transparent text-cream [&>option]:text-espresso' : 'hairline bg-transparent'}`}
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {LANGUAGE_NATIVE[c]}
            {t(`langNames.${c}`) !== LANGUAGE_NATIVE[c] ? ` · ${t(`langNames.${c}`)}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Editorial detail layout shared by the book and film screens.
 * meta: [[label, value]] rows; theme: { dark, accent }.
 */
export function RecDetail({ kind, rec, item, kicker, title, subtitle, byline, meta, why, primary, links, langOptions, onLang, onAnother, dark, accent }) {
  const { t } = useI18n()
  const [more, setMore] = useState(false)
  const long = (item.description ?? '').length > 280

  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={item.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={`grid items-start gap-8 lg:gap-16 ${kind === 'movie' ? 'lg:grid-cols-[1.15fr_0.85fr]' : 'lg:grid-cols-[0.85fr_1.15fr]'}`}
      >
        {/* Cover / poster */}
        <div className={`mx-auto w-[min(56vw,15rem)] lg:sticky lg:top-10 lg:w-full lg:max-w-sm ${kind === 'movie' ? 'lg:order-2' : ''}`}>
          <motion.div initial={{ opacity: 0, rotate: kind === 'book' ? -3 : 0, y: 20 }} animate={{ opacity: 1, rotate: 0, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
            <CoverImage
              src={item.cover}
              title={item.title}
              sub={kind === 'book' ? item.author : item.year}
              alt={kind === 'book' ? `${item.title}, ${item.author ?? ''}` : `${item.title} (${item.year ?? ''})`}
              eager
              className={`aspect-[2/3] w-full ${kind === 'book' ? 'rounded-[3px_8px_8px_3px] shadow-[18px_24px_40px_-18px_rgba(36,25,21,.55)]' : 'rounded-lg shadow-[0_30px_70px_-24px_rgba(217,164,91,.45)]'}`}
            />
          </motion.div>
        </div>

        <div className={kind === 'movie' ? 'lg:order-1' : ''}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow" style={{ color: accent }}>
              {kicker}
            </p>
            <span className="eyebrow opacity-50">
              {t('rec.sourceLabel')}: {t(`rec.sources.${item.source}`)}
            </span>
          </div>
          <h1 className="display mt-3 text-[clamp(2.1rem,8.4vw,4.2rem)]">{title}</h1>
          {subtitle && (
            <p className="display mt-1 text-xl" style={{ color: accent }} lang={item.language}>
              {subtitle}
            </p>
          )}
          {byline && <p className="mt-2 text-lg opacity-80">{byline}</p>}

          <dl className={`mt-6 grid grid-cols-2 border-t ${dark ? 'border-cream/15' : 'hairline'}`}>
            {meta.filter(([, v]) => v).map(([k, v], i) => (
              <div key={k} className={`border-b py-3 ${dark ? 'border-cream/15' : 'hairline'} ${i % 2 ? 'pl-4' : 'pr-4'}`}>
                <dt className="eyebrow opacity-55">{k}</dt>
                <dd className="mt-0.5 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          {item.description && (
            <div className="mt-6">
              <p className={`max-w-xl text-[1.02rem] opacity-85 ${long && !more ? 'line-clamp-5' : ''}`} lang={item.overviewLang}>
                {item.description}
              </p>
              {long && (
                <button type="button" onClick={() => setMore((m) => !m)} className="mt-1 min-h-10 text-sm font-semibold underline underline-offset-4 opacity-70">
                  {more ? '−' : '+'}
                </button>
              )}
            </div>
          )}

          <blockquote className="mt-7 max-w-xl border-l-2 pl-5" style={{ borderColor: accent }}>
            <p className="eyebrow opacity-60">{t('rec.whyTitle')}</p>
            <p className="display mt-2 text-[1.3rem] italic leading-snug">{why}</p>
          </blockquote>

          <Notice rec={rec} />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={onAnother} disabled={rec.items.length < 2}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('rec.another')}
            </Button>
            {primary}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <LangSwitch value={rec.requested} options={langOptions} onChange={onLang} dark={dark} />
            {links}
          </div>
        </div>
      </motion.article>
    </AnimatePresence>
  )
}

export function ExternalLinkText({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold underline underline-offset-4 opacity-80 hover:opacity-100">
      {children} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  )
}

export function Rating({ value }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
      {value}/10
    </span>
  )
}

export function NextButton({ onClick, children, variant = 'primary' }) {
  return (
    <Button variant={variant} onClick={onClick}>
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  )
}
