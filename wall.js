/* =====================================================================================
   TEXAS UNITED PATRIOTS — READER REGISTRATION WALL
   -------------------------------------------------------------------------------------
   Headline + a short teaser, then the rest of the article fades out and a modal asks the
   reader to register. Continue with Google, or a plain name + email form. Every signup is
   stored in Kit, which already powers the newsletter signup on the homepage.

   WHAT THIS IS, STATED PLAINLY: a REGISTRATION wall, not a paywall. This site is static
   HTML — the full article text is in the page before this script runs, so a determined
   reader can bypass it (Escape, reader mode, view-source). That is the accepted trade-off
   for a soft wall and it is how most registration walls work. It is NOT sufficient to sell
   access. Charging money requires the server to withhold the text, which requires a
   backend this site does not have.

   ── THE TWO BLANKS, AND THEY ARE BART'S ─────────────────────────────────────────────
   1. KIT_FORM_ID   — the numeric id from a free Kit form (kit.com). Same service the
                      homepage signup uses. NO api key and NO secret belongs in this file.
   2. GOOGLE_CLIENT_ID — optional. A Google OAuth "Web application" client id, created free
                      in Google Cloud Console, with texasunitedpatriots.org listed as an
                      authorised JavaScript origin. Leave blank and the Google button is
                      simply not shown; the email form still works.

   ── IT FAILS CLOSED, AND THE DIRECTION MATTERS ──────────────────────────────────────
   With KIT_FORM_ID blank the wall DOES NOT ENGAGE AT ALL. A wall that blocks readers while
   storing nobody's email is the worst of both worlds — it costs readers and collects
   nothing. So no id, no wall: the articles simply read as they do today. This mirrors the
   donate block's rule (never ask without a named recipient) pointed the other way.
   ===================================================================================== */
(function () {
  "use strict";

  var KIT_FORM_ID = "";        // ← numeric Kit form id, e.g. "7654321"
  var GOOGLE_CLIENT_ID = "";   // ← optional, e.g. "1234567890-abc.apps.googleusercontent.com"

  var TEASER_BLOCKS = 2;       // body elements kept readable before the fade
  var STORAGE_KEY = "tup_reader_v1";

  /* ── Guards ──────────────────────────────────────────────────────────────────────── */

  /* PREVIEW MODE — add ?wall=preview to any article URL.
     Shows the wall exactly as readers will see it, on any device, WITHOUT a Kit form and
     WITHOUT collecting anything. It exists because "it ships inert" and "Bart can see it"
     are different requirements, and the first one was making the second impossible. Never
     engages on its own: it needs the query string, every time. */
  var PREVIEW = /[?&]wall=preview\b/.test(location.search);

  if (!KIT_FORM_ID && !PREVIEW) {
    console.warn("[wall] disabled: set KIT_FORM_ID in wall.js to start collecting readers (or add ?wall=preview to look at it)");
    return;
  }

  // Never wall a crawler. The article HTML is fully present either way, but an indexer that
  // executes JS should still see the whole piece — the search traffic IS the audience.
  if (/bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegram|discord|lighthouse|headless/i.test(navigator.userAgent)) return;

  var prose = document.querySelector(".prose");
  if (!prose) return; // not an article page

  // Already registered — never ask twice. (Preview always shows, so it can be re-checked.)
  if (!PREVIEW) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { saved = null; }
    if (saved && saved.email) return;
  }

  /* ── Split the body into teaser and gated remainder ──────────────────────────────── */

  var blocks = Array.prototype.filter.call(prose.children, function (el) {
    return !/^(SCRIPT|STYLE)$/.test(el.tagName);
  });
  if (blocks.length <= TEASER_BLOCKS) return; // too short to be worth walling

  var gated = blocks.slice(TEASER_BLOCKS);

  var style = document.createElement("style");
  style.textContent = [
    ".tup-gated{display:none!important}",
    ".tup-fade{position:relative;height:9rem;margin-top:-1.5rem;pointer-events:none;",
    "background:linear-gradient(to bottom,rgba(249,249,249,0) 0%,rgba(249,249,249,.85) 55%,#f9f9f9 100%)}",
    ".tup-ovl{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;",
    "padding:1rem;background:rgba(12,12,14,.72);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}",
    ".tup-card{background:#fff;max-width:30rem;width:100%;padding:2.25rem 1.75rem;box-shadow:0 24px 60px rgba(0,0,0,.35);",
    "max-height:92vh;overflow-y:auto;text-align:center}",
    ".tup-kicker{font-family:'Public Sans',system-ui,sans-serif;font-weight:700;font-size:9px;letter-spacing:.2em;",
    "text-transform:uppercase;color:#5d0011;margin-bottom:.85rem}",
    ".tup-h{font-family:'Public Sans',system-ui,sans-serif;font-weight:900;font-size:1.6rem;line-height:1.05;",
    "text-transform:uppercase;letter-spacing:-.02em;color:#1a1c1c;margin-bottom:.7rem}",
    ".tup-sub{font-family:Newsreader,Georgia,serif;font-size:.98rem;line-height:1.55;color:#47464f;margin-bottom:1.5rem}",
    ".tup-field{text-align:left;margin-bottom:.8rem}",
    ".tup-field label{display:block;font-family:'Public Sans',system-ui,sans-serif;font-weight:700;font-size:9px;",
    "letter-spacing:.16em;text-transform:uppercase;color:#47464f;margin-bottom:.35rem}",
    ".tup-field input{width:100%;padding:.75rem .9rem;border:1px solid #d6d5da;background:#fff;font-size:1rem;",
    "font-family:Newsreader,Georgia,serif;color:#1a1c1c}",
    ".tup-field input:focus{outline:2px solid #5d0011;outline-offset:-2px;border-color:#5d0011}",
    ".tup-btn{width:100%;padding:.85rem 1rem;background:#5d0011;color:#fff;border:0;cursor:pointer;",
    "font-family:'Public Sans',system-ui,sans-serif;font-weight:800;font-size:.8rem;letter-spacing:.12em;",
    "text-transform:uppercase;transition:background .15s}",
    ".tup-btn:hover{background:#87001d}",
    ".tup-btn[disabled]{opacity:.55;cursor:default}",
    ".tup-or{display:flex;align-items:center;gap:.75rem;margin:1.15rem 0;",
    "font-family:'Public Sans',system-ui,sans-serif;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#8b8a91}",
    ".tup-or:before,.tup-or:after{content:'';flex:1;height:1px;background:#e3e2e6}",
    ".tup-err{color:#87001d;font-family:Newsreader,Georgia,serif;font-size:.9rem;margin-top:.75rem;min-height:1.2em}",
    ".tup-fine{font-family:'Public Sans',system-ui,sans-serif;font-size:10px;line-height:1.5;color:#8b8a91;margin-top:1.25rem}",
    ".tup-fine a{color:#5d0011;text-decoration:underline}",
    "#tup-gbtn{display:flex;justify-content:center;min-height:44px}",
    "body.tup-locked{overflow:hidden}",
  ].join("");
  document.head.appendChild(style);

  gated.forEach(function (el) { el.classList.add("tup-gated"); });
  var fade = document.createElement("div");
  fade.className = "tup-fade";
  prose.insertBefore(fade, gated[0]);

  /* ── The modal ───────────────────────────────────────────────────────────────────── */

  var ovl = document.createElement("div");
  ovl.className = "tup-ovl";
  ovl.setAttribute("role", "dialog");
  ovl.setAttribute("aria-modal", "true");
  ovl.setAttribute("aria-labelledby", "tup-title");
  ovl.innerHTML = [
    '<div class="tup-card">',
    '  <div class="tup-kicker">Texas United Patriots</div>',
    '  <h2 class="tup-h" id="tup-title">Keep reading — it\'s free</h2>',
    '  <p class="tup-sub">Register to finish this article and get our reporting on Texas schools, agencies and elections. No cost, and you can unsubscribe any time.</p>',
    '  <div id="tup-gwrap" style="display:none">',
    '    <div id="tup-gbtn"></div>',
    '    <div class="tup-or">or</div>',
    '  </div>',
    '  <form id="tup-form" novalidate>',
    '    <div class="tup-field"><label for="tup-name">First name</label>',
    '      <input id="tup-name" name="name" type="text" autocomplete="given-name" required /></div>',
    '    <div class="tup-field"><label for="tup-email">Email address</label>',
    '      <input id="tup-email" name="email" type="email" autocomplete="email" inputmode="email" required /></div>',
    '    <button class="tup-btn" type="submit" id="tup-submit">Create free account</button>',
    '    <div class="tup-err" id="tup-err" role="alert"></div>',
    '  </form>',
    // Wording matches privacy.html deliberately. An earlier draft promised "never sell OR
    // SHARE", which the policy does not say and which storing the signup in Kit would break.
    // A promise the policy contradicts is worse than no promise at all.
    '  <p class="tup-fine">We use your name and email to send you our updates. We do not sell your personal information. See our <a href="/privacy.html">Privacy Policy</a>.</p>',
    '</div>',
  ].join("");
  /* The modal is NOT shown on load. Bart's spec: "see the headline and maybe a sentence or
     two, and THEN be met with a popup." Showing it immediately covers the headline with a
     box before the reader has been given a reason to care — which is how a registration ask
     gets dismissed. It appears when they reach the end of the teaser, i.e. when the fade
     scrolls into view, exactly where the reading stops. */
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
    setTimeout(showModal, 6000); // no observer — still ask, just on a timer
  }

  if (PREVIEW && !KIT_FORM_ID) {
    var note = document.createElement("p");
    note.className = "tup-fine";
    note.style.cssText = "margin-top:.9rem;color:#87001d;font-weight:700;letter-spacing:.08em;text-transform:uppercase";
    note.textContent = "Preview — nothing is saved until a Kit form is connected";
    ovl.querySelector(".tup-card").appendChild(note);
  }

  var err = ovl.querySelector("#tup-err");
  var submit = ovl.querySelector("#tup-submit");

  function unlock(name, email) {
    // Preview remembers nothing, so the wall can be looked at again on the next reload.
    if (!PREVIEW) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name, email: email, at: Date.now() })); } catch (e) { /* private mode — they read this once */ }
    }
    gated.forEach(function (el) { el.classList.remove("tup-gated"); });
    if (fade.parentNode) fade.parentNode.removeChild(fade);
    document.body.classList.remove("tup-locked");
    if (ovl.parentNode) ovl.parentNode.removeChild(ovl);
  }

  /* Kit's public form endpoint — no api key, no secret, CORS-open by design. */
  function register(name, email) {
    // Preview has nowhere to save to, and must never pretend it saved. It unlocks locally
    // and stores nothing — the whole point is to look at the design, not to collect.
    if (!KIT_FORM_ID) return Promise.resolve(true);
    var body = new URLSearchParams();
    body.set("email_address", email);
    if (name) body.set("first_name", name);
    return fetch("https://app.convertkit.com/forms/" + KIT_FORM_ID + "/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
    }).then(function (r) {
      if (!r.ok) throw new Error("kit " + r.status);
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
    register(name, email)
      .then(function () { unlock(name, email); })
      .catch(function () {
        // Honest failure: say so, and do NOT unlock — an unlock we didn't record is a
        // reader we lost the email of, which is the entire point of the wall.
        submit.disabled = false;
        submit.textContent = "Create free account";
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
          // Read name/email out of the ID token. NOT verified here on purpose: this is a
          // lead-capture wall, not a security boundary, and nothing behind it is secret.
          // The moment anything is actually PAID for, this must move server-side.
          var claims = {};
          try { claims = JSON.parse(decodeURIComponent(escape(atob(resp.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))))); } catch (e2) { claims = {}; }
          var email = claims.email || "";
          var name = claims.given_name || (claims.name || "").split(" ")[0] || "";
          if (!email) { err.textContent = "Google didn't return an email address. Please register below."; return; }
          register(name, email)
            .then(function () { unlock(name, email); })
            .catch(function () { err.textContent = "That didn't go through. Please try the form below."; });
        },
      });
      google.accounts.id.renderButton(document.getElementById("tup-gbtn"), {
        theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: 320,
      });
      document.getElementById("tup-gwrap").style.display = "block";
    };
    document.head.appendChild(gs);
  }
})();
