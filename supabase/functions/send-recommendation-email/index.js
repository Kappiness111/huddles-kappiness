// Supabase Edge Function (Deno) — sends the attendee their recommendations with Resend.
//
// Secrets (set with `supabase secrets set ...`, never in the frontend):
//   RESEND_API_KEY   Resend API key
//   RESEND_FROM      e.g. "Kappiness <stories@yourdomain.com>" (a verified Resend domain)
//   SITE_URL         public site URL, used for bundled covers (/media/...) — optional
//   ALLOWED_ORIGIN   your site origin for CORS, e.g. https://kappiness.example — optional ("*" if unset)
// Provided automatically by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Abuse protection: an email is only sent if a matching submission row exists (same id, receipt
// number and email), the attendee consented to email, the row is less than 24h old, and fewer
// than 3 emails have been sent for it. So it can never be used to email arbitrary addresses.

const MAX_SENDS = 3
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const IMAGE_HOSTS = ['books.google.com', 'books.googleusercontent.com', 'covers.openlibrary.org', 'image.tmdb.org']
const LINK_HOSTS = ['books.google.com', 'books.google.co.in', 'play.google.com', 'openlibrary.org', 'www.themoviedb.org']

const env = (k) => Deno.env.get(k) ?? ''
const cors = () => ({
  'Access-Control-Allow-Origin': env('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
})
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors(), 'Content-Type': 'application/json' } })

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const clip = (s, n) => (String(s ?? '').length > n ? `${String(s).slice(0, n).replace(/\s+\S*$/, '')}…` : String(s ?? ''))

function safeUrl(url, hosts) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`)) ? u.href : null
  } catch {
    return null
  }
}
function imageUrl(cover) {
  if (!cover) return null
  if (cover.startsWith('/media/') && env('SITE_URL')) return `${env('SITE_URL').replace(/\/$/, '')}${cover}`
  return safeUrl(cover.replace(/^http:/, 'https:'), IMAGE_HOSTS)
}

function pickBlock(label, item, linkText, copy) {
  if (!item) return ''
  const img = imageUrl(item.cover)
  const link = safeUrl(item.link, LINK_HOSTS)
  const meta = [item.author && copy.by.replace('{author}', item.author), item.year, copy.inLang.replace('{lang}', item.languageName ?? item.language)]
    .filter(Boolean)
    .map(esc)
    .join(' · ')
  return `
  <tr><td style="padding:24px 0;border-top:1px solid #e8d0b0">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
      ${img ? `<td width="96" valign="top" style="padding-right:18px"><img src="${esc(img)}" width="96" alt="" style="display:block;border-radius:4px;width:96px;height:auto"></td>` : ''}
      <td valign="top">
        <p style="margin:0;font:600 11px/1.4 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#a65d36">${esc(label)}</p>
        <p style="margin:6px 0 0;font:500 22px/1.25 Georgia,serif;color:#33231f">${esc(item.title)}</p>
        ${item.originalTitle && item.originalTitle !== item.title ? `<p style="margin:2px 0 0;font:600 15px/1.4 Arial,sans-serif;color:#b87945">${esc(item.originalTitle)}</p>` : ''}
        <p style="margin:6px 0 0;font:14px/1.5 Arial,sans-serif;color:#7a6253">${meta}</p>
        ${item.description ? `<p style="margin:10px 0 0;font:15px/1.6 Arial,sans-serif;color:#33231f">${esc(clip(item.description, 360))}</p>` : ''}
        ${link ? `<p style="margin:12px 0 0"><a href="${esc(link)}" style="font:600 14px Arial,sans-serif;color:#a65d36">${esc(linkText)} →</a></p>` : ''}
      </td>
    </tr></table>
  </td></tr>`
}

function render(p, logoUrl) {
  const c = p.copy
  return `<!doctype html><html lang="${esc(p.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject)}</title></head>
<body style="margin:0;background:#f5ebdd">
<span style="display:none;max-height:0;overflow:hidden">${esc(c.preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5ebdd"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fbf6ee;border-radius:12px"><tr><td style="padding:36px 32px">
    ${logoUrl ? `<img src="${esc(logoUrl)}" height="40" alt="Kappiness" style="display:block;height:40px;width:auto">` : '<p style="margin:0;font:600 18px Georgia,serif;color:#33231f">Kappiness</p>'}
    <p style="margin:28px 0 0;font:16px/1.6 Arial,sans-serif;color:#33231f">${esc(c.greeting)}</p>
    <p style="margin:8px 0 0;font:16px/1.6 Arial,sans-serif;color:#33231f">${esc(c.intro)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px">
      <tr><td style="padding:24px 0;border-top:1px solid #e8d0b0">
        <p style="margin:0;font:600 11px/1.4 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#a65d36">${esc(c.identity)}</p>
        <p style="margin:8px 0 0;font:500 30px/1.2 Georgia,serif;color:#33231f">${esc(p.personality.title)}</p>
        <p style="margin:6px 0 0;font:italic 17px/1.5 Georgia,serif;color:#b87945">${esc(p.personality.tagline)}</p>
        <p style="margin:10px 0 0;font:15px/1.6 Arial,sans-serif;color:#33231f">${esc(p.personality.description)}</p>
      </td></tr>
      ${pickBlock(c.read, p.book, c.previewBook, c)}
      ${pickBlock(c.watch, p.movie, c.filmDetails, c)}
      <tr><td style="padding:24px 0 0;border-top:1px solid #e8d0b0">
        <p style="margin:0;font:italic 18px/1.5 Georgia,serif;color:#33231f">${esc(c.closing)}</p>
        <p style="margin:16px 0 0;font:15px/1.6 Arial,sans-serif;color:#33231f;white-space:pre-line">${esc(c.signoff)}</p>
      </td></tr>
    </table>
  </td></tr></table>
  <p style="max-width:520px;margin:20px auto 0;font:12px/1.6 Arial,sans-serif;color:#7a6253">${esc(c.footer)}</p>
  <p style="margin:6px 0 0;font:12px Arial,sans-serif;color:#7a6253">${esc(p.receiptNo)}</p>
</td></tr></table></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method not allowed' })
  if (!env('RESEND_API_KEY') || !env('RESEND_FROM')) return json(500, { ok: false, error: 'email not configured' })

  let p
  try {
    p = await req.json()
  } catch {
    return json(400, { ok: false, error: 'invalid json' })
  }
  if (!p?.submissionId || !p?.receiptNo || !p?.to || !p?.copy?.subject || !p?.personality?.title) return json(400, { ok: false, error: 'missing fields' })

  // Verify against the stored submission (service role — server only).
  const db = `${env('SUPABASE_URL')}/rest/v1/attendee_submissions`
  const auth = { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}` }
  const q = new URLSearchParams({ id: `eq.${p.submissionId}`, receipt_number: `eq.${p.receiptNo}`, select: 'email,consent_email,created_at,email_send_count' })
  const rowRes = await fetch(`${db}?${q}`, { headers: auth })
  const [row] = rowRes.ok ? await rowRes.json() : []
  if (!row) return json(404, { ok: false, error: 'submission not found' })
  if (row.email.toLowerCase() !== String(p.to).trim().toLowerCase()) return json(403, { ok: false, error: 'email mismatch' })
  if (!row.consent_email) {
    // The attendee may opt in on the receipt screen; record that consent now.
    if (p.consentEmail !== true) return json(403, { ok: false, error: 'no email consent' })
  }
  if (Date.now() - new Date(row.created_at).getTime() > MAX_AGE_MS) return json(403, { ok: false, error: 'expired' })
  if (row.email_send_count >= MAX_SENDS) return json(429, { ok: false, error: 'send limit reached' })

  const logoUrl = env('SITE_URL') ? `${env('SITE_URL').replace(/\/$/, '')}/brand/kappiness-logo.png` : null
  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('RESEND_FROM'), to: [row.email], subject: p.copy.subject, html: render(p, logoUrl) }),
  })
  if (!send.ok) return json(502, { ok: false, error: `resend ${send.status}` })

  await fetch(`${db}?id=eq.${p.submissionId}`, {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ email_send_count: row.email_send_count + 1, email_sent_at: new Date().toISOString(), consent_email: true }),
  })
  return json(200, { ok: true })
})
