// Book recommendations from real data.
//   1. Google Books  — volumes search with langRestrict, filtered to the exact language.
//   2. Open Library  — subject search filtered by MARC language code (strict: only works
//                      whose recorded languages are the target, or the target + English).
//   3. Curated shelf — real titles bundled with the app (works offline).
// Every item keeps its TRUE language from metadata, and its source, so the UI never mislabels.

import { config, fetchJson } from './config.js'
import { BOOK_SUBJECT, genresFromText, isBlocked, labelFromCategories } from './genreSignals.js'
import { OPEN_LIBRARY_CODE } from '../i18n/languages.js'
import { CURATED_BOOKS } from '../data/curated.js'
import { mediaSrc } from '../lib/media.js'
import { orderCandidates, tasteScore, topGenres } from '../lib/recommendationEngine.js'

const GB = 'https://www.googleapis.com/books/v1/volumes'
const NATIVE_NOVEL_TERM = { ml: 'നോവൽ', hi: 'उपन्यास', ta: 'நாவல்', te: 'నవల' }

const stripHtml = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const clip = (s, n = 320) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s)
const normTitle = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

function googleCover(links) {
  const url = links?.thumbnail || links?.smallThumbnail
  return url ? url.replace(/^http:/, 'https:').replace('&edge=curl', '') : null
}

function fromGoogle(item, searchedGenre) {
  const v = item.volumeInfo ?? {}
  const isbn = (v.industryIdentifiers ?? []).find((i) => i.type === 'ISBN_13') ?? (v.industryIdentifiers ?? [])[0]
  const description = clip(stripHtml(v.description || item.searchInfo?.textSnippet || ''))
  return {
    id: `gb-${item.id}`,
    source: 'google',
    title: v.title + (v.subtitle && v.title.length < 30 ? `: ${v.subtitle}` : ''),
    author: (v.authors ?? []).join(', '),
    description,
    genreLabel: labelFromCategories(v.categories),
    genres: genresFromText([...(v.categories ?? []), v.title, description], searchedGenre),
    cover: googleCover(v.imageLinks),
    year: v.publishedDate ? Number(String(v.publishedDate).slice(0, 4)) : null,
    isbn: isbn?.identifier ?? null,
    link: v.previewLink || v.infoLink || null,
    language: v.language,
    quality: Math.min(1, (v.ratingsCount ?? 0) / 50) * 0.5 + (description ? 0.3 : 0) + (v.averageRating ? v.averageRating / 25 : 0),
    _mature: v.maturityRating === 'MATURE',
    _text: [v.title, description, ...(v.categories ?? [])].join(' '),
  }
}

async function googleSearch(q, lang, searchedGenre) {
  const params = new URLSearchParams({ q, langRestrict: lang, printType: 'books', maxResults: '20', orderBy: 'relevance' })
  if (config.googleBooksKey) params.set('key', config.googleBooksKey)
  const data = await fetchJson(`${GB}?${params}`)
  return (data.items ?? [])
    .map((it) => fromGoogle(it, searchedGenre))
    .filter((b) => b.language === lang && !b._mature && b.cover && b.title && !isBlocked(b._text))
}

function fromOpenLibrary(doc, lang, searchedGenre) {
  const subjects = doc.subject ?? []
  return {
    id: `ol-${doc.key}`,
    source: 'openlibrary',
    title: doc.title,
    author: (doc.author_name ?? []).slice(0, 2).join(', '),
    description: '', // filled from the work record by enrichOpenLibrary()
    _key: doc.key,
    genreLabel: labelFromCategories(subjects.slice(0, 4)),
    genres: genresFromText(subjects.slice(0, 30), searchedGenre),
    cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    year: doc.first_publish_year ?? null,
    isbn: doc.isbn?.[0] ?? null,
    link: `https://openlibrary.org${doc.key}`,
    language: lang,
    quality: Math.min(1, (doc.edition_count ?? 1) / 30) * 0.5,
    _langs: doc.language ?? [],
    _text: [doc.title, ...subjects.slice(0, 30)].join(' '),
  }
}

async function openLibrarySearch(lang, genre) {
  const code = OPEN_LIBRARY_CODE[lang]
  if (!code) return []
  const params = new URLSearchParams({
    subject: BOOK_SUBJECT[genre] ?? 'fiction',
    language: code,
    limit: '40',
    fields: 'key,title,author_name,cover_i,first_publish_year,language,subject,isbn,edition_count',
  })
  const data = await fetchJson(`https://openlibrary.org/search.json?${params}`)
  return (data.docs ?? [])
    .filter((d) => d.cover_i && d.title)
    .filter((d) => {
      // Open Library "works" bundle every edition, so a foreign classic with one Hindi translation
      // lists ['eng','hin']. To never mislabel, a work counts as {lang} only if that is the ONLY
      // language recorded. (English: English must be among them.)
      const langs = (d.language ?? []).filter((l) => l !== 'und')
      return lang === 'en' ? langs.includes('eng') : langs.length > 0 && langs.every((l) => l === code)
    })
    .map((d) => fromOpenLibrary(d, lang, genre))
    .filter((b) => !isBlocked(b._text))
}

/** Fetches the real work description for the top Open Library picks (search results don't include it). */
async function enrichOpenLibrary(items, n = 6) {
  return Promise.all(
    items.map(async (b, i) => {
      if (b.source !== 'openlibrary' || i >= n) return b
      try {
        const w = await fetchJson(`https://openlibrary.org${b._key}.json`, { timeout: 5000 })
        const raw = typeof w.description === 'string' ? w.description : w.description?.value ?? ''
        // Drop markdown links and the '----' / '(Source…)' trailers Open Library descriptions often carry.
        const cleaned = raw.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\r?\n-{3,}|\r?\n\r?\n\(/)[0]
        const text = clip(stripHtml(cleaned))
        return isBlocked(text) ? null : { ...b, description: text }
      } catch {
        return b
      }
    }),
  ).then((list) => list.filter(Boolean))
}

function curatedBooks(lang) {
  return CURATED_BOOKS.filter((b) => b.language === lang).map((b) => ({
    id: `kp-${b.id}`,
    source: 'curated',
    title: b.title,
    nativeTitle: b.nativeTitle,
    author: b.author,
    description: b.description,
    genreLabel: b.genreLabel,
    genres: b.genres,
    cover: mediaSrc('books', b.id),
    year: b.year,
    isbn: null,
    link: null,
    language: b.language,
    quality: 0.4,
  }))
}

function rank(items, ctx) {
  const seen = new Set()
  const unique = items.filter((b) => {
    const k = normTitle(b.title)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return orderCandidates(
    unique.map((item) => ({ item, score: tasteScore(ctx.profile, ctx.personality, item.genres) + 0.15 * (item.quality ?? 0) })),
    ctx.seed,
  )
}

/**
 * @returns {Promise<{ items: object[], requested: string, actual: string, offline: boolean }>}
 * `items` is ranked best-first: live API results, then same-language curated picks.
 */
export async function findBooks({ profile, personality, lang, seed }) {
  const ctx = { profile, personality, seed }
  const [g1, g2] = topGenres(profile, 2)
  let live = []
  let apiFailed = 0
  const attempt = async (fn) => {
    try {
      live = live.concat(await fn())
    } catch (e) {
      apiFailed++
      console.warn('[books]', e.message)
    }
  }

  // 1. Google Books — genre subjects first, then broaden.
  await attempt(() => googleSearch(`subject:"${BOOK_SUBJECT[g1]}"`, lang, g1))
  if (live.length < 4 && g2) await attempt(() => googleSearch(`subject:"${BOOK_SUBJECT[g2]}"`, lang, g2))
  if (live.length < 4) await attempt(() => googleSearch(NATIVE_NOVEL_TERM[lang] ?? 'subject:fiction', lang))
  // 2. Open Library.
  if (live.length < 4) await attempt(() => openLibrarySearch(lang, g1))
  if (live.length < 4 && g2) await attempt(() => openLibrarySearch(lang, g2))

  const liveTitles = new Set(live.map((b) => normTitle(b.title)))
  const curated = curatedBooks(lang).filter((b) => !liveTitles.has(normTitle(b.title)))
  const items = [...(await enrichOpenLibrary(rank(live, ctx))), ...rank(curated, ctx)]
  if (items.length) return { items, requested: lang, actual: lang, offline: live.length === 0 && apiFailed > 0 }

  // 3. Nothing in that language anywhere: closest English pick, clearly flagged.
  return { items: rank(curatedBooks('en'), ctx), requested: lang, actual: 'en', offline: apiFailed > 0 }
}
