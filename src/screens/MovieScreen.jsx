import { useEffect } from 'react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import { ExternalLinkText, NextButton, Rating, RecDetail, RecLoading } from '../components/rec/RecParts.jsx'
import { currentPick, useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'
import { LANGUAGE_NATIVE, MOVIE_LANGUAGES } from '../i18n/languages.js'
import { whyText } from '../lib/why.js'

export default function MovieScreen() {
  const { state, nextRec, go, loadRec } = useExperience()
  const i18n = useI18n()
  const { t } = i18n
  const rec = state.recs.movie
  const movie = currentPick(rec)

  const upcoming = rec.items[(rec.index + 1) % Math.max(1, rec.items.length)]
  useEffect(() => {
    if (upcoming?.cover) new Image().src = upcoming.cover
  }, [upcoming])

  return (
    <div className="grain min-h-dvh bg-[#1B1412] text-cream">
      {/* soft projector light */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60dvh] bg-[radial-gradient(60%_60%_at_70%_0%,rgba(217,164,91,.16),transparent_70%)]" aria-hidden="true" />
      <TopBar dark label={t('movie.kicker')} />
      <main className="relative mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-12">
        {rec.status === 'loading' && <RecLoading motif="horizon" />}
        {rec.status === 'error' && (
          <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 text-center">
            <p className="display text-2xl">{t('rec.error')}</p>
            <Button variant="light" onClick={() => loadRec('movie', state.prefs.movie)}>{t('common.tryAgain')}</Button>
            <Button variant="ghost" onClick={() => go('receipt')}>{t('movie.next')}</Button>
          </div>
        )}
        {rec.status === 'ready' && movie && (
          <RecDetail
            kind="movie"
            dark
            rec={rec}
            item={movie}
            accent="#D9A45B"
            kicker={t('movie.kicker')}
            title={movie.title}
            subtitle={movie.originalTitle && movie.originalTitle !== movie.title ? `${t('movie.original')}: ${movie.originalTitle}` : null}
            meta={[
              [t('rec.language'), LANGUAGE_NATIVE[movie.language] ?? movie.language],
              [t('rec.genre'), movie.genreLabel],
              [t('movie.released'), movie.year],
              [t('movie.rating'), movie.rating ? <Rating value={movie.rating} /> : null],
            ]}
            why={whyText(i18n, state.result.profile, movie)}
            langOptions={MOVIE_LANGUAGES}
            onLang={(l) => loadRec('movie', l)}
            onAnother={() => nextRec('movie')}
            primary={
              <NextButton variant="light" onClick={() => go('receipt')}>
                {t('movie.next')}
              </NextButton>
            }
            links={
              <>
                <button type="button" onClick={() => go('book')} className="min-h-10 text-sm font-semibold opacity-70 hover:opacity-100">
                  ← {t('book.kicker')}
                </button>
                {movie.link && <ExternalLinkText href={movie.link}>{t('movie.details')}</ExternalLinkText>}
              </>
            }
          />
        )}
      </main>
    </div>
  )
}
