// "Why it matches you" — grounded in the attendee's actual quiz answers, never generic.
import { answersBehind, sharedGenres } from './recommendationEngine.js'

export function whyText({ t, list }, profile, item) {
  const [genre] = sharedGenres(profile, item.genres, 1)
  if (!genre) return t('rec.whyGenre', { genre: t('genres.drama') })
  const choices = answersBehind(profile, genre, 2).map((d) => `“${t(d.labelKey ?? `quiz.${d.questionId}.${d.side}.label`)}”`)
  const genreName = t(`genres.${genre}`)
  return choices.length ? t('rec.whyChoices', { choices: list(choices), genre: genreName }) : t('rec.whyGenre', { genre: genreName })
}

/** Personality description extension built from the actual preference profile. */
export function profileLine({ t }, interests) {
  const [a, b, c] = interests.map((g) => t(`genres.${g}`))
  if (c) return t('reveal.profileLine', { a, b, c })
  if (b) return t('reveal.profileLineTwo', { a, b })
  return ''
}
