// Interface languages (fully translated UI) and recommendation languages (what language the
// book / movie itself is in). The two are independent. To add a UI language: add a locale file
// in ./locales, register it in ./index.jsx and add it here.

export const UI_LANGUAGES = [
  { code: 'en', native: 'English', htmlLang: 'en', tmdb: 'en-US' },
  { code: 'ml', native: 'മലയാളം', htmlLang: 'ml', tmdb: 'ml-IN' },
  { code: 'hi', native: 'हिंदी', htmlLang: 'hi', tmdb: 'hi-IN' },
]

// Native names for any language code we may show (recommendation languages, API metadata).
export const LANGUAGE_NATIVE = {
  en: 'English',
  ml: 'മലയാളം',
  hi: 'हिंदी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  bn: 'বাংলা',
  mr: 'मराठी',
  fr: 'Français',
  es: 'Español',
  ja: '日本語',
  ko: '한국어',
}

// ISO 639-1 → Open Library's MARC (ISO 639-2/B) codes.
export const OPEN_LIBRARY_CODE = { en: 'eng', ml: 'mal', hi: 'hin', ta: 'tam', te: 'tel', kn: 'kan', bn: 'ben', mr: 'mar' }

export const BOOK_LANGUAGES = ['en', 'ml', 'hi', 'ta', 'te']
export const MOVIE_LANGUAGES = ['ml', 'en', 'hi', 'ta', 'te']

export const DEFAULT_UI_LANGUAGE = 'en'
