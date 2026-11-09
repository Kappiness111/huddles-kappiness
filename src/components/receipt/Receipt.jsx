// The collectible story receipt — styled like a slip from an independent bookshop.
// Presentational only. Sized in `em` (see .rcpt in index.css) so print.js can rescale it.
import { QRCodeSVG } from 'qrcode.react'
import Cup from '../../illustrations/Cup.jsx'
import Motif from '../../illustrations/Motif.jsx'
import { translate } from '../../i18n/index.jsx'
import { LANGUAGE_NATIVE } from '../../i18n/languages.js'
import { LOGO_SRC } from '../../lib/media.js'
import { formatReceiptDate } from '../../lib/receiptDate.js'

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5em', fontSize: '0.88em' }}>
      <span className="rcpt-label" style={{ fontSize: '0.78em' }}>{k}</span>
      <span style={{ flex: 1, borderBottom: '1px dotted var(--rule)', transform: 'translateY(-0.3em)', minWidth: '1em' }} />
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

function Pick({ label, item, meta, t }) {
  if (!item) return null
  const original = item.nativeTitle ?? (item.originalTitle && item.originalTitle !== item.title ? item.originalTitle : null)
  return (
    <div style={{ display: 'flex', gap: '0.9em', alignItems: 'flex-start', minWidth: 0 }}>
      {item.cover && (
        <img src={item.cover} alt="" loading="eager" referrerPolicy="no-referrer" style={{ width: '4.2em', height: '6.3em', borderRadius: '0.2em', flexShrink: 0, boxShadow: '0 0.4em 0.8em -0.4em rgba(36,25,21,.5)' }} />
      )}
      <div style={{ minWidth: 0 }}>
        <p className="rcpt-label">{label}</p>
        <p className="rcpt-display" style={{ fontSize: '1.35em', marginTop: '0.2em' }}>{item.title}</p>
        {original && (
          <p style={{ fontSize: '0.86em', fontWeight: 600, color: 'var(--accent)' }} lang={item.language}>
            {original}
          </p>
        )}
        {meta && <p style={{ fontSize: '0.84em', marginTop: '0.15em' }}>{meta}</p>}
        <p style={{ fontSize: '0.78em', marginTop: '0.3em', color: 'var(--soft)' }}>
          {t('receipt.inLang', { lang: LANGUAGE_NATIVE[item.language] ?? item.language })}
          {item.genreLabel ? ` · ${item.genreLabel}` : ''}
        </p>
      </div>
    </div>
  )
}

export default function Receipt({ data, variant = 'thermal', notchBg }) {
  const { attendee, receiptNo, completedAt, result, uiLang } = data
  const t = (k, v) => translate(uiLang, k, v)
  const p = result.personality
  const { book, movie } = data.picks
  const a5 = variant === 'a5'
  const first = attendee.name.split(' ')[0]
  const date = formatReceiptDate(completedAt, uiLang)
  const qrValue = `KAPPINESS|${receiptNo}|${p.id}|${book?.id ?? ''}|${movie?.id ?? ''}`

  return (
    <article className={`rcpt ${a5 ? 'is-a5' : ''}`} style={notchBg ? { '--notch-bg': notchBg } : undefined} aria-label={t('receipt.title')}>
      <div className="rcpt-inner">
        <header style={{ textAlign: 'center' }}>
          <img src={LOGO_SRC} alt="Kappiness" loading="eager" style={{ height: '3.6em', width: 'auto', margin: '0 auto', objectFit: 'contain' }} />
          <p className="rcpt-label" style={{ marginTop: '1em' }}>{t('receipt.original')}</p>
          <h2 className="rcpt-display" style={{ fontSize: a5 ? '2.2em' : '1.95em', marginTop: '0.2em', fontStyle: 'italic' }}>
            {t('receipt.title')}
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72em', letterSpacing: '0.12em', marginTop: '0.5em', color: 'var(--soft)' }}>
            {t('receipt.no')} {receiptNo}
          </p>
        </header>

        <hr className="rcpt-rule is-double" />
        <section style={{ display: 'grid', gap: '0.35em' }}>
          <Row k={t('receipt.name')} v={attendee.name} />
          <Row k={t('receipt.date')} v={date} />
        </section>

        <div className="rcpt-notch" />
        <section style={{ textAlign: 'center' }}>
          <p className="rcpt-label">{t('receipt.personality')}</p>
          <div style={{ width: '3.4em', margin: '0.5em auto 0', color: 'var(--ink)' }}>
            <Motif name={p.tone.motif} accent="var(--accent)" strokeWidth={2} className="h-auto w-full" />
          </div>
          <p className="rcpt-display" style={{ fontSize: a5 ? '2.2em' : '1.95em', marginTop: '0.3em' }}>
            {t(`personalities.${p.id}.title`)}
          </p>
          <p className="rcpt-display" style={{ fontStyle: 'italic', fontSize: '1.08em', marginTop: '0.3em', color: 'var(--accent)' }}>
            {t(`personalities.${p.id}.tagline`)}
          </p>
          <p style={{ fontSize: '0.86em', marginTop: '0.55em' }}>{t(`personalities.${p.id}.description`)}</p>
        </section>

        <div className="rcpt-notch" />
        <section style={{ display: 'grid', gridTemplateColumns: a5 ? '1fr 1fr' : '1fr', gap: a5 ? '1.4em' : '1.1em' }}>
          <Pick t={t} label={t('receipt.read')} item={book} meta={book?.author} />
          <Pick t={t} label={t('receipt.watch')} item={movie} meta={movie?.year ? String(movie.year) : null} />
        </section>

        <div className="rcpt-notch" />
        <footer style={{ display: 'grid', gridTemplateColumns: a5 ? '1.2fr 1fr' : '1fr', gap: a5 ? '1.6em' : '1em', alignItems: 'center' }}>
          <p className="rcpt-display" style={{ fontSize: '1.15em', fontStyle: 'italic' }}>
            {t('receipt.message', { name: first })}
          </p>
          <div style={{ display: 'flex', gap: '0.9em', alignItems: 'center', ...(a5 ? { borderLeft: '1px dashed var(--rule)', paddingLeft: '1.4em' } : {}) }}>
            <div style={{ background: '#fff', padding: '0.3em', borderRadius: '0.3em', flexShrink: 0, lineHeight: 0 }}>
              <QRCodeSVG value={qrValue} size={256} level="M" bgColor="#ffffff" fgColor="#33231F" style={{ width: '4.4em', height: '4.4em' }} title={receiptNo} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="rcpt-display" style={{ fontSize: '1em' }} lang="en">
                {t('receipt.footer')}
              </p>
              <p style={{ fontSize: '0.76em', marginTop: '0.3em', color: 'var(--soft)' }}>{t('receipt.thanks')}</p>
            </div>
            {!a5 && <Cup mood="smile" steam={false} float={false} className="w-[2.8em] shrink-0" />}
          </div>
        </footer>

        <p className="rcpt-label" style={{ textAlign: 'center', marginTop: '1.4em' }}>
          ✦ {t('receipt.keep')} ✦
        </p>
      </div>
    </article>
  )
}
