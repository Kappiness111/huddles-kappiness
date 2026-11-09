// Tiny i18n layer: nested locale objects and `{var}` interpolation. The site is English-only;
// `lang` is kept so the receipt, email and saved record keep their existing shape.
import { createContext, useContext, useEffect, useMemo } from 'react'
import en from './locales/en.js'
import { UI_LANGUAGES } from './languages.js'

const LOCALES = { en }

const lookup = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)

/** Translate `key` into `lang`. Falls back to English, then to the key itself. */
export function translate(lang, key, vars) {
  let value = lookup(LOCALES[lang], key)
  if (value === undefined) value = lookup(LOCALES.en, key)
  if (value === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`)
    return key
  }
  if (typeof value === 'string' && vars) {
    value = value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m))
  }
  return value
}

/** Join a list naturally: "A and B", "A, B and C" (in the target language). */
export function joinList(lang, items) {
  if (items.length <= 1) return items.join('')
  const and = translate(lang, 'common.and')
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`
}

const I18nContext = createContext(null)

export function I18nProvider({ lang, children }) {
  useEffect(() => {
    const meta = UI_LANGUAGES.find((l) => l.code === lang)
    document.documentElement.lang = meta?.htmlLang ?? 'en'
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      t: (key, vars) => translate(lang, key, vars),
      list: (items) => joinList(lang, items),
    }),
    [lang],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
