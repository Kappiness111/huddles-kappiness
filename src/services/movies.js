// Film AND series recommendations ("your next watch").
// Series come from TMDB's TV endpoints and carry format: 'series' (films: 'film').
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
import { diversify, orderCandidates, tasteScore, topGenres } from '../lib/recommendationEngine.js'
import { hashString } from '../lib/ids.js'
import { recencyPenalty } from './recentPicks.js'
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
// TMDB TV genre ids → our dimensions. (TV has no romance/thriller genres; drama and crime carry them.)
const TV_TO_GENRES = {
  10759: { adventure: 3, thriller: 1 },
  16: { fantasy: 1 },
  35: { contemporary: 2 },
  80: { mystery: 2, thriller: 2 },
  18: { drama: 3, relationships: 1 },
  10751: { relationships: 2, contemporary: 1 },
  9648: { mystery: 3, psychological: 1 },
  10765: { scifi: 2, fantasy: 2 },
  10768: { historical: 2, drama: 1 },
  37: { adventure: 2, historical: 1 },
}
const GENRE_TO_TV = {
  romance: [18, 10751],
  drama: [18],
  mystery: [9648, 80],
  thriller: [80, 9648, 10759],
  psychological: [9648, 80],
  fantasy: [10765],
  historical: [10768],
  scifi: [10765],
  adventure: [10759],
  philosophy: [18, 10765],
  relationships: [18, 10751],
  selfDiscovery: [18],
  literary: [18],
  contemporary: [35, 18],
}
// Not story picks: documentary, kids, news, reality, soap (endless daily serials), talk.
const EXCLUDED_TV = '99,10762,10763,10764,10766,10767'

/** The languages a visitor is matched across when they don't pick one (the default). */
export const ANY_LANGUAGE = 'any'
const FOCUS_LANGUAGES = ['en', 'ml', 'hi', 'ta', 'te']

// How far a film handed out recently on this device drops in the ranking (see lib/recentPicks.js).
const RECENT_WEIGHT = 0.3

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

const genreNameCache = {}
async function genreNames(locale, media = 'movie') {
  const key = `${media}:${locale}`
  if (!genreNameCache[key]) {
    const data = await tmdb(`/genre/${media}/list`, { language: locale })
    genreNameCache[key] = Object.fromEntries((data.genres ?? []).map((g) => [g.id, g.name]))
  }
  return genreNameCache[key]
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
    format: 'film',
    quality: Math.min(1, (m.vote_average ?? 0) / 10) * 0.7 + Math.min(1, Math.log10((m.popularity ?? 1) + 1) / 3) * 0.3,
  }
}

function fromTmdbTv(m, names, locale) {
  const v = Object.fromEntries(GENRES.map((g) => [g, 0]))
  for (const id of m.genre_ids ?? []) for (const [g, w] of Object.entries(TV_TO_GENRES[id] ?? {})) v[g] = Math.min(3, v[g] + w)
  return {
    id: `tmdbtv-${m.id}`,
    tmdbId: m.id,
    media: 'tv',
    source: 'tmdb',
    title: m.name,
    originalTitle: m.original_name,
    description: m.overview,
    overviewLang: locale.slice(0, 2),
    genreLabel: (m.genre_ids ?? []).map((id) => names[id]).filter(Boolean).slice(0, 2).join(' · '),
    genres: v,
    cover: m.poster_path ? `${IMG}${m.poster_path}` : null,
    year: m.first_air_date ? Number(m.first_air_date.slice(0, 4)) : null,
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    votes: m.vote_count ?? 0,
    language: m.original_language,
    link: `https://www.themoviedb.org/tv/${m.id}`,
    format: 'series',
    quality: Math.min(1, (m.vote_average ?? 0) / 10) * 0.7 + Math.min(1, Math.log10((m.popularity ?? 1) + 1) / 3) * 0.3,
  }
}

/** Well-loved series in one original language (most voted + popular now). */
async function discoverTv(lang, locale, genreIds, page = 1) {
  const names = await genreNames(locale, 'tv')
  const base = {
    with_original_language: lang,
    include_adult: 'false',
    without_genres: EXCLUDED_TV,
    'vote_count.gte': lang === 'en' ? '300' : '10',
    'vote_average.gte': '6.5',
    language: locale,
  }
  if (genreIds.length) base.with_genres = genreIds.join('|')
  // Most voted (two pages), popular now, and acclaimed (top rated with a higher vote floor).
  const asks = [
    { sort_by: 'vote_count.desc', page },
    { sort_by: 'vote_count.desc', page: page + 1 },
    { sort_by: 'popularity.desc', page: 1 },
    { sort_by: 'vote_average.desc', page: 1, 'vote_count.gte': lang === 'en' ? '1500' : '40' },
  ]
  const results = await Promise.all(asks.map(({ page: pg, ...q }) => tmdb('/discover/tv', { ...base, ...q, page: String(pg) }).catch(() => ({ results: [] }))))
  return results.flatMap((p) => p.results ?? []).filter((m) => m.poster_path && !m.adult).map((m) => fromTmdbTv(m, names, locale))
}

async function discover(lang, locale, genreIds, minVotes, pages = [1, 1, 1], light = false) {
  const names = await genreNames(locale)
  const base = {
    with_original_language: lang,
    include_adult: 'false',
    without_genres: EXCLUDED_GENRES,
    'vote_count.gte': String(minVotes),
    'vote_average.gte': '6.3',
    language: locale,
  }
  if (genreIds.length) base.with_genres = genreIds.join('|')
  // Well-loved films (most votes) plus what people are watching now; our own ranking picks between them.
  // (Sorting by average rating alone surfaces obscure films with a handful of votes.)
  // A third request takes acclaimed films (highest rated, with a much higher vote floor).
  const asks = [
    { sort_by: 'vote_count.desc', page: pages[0] },
    { sort_by: 'popularity.desc', page: pages[1] },
    { sort_by: 'vote_average.desc', page: pages[2], 'vote_count.gte': String(minVotes * 3) },
  ]
  // Light (all-languages) mode: two sorts plus the next page of the most-voted list, for breadth.
  const list = light ? [asks[0], asks[1], { ...asks[0], page: asks[0].page + 1 }] : asks
  const results = await Promise.all(list.map(({ page, ...q }) => tmdb('/discover/movie', { ...base, ...q, page: String(page) }).catch(() => ({ results: [] }))))
  return results.flatMap((p) => p.results ?? []).filter((m) => m.poster_path && !m.adult).map((m) => fromTmdb(m, names, locale))
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
    const d = await tmdb(`/${movie.media === 'tv' ? 'tv' : 'movie'}/${movie.tmdbId}`, { language: 'en-US' })
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
    cover: m.noCover ? null : mediaSrc('movies', m.id), // no verified poster → designed typographic cover
    year: m.year,
    rating: null,
    language: m.language,
    link: null,
    format: m.format ?? 'film',
    quality: 0.6, // hand-picked and hand-tagged
  }))
}

function rank(items, ctx) {
  const seen = new Set()
  const unique = items.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)))
  return orderCandidates(
    unique.map((item) => {
      const score = tasteScore(ctx.profile, ctx.personality, item.genres) + 0.2 * (item.quality ?? 0) - RECENT_WEIGHT * ctx.recent(item)
      return { item: { ...item, match: score }, score }
    }),
    ctx.seed,
  )
}

/** Live films + series in one language. `light` = the lighter search used across all languages. */
async function liveWatch(lang, locale, profile, h, light) {
  const top = topGenres(profile, 2)
  const ids = [...new Set(top.flatMap((g) => GENRE_TO_TMDB[g]))]
  const tvIds = [...new Set(top.flatMap((g) => GENRE_TO_TV[g]))]
  const minVotes = lang === 'en' ? 800 : lang === 'hi' ? 150 : 40
  // Each visitor gets different result pages, so phones at the stall don't all see the same films.
  const deep = lang === 'en' || lang === 'hi'
  const pages = deep ? [1 + (h % 4), 1 + ((h >>> 2) % 3), 1 + ((h >>> 4) % 2)] : [1 + (h % 2), 1, 1]
  const [films, series] = await Promise.all([
    discover(lang, locale, ids, minVotes, pages, light && !deep),
    discoverTv(lang, locale, tvIds, deep ? 1 + ((h >>> 6) % 2) : 1),
  ])
  let live = [...films, ...series]
  if (light) return live
  if (live.length < 8 && pages.some((p) => p > 1)) live = live.concat(await discover(lang, locale, ids, minVotes))
  if (live.length < 4) live = live.concat(await discover(lang, locale, [], minVotes))
  if (live.length < 4) live = live.concat(await searchCurated(lang, locale))
  return live
}

/**
 * @param lang a language code, or 'any' (the default): the best films AND series for the visitor's
 *   personality across English, Malayalam, Hindi, Tamil and Telugu.
 */
export async function findMovies({ profile, personality, lang = ANY_LANGUAGE, uiLang, seed }) {
  const recentP = recencyPenalty('movie') // runs alongside the searches below
  const ctx = { profile, personality, seed }
  const locale = UI_LANGUAGES.find((l) => l.code === uiLang)?.tmdb ?? 'en-US'
  const any = lang === ANY_LANGUAGE
  const langs = any ? FOCUS_LANGUAGES : [lang]
  const h = hashString(`movies:${seed}`)
  let live = []
  let apiFailed = !isTmdbConfigured

  if (isTmdbConfigured) {
    const found = await Promise.all(
      langs.map((l) =>
        liveWatch(l, locale, profile, h, any).catch((e) => {
          apiFailed = true
          console.warn('[movies]', l, e.message)
          return []
        }),
      ),
    )
    live = found.flat()
  }

  ctx.recent = await recentP
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  const liveTitles = new Set(live.flatMap((m) => [norm(m.title), norm(m.originalTitle ?? '')]))
  const curated = langs.flatMap((l) => curatedMovies(l)).filter((m) => !liveTitles.has(norm(m.title)))
  // Live and curated picks compete in ONE ranking, so the closest match wins wherever it came from.
  let items = rank([...live, ...curated], ctx)
  if (any) items = diversify(items)
  if (items.length) return { items, requested: lang, actual: lang, offline: live.length === 0 && apiFailed }
  return { items: rank(curatedMovies('en'), ctx), requested: lang, actual: 'en', offline: apiFailed }
}
