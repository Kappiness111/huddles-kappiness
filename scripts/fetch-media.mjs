// Downloads real book covers (Open Library, falling back to Wikipedia) and movie posters
// (Wikipedia) into public/media so the stall works offline and prints reliably.
//
//   npm run fetch-media            # only downloads missing files
//   npm run fetch-media -- --force # re-downloads everything

import { mkdir, writeFile, access } from 'node:fs/promises'
import { CURATED_BOOKS as BOOKS, CURATED_MOVIES as MOVIES } from '../src/data/curated.js'

const UA = 'KappinessEventStall/1.0 (offline media cache build script)'
const force = process.argv.includes('--force')
const root = new URL('../public/media/', import.meta.url)

const exists = (url) => access(url).then(() => true, () => false)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Wikimedia rate-limits bursts, so back off and retry on 429.
async function fetchWithRetry(url, tries = 5) {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status !== 429 || i >= tries) return res
    await sleep(2000 * 2 ** i)
  }
}

async function getJson(url) {
  const res = await fetchWithRetry(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function download(url, dest) {
  const res = await fetchWithRetry(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 2000) throw new Error(`image too small (${buf.length}b) ${url}`)
  await writeFile(dest, buf)
  return buf.length
}

// Wikimedia only serves standard thumbnail widths (500, 960, 1280...).
async function wikiImage(page, width = 960) {
  const data = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${page}`)
  const src = data.originalimage?.source || data.thumbnail?.source
  if (!src) throw new Error(`no image on wiki page ${page}`)
  // Ask Wikimedia for a resized thumbnail when the original is huge.
  if (data.originalimage && data.originalimage.width > 1400 && data.thumbnail) {
    return data.thumbnail.source.replace(/\/\d+px-/, `/${width}px-`)
  }
  return src
}

async function openLibraryCover(title, author) {
  const q = new URLSearchParams({ title, author, limit: '5', fields: 'cover_i,title,author_name' })
  const data = await getJson(`https://openlibrary.org/search.json?${q}`)
  const hit = data.docs.find((d) => d.cover_i)
  if (!hit) throw new Error(`no Open Library cover for ${title}`)
  return `https://covers.openlibrary.org/b/id/${hit.cover_i}-L.jpg`
}

// Order: pinned Open Library cover → Wikipedia page → Open Library search.
async function bookCover(book) {
  if (book.coverId) return `https://covers.openlibrary.org/b/id/${book.coverId}-L.jpg`
  const title = book.search?.title ?? book.title
  const author = book.search?.author ?? book.author
  if (book.wiki) {
    try {
      return await wikiImage(book.wiki)
    } catch (e) {
      console.warn(`  wiki failed for ${book.id}: ${e.message}`)
    }
  }
  return openLibraryCover(title, author)
}

async function run(kind, items, resolve) {
  const dir = new URL(`${kind}/`, root)
  await mkdir(dir, { recursive: true })
  let ok = 0
  for (const item of items) {
    const dest = new URL(`${item.id}.jpg`, dir)
    if (!force && (await exists(dest))) {
      ok++
      continue
    }
    try {
      const url = await resolve(item)
      const size = await download(url, dest)
      console.log(`✓ ${kind}/${item.id}.jpg  ${(size / 1024).toFixed(0)}kb`)
      ok++
      await sleep(1200)
    } catch (e) {
      console.error(`✗ ${kind}/${item.id}: ${e.message}`)
    }
  }
  console.log(`${kind}: ${ok}/${items.length} available\n`)
}

await run('books', BOOKS, bookCover)
await run('movies', MOVIES, (m) => wikiImage(m.wiki))
