// Shared pieces for the book and film screens: loading, notices, and the editorial detail layout.
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ExternalLink, Heart, Info, Star, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import CoverImage from '../media/CoverImage.jsx'
import Motif from '../../illustrations/Motif.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { LANGUAGE_NATIVE } from '../../i18n/languages.js'
import { sharedGenres } from '../../lib/recommendationEngine.js'

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
            {c === 'any' ? t('rec.anyLang') : LANGUAGE_NATIVE[c]}
            {c !== 'any' && t(`langNames.${c}`) !== LANGUAGE_NATIVE[c] ? ` · ${t(`langNames.${c}`)}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

/** A little burst of hearts when a pick is loved. */
function HeartBurst({ accent }) {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => {
        const angle = (i / 9) * Math.PI * 2
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 -ml-[7px] -mt-[7px]"
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
            animate={{ x: Math.cos(angle) * 48, y: Math.sin(angle) * 48, scale: 1, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <Heart className="h-3.5 w-3.5" style={{ color: accent, fill: accent }} />
          </motion.span>
        )
      })}
    </span>
  )
}

/** Love it · Already read/seen it · Not for me. Each reaction re-ranks what comes next. */
function Reactions({ kind, rec, item, onReact, dark, accent }) {
  const { t } = useI18n()
  const loved = rec.loved === item.id
  const canMove = rec.items.length > 1
  const pill = `relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[0.95rem] font-semibold ring-1 ring-inset transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    dark ? 'ring-cream/25 hover:ring-cream/60' : 'ring-espresso/20 hover:ring-espresso/50'
  }`
  return (
    <div>
      <p className="eyebrow opacity-60">{t('rec.reactTitle')}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onReact('love')}
          aria-pressed={loved}
          className={pill}
          style={loved ? { background: accent, color: dark ? '#1B1412' : '#FBF6EE' } : undefined}
        >
          <motion.span animate={loved ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.45 }} className="inline-flex">
            <Heart className="h-4 w-4" style={loved ? { fill: 'currentColor' } : undefined} aria-hidden="true" />
          </motion.span>
          {loved ? t('rec.loved') : t('rec.love')}
          {loved && <HeartBurst key={item.id} accent={accent} />}
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => onReact('seen')} disabled={!canMove} className={pill}>
          <Check className="h-4 w-4" aria-hidden="true" />
          {t(`${kind}.seen`)}
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => onReact('nope')} disabled={!canMove} className={pill}>
          <X className="h-4 w-4" aria-hidden="true" />
          {t('rec.nope')}
        </motion.button>
      </div>
      <AnimatePresence>
        {loved && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-sm font-semibold" style={{ color: accent }} role="status">
            {t('rec.lovedNote')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The next few matches as a mini shelf: tap one to swap it in. */
function MoreMatches({ kind, rec, onReact, dark }) {
  const { t } = useI18n()
  const next = rec.items.slice(1).filter((x) => !rec.disliked.includes(x.id)).slice(0, 4)
  if (!next.length) return null
  return (
    <section className={`mt-10 border-t pt-6 ${dark ? 'border-cream/15' : 'hairline'}`} aria-label={t('rec.moreTitle')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow opacity-60">{t('rec.moreTitle')}</p>
        <p className="text-xs opacity-50">{t('rec.moreHint')}</p>
      </div>
      <ul className="mt-4 grid grid-cols-4 gap-3 sm:gap-5">
        {next.map((x, i) => (
          <motion.li key={x.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}>
            <motion.button
              type="button"
              onClick={() => onReact('pick', x.id)}
              whileHover={{ y: -6, rotate: i % 2 ? 1.5 : -1.5 }}
              whileTap={{ scale: 0.95 }}
              className="group block w-full text-left"
              aria-label={x.title}
            >
              <CoverImage
                src={x.cover}
                title={x.title}
                sub={kind === 'book' ? x.author : x.year}
                alt=""
                className={`aspect-[2/3] w-full text-[0.55rem] shadow-[0_12px_24px_-14px_rgba(36,25,21,.6)] ${kind === 'book' ? 'rounded-[2px_5px_5px_2px]' : 'rounded-md'}`}
              />
              <span className="mt-2 line-clamp-2 block text-xs font-semibold leading-snug opacity-80 group-hover:opacity-100">{x.title}</span>
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Editorial detail layout shared by the book and film screens.
 * meta: [[label, value]] rows; theme: { dark, accent }.
 */
export function RecDetail({ kind, rec, item, profile, kicker, title, subtitle, byline, meta, why, primary, links, langOptions, onLang, onReact, dark, accent }) {
  const { t } = useI18n()
  const [more, setMore] = useState(false)
  const long = (item.description ?? '').length > 280
  const notes = sharedGenres(profile, item.genres ?? {}, 3)

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
        {/* Cover / poster: flips in like a card being turned over */}
        <div className={`mx-auto w-[min(56vw,15rem)] [perspective:1200px] lg:sticky lg:top-10 lg:w-full lg:max-w-sm ${kind === 'movie' ? 'lg:order-2' : ''}`}>
          <motion.div
            initial={{ opacity: 0, rotateY: -80, y: 16 }}
            animate={{ opacity: 1, rotateY: 0, y: 0 }}
            whileHover={{ rotate: kind === 'book' ? -2 : 0, y: -6 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
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

          {notes.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1 opacity-60">{t('rec.matchesTitle')}</span>
              {notes.map((g, i) => (
                <motion.span
                  key={g}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.1, type: 'spring', stiffness: 380, damping: 20 }}
                  className="rounded-full px-3 py-1 text-sm font-semibold"
                  style={{ boxShadow: `inset 0 0 0 1px ${accent}`, color: accent }}
                >
                  {t(`genres.${g}`)}
                </motion.span>
              ))}
            </div>
          )}

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

          <div className="mt-8">
            <Reactions kind={kind} rec={rec} item={item} onReact={onReact} dark={dark} accent={accent} />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">{primary}</div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <LangSwitch value={rec.requested} options={langOptions} onChange={onLang} dark={dark} />
            {links}
          </div>
          <MoreMatches kind={kind} rec={rec} onReact={onReact} dark={dark} />
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
