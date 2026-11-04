// Every key in en.js must exist (with the same shape) in every other locale.  `npm run check-locales`
import en from '../src/i18n/locales/en.js'
import ml from '../src/i18n/locales/ml.js'
import hi from '../src/i18n/locales/hi.js'

let failed = false
for (const [code, loc] of Object.entries({ ml, hi })) {
  const missing = []
  const walk = (a, b, path) => {
    for (const k of Object.keys(a)) {
      const p = path ? `${path}.${k}` : k
      if (b == null || !(k in b)) missing.push(p)
      else if (Array.isArray(a[k])) { if (!Array.isArray(b[k]) || b[k].length !== a[k].length) missing.push(`${p} (array length)`) }
      else if (typeof a[k] === 'object') walk(a[k], b[k], p)
      else if (typeof a[k] === 'string') {
        const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
        if (vars(a[k]) !== vars(String(b[k]))) missing.push(`${p} (placeholders differ)`)
      }
    }
  }
  walk(en, loc, '')
  console.log(`${code}: ${missing.length ? missing.join(', ') : 'complete'}`)
  if (missing.length) failed = true
}
process.exit(failed ? 1 : 0)
