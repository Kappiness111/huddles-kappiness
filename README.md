# Kappiness: The Story Within

An illustrated, mobile-first experience for the Kappiness stall at Huddles. The site is in English.
Attendees say hello, step into **The Mind Lab** (three short personality scenarios, no right answers),
answer **This or That** (ten quick choices), meet their story identity, and get a real book and a real
film or series picked for their personality, from English, Malayalam, Hindi, Tamil and Telugu stories.
They take away a printed keepsake (with an Instagram QR code for @kappi_ness) and an email.

Built with React 19, Vite, Tailwind CSS 4, Framer Motion and Supabase (plain JavaScript).

```bash
npm install
npm run dev                # http://localhost:5173
npm run build && npm run preview   # production build; a phone or tablet on the same wifi can open the Network URL
npm run fetch-media        # download covers/posters for any new curated title
```

## The experience

| # | Screen | Notes |
|---|---|---|
| 1 | Welcome | Editorial landscape, "There is a story waiting to find you.", "Let's begin", time estimate. |
| 2 | Attendee | Name and email are required, phone is optional. Consent is required for data collection and for email delivery. Includes a privacy notice. |
| 3 | The Mind Lab | Three personality scenarios, one from each section (*Your Inner World*, *Your Instincts*, *The Decision Room*), drawn from 10 per section (1,000 combinations), answers in a different order for each visitor. Four options each, no right answers, no maths. After each choice: what it says about the visitor and the genres it adds. **Its answers feed the recommendation profile** (`src/data/mindlab.js`). |
| 4 | This or That | 10 questions, each drawn from 8 parallel versions (80 questions in all), so every visitor gets their own mix (about a billion possible quizzes, scored identically) and the next visitor on a device shares none of the previous visitor's questions, shown as an editorial split with abstract line-art. Each choice pops up the genres it boosted. |
| 5 | Reveal | One of **14** story identities (never the same as the previous visitor's), from the Mind Lab and This or That together. Marked as a creative identity, not an assessment. |
| 6 | Book | No language question: the best matches across English, Malayalam, Hindi, Tamil and Telugu. The cover flips in with the genres it shares with the visitor. Reactions: **Love it**, **I've read it** and **Not for me** (similar books sink). A "More matches" shelf swaps in any of the next four. An optional switch narrows to one language. |
| 7 | Watch | The same for **films and TV series** (labelled *Series*), with original title and original language. |
| 8 | Receipt | A 2 × 6 in bookmark keepsake, **downloaded** as a one-page PDF (via the browser's Save as PDF) or **sent by email**, with sending, sent, failed + retry, and not-configured states. No printing at the stall. The QR code opens instagram.com/Kappi_ness. |
| 9 | Thanks | "Thank you for exploring with Kappiness." → Start a new experience (auto-resets after 45 seconds). |

Whatever is showing when the visitor moves on is the pick that goes on the receipt, the email and the saved record.

## Design system

- **Type:** Fraunces (display) and Manrope (text) for Latin. Noto Serif/Sans Malayalam and
  Devanagari, plus Noto Sans Tamil and Telugu, take over glyph by glyph. Everything is self-hosted, so it works offline and in print.
  Indic scripts get taller line-heights, no letter-spacing, and smaller sizes for long Malayalam words.
- **Colour:** espresso, terracotta, caramel, amber, cream and sand, with restrained dusk, moss and deep green.
- **Illustration** (`src/illustrations/`): a layered landscape with an abstract figure, 20 fine line-art
  motifs (quiz options and identities), and the Kappiness cup. The cup is always happy and appears
  only on the welcome screen, the receipt and the thank-you screen.

## Recommendations (real data, never invented)

Scoring (`src/lib/recommendationEngine.js`) maps quiz answers onto 14 dimensions: romance, drama, mystery,
thriller, psychological, fantasy, historical, sci-fi, adventure, philosophy, relationships,
self-discovery, literary and contemporary. Each is weighted and normalised. The identity is the best
affinity match. Every one of the 1,024 possible answer combinations gives one of the 7 identities, and each identity appears for 9–20% of them.

- **Books:** Google Books (`langRestrict`, exact `language` match), searching for books in *both* of the visitor's
  top genres and in the top genre alone, then Open Library (a work counts as Malayalam or Hindi only if that is its
  sole recorded language). Summaries, study guides, box sets and blank books are filtered out. Live results and the
  bundled 95-title shelf are ranked together, so the closest match wins wherever it came from. The true language
  and the source are always shown.
- **All languages by default:** books and watch picks are searched in English, Malayalam, Hindi, Tamil and
  Telugu at once and ranked together by taste; a gentle variety rule stops one language (or one format)
  filling every top slot. The shelf (55 books, 60 films, 20 series) includes Tamil and Telugu classics and series in all five languages; titles without a verified cover
  are marked `noCover` and get the designed typographic cover instead of a guessed image.
- **Covers:** every frame is 2:3. Covers close to that shape fill it; clearly different shapes are shown
  whole over a blurred copy of themselves; missing or placeholder images get the typographic cover.
- **Films and series:** TMDB Discover (films) and Discover TV (series, without soaps, reality, talk,
  news, kids and documentaries) with `with_original_language` and the attendee's genres, taking the most-voted and the
  currently popular films with an average of at least 6.3 (sorting by rating alone surfaces obscure films with a
  handful of votes). It broadens the search if needed, then uses Search to match shelf titles. Live and shelf films
  are ranked together. Original language and overview language are tracked separately.
- **Variety:** each visitor's searches read different result pages (Google Books `startIndex`, Open Library
  `page`, TMDB Discover pages across three sorts: most voted, popular now, highest rated), and the strongest
  few matches rotate per visitor. Picks handed out recently sink in the ranking, so people don't leave with
  the same story: the `recent_recommendations()` database function shares the latest titles across every
  phone (titles only, no personal data), and each device also remembers its own last 40.
- **Reactions:** every pick keeps its match score. "Not for me" lowers the score of the remaining picks that look
  like the one turned down (`reactToRec` in `src/state/ExperienceContext.jsx`), so the next suggestion moves away
  from it.
- **Ranking:** genre similarity, a personality bonus, rating and popularity, and a stable per-session tie-break.
  Adult and non-fiction results are filtered out.

## Backend (Supabase + Gmail API / Google Apps Script)

Everything secret lives in Supabase. The browser only ever holds public values.

**Flow:** the receipt appears → the record is saved (`attendee_submissions`) → if the visitor consented,
the Story Receipt is emailed automatically → the receipt screen shows *sending / sent / failed + retry*.
The record is built once, so save retries and email retries always use exactly the receipt on screen.
The receipt stays on screen (and printable) whatever happens to the email.

1. **Database:** `supabase/migrations/` (apply with `supabase db push`). The second migration adds
   `recent_recommendations()`, which returns only the titles of recent picks (for variety between visitors). `attendee_submissions` holds the visitor,
   consent, quiz answers, story identity, preference scores, the recommended book and film (title, author, language,
   genre, cover/poster, link), the receipt wording in the visitor's language, and the email delivery state.
   - Row-level security: the public key may **insert only**. It can never read, update or delete, so no visitor can
     see anyone's record. A trigger sets `created_at` and the email state server-side, whatever the browser sends.
   - `claim_submission_email()` / `finish_submission_email()` (service role only) verify and lock each send:
     matching id + receipt number + email, consent, under 24h old, at most 3 attempts per receipt, at most 5 emails per
     address per day, and never a second email once one has been sent.
   - There is a 90-day retention function, with a `pg_cron` line to schedule it.
2. **Edge Functions** (`supabase/functions/`, JavaScript, entrypoints in `supabase/config.toml`):
   - `send-recommendation-email`: takes `{ submissionId, receiptNo, email }` only, claims the row (above), renders the
     email **from the saved row** (`receipt-email.js`, an email-safe copy of the on-screen receipt) and sends it with
     the provider chosen by `EMAIL_PROVIDER` (see *Email providers* below). All text is HTML-escaped; `javascript:`
     links and unsafe image URLs are dropped.
   - `tmdb`: a read-only proxy for the TMDB film and TV endpoints the app uses. It adds the token server-side.
     After changing it, redeploy with `supabase functions deploy tmdb`.

### Email providers

| `EMAIL_PROVIDER` | What sends the email | Sheet row |
|---|---|---|
| unset or `apps_script` | The existing Google Apps Script Web App (`APPS_SCRIPT_URL`, `MailApp`): the original behaviour | written by that script |
| `gmail_api` | The Gmail API (`users.messages.send`, OAuth refresh token) as `GMAIL_SENDER` | written by a **separate** logging-only Apps Script deployment (`APPS_SCRIPT_LOG_URL`); see `supabase/functions/send-recommendation-email/APPS_SCRIPT_LOGGING.md` |

- **Fallback:** with `gmail_api`, if Gmail *definitely* did not accept the message (not configured, OAuth failure,
  rejected, its sending limit, or our safety cap), the same claimed attempt is sent through Apps Script instead.
  If Gmail's answer is *ambiguous* (timeout, network error, 5xx), the email may already be on its way, so there is
  no fallback and the visitor is not offered a retry, which prevents duplicate receipts. Set `EMAIL_FALLBACK=off`
  to disable the fallback.
- **Daily safety cap:** `GMAIL_DAILY_CAP` (default 450) limits Gmail API sends in any rolling 24 hours, counted
  from the database (`email_message_id` starts with `gmail:`), so it holds across function instances. Gmail's own
  limit (about 500 a day for a personal account) is not guaranteed; a sending-limit error is never retried.
- **Records:** `email_message_id` is `gmail:<id>` or `apps_script:<key>`; failures are saved in `email_last_error`
  prefixed with the provider. Gmail sends are only marked sent after Gmail returns a message id.
- Switching provider is a single secret change; the website doesn't change.

Secrets (set with the Supabase CLI, never in `.env.local` or Git):

```bash
# already in production: APPS_SCRIPT_URL, APPS_SCRIPT_SECRET, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET,
#                        GMAIL_REFRESH_TOKEN, GMAIL_SENDER, SITE_URL, ALLOWED_ORIGIN
supabase secrets set APPS_SCRIPT_LOG_URL="<new logging-only deployment URL>"
supabase secrets set GMAIL_SENDER_NAME="Kappiness" EMAIL_REPLY_TO="infokappiness@gmail.com"   # optional
supabase secrets set GMAIL_DAILY_CAP=450                                                       # optional
supabase secrets set EMAIL_PROVIDER=gmail_api      # switch to Gmail API
supabase secrets set EMAIL_PROVIDER=apps_script    # switch back (or: supabase secrets unset EMAIL_PROVIDER)
supabase functions deploy send-recommendation-email
supabase functions deploy tmdb
```

3. **Frontend `.env.local`** (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the anon *or*
   publishable key), `VITE_EMAIL_ENABLED=true`, `VITE_TMDB_ENABLED=true`, and optionally `VITE_GOOGLE_BOOKS_API_KEY`
   (a public key, restricted by HTTP referrer).

**Tests (no Supabase project, no real email):** `npm test` runs `test:sql` (the migration on PGlite: RLS, trigger,
claim logic), `test:providers` (Gmail API token refresh, MIME/base64url, error handling, Apps Script, fallback,
cap, Sheet logging, provider switching, against fake Google/Apps Script endpoints) and `test:backend` (the real
frontend services + supabase-js against a local fake Supabase, routed into the real handler and provider router,
and it writes email previews for English, Malayalam and Hindi picks).

With nothing configured the app still works end to end, using live Google Books / Open Library plus the
shelf. It says honestly that email isn't connected, and it never claims data was saved.

## Stall setup

- Full screen: `chrome --kiosk http://localhost:4173`. For one-tap printing, set the thermal printer
  as default and add `--kiosk-printing`.
- Printing measures the receipt first. A thermal roll page is exactly as long as the receipt. An A5 receipt
  is scaled down if needed so it fits one sheet in any language. Only the receipt prints.
- Privacy: no localStorage or cookies. Start over, Start a new experience, 2.5 minutes of inactivity
  (after a 20-second warning) and the 45-second thank-you timer each create a new session.
  Late API responses from a previous session are discarded.
