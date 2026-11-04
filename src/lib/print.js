// Printing. The print stylesheet (index.css) hides everything except `.print-root`.
// Before opening the dialog we MEASURE the receipt, because its height depends on the script
// (Malayalam needs much taller lines than English):
//   • thermal → the page is exactly as long as the receipt (no wasted paper, never split)
//   • A5      → the receipt is scaled down if needed so it always fits on one sheet

const MM_PER_PX = 25.4 / 96

export const PRINT_FORMATS = {
  thermal: { id: 'thermal', width: 80, sideMargin: 4, baseFont: 2.77 },
  a5: { id: 'a5', baseFont: 3.05, maxHeight: 210 - 2 * 6 - 4, minFont: 2.3 },
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

export async function printReceipt(format, root) {
  await imagesReady(root)
  if (document.fonts?.ready) await document.fonts.ready
  const f = PRINT_FORMATS[format]
  const rcpt = root.querySelector('.rcpt')
  document.documentElement.dataset.printFormat = format

  let font = f.baseFont
  if (format === 'thermal') {
    const h = measure(root, font)
    pageStyle(`@page { size: ${f.width}mm ${Math.ceil(h + 6)}mm; margin: 3mm ${f.sideMargin}mm 0; }`)
  } else {
    const h = measure(root, font)
    if (h > f.maxHeight) font = Math.max(f.minFont, (font * f.maxHeight) / h)
    pageStyle('@page { size: A5 portrait; margin: 6mm; }')
  }
  rcpt.style.fontSize = `${font}mm`
  window.print()
  rcpt.style.fontSize = ''
}
