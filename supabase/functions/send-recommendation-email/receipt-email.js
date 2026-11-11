
 // Email-compatible version of the on-screen Story Receipt.
 // Renders only from the stored Supabase submission row.

const C = {
  page: '#f5ebdd',
  paper: '#fcf7ef',
  ink: '#33231f',
  soft: '#7a6253',
  accent: '#a65d36',
  caramel: '#b87945',
  rule: '#b5a69c',
  sand: '#e8d0b0',
}

const SERIF = "'Fraunces',Georgia,'Times New Roman',serif"
const SANS = "'Manrope','Helvetica Neue',Arial,sans-serif"
const MONO = "'IBM Plex Mono',Menlo,Consolas,monospace"

const IMAGE_HOSTS = [
  'books.google.com',
  'books.googleusercontent.com',
  'covers.openlibrary.org',
  'archive.org',
  'image.tmdb.org',
  'm.media-amazon.com',
  'images-na.ssl-images-amazon.com',
  'images.unsplash.com'
]

const LINK_HOSTS = [
  'books.google.com',
  'books.google.co.in',
  'play.google.com',
  'openlibrary.org',
  'www.themoviedb.org'
]

const INSTAGRAM_URL = 'https://www.instagram.com/Kappi_ness/'

const INSTAGRAM_QR_URL =
  'https://quickchart.io/qr?text=' +
  encodeURIComponent(INSTAGRAM_URL) +
  '&size=256&margin=2'

const DEFAULT_COPY = {
  subject: '{name}, your Kappiness story picks',
  preheader: 'Your story identity, a book and a film chosen for you at Huddles.',
  greeting: 'Hi {name},',
  intro: 'Thank you for exploring with Kappiness at Huddles. Here is the story we found for you.',
  original: 'Kappiness · Huddles',
  title: 'Your Story Receipt',
  no: 'No.',
  nameLabel: 'Name',
  dateLabel: 'Date',
  date: '',
  personality: 'Story identity',
  read: 'Your next read',
  watch: 'Your next watch',
  inLang: 'In {lang}',
  message: '{name}, may your next story find you exactly when you need it.',
  tagline: 'Nourishing minds, pouring happiness.',
  thanks: 'Thank you for exploring with Kappiness.',
  keep: 'Keep it · Share it · Read it',
  previewBook: 'Preview the book',
  filmDetails: 'See the film',
  signoff: 'With warmth,\nTeam Kappiness',
  legal: 'You are receiving this because you asked for your recommendations at the Kappiness stall at Huddles. Reply to this email to have your details deleted.',
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c])

const str = (v, max = 400) =>
  (typeof v === 'string' || typeof v === 'number')
    ? String(v).trim().slice(0, max)
    : ''

const clip = (s, n) =>
  s.length > n
    ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…`
    : s

const fill = (tpl, vars) =>
  tpl.replace(/\{(\w+)\}/g, (m, k) =>
    vars[k] !== undefined ? vars[k] : m
  )

function safeUrl(url, hosts) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' &&
      hosts.some((h) =>
        u.hostname === h || u.hostname.endsWith(`.${h}`)
      )
      ? u.href
      : null
  } catch {
    return null
  }
}

/**
 * Resolve recommendation cover images for email.
 * Supports public HTTPS image URLs and local website covers.
 */
export function imageUrl(cover, siteUrl) {
  const c = str(cover, 1000)
  if (!c) return null

  const site = str(siteUrl, 1000).replace(/\/+$/, '')

  // Allow local book and movie covers.
  if (c.startsWith('/') && !c.startsWith('//')) {
    const local = c.match(
      /^\/media\/(?:books|movies)\/[a-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/i
    )

    return local && site ? `${site}${local[0]}` : null
  }

  // Upgrade HTTP image URLs to HTTPS.
  const candidate = c.replace(/^http:\/\//i, 'https://')

  try {
    const url = new URL(candidate)

    if (url.protocol !== 'https:') return null
    if (!url.hostname || url.username || url.password) return null

    const host = url.hostname.toLowerCase()

    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '127.0.0.1' ||
      host === '::1' ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

const label = (text, extra = '', en = true) =>
  `<p style="margin:0;font-family:${en ? MONO : SANS};font-size:10px;line-height:1.4;font-weight:${en ? 500 : 700};${
    en ? 'letter-spacing:.2em;text-transform:uppercase;' : ''
  }color:${C.soft};${extra}">${esc(text)}</p>`

const notch = () => `
<tr><td style="padding:18px 0">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td width="10" height="20" style="width:10px;height:20px;background:${C.page};border-radius:0 10px 10px 0;font-size:0;line-height:0">&nbsp;</td>
      <td style="border-top:1px dashed ${C.rule};font-size:0;line-height:0">&nbsp;</td>
      <td width="10" height="20" style="width:10px;height:20px;background:${C.page};border-radius:10px 0 0 10px;font-size:0;line-height:0">&nbsp;</td>
    </tr>
  </table>
</td></tr>`

const leader = (k, v, en) => `
<tr>
  <td style="padding:3px 0;white-space:nowrap" valign="bottom">${label(k, '', en)}</td>
  <td width="100%" style="padding:0 8px" valign="bottom">
    <div style="border-bottom:1px dotted ${C.rule};height:1px;margin-bottom:5px;font-size:0;line-height:0">&nbsp;</div>
  </td>
  <td style="padding:3px 0;white-space:nowrap;text-align:right;font-family:${SANS};font-size:13px;font-weight:600;color:${C.ink}" valign="bottom">${esc(v)}</td>
</tr>`

function pick({ heading, item, meta, linkText, copy, siteUrl, en }) {
  if (!item || !str(item.title)) return ''

  const img = imageUrl(item.cover, siteUrl)
  const link = safeUrl(str(item.link, 500), LINK_HOSTS)
  const title = str(item.title, 200)
  const original = str(item.original_title, 200)
  const lang = str(item.language_name, 40) || str(item.language, 8)
  const genre = str(item.genre, 80)
  const description = clip(str(item.description, 1200), 280)

  return `
<tr><td style="padding:6px 22px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      ${
        img
          ? `<td width="70" valign="top" style="padding-right:14px">
              <img src="${esc(img)}" width="70" height="105" alt="${esc(title)}" style="display:block;width:70px;height:105px;object-fit:cover;border-radius:3px;border:0;box-shadow:0 6px 12px -6px rgba(36,25,21,.5)">
            </td>`
          : ''
      }
      <td valign="top">
        ${label(heading, '', en)}
        <p style="margin:4px 0 0;font-family:${SERIF};font-size:19px;line-height:1.15;color:${C.ink}">${esc(title)}</p>
        ${original && original !== title ? `<p style="margin:2px 0 0;font-family:${SANS};font-size:12px;font-weight:600;color:${C.accent}">${esc(original)}</p>` : ''}
        ${meta ? `<p style="margin:3px 0 0;font-family:${SANS};font-size:12px;color:${C.ink}">${esc(meta)}</p>` : ''}
        <p style="margin:4px 0 0;font-family:${SANS};font-size:11px;color:${C.soft}">${esc(fill(copy.inLang, { lang }))}${genre ? ` · ${esc(genre)}` : ''}</p>
        ${description ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:12px;line-height:1.55;color:${C.ink}">${esc(description)}</p>` : ''}
        ${link ? `<p style="margin:8px 0 0"><a href="${esc(link)}" style="font-family:${SANS};font-size:12px;font-weight:600;color:${C.accent}">${esc(linkText)} &rarr;</a></p>` : ''}
      </td>
    </tr>
  </table>
</td></tr>`
}

export function renderReceiptEmail(s, { siteUrl = '' } = {}) {
  const site = siteUrl.replace(/\/+$/, '')

  const raw = s.email_copy && typeof s.email_copy === 'object'
    ? s.email_copy
    : {}

  const copy = Object.fromEntries(
    Object.entries(DEFAULT_COPY).map(([k, d]) => [
      k,
      str(raw[k], 600) || d
    ])
  )

  const lang = str(s.website_language, 8) || 'en'
  const en = lang === 'en'
  const name = str(s.full_name, 80)
  const first = name.split(/\s+/)[0] || name
  const receiptNo = str(s.receipt_number, 40)

  const id = s.story_identity && typeof s.story_identity === 'object'
    ? s.story_identity
    : {}

  const identity = {
    title: str(id.title, 120) || str(s.personality_type, 60),
    tagline: str(id.tagline, 200),
    description: str(id.description, 800)
  }

  const book = s.recommended_book
  const movie = s.recommended_movie

  const date =
    copy.date ||
    new Date(s.created_at ?? Date.now()).toLocaleDateString(
      'en-GB',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      }
    )

  const logo = site
    ? `${site}/brand/kappiness-logo-transparent.png`
    : null

  const subject = fill(copy.subject, { name: first })
  const message = fill(copy.message, { name: first })
  const display = en ? '' : 'font-weight:600;line-height:1.35;'

  const html = `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
</head>

<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(copy.preheader)}</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.page}">
<tr>
<td align="center" style="padding:28px 12px 36px">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:460px">
    <tr>
      <td style="padding:0 4px 22px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink}">
        <p style="margin:0">${esc(fill(copy.greeting, { name: first }))}</p>
        <p style="margin:6px 0 0">${esc(copy.intro)}</p>
      </td>
    </tr>
  </table>

  <!-- Story Receipt -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:420px;background:${C.paper};border-top:7px dotted ${C.page};border-bottom:7px dotted ${C.page};box-shadow:0 22px 30px -18px rgba(51,35,31,.35)">

    <tr>
      <td align="center" style="padding:26px 22px 0">
        ${logo
          ? `<img src="${esc(logo)}" height="50" alt="Kappiness" style="display:block;height:50px;width:auto;margin:0 auto;border:0">`
          : `<p style="margin:0;font-family:${SERIF};font-size:22px;color:${C.ink}">Kappiness</p>`
        }
        ${label(copy.original, 'margin-top:14px;', en)}
        <p style="margin:4px 0 0;font-family:${SERIF};font-style:italic;font-size:27px;line-height:1.1;color:${C.ink};${display}">${esc(copy.title)}</p>
        <p style="margin:8px 0 0;font-family:${MONO};font-size:10px;letter-spacing:.12em;color:${C.soft}">${esc(copy.no)} ${esc(receiptNo)}</p>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 22px 0">
        <div style="border-top:3px double ${C.ink};font-size:0;line-height:0">&nbsp;</div>
      </td>
    </tr>

    <tr>
      <td style="padding:10px 22px 0">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${leader(copy.nameLabel, name, en)}
          ${leader(copy.dateLabel, date, en)}
        </table>
      </td>
    </tr>

    ${notch()}

    <tr>
      <td align="center" style="padding:0 22px">
        ${label(copy.personality, '', en)}
        <p style="margin:8px 0 0;font-size:20px;line-height:1;color:${C.accent}">&#10022;</p>
        <p style="margin:6px 0 0;font-family:${SERIF};font-size:27px;line-height:1.1;color:${C.ink};${display}">${esc(identity.title)}</p>
        ${identity.tagline
          ? `<p style="margin:6px 0 0;font-family:${SERIF};font-style:italic;font-size:15px;line-height:1.35;color:${C.accent}">${esc(identity.tagline)}</p>`
          : ''
        }
        ${identity.description
          ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:12.5px;line-height:1.55;color:${C.ink}">${esc(identity.description)}</p>`
          : ''
        }
      </td>
    </tr>

    ${notch()}

    ${pick({
      heading: copy.read,
      item: book,
      meta: str(book?.author, 160),
      linkText: copy.previewBook,
      copy,
      siteUrl: site,
      en
    })}

    ${book && movie
      ? '<tr><td style="padding:8px 0;font-size:0;line-height:0">&nbsp;</td></tr>'
      : ''
    }

    ${pick({
      heading: copy.watch,
      item: movie,
      meta: str(movie?.year, 8),
      linkText: copy.filmDetails,
      copy,
      siteUrl: site,
      en
    })}

    ${notch()}

    <tr>
      <td style="padding:0 22px">
        <p style="margin:0;font-family:${SERIF};font-style:italic;font-size:16px;line-height:1.35;color:${C.ink}">${esc(message)}</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:14px">
          <tr>
            <td valign="middle">
              <p style="margin:0;font-family:${SERIF};font-size:14px;color:${C.ink}" lang="en">${esc(copy.tagline)}</p>
              <p style="margin:4px 0 0;font-family:${SANS};font-size:11px;color:${C.soft}">${esc(copy.thanks)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Instagram QR code -->
    <tr>
      <td align="center" style="padding:22px 22px 10px">
        ${label('FIND US ON INSTAGRAM', '', en)}
        <a href="${esc(INSTAGRAM_URL)}" style="text-decoration:none">
          <img
            src="${esc(INSTAGRAM_QR_URL)}"
            width="120"
            height="120"
            alt="Scan to visit Kappiness Instagram"
            style="display:block;width:120px;height:120px;margin:12px auto;border:6px solid #ffffff"
          >
        </a>
        <p style="margin:8px 0 0;font-family:${SERIF};font-size:17px;color:${C.ink}">
          @kappi_ness
        </p>
        <p style="margin:5px 0 0;font-family:${SANS};font-size:11px;color:${C.soft}">
          Scan to visit our Instagram page.
        </p>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:14px 22px 26px">
        ${label(`✦ ${copy.keep} ✦`, '', en)}
      </td>
    </tr>

  </table>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:460px">
    <tr>
      <td style="padding:24px 4px 0;font-family:${SANS};color:${C.ink}">
        <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-line">${esc(copy.signoff)}</p>
        <p style="margin:22px 0 0;padding-top:14px;border-top:1px solid ${C.sand};font-size:11px;line-height:1.6;color:${C.soft}">${esc(copy.legal)}</p>
        <p style="margin:6px 0 0;font-family:${MONO};font-size:10px;letter-spacing:.12em;color:${C.soft}">HUDDLES GLOBAL × KAPPINESS · ${esc(receiptNo)}</p>
      </td>
    </tr>
  </table>

</td>
</tr>
</table>
</body>
</html>`

  const pickText = (heading, item, meta) => {
    if (!item || !str(item.title)) return []

    const lines = [heading.toUpperCase(), str(item.title, 200)]

    if (str(item.original_title) && str(item.original_title) !== str(item.title)) {
      lines.push(str(item.original_title, 200))
    }

    if (meta) lines.push(meta)

    lines.push(
      fill(copy.inLang, {
        lang: str(item.language_name, 40) || str(item.language, 8)
      }) + (str(item.genre) ? ` · ${str(item.genre, 80)}` : '')
    )

    const link = safeUrl(str(item.link, 500), LINK_HOSTS)
    if (link) lines.push(link)

    return [...lines, '']
  }

  const text = [
    fill(copy.greeting, { name: first }),
    copy.intro,
    '',
    `${copy.original} — ${copy.title}`,
    `${copy.no} ${receiptNo}`,
    `${copy.nameLabel}: ${name}`,
    `${copy.dateLabel}: ${date}`,
    '',
    copy.personality.toUpperCase(),
    identity.title,
    identity.tagline,
    identity.description,
    '',
    ...pickText(copy.read, book, str(book?.author, 160)),
    ...pickText(copy.watch, movie, str(movie?.year, 8)),
    message,
    copy.tagline,
    '',
    'FIND US ON INSTAGRAM',
    '@kappi_ness',
    INSTAGRAM_URL,
    '',
    copy.signoff,
    '',
    copy.legal,
  ]
    .filter((l) => l !== undefined)
    .join('\n')

  return { subject, html, text }
}
