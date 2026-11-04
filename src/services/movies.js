// Movie recommendations.
//   1. TMDB Discover — with_original_language = the attendee's choice (a Malayalam pick is a film
//      originally made in Malayalam), genres from their profile, localized metadata via `language`.
//   2. TMDB Discover broadened (language only), then TMDB Search for curated titles in that language.
//   3. Curated shelf (offline / not configured).
// `language` on each item is always the ORIGINAL language; `overviewLang` is the language the
// description text is in — they are never confused.

import { config, fetchJson, functionHeaders, isTmdbConfigured } from './config.js'
import { CURATED_MOVIES } from '../data/curated.js'
import { GENRES } from '../data/genres.js'
import { mediaSrc } from '../lib/media.js'
import { orderCandidates, tasteScore, topGenres } from '../lib/recommendationEngine.js'
import { UI_LANGUAGES } from '../i18n/languages.js'

const IMG = 'https://image.tmdb.org/t/p/w500'

// TMDB genre ids → our dimensions.
const TMDB_TO_GENRES = {
  10749: { romance: 3, relationships: 1 },
  14: { fantasy: 3 },
  9648: { mystery: 3 },
  53: { thriller: 3 },
  80: { mystery: 2, thriller: 1 },
  18: { drama: 3, relationships: 1 },
  12: { adventure: 3 },
  28: { adventure: 2, thriller: 1 },
  878: { scifi: 3 },
  35: { contemporary: 2 },
  10751: { relationships: 2, contemporary: 1 },
  16: { fantasy: 1 },
  36: { historical: 3, drama: 1 },
  10402: { romance: 1, drama: 1 },
}
// Our dimensions → TMDB genre ids to ask for. TMDB has no "literary", "philosophy" or
// "self-discovery" genres, so those lean on drama (plus sci-fi for philosophy).
const GENRE_TO_TMDB = {
  romance: [10749],
  drama: [18],
  mystery: [9648, 80],
  thriller: [53],
  psychological: [53, 9648],
  fantasy: [14],
  historical: [36],
  scifi: [878],
  adventure: [12],
  philosophy: [18, 878],
  relationships: [18, 10749],
  selfDiscovery: [18],
  literary: [18],
  contemporary: [18, 35],
}
const EXCLUDED_GENRES = '27,10752' // horror, war — not great picks for a casual stall

function genresFromIds(ids = []) {
  const v = Object.fromEntries(GENRES.map((g) => [g, 0]))
  for (const id of ids) for (const [g, w] of Object.entries(TMDB_TO_GENRES[id] ?? {})) v[g] = Math.min(3, v[g] + w)
  // TMDB has no "psychological" genre; thriller + mystery together signals it.
  if (ids.includes(53) && ids.includes(9648)) v.psychological = 2
  return v
}

async function tmdb(path, params) {
  const qs = new URLSearchParams(params)
  if (config.tmdbProxyUrl) {
    const url = `${config.tmdbProxyUrl}${path}?${qs}`
    return fetchJson(url, { headers: functionHeaders(url) })
  }
  return fetchJson(`https://api.themoviedb.org/3${path}?${qs}`, {
    headers: { Authorization: `Bearer ${config.tmdbDevToken}`, accept: 'application/json' },
  })
}

let genreNameCache = {}
async function genreNames(locale) {
  if (!genreNameCache[locale]) {
    const data = await tmdb('/genre/movie/list', { language: locale })
    genreNameCache[locale] = Object.fromEntries((data.genres ?? []).map((g) => [g.id, g.name]))
  }
  return genreNameCache[locale]
}

function fromTmdb(m, names, locale) {
  return {
    id: `tmdb-${m.id}`,
    tmdbId: m.id,
    source: 'tmdb',
    title: m.title,
    originalTitle: m.original_title,
    description: m.overview,
    overviewLang: locale.slice(0, 2),
    genreLabel: (m.genre_ids ?? []).map((id) => names[id]).filter(Boolean).slice(0, 2).join(' · '),
    genres: genresFromIds(m.genre_ids),
    cover: m.poster_path ? `${IMG}${m.poster_path}` : null,
    year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    votes: m.vote_count ?? 0,
    language: m.original_language,
    link: `https://www.themoviedb.org/movie/${m.id}`,
    quality: Math.min(1, (m.vote_average ?? 0) / 10) * 0.7 + Math.min(1, Math.log10((m.popularity ?? 1) + 1) / 3) * 0.3,
  }
}

async function discover(lang, locale, genreIds, minVotes) {
  const names = await genreNames(locale)
  const base = {
    with_original_language: lang,
    include_adult: 'false',
    without_genres: EXCLUDED_GENRES,
    'vote_count.gte': String(minVotes),
    sort_by: 'vote_average.desc',
    language: locale,
  }
  if (genreIds.length) base.with_genres = genreIds.join('|')
  const pages = await Promise.all([1, 2].map((page) => tmdb('/discover/movie', { ...base, page: String(page) })))
  return pages.flatMap((p) => p.results ?? []).filter((m) => m.poster_path && !m.adult).map((m) => fromTmdb(m, names, locale))
}

/** Uses TMDB Search to resolve curated titles to live TMDB data (posters, localized overview). */
async function searchCurated(lang, locale) {
  const names = await genreNames(locale)
  const picks = CURATED_MOVIES.filter((m) => m.language === lang).slice(0, 8)
  const found = await Promise.all(
    picks.map((m) =>
      tmdb('/search/movie', { query: m.title, year: String(m.year), language: locale, include_adult: 'false' })
        .then((d) => (d.results ?? []).find((r) => r.original_language === lang && r.poster_path))
        .catch(() => null),
    ),
  )
  return found.filter(Boolean).map((m) => fromTmdb(m, names, locale))
}

/** Fills an empty localized overview with the English one (labelled as English). */
export async function ensureOverview(movie) {
  if (movie.source !== 'tmdb' || movie.description) return movie
  try {
    const d = await tmdb(`/movie/${movie.tmdbId}`, { language: 'en-US' })
    return { ...movie, description: d.overview ?? '', overviewLang: 'en' }
  } catch {
    return movie
  }
}

function curatedMovies(lang) {
  return CURATED_MOVIES.filter((m) => m.language === lang).map((m) => ({
    id: `kp-${m.id}`,
    source: 'curated',
    title: m.title,
    originalTitle: m.nativeTitle && m.nativeTitle !== m.title ? m.nativeTitle : null,
    description: m.description,
    overviewLang: 'en',
    genreLabel: m.genreLabel,
    genres: m.genres,
    cover: mediaSrc('movies', m.id),
    year: m.year,
    rating: null,
    language: m.language,
    link: null,
    quality: 0.4,
  }))
}

function rank(items, ctx) {
  const seen = new Set()
  const unique = items.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)))
  return orderCandidates(
    unique.map((item) => ({ item, score: tasteScore(ctx.profile, ctx.personality, item.genres) + 0.2 * (item.quality ?? 0) })),
    ctx.seed,
  )
}

export async function findMovies({ profile, personality, lang, uiLang, seed }) {
  const ctx = { profile, personality, seed }
  const locale = UI_LANGUAGES.find((l) => l.code === uiLang)?.tmdb ?? 'en-US'
  const minVotes = lang === 'en' ? 300 : 15
  let live = []
  let apiFailed = !isTmdbConfigured

  if (isTmdbConfigured) {
    try {
      const ids = [...new Set(topGenres(profile, 2).flatMap((g) => GENRE_TO_TMDB[g]))]
      live = await discover(lang, locale, ids, minVotes)
      if (live.length < 4) live = live.concat(await discover(lang, locale, [], minVotes))
      if (live.length < 4) live = live.concat(await searchCurated(lang, locale))
    } catch (e) {
      apiFailed = true
      console.warn('[movies]', e.message)
    }
  }

  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  const liveTitles = new Set(live.flatMap((m) => [norm(m.title), norm(m.originalTitle ?? '')]))
  const curated = curatedMovies(lang).filter((m) => !liveTitles.has(norm(m.title)))
  const items = [...rank(live, ctx), ...rank(curated, ctx)]
  if (items.length) return { items, requested: lang, actual: lang, offline: live.length === 0 && apiFailed }
  return { items: rank(curatedMovies('en'), ctx), requested: lang, actual: 'en', offline: apiFailed }
}
