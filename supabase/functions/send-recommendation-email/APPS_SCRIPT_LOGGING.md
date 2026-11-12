# Google Sheet logging for Gmail API sends

When `EMAIL_PROVIDER=gmail_api`, the Gmail API sends the receipt, and the Edge Function then asks
Apps Script to **only write the Sheet row**. It calls a **separate deployment** (`APPS_SCRIPT_LOG_URL`)
and never the existing sending deployment (`APPS_SCRIPT_URL`). The existing deployment doesn't know
about `action: "log"` and would send a second email, so the function refuses to log through it.

Your existing deployment keeps serving the version it is pinned to, so it stays a working fallback.

## 1. Add a logging branch to the Apps Script project

Open the existing project (do not create a new one). At the very top of `doPost(e)`, right after
the request body is parsed and the token is checked, add a branch like this. Reuse the code your
script already uses to append the Sheet row, so the columns stay exactly the same:

```javascript
// Logging-only request from the Edge Function (the Gmail API already sent the email).
// It must never call MailApp.
if (data.action === 'log' && data.logOnly === true) {
  // Same columns as today. Replace this line with your existing "append row" code/function.
  appendReceiptRow_(data); // uses data.submissionId, receiptNo, name, email, phone, date, story,
                           // storyIdentity, recommendedBook, recommendedMovie
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

The request also includes `emailStatus: "sent"`, `provider: "gmail_api"` and `messageId` if you
want to record them in extra columns. This is optional; leaving the columns unchanged is fine.

The token check must stay in front of this branch: the body carries the same `token`
(`APPS_SCRIPT_SECRET`) as today.

## 2. Create a NEW deployment (do not edit the existing one)

1. **Deploy → New deployment → Web app.**
2. Execute as **Me**. Who has access: the same setting as your existing deployment.
3. Copy the new **Web app URL**. This is `APPS_SCRIPT_LOG_URL`.

**Do not** use "Manage deployments → Edit" on the existing deployment. That deployment keeps
running its pinned version and remains the email fallback.

## 3. Check it

- Send one test request with `action: "log"` and confirm a row appears and **no email** is sent
  (`MailApp.getRemainingDailyQuota()` is unchanged).
- If `APPS_SCRIPT_LOG_URL` is not set, Gmail API sends still work and are recorded in Supabase.
  Only the Sheet row is skipped, and the function logs a warning.
