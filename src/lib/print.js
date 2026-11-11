// Printing. The print stylesheet (index.css) hides everything except `.print-root`.
// Before opening the dialog we MEASURE the receipt, because its height depends on its content
// (long titles, covers, wrapping):
//   • thermal  → the page is exactly as long as the receipt (no wasted paper, never split)
//   • A5       → the receipt is scaled down if needed so it always fits on one sheet
//   • bookmark → the page IS the bookmark (2 × 6 in). The receipt is sized to the page width and
//                scaled down if it would be too tall, centred with a 3 mm margin, and the print
//                area is locked to one page, so the PDF is always a single page, ready to cut.

const MM_PER_PX = 25.4 / 96

export const PRINT_FORMATS = {
  thermal: { id: 'thermal', width: 80, sideMargin: 4, baseFont: 2.77 },
  a5: { id: 'a5', baseFont: 3.05, maxHeight: 210 - 2 * 6 - 4, minFont: 2.3 },
  // 2 × 6 in. `emWidth` must match `.rcpt.is-bookmark { width }` in index.css.
  bookmark: { id: 'bookmark', width: 50.8, height: 152.4, margin: 3, emWidth: 22 },
}

function pageStyle(css) {
  let el = document.getElementById('kap-print-page')
  if (!el) {
    el = document.createElement('style')
    el.id = 'kap-print-page'
    document.head.appendChild(el)
  }
  el.textContent = css
}

/** Height (mm) of the receipt inside `root` when rendered at `fontMm`. */
function measure(root, fontMm) {
  const rcpt = root.querySelector('.rcpt')
  const prev = root.getAttribute('style')
  root.setAttribute('style', 'display:flex;position:fixed;left:-10000px;top:0;visibility:hidden;')
  rcpt.style.fontSize = `${fontMm}mm`
  const h = rcpt.getBoundingClientRect().height * MM_PER_PX
  if (prev === null) root.removeAttribute('style')
  else root.setAttribute('style', prev)
  return h
}

function imagesReady(root) {
  return Promise.all(
    [...root.querySelectorAll('img')].map((img) =>
      img.complete ? null : new Promise((r) => {
        img.addEventListener('load', r, { once: true })
        img.addEventListener('error', r, { once: true })
      }),
    ),
  )
}

/**
 * Sets the page size and the receipt's print font for `format`. Returns a cleanup function.
 * Exported separately from printReceipt so the layout can be checked without a print dialog.
 */
export function preparePrint(format, root) {
  const f = PRINT_FORMATS[format]
  const rcpt = root.querySelector('.rcpt')
  document.documentElement.dataset.printFormat = format

  let font
  if (format === 'thermal') {
    font = f.baseFont
    const h = measure(root, font)
    pageStyle(`@page { size: ${f.width}mm ${Math.ceil(h + 6)}mm; margin: 3mm ${f.sideMargin}mm 0; }`)
  } else if (format === 'bookmark') {
    const innerW = f.width - 2 * f.margin
    const innerH = f.height - 2 * f.margin
    font = innerW / f.emWidth // the receipt fills the bookmark's width…
    const h = measure(root, font)
    const limit = innerH * 0.97 // …unless that makes it too tall: then shrink (2 % safety for rounding)
    if (h > limit) font = (font * limit) / h
    pageStyle(`@page { size: ${f.width}mm ${f.height}mm; margin: 0; }`)
  } else {
    font = f.baseFont
    const h = measure(root, font)
    if (h > f.maxHeight) font = Math.max(f.minFont, (font * f.maxHeight) / h)
    pageStyle('@page { size: A5 portrait; margin: 6mm; }')
  }
  rcpt.style.fontSize = `${font}mm`
  return () => {
    rcpt.style.fontSize = ''
  }
}

export async function printReceipt(format, root) {
  await imagesReady(root)
  if (document.fonts?.ready) await document.fonts.ready
  const cleanup = preparePrint(format, root)
  window.print()
  cleanup()
}
