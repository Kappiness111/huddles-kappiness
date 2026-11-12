// Chooses the email provider for one already-claimed receipt, and applies the safety rules.
//
// Secrets:
//   EMAIL_PROVIDER   'gmail_api' → Gmail API first. 'apps_script' (or unset) → Apps Script only,
//                    exactly the original behaviour. Unset is the safe default for deployment.
//   EMAIL_FALLBACK   'off' disables the Apps Script fallback (default: on when Apps Script is configured).
//   GMAIL_DAILY_CAP  max Gmail API sends in any rolling 24 hours (default 450, below Gmail's ~500).
//
// Rules:
//   • Gmail DEFINITELY didn't accept (not configured, auth failure, rejected, quota/cap) → Apps Script fallback.
//   • Gmail result AMBIGUOUS (timeout, network error, 5xx) → no fallback and not retryable, because the
//     message may already be on its way: a second send could duplicate the receipt.
//   • Quota/cap reached and no fallback → not retryable (no hammering a daily limit).
//   • The message id records the provider ('gmail:<id>' / 'apps_script:<key>'); errors are prefixed too.
//     That is also how the rolling 24-hour Gmail count is kept, persistently, in the database.

export const GMAIL_ID_PREFIX = 'gmail:'
export const APPS_SCRIPT_ID_PREFIX = 'apps_script:'
const DEFAULT_CAP = 450

export function createDelivery({ env, gmail, appsScript, gmailSentLast24h, log = console }) {
  const provider = () => (env('EMAIL_PROVIDER') === 'gmail_api' ? 'gmail_api' : 'apps_script')
  const fallbackOn = () => env('EMAIL_FALLBACK') !== 'off' && appsScript.configured()
  const cap = () => {
    const n = Number.parseInt(env('GMAIL_DAILY_CAP'), 10)
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CAP
  }

  /** The function can send if the selected provider (or, for Gmail, its fallback) is set up. */
  const configured = () => (provider() === 'gmail_api' ? gmail.configured() || fallbackOn() : appsScript.configured())

  async function viaAppsScript(msg, gmailError = null) {
    const a = await appsScript.send(msg)
    if (a.ok) return { ok: true, provider: 'apps_script', id: `${APPS_SCRIPT_ID_PREFIX}${a.id}`, fallback: Boolean(gmailError), note: gmailError }
    return { ok: false, provider: 'apps_script', retryable: true, error: gmailError ? `${gmailError}; ${a.error}` : a.error }
  }

  async function tryGmail(msg) {
    if (!gmail.configured()) return { ok: false, outcome: 'rejected', error: 'gmail_api: not configured' }
    let count = null
    try {
      count = await gmailSentLast24h()
    } catch (e) {
      // Can't read the count: Gmail's own limit still protects the account, so carry on.
      log.error('[email] could not read the Gmail send count', e?.message ?? e)
    }
    if (count !== null && count >= cap()) return { ok: false, outcome: 'quota', error: `gmail_api: safety cap reached (${count}/${cap()} in 24h)` }
    return gmail.send(msg)
  }

  async function send(msg) {
    if (provider() === 'apps_script') return viaAppsScript(msg)

    const g = await tryGmail(msg)
    if (g.ok) return { ok: true, provider: 'gmail_api', id: `${GMAIL_ID_PREFIX}${g.id}` }

    if (g.outcome === 'ambiguous') return { ok: false, provider: 'gmail_api', ambiguous: true, retryable: false, error: g.error }
    if (fallbackOn()) return viaAppsScript(msg, g.error)
    const stop = g.outcome === 'quota' || g.outcome === 'auth'
    return { ok: false, provider: 'gmail_api', quota: g.outcome === 'quota', retryable: !stop, error: g.error }
  }

  /** After a confirmed send: the Gmail path logs the Sheet row (Apps Script sends log their own). */
  async function afterSend(msg, sent) {
    if (!sent.ok || sent.provider !== 'gmail_api') return
    const r = await appsScript.logOnly(msg, { provider: 'gmail_api', messageId: sent.id })
    if (!r.ok) log.error('[email] sheet logging skipped/failed (the email WAS sent)', msg.submissionId, r.error)
  }

  return { provider, configured, send, afterSend }
}
