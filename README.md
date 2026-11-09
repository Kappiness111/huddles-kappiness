# Kappiness: The Story Within

An illustrated, mobile-first, multilingual experience for the Kappiness stall at Huddles.
Attendees say hello, play **The Mind Lab** (one short thinking game), answer **This or That** (one
ten-question preference quiz), meet their story identity, and get a real book and a real film.
They take away a printed keepsake and an email.

Built with React 19, Vite, Tailwind CSS 4, Framer Motion and Supabase (plain JavaScript).

```bash
npm install
npm run dev                # http://localhost:5173
npm run build && npm run preview   # production build; a phone or tablet on the same wifi can open the Network URL
npm run check-locales      # every key exists in en / ml / hi, with the same {placeholders}
npm run verify-mindlab     # every Mind Lab puzzle's answer is computed, explained and in its options
npm run fetch-media        # download covers/posters for any new curated title
```

## The experience

| # | Screen | Notes |
|---|---|---|
| 1 | Welcome | Editorial landscape, "There is a story waiting to find you.", language selector, "Let's begin", time estimate. |
| 2 | Language | English, മലയാളം and हिंदी on the welcome screen. The language can be changed from the top bar at any point without losing progress. |
| 3 | Attendee | Name and email are required, phone is optional. Consent is required for data collection and for email delivery. Includes a privacy notice. |
| 4 | The Mind Lab | Exactly 3 challenges: *A Different Perspective*, *Pattern Recognition* and *The Decision Room*, one question from each section per visitor. Each has feedback and an explanation. No scores, no labels, and it does not feed the recommendations. |
| 5 | This or That | 10 questions, shown as an editorial split with abstract line-art. Back and Next buttons, a progress bar, and two short interlude screens. |
| 6 | Reveal | One of 7 story identities. The description is extended from the attendee's actual top genres. Marked as a creative identity, not an assessment. |
| 7 | Book | Language preference is independent of the UI language. Includes Find another, a language switch, and a "why it matches" line that quotes the attendee's own answers. |
| 8 | Film | Same as the book screen, with original title and original language. |
| 9 | Receipt | 80mm thermal, A5, and PDF (via the print dialog). Send to email, with sending, sent, failed + retry, and not-configured states. |
| 10 | Thanks | "Thank you for exploring with Kappiness." → Start a new experience (auto-resets after 45 seconds). |

The Mind Lab shows each visitor exactly **one question from each section**, drawn at random from its pool
(`src/data/mindlab.js`):

| Section | Question pool | Shown per visitor |
|---|---|---|
| A Different Perspective | 12 scenarios | 1 |
| Pattern Recognition | 18 number puzzles | 1 |
| The Decision Room | 12 scenarios | 1 |

Each visitor's three questions are picked independently, so people playing at the same time usually see
different combinations (2,592 are possible), and the next visitor on the same device never gets any of the
previous visitor's three. The picks stay the same for the whole visit, even if the page is refreshed and the
visitor registers again (`src/lib/mindLabSession.js` keeps only the three question ids in the tab's
sessionStorage). Starting a new experience picks new ones. Each puzzle's answer is computed from its rule,
not typed by hand.

## Design system

- **Type:** Fraunces (display) and Manrope (text) for Latin. Noto Serif/Sans Malayalam and
  Devanagari, plus Noto Sans Tamil and Telugu, take over glyph by glyph. Everything is self-hosted, so it works offline and in print.
  Indic scripts get taller line-heights, no letter-spacing, and smaller sizes for long Malayalam words.
- **Colour:** espresso, terracotta, caramel, amber, cream and sand, with restrained dusk, moss and "lab" green.
- **Illustration** (`src/illustrations/`): a layered landscape with an abstract figure, 20 fine line-art
  motifs (quiz options and identities), and the Kappiness cup. The cup is always happy and appears
  only on the welcome screen, Mind Lab completion, the receipt and the thank-you screen.

## Recommendations (real data, never invented)

Scoring (`src/lib/recommendationEngine.js`) maps quiz answers onto 14 dimensions: romance, drama, mystery,
thriller, psychological, fantasy, historical, sci-fi, adventure, philosophy, relationships,
self-discovery, literary and contemporary. Each is weighted and normalised. The identity is the best
affinity match. Every one of the 1,024 possible answer combinations gives one of the 7 identities, and each identity appears for 9–20% of them.

- **Books:** Google Books (`langRestrict`, exact `language` match), then Open Library (a work counts
  as Malayalam or Hindi only if that is its sole recorded language), then the bundled 95-title shelf. The true language and the source are always shown.
- **Films:** TMDB Discover with `with_original_language` and the attendee's genres. It broadens the search if needed,
  then uses Search to match shelf titles, then falls back to the shelf. Original language and overview language are tracked separately.
- **Ranking:** genre similarity, a personality bonus, rating and popularity, and a stable per-session tie-break.
  Adult and non-fiction results are filtered out.

## Backend (Supabase + Resend)

Everything secret lives in Supabase. The browser only ever holds public values.

**Flow:** the receipt appears → the record is saved (`attendee_submissions`) → if the visitor consented,
the Story Receipt is emailed automatically → the receipt screen shows *sending / sent / failed + retry*.
The record is built once, so save retries and email retries always use exactly the receipt on screen.
The receipt stays on screen (and printable) whatever happens to the email.

1. **Database:** `supabase/migrations/` (apply with `supabase db push`). `attendee_submissions` holds the visitor,
   consent, quiz answers, story identity, preference scores, the recommended book and film (title, author, language,
   genre, cover/poster, link), the receipt wording in the visitor's language, and the email delivery state.
   - Row-level security: the public key may **insert only**. It can never read, update or delete, so no visitor can
     see anyone's record. A trigger sets `created_at` and the email state server-side, whatever the browser sends.
   - `claim_submission_email()` / `finish_submission_email()` (service role only) verify and lock each send:
     matching id + receipt number + email, consent, under 24h old, at most 3 attempts per receipt, at most 5 emails per
     address per day, and never a second email once one has been sent.
   - There is a 90-day retention function, with a `pg_cron` line to schedule it.
2. **Edge Functions** (`supabase/functions/`, JavaScript, entrypoints in `supabase/config.toml`):
   - `send-recommendation-email`: takes `{ submissionId, receiptNo, email }` only, renders the email **from the saved
     row** (`receipt-email.js`, an email-safe copy of the on-screen receipt) and sends it with **Resend**.
     All text is HTML-escaped, and image and link hosts are whitelisted.
   - `tmdb`: a read-only proxy for 4 TMDB endpoints. It adds the token server-side.

```bash
cp supabase/functions/.env.example supabase/functions/.env   # fill in; git-ignored
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy send-recommendation-email
supabase functions deploy tmdb
```

3. **Frontend `.env.local`** (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the anon *or*
   publishable key), `VITE_EMAIL_ENABLED=true`, `VITE_TMDB_ENABLED=true`, and optionally `VITE_GOOGLE_BOOKS_API_KEY`
   (a public key, restricted by HTTP referrer).

**Tests (no Supabase project needed):** `npm test` runs `test:sql` (the migration on PGlite: RLS, trigger, claim
logic) and `test:backend` (the real frontend services + supabase-js against a local fake Supabase, routed into the
real Edge Function handler, and it writes email previews in en / ml / hi).

With nothing configured the app still works end to end, using live Google Books / Open Library plus the
shelf. It says honestly that email isn't connected, and it never claims data was saved.

## Stall setup

- Full screen: `chrome --kiosk http://localhost:4173`. For one-tap printing, set the thermal printer
  as default and add `--kiosk-printing`.
- Printing measures the receipt first. A thermal roll page is exactly as long as the receipt. An A5 receipt
  is scaled down if needed so it fits one sheet in any language. Only the receipt prints.
- Privacy: no localStorage or cookies. Start over, Start a new experience, 2.5 minutes of inactivity
  (after a 20-second warning) and the 45-second thank-you timer each create a new session and reset the language.
  Late API responses from a previous session are discarded.
