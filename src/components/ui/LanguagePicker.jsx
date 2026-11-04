import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Languages } from 'lucide-react'
import { UI_LANGUAGES } from '../../i18n/languages.js'

/** Full segmented selector: English | മലയാളം | हिंदी (welcome screen). */
export function LanguageSegments({ value, onChange, label, dark = false }) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid grid-cols-3 border-y ${dark ? 'border-cream/20' : 'hairline'}`}>
      {UI_LANGUAGES.map((l, i) => {
        const on = value === l.code
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={on}
            lang={l.htmlLang}
            onClick={() => onChange(l.code)}
            className={`relative min-h-12 px-2 text-[0.95rem] font-semibold transition-colors ${i ? `border-l ${dark ? 'border-cream/20' : 'hairline'}` : ''} ${
              on ? (dark ? 'text-cream' : 'text-espresso') : dark ? 'text-cream/55 hover:text-cream' : 'text-espresso/50 hover:text-espresso'
            }`}
          >
            {l.native}
            {on && <motion.span layoutId="lang-underline" className="absolute inset-x-4 -bottom-px h-0.5 bg-terracotta" />}
          </button>
        )
      })}
    </div>
  )
}

/** Compact menu for the top bar — switch language at any point without losing progress. */
export function LanguageMenu({ value, onChange, label, dark = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = UI_LANGUAGES.find((l) => l.code === value)

  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors ${dark ? 'text-cream/85 hover:bg-cream/10' : 'text-espresso/80 hover:bg-espresso/5'}`}
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        <span lang={current.htmlLang}>{current.native}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl bg-paper py-1 text-espresso shadow-[0_18px_40px_-16px_rgba(36,25,21,.45)] ring-1 ring-espresso/10"
          >
            {UI_LANGUAGES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === l.code}
                  lang={l.htmlLang}
                  onClick={() => {
                    onChange(l.code)
                    setOpen(false)
                  }}
                  className="flex min-h-11 w-full items-center justify-between px-4 text-left font-semibold hover:bg-cream"
                >
                  {l.native}
                  {value === l.code && <Check className="h-4 w-4 text-terracotta" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
