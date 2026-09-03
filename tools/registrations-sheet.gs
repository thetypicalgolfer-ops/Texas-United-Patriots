/* =====================================================================================
   TEXAS UNITED PATRIOTS — REGISTRATION RECEIVER (Google Apps Script)
   -------------------------------------------------------------------------------------
   Receives a reader registration from the article wall (wall.js) and appends one row to
   a Google Sheet in Bart's own Drive. Nothing else touches the data: no third-party list
   service, no API key, no account beyond his own Google account. Export is File →
   Download → Microsoft Excel (.xlsx) or CSV, whenever he wants it.

   ── HOW TO INSTALL (Bart's steps, about five minutes) ───────────────────────────────
   1. drive.google.com → New → Google Sheets. Name it "TUP Registrations".
   2. In that sheet: Extensions → Apps Script.
   3. Delete whatever is in the editor. Paste this ENTIRE file. Save (disk icon).
   4. Deploy → New deployment → gear icon → Web app.
        Description:      registrations
        Execute as:       Me
        Who has access:   ANYONE          ← must be "Anyone", not "Anyone with Google account"
      Deploy. Approve the permission prompt (it is asking to write to your own sheet).
   5. Copy the Web app URL. It looks like:
        https://script.google.com/macros/s/AKfycb.................../exec
      Give that URL to JARVIS. It is not a secret — it only accepts new rows, and it
      never reads or returns anything from the sheet.

   ── IF YOU EVER CHANGE THIS FILE ────────────────────────────────────────────────────
   Apps Script serves the deployed VERSION, not the saved file. After editing you must do
   Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy, or the
   old code keeps running. Editing is not deploying — the same trap as everywhere else.
   ===================================================================================== */

var SHEET_NAME = 'Registrations';
var HEADERS = ['Timestamp (CT)', 'First name', 'Email', 'Article', 'Source', 'Referrer'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '{}';
    var d = {};
    try {
      d = JSON.parse(raw);
    } catch (parseErr) {
      // form-encoded fallback, so a plain <form> POST also works
      d = (e && e.parameter) || {};
    }

    var email = String(d.email || '').trim();
    var name = String(d.name || '').trim();

    // Refuse junk rather than dirty the sheet. The wall validates too; this is the
    // backstop for anything that reaches the endpoint by another route.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json_({ ok: false, error: 'invalid email' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(20000); // two readers registering at once must not overwrite one row
    try {
      sheet_().appendRow([
        Utilities.formatDate(new Date(), 'America/Chicago', 'yyyy-MM-dd HH:mm:ss'),
        name.slice(0, 120),
        email.slice(0, 254),
        String(d.article || '').slice(0, 200),
        String(d.source || 'form').slice(0, 40),
        String(d.referrer || '').slice(0, 300),
      ]);
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* A GET is only ever a health check — it never returns anybody's data. */
function doGet() {
  return json_({ ok: true, service: 'tup-registrations' });
}
