// Turns free-text category/subject metadata from book APIs into our genre vector.
import { GENRES } from '../data/genres.js'

const KEYWORDS = {
  romance: ['romance', 'love stor', 'romantic'],
  drama: ['drama', 'domestic', 'family saga', 'tragedy'],
  mystery: ['mystery', 'detective', 'crime', 'whodunit', 'investigation'],
  thriller: ['thriller', 'suspense', 'spy', 'espionage'],
  psychological: ['psychological', 'psychology', 'mind', 'mental'],
  fantasy: ['fantasy', 'magic', 'myth', 'fairy', 'dragons', 'legend', 'magical realism'],
  historical: ['historical', 'history', 'war', 'colonial', 'period', '19th century', '18th century'],
  scifi: ['science fiction', 'dystopi', 'space', 'robot', 'time travel', 'futur', 'artificial intelligence'],
  adventure: ['adventure', 'action', 'travel', 'quest', 'survival', 'journey'],
  philosophy: ['philosoph', 'existential', 'meaning of life', 'spiritual', 'ethics'],
  relationships: ['relationship', 'family', 'friendship', 'marriage', 'mothers', 'fathers', 'siblings'],
  selfDiscovery: ['coming of age', 'bildungsroman', 'self-discovery', 'personal growth', 'identity'],
  literary: ['literary', 'classic', 'literature'],
  contemporary: ['contemporary', 'urban', 'modern life', 'humor', 'humour', 'satire'],
}

// Search terms per genre for book APIs (English subject vocabulary, which both APIs use).
export const BOOK_SUBJECT = {
  romance: 'romance',
  drama: 'domestic fiction',
  mystery: 'mystery',
  thriller: 'thriller',
  psychological: 'psychological fiction',
  fantasy: 'fantasy',
  historical: 'historical fiction',
  scifi: 'science fiction',
  adventure: 'adventure',
  philosophy: 'philosophical fiction',
  relationships: 'family life',
  selfDiscovery: 'coming of age',
  literary: 'literary fiction',
  contemporary: 'contemporary fiction',
}

// Things we never want to recommend at a public event stall.
const BLOCKED = /\b(erotic|erotica|sex|sexual|kama ?sutra|adult content|porn|bdsm|explicit|steamy|spicy|smut|dark romance|new adult|mafia romance)\b/i
// We recommend stories — keep self-help, business and study books out.
const NON_FICTION = /\b(self-help|self help|management|business|success|motivation|leadership|personal finance|textbooks?|study guides?|examinations?|grammar|cookery|religion)\b/i

export function isBlocked(...texts) {
  return texts.some((t) => t && (BLOCKED.test(t) || NON_FICTION.test(t)))
}

// Not a story to hand someone: summaries, study aids, bundles, colouring and blank books.
const NOT_A_STORY = /\b(summary of|summary & analysis|study guide|sparknotes|cliffsnotes|book analysis|workbook|box(ed)? set|omnibus|books? \d+\s*[-–]\s*\d+|colou?ring book|journal|notebook|puzzle book|quiz book)\b/i

export const isNotAStory = (title = '') => NOT_A_STORY.test(title) || /\s\/\s/.test(title)

/** Genre vector from metadata text, plus a boost for the genre(s) we searched for. */
export function genresFromText(texts, searched) {
  const hay = texts.filter(Boolean).join(' | ').toLowerCase()
  const v = Object.fromEntries(GENRES.map((g) => [g, 0]))
  for (const [g, words] of Object.entries(KEYWORDS)) {
    for (const w of words) if (hay.includes(w)) v[g] += 1
    v[g] = Math.min(v[g], 3)
  }
  for (const g of [].concat(searched ?? [])) v[g] = Math.max(v[g], 2)
  return v
}

/** A readable genre label from API categories (first two, de-duplicated). */
export function labelFromCategories(categories = []) {
  const seen = new Set()
  const parts = []
  for (const raw of categories.flatMap((c) => c.split(/[/,;]|--/))) {
    const s = raw.trim().replace(/\s+/g, ' ')
    const key = s.toLowerCase()
    if (!s || s.length > 28 || seen.has(key) || /^(fiction|general|juvenile fiction|literature|novel|novels|accessible book|protected daisy|in library|large type books)$/i.test(s)) continue
    seen.add(key)
    parts.push(s.charAt(0).toUpperCase() + s.slice(1))
  }
  return parts.slice(0, 2).join(' · ') || 'Fiction'
}
