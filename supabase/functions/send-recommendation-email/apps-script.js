// Google Apps Script provider: the original, working email sender (MailApp + Google Sheet row),
// plus an optional logging-only call used when the Gmail API sent the email.
//
// Secrets:
//   APPS_SCRIPT_URL      the existing Web App deployment that SENDS the email and logs the Sheet row
//   APPS_SCRIPT_SECRET   shared token checked by the Apps Script
//   APPS_SCRIPT_LOG_URL  optional: a SEPARATE deployment that only writes the Sheet row (`action: 'log'`).
//                        Logging is never sent to APPS_SCRIPT_URL: the existing deployment doesn't know
//                        about `action: 'log'` and would send a second email.

async function postJson(fetchFn, url, body, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const result = await response.json().catch(() => ({}))
    return { response, result }
  } finally {
    clearTimeout(timer)
  }
}

// The visitor and receipt details the existing Sheet expects (unchanged field names).
const sheetFields = (msg) => ({
  submissionId: msg.submissionId,
  receiptNo: msg.receiptNo,
  name: msg.name,
  phone: msg.phone,
  date: msg.date,
  story: msg.story,
  storyIdentity: msg.storyIdentity,
  recommendedBook: msg.recommendedBook,
  recommendedMovie: msg.recommendedMovie,
})

export function createAppsScript({ env, fetch: fetchFn = globalThis.fetch, timeoutMs = 15000, logTimeoutMs = 8000 } = {}) {
  const configured = () => Boolean(env('APPS_SCRIPT_URL') && env('APPS_SCRIPT_SECRET'))

  /** Sends through the existing deployment, exactly as before. */
  async function send(msg) {
    if (!configured()) return { ok: false, outcome: 'rejected', error: 'apps_script: not configured' }
    try {
      const { response, result } = await postJson(
        fetchFn,
        env('APPS_SCRIPT_URL'),
        {
          token: env('APPS_SCRIPT_SECRET'),
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          ...sheetFields(msg),
          idempotencyKey: msg.idempotencyKey,
        },
        timeoutMs,
      )
      if (response.ok && result.success === true) return { ok: true, id: msg.idempotencyKey }
      return { ok: false, outcome: 'rejected', error: `apps_script: ${String(result.error || `http ${response.status}`).slice(0, 200)}` }
    } catch (e) {
      // Same as the original behaviour: reported as a failed attempt the visitor can retry.
      return { ok: false, outcome: 'rejected', error: `apps_script: ${e?.name === 'AbortError' ? 'timeout' : 'network error'}` }
    }
  }

  /** Writes the Sheet row for an email another provider already sent. Never sends an email. */
  async function logOnly(msg, { provider, messageId, fallbackReason = null }) {
    const url = env('APPS_SCRIPT_LOG_URL')
    if (!url) return { ok: false, skipped: true, error: 'apps_script: APPS_SCRIPT_LOG_URL not set' }
    if (url === env('APPS_SCRIPT_URL')) return { ok: false, skipped: true, error: 'apps_script: refusing to log via the sending deployment' }
    try {
      const { response, result } = await postJson(
        fetchFn,
        url,
        {
          token: env('APPS_SCRIPT_SECRET'),
          action: 'log',
          logOnly: true,
          email: msg.to,
          ...sheetFields(msg),
          emailStatus: 'sent',
          provider,
          messageId,
          fallbackReason,
        },
        logTimeoutMs,
      )
      if (response.ok && result.success === true) return { ok: true }
      return { ok: false, error: `apps_script log: ${String(result.error || `http ${response.status}`).slice(0, 200)}` }
    } catch (e) {
      return { ok: false, error: `apps_script log: ${e?.name === 'AbortError' ? 'timeout' : 'network error'}` }
    }
  }

  return { configured, send, logOnly }
}
