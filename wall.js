/* =====================================================================================
   TEXAS UNITED PATRIOTS — READER REGISTRATION WALL
   -------------------------------------------------------------------------------------
   Headline plus a short teaser, then the rest of the article fades and a modal asks the
   reader to register. Styled to match the New York Times login wall Bart supplied as the
   reference: white sheet, serif heading with the accent rule under it, a single stacked
   column of full-width controls, black primary button, outlined provider buttons.

   WHAT THIS IS, PLAINLY: a REGISTRATION wall, not a paywall. This site is static HTML —
   the article text is in the page before this script runs, so a determined reader can get
   past it (Escape, reader mode, view-source). That is how soft walls work, and it fully
   serves the goal of collecting names and emails. It is NOT enough to sell access.
   Charging requires the server to withhold the text, which needs a backend this site does
   not have. Bart chose this knowing that, with the real paywall to follow.

   ── THE ONE BLANK THAT TURNS IT ON, AND IT IS BART'S ────────────────────────────────
   SHEET_ENDPOINT — the Web app URL of the Apps Script in tools/registrations-sheet.gs,
   which appends every registration straight to a Google Sheet in Bart's own Drive. His
   choice, and the right one: the list lives in his Drive, exports to Excel or CSV in two
   clicks, and no third-party list service ever holds his readers.

   It is NOT a secret. That endpoint only accepts new rows — it never reads the sheet and
   never returns anybody's data. It still belongs in this file and nowhere else.

   Until it is set the wall stays OFF for real readers, on purpose. A registration box
   that blocks the article while throwing the email away is worse than no box at all: it
   costs readers AND builds no list, and Bart would believe he was collecting one.
   Use ?wall=preview on any article to look at it without collecting anything.

   GOOGLE_CLIENT_ID is optional. Blank = the Google button is not shown and the email form
   still works. There is deliberately no Apple button: Sign in with Apple requires a server
   to exchange the authorisation code, and this site has no server.
   ===================================================================================== */
(function () {
  "use strict";

  // ← TURNS THE WALL ON. Apps Script Web app URL, .../exec  (see tools/registrations-sheet.gs)
  var SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbywh83BRIfdpq0jUO3uDIk2W09aNIaw4xvs3IxvJVWrBWJ8nm0UczIur_DVKRIidMW9/exec";
  var GOOGLE_CLIENT_ID = "";   // ← optional, e.g. "1234567890-abc.apps.googleusercontent.com"

  var TEASER_BLOCKS = 2;       // body elements left readable before the fade
  var STORAGE_KEY = "tup_reader_v1";

  /* ── Guards ──────────────────────────────────────────────────────────────────────── */

  var PREVIEW = /[?&]wall=preview\b/.test(location.search);

  if (!SHEET_ENDPOINT && !PREVIEW) {
    console.warn("[wall] OFF — no SHEET_ENDPOINT. Set it in wall.js to switch the wall on for readers. Add ?wall=preview to any article to look at it.");
    return;
  }

  // Never wall a crawler. The HTML is complete either way, but an indexer that runs JS must
  // still see the whole piece — the search traffic IS the audience.
  if (/bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegram|discord|lighthouse|headless/i.test(navigator.userAgent)) return;

  var prose = document.querySelector(".prose");
  if (!prose) return; // not an article page

  if (!PREVIEW) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { saved = null; }
    if (saved && saved.email) return; // already registered — never ask twice
  }

  /* ── Split the body into teaser and gated remainder ──────────────────────────────── */

  var blocks = Array.prototype.filter.call(prose.children, function (el) {
    return !/^(SCRIPT|STYLE)$/.test(el.tagName);
  });
  if (blocks.length <= TEASER_BLOCKS) return;
  var gated = blocks.slice(TEASER_BLOCKS);

  var style = document.createElement("style");
  style.textContent = [
    ".tup-gated{display:none!important}",
    ".tup-fade{position:relative;height:10rem;margin-top:-1.5rem;pointer-events:none;",
    "background:linear-gradient(to bottom,rgba(249,249,249,0),rgba(249,249,249,.9) 55%,#f9f9f9)}",

    /* the sheet */
    ".tup-ovl{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;",
    "padding:1rem;background:rgba(255,255,255,.92);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}",
    ".tup-card{background:#fff;max-width:26rem;width:100%;padding:1.5rem 1.25rem 2rem;max-height:94vh;overflow-y:auto;",
    "text-align:center;font-family:'Public Sans',Helvetica,Arial,sans-serif;color:#121212}",

    /* NYT-style heading block */
    ".tup-h{font-family:Newsreader,Georgia,'Times New Roman',serif;font-weight:400;font-size:1.5rem;",
    "line-height:1.25;color:#121212;margin:0 0 .35rem}",
    ".tup-h b{font-weight:700}",
    ".tup-rule{width:52px;height:2px;background:#5d0011;margin:.9rem auto 1.1rem}",
    ".tup-sub{font-family:Newsreader,Georgia,serif;font-size:1.1rem;color:#121212;margin:0 0 1.5rem}",

    /* fields */
    ".tup-field{text-align:left;margin-bottom:1rem}",
    ".tup-field label{display:block;font-size:.8rem;font-weight:400;color:#121212;margin-bottom:.4rem}",
    ".tup-field input{width:100%;padding:.85rem .8rem;border:1px solid #121212;background:#fff;font-size:1rem;",
    "font-family:'Public Sans',Helvetica,Arial,sans-serif;color:#121212;border-radius:0;-webkit-appearance:none}",
    ".tup-field input:focus{outline:2px solid #5d0011;outline-offset:-2px}",

    /* buttons */
    ".tup-btn{width:100%;padding:.9rem 1rem;background:#121212;color:#fff;border:1px solid #121212;cursor:pointer;",
    "font-family:'Public Sans',Helvetica,Arial,sans-serif;font-weight:700;font-size:.95rem;border-radius:0;",
    "transition:background .15s}",
    ".tup-btn:hover{background:#000}",
    ".tup-btn[disabled]{opacity:.5;cursor:default}",
    ".tup-prov{width:100%;padding:.8rem 1rem;background:#fff;color:#121212;border:1px solid #121212;cursor:pointer;",
    "font-family:'Public Sans',Helvetica,Arial,sans-serif;font-weight:600;font-size:.95rem;border-radius:0;",
    "display:flex;align-items:center;justify-content:center;gap:.6rem;margin-top:.75rem}",
    ".tup-prov:hover{background:#f7f7f7}",
    ".tup-prov svg{width:18px;height:18px;flex:none}",
    "#tup-gbtn{margin-top:.75rem;display:flex;justify-content:center}",

    /* divider + fine print, NYT proportions */
    ".tup-or{display:flex;align-items:center;gap:.9rem;margin:1.1rem 0;font-size:.95rem;color:#121212}",
    ".tup-or:before,.tup-or:after{content:'';flex:1;height:1px;background:#dfdfdf}",
    ".tup-err{color:#a81817;font-size:.85rem;margin-top:.6rem;min-height:1.1em;text-align:left}",
    ".tup-fine{font-size:.78rem;line-height:1.5;color:#333;margin:1.1rem 0 0}",
    ".tup-fine a{color:#333;text-decoration:underline}",
    ".tup-note{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5d0011;margin-top:1rem}",
    "body.tup-locked{overflow:hidden}",
    "@media (max-width:420px){.tup-card{padding:1.25rem 1rem 1.75rem}.tup-h{font-size:1.35rem}}",
  ].join("");
  document.head.appendChild(style);

  gated.forEach(function (el) { el.classList.add("tup-gated"); });
  var fade = document.createElement("div");
  fade.className = "tup-fade";
  prose.insertBefore(fade, gated[0]);

  /* ── The sheet ───────────────────────────────────────────────────────────────────── */

  var GOOGLE_G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

  var ovl = document.createElement("div");
  ovl.className = "tup-ovl";
  ovl.setAttribute("role", "dialog");
  ovl.setAttribute("aria-modal", "true");
  ovl.setAttribute("aria-labelledby", "tup-title");
  ovl.innerHTML = [
    '<div class="tup-card">',
    '  <p class="tup-h" id="tup-title">This story is <b>free to read</b>.</p>',
    '  <div class="tup-rule"></div>',
    '  <p class="tup-sub">Register to continue.</p>',
    '  <form id="tup-form" novalidate>',
    '    <div class="tup-field"><label for="tup-name">First name</label>',
    '      <input id="tup-name" name="name" type="text" autocomplete="given-name" required /></div>',
    '    <div class="tup-field"><label for="tup-email">Email address</label>',
    '      <input id="tup-email" name="email" type="email" autocomplete="email" inputmode="email" required /></div>',
    '    <button class="tup-btn" type="submit" id="tup-submit">Continue</button>',
    '    <div class="tup-err" id="tup-err" role="alert"></div>',
    '  </form>',
    '  <div id="tup-gwrap" style="display:none">',
    '    <div class="tup-or">or</div>',
    '    <div id="tup-gbtn"></div>',
    '  </div>',
    '  <p class="tup-fine">By continuing, you agree to our <a href="/terms.html">Terms of Service</a> and <a href="/privacy.html">Privacy Policy</a>. We use your name and email to send you our updates. We do not sell your personal information.</p>',
    '</div>',
  ].join("");

  /* Not shown on load. Bart's spec: the headline and a sentence or two FIRST, then the ask.
     A box over the headline is a demand before a reason, and it gets dismissed. */
  var shown = false;
  function showModal() {
    if (shown) return;
    shown = true;
    document.body.appendChild(ovl);
    document.body.classList.add("tup-locked");
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); showModal(); }
    }, { rootMargin: "0px 0px -25% 0px" });
    io.observe(fade);
  } else {
    setTimeout(showModal, 6000);
  }

  if (PREVIEW && !SHEET_ENDPOINT) {
    var note = document.createElement("p");
    note.className = "tup-note";
    note.textContent = "Preview — nothing is saved until the Google Sheet is connected";
    ovl.querySelector(".tup-card").appendChild(note);
  }

  var err = ovl.querySelector("#tup-err");
  var submit = ovl.querySelector("#tup-submit");

  function unlock(name, email) {
    if (!PREVIEW) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name, email: email, at: Date.now() })); } catch (e) { /* private mode — they read this once */ }
    }
    gated.forEach(function (el) { el.classList.remove("tup-gated"); });
    if (fade.parentNode) fade.parentNode.removeChild(fade);
    document.body.classList.remove("tup-locked");
    if (ovl.parentNode) ovl.parentNode.removeChild(ovl);
  }

  /* Append one row to Bart's Google Sheet, via the Apps Script Web app.
     `text/plain` is deliberate: it keeps this a CORS "simple request", so the browser
     sends it straight through with no preflight. Apps Script has no way to answer an
     OPTIONS preflight, so any other content type fails before it leaves the browser. */
  function register(name, email, source) {
    // Preview has nowhere to save to and must never pretend it saved.
    if (!SHEET_ENDPOINT) return Promise.resolve(true);
    var payload = JSON.stringify({
      name: name,
      email: email,
      source: source || "form",
      article: (document.querySelector("h1") || {}).textContent ? document.querySelector("h1").textContent.trim().slice(0, 200) : location.pathname,
      referrer: document.referrer || "",
    });
    return fetch(SHEET_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload,
      redirect: "follow", // Apps Script bounces /exec → googleusercontent.com
    }).then(function (r) {
      if (!r.ok) throw new Error("sheet " + r.status);
      return r.json().catch(function () { return { ok: true }; }); // readable body is a bonus, not a requirement
    }).then(function (j) {
      if (j && j.ok === false) throw new Error(j.error || "sheet refused");
      return true;
    });
  }

  ovl.querySelector("#tup-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = ovl.querySelector("#tup-name").value.trim();
    var email = ovl.querySelector("#tup-email").value.trim();
    err.textContent = "";
    if (!name) { err.textContent = "Please enter your first name."; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = "Please enter a valid email address."; return; }
    submit.disabled = true;
    submit.textContent = "Registering…";
    register(name, email, "form")
      .then(function () { unlock(name, email); })
      .catch(function () {
        // Honest failure: say so and do NOT unlock. An unlock we didn't capture an email
        // from is a reader lost for nothing, which is the whole point of the wall.
        submit.disabled = false;
        submit.textContent = "Continue";
        err.textContent = "That didn't go through. Please check your connection and try again.";
      });
  });

  /* ── Continue with Google (optional) ─────────────────────────────────────────────── */

  if (GOOGLE_CLIENT_ID) {
    var gs = document.createElement("script");
    gs.src = "https://accounts.google.com/gsi/client";
    gs.async = true;
    gs.defer = true;
    gs.onload = function () {
      if (!window.google || !google.accounts || !google.accounts.id) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: function (resp) {
          // Read name/email from the ID token. NOT verified here on purpose: this is
          // lead capture, not a security boundary, and nothing behind it is secret. The
          // moment anything is actually PAID for, this must move server-side.
          var claims = {};
          try { claims = JSON.parse(decodeURIComponent(escape(atob(resp.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))))); } catch (e2) { claims = {}; }
          var email = claims.email || "";
          var name = claims.given_name || (claims.name || "").split(" ")[0] || "";
          if (!email) { err.textContent = "Google didn't return an email address. Please register above."; return; }
          register(name, email, "google")
            .then(function () { unlock(name, email); })
            .catch(function () { err.textContent = "That didn't go through. Please try the form above."; });
        },
      });
      google.accounts.id.renderButton(document.getElementById("tup-gbtn"), {
        theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: 320,
      });
      document.getElementById("tup-gwrap").style.display = "block";
    };
    document.head.appendChild(gs);
  } else if (PREVIEW) {
    // So the reference layout can be judged whole: an inert, clearly-labelled Google button
    // that appears ONLY in preview. It never renders for a real reader without a client id.
    var wrap = ovl.querySelector("#tup-gwrap");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tup-prov";
    btn.innerHTML = GOOGLE_G + "<span>Continue with Google</span>";
    btn.addEventListener("click", function () { err.textContent = "Preview only — add a Google client id to enable this."; });
    ovl.querySelector("#tup-gbtn").appendChild(btn);
    wrap.style.display = "block";
  }
})();
