import { useEffect } from 'react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import { ExternalLinkText, NextButton, RecDetail, RecLoading } from '../components/rec/RecParts.jsx'
import { currentPick, useExperience } from '../state/ExperienceContext.jsx'
import { useI18n } from '../i18n/index.jsx'
import { BOOK_LANGUAGES, LANGUAGE_NATIVE } from '../i18n/languages.js'
import { whyText } from '../lib/why.js'

export default function BookScreen() {
  const { state, reactRec, go, loadRec } = useExperience()
  const i18n = useI18n()
  const { t } = i18n
  const rec = state.recs.book
  const book = currentPick(rec)

  // Preload the next cover so "Find another" feels instant.
  const upcoming = rec.items[(rec.index + 1) % Math.max(1, rec.items.length)]
  useEffect(() => {
    if (upcoming?.cover) new Image().src = upcoming.cover
  }, [upcoming])

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <TopBar label={t('book.kicker')} />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-12">
        {rec.status === 'loading' && <RecLoading motif="page" />}
        {rec.status === 'error' && (
          <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 text-center">
            <p className="display text-2xl">{t('rec.error')}</p>
            <Button onClick={() => loadRec('book', state.prefs.book)}>{t('common.tryAgain')}</Button>
            <Button variant="ghost" onClick={() => go('movie')}>{t('book.next')}</Button>
          </div>
        )}
        {rec.status === 'ready' && book && (
          <RecDetail
            kind="book"
            rec={rec}
            profile={state.result.profile}
            item={book}
            accent="#A65D36"
            kicker={t('book.kicker')}
            title={book.title}
            subtitle={book.nativeTitle}
            byline={book.author ? t('book.by', { author: book.author }) : null}
            meta={[
              [t('rec.language'), LANGUAGE_NATIVE[book.language] ?? book.language],
              [t('rec.genre'), book.genreLabel],
              [t('book.published'), book.year],
              [t('book.isbn'), book.isbn],
            ]}
            why={whyText(i18n, state.result.profile, book)}
            langOptions={BOOK_LANGUAGES}
            onLang={(l) => loadRec('book', l)}
            onReact={(reaction, id) => reactRec('book', reaction, id)}
            primary={<NextButton onClick={() => go('movie')}>{t('book.next')}</NextButton>}
            links={book.link && <ExternalLinkText href={book.link}>{t('book.preview')}</ExternalLinkText>}
          />
        )}
      </main>
    </div>
  )
}
