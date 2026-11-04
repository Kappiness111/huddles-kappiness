// Uses crypto.getRandomValues, which (unlike crypto.randomUUID) also works when a tablet
// opens the stall laptop over plain http on the local network.

function randomBytes(n) {
  const bytes = new Uint8Array(n)
  crypto.getRandomValues(bytes)
  return bytes
}

/** RFC 4122 v4 UUID — matches Supabase `uuid` columns. */
export function newId() {
  if (typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      /* insecure context — fall through */
    }
  }
  const b = randomBytes(16)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const RECEIPT_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // no 0/O/1/I

/** Human-friendly receipt number, e.g. KAP-261104-7F3Q. */
export function receiptNumber(date = new Date()) {
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const code = [...randomBytes(4)].map((x) => RECEIPT_ALPHABET[x % RECEIPT_ALPHABET.length]).join('')
  return `KAP-${yy}${mm}${dd}-${code}`
}

/** Small deterministic string hash (FNV-1a) used for stable tie-breaking. */
export function hashString(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
