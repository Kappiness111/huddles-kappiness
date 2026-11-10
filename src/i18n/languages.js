// The interface is English-only. Recommendations come in English, Malayalam, Hindi, Tamil and Telugu:
// by default the best matches across all five, or one language via the switch on the book/film screens.

export const UI_LANGUAGES = [{ code: 'en', native: 'English', htmlLang: 'en', tmdb: 'en-US' }]

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

// 'any' (the default) = the best matches across all five, chosen by the visitor's personality.
export const BOOK_LANGUAGES = ['any', 'en', 'ml', 'hi', 'ta', 'te']
export const MOVIE_LANGUAGES = ['any', 'en', 'ml', 'hi', 'ta', 'te']

export const DEFAULT_UI_LANGUAGE = 'en'
