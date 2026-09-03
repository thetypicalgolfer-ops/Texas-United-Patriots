/* =====================================================================================
   TEXAS UNITED PATRIOTS — REGISTRATION RECEIVER (Google Apps Script)
   -------------------------------------------------------------------------------------
   Receives a reader registration from the article wall (wall.js) and appends one row to
   a Google Sheet in Bart's own Drive. No third-party list service, no API key, no account
   beyond his own Google account. Export whenever: File → Download → Microsoft Excel.

   THIS IS A STANDALONE SCRIPT. It does NOT need to be created from inside a spreadsheet,
   and it deliberately never calls getActiveSpreadsheet() — that returns null in a
   standalone project, which is exactly how a pasted script fails silently after a
   successful-looking deploy. Instead it CREATES its own sheet on first use and remembers
   the id in Script Properties, so there is nothing for Bart to look up or paste.

   ── HOW TO INSTALL (from the Apps Script editor you already have open) ──────────────
   1. Click in the code area, select all (Ctrl+A), and paste this file over it. Save.
   2. In the function dropdown at the top, choose  setup  → click Run.
      Approve the permission prompt (it is asking to create a sheet in YOUR Drive).
      The Execution log prints the new sheet's link — that is your registration list.
   3. Deploy → New deployment → gear icon → Web app
        Execute as:      Me
        Who has access:  ANYONE        ← must be "Anyone", NOT "Anyone with a Google account"
      Deploy, then copy the Web app URL:
        https://script.google.com/macros/s/AKfycb.................../exec
   4. Give that URL to JARVIS. It is not a secret: it only accepts new rows. It never
      reads the sheet and never returns anybody's data.

   ── IF YOU EVER EDIT THIS ───────────────────────────────────────────────────────────
   Apps Script serves the deployed VERSION, not the saved file. After editing:
   Deploy → Manage deployments → pencil → Version: New version → Deploy.
   Saving is not deploying — the same trap as everywhere else.
   ===================================================================================== */

var SHEET_TITLE = 'TUP Registrations';
var TAB_NAME = 'Registrations';
var HEADERS = ['Timestamp (CT)', 'First name', 'Email', 'Article', 'Source', 'Referrer'];
var PROP_KEY = 'TUP_SHEET_ID';

/* Run this ONCE from the editor. Creates the sheet, prints its link. Safe to re-run —
   it reuses the existing sheet instead of making a second one. */
function setup() {
  var ss = spreadsheet_();
  var url = ss.getUrl();
  Logger.log('Registration sheet ready:');
  Logger.log(url);
  return url;
}

function spreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_KEY);

  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (gone) {
      // deleted or moved to trash — fall through and make a fresh one rather than
      // throw away registrations
      props.deleteProperty(PROP_KEY);
    }
  }

  var ss = SpreadsheetApp.create(SHEET_TITLE);
  props.setProperty(PROP_KEY, ss.getId());
  return ss;
}

function tab_(ss) {
  var sh = ss.getSheetByName(TAB_NAME);
  if (!sh) {
    // a brand-new spreadsheet has one sheet called "Sheet1" — rename it rather than
    // leave an empty tab sitting next to the data
    var first = ss.getSheets()[0];
    if (first && first.getLastRow() === 0 && ss.getSheets().length === 1) {
      first.setName(TAB_NAME);
      sh = first;
    } else {
      sh = ss.insertSheet(TAB_NAME);
    }
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 150);
    sh.setColumnWidth(3, 240);
    sh.setColumnWidth(4, 320);
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
      d = (e && e.parameter) || {}; // form-encoded fallback
    }

    var email = String(d.email || '').trim();
    var name = String(d.name || '').trim();

    // Refuse junk rather than dirty the sheet. The wall validates too; this is the
    // backstop for anything reaching the endpoint by another route.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json_({ ok: false, error: 'invalid email' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(20000); // two readers registering at once must not overwrite one row
    try {
      tab_(spreadsheet_()).appendRow([
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

/* A GET is only ever a health check. It never returns the sheet, its link, or any row. */
function doGet() {
  return json_({ ok: true, service: 'tup-registrations' });
}
