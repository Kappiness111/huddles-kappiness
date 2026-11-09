// The date printed on the Story Receipt. Shared by Receipt.jsx and the emailed copy so both match.
const DATE_LOCALE = { en: 'en-GB', ml: 'ml-IN', hi: 'hi-IN' }

export function formatReceiptDate(at, uiLang) {
  return new Date(at ?? Date.now()).toLocaleDateString(DATE_LOCALE[uiLang] ?? 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
