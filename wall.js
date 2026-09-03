/* =====================================================================================
   TEXAS UNITED PATRIOTS — READER REGISTRATION WALL
   -------------------------------------------------------------------------------------
   Headline plus a short teaser, then a FULL-WIDTH sheet rises from the bottom of the
   screen and asks the reader to register. Modelled on the New York Times wall Bart
   supplied: full-bleed panel, the site's own navbar still visible above it, a soft drop
   shadow cast upward onto the article, one centred column, black primary button, then the
   provider buttons.

   WHAT THIS IS, PLAINLY: a REGISTRATION wall, not a paywall. This site is static HTML —
   the article text is in the page before this script runs, so a determined reader can get
   past it (Escape, reader mode, view-source). That is how soft walls work and it fully
   serves the goal of collecting names and emails. It is NOT enough to sell access.
   Charging requires the server to withhold the text, which needs a backend this site does
   not have. Bart chose this knowing that, with the real paywall to follow.

   ── WHERE THE REGISTRATIONS GO ──────────────────────────────────────────────────────
   SHEET_ENDPOINT is the Apps Script Web app in tools/registrations-sheet.gs, which
   appends one row per reader to a Google Sheet in Bart's own Drive. It is write-only: it
   cannot read the sheet and never returns anybody's data, which is why it can live in a
   public file. Blank ⇒ the wall does not engage for real readers at all, because a box
   that blocks the article while throwing the email away costs readers AND builds no list.

   ── THE TWO SOCIAL LOGINS, AND WHAT EACH ACTUALLY COSTS ─────────────────────────────
   GOOGLE_CLIENT_ID  — FREE. A Google Cloud "OAuth 2.0 Client ID" of type Web application
                       with texasunitedpatriots.org as an authorised JavaScript origin.
   APPLE_CLIENT_ID   — NOT free. Sign in with Apple requires membership of the Apple
                       Developer Program, **$99/year**, plus a Services ID and a verified
                       domain. That is the real blocker, not the code: the implementation
                       below runs entirely client-side with usePopup:true and needs no
                       server. (An earlier version of this file said Apple was impossible
                       without a backend. That was wrong — the popup flow returns the
                       id_token straight to the page. The cost is the membership.)
   Each button renders ONLY when its id is set. No id, no button — never a control that
   cannot work. In ?wall=preview both render inert so the layout can be judged whole.
   ===================================================================================== */
(function () {
  "use strict";

  var SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbywh83BRIfdpq0jUO3uDIk2W09aNIaw4xvs3IxvJVWrBWJ8nm0UczIur_DVKRIidMW9/exec";
  var GOOGLE_CLIENT_ID = "762455340749-h90mh2ru2tsrj7fgojhrfpf04sh5mbfj.apps.googleusercontent.com";
  var APPLE_CLIENT_ID = "";    // ← needs the $99/yr Apple Developer Program, e.g. "org.texasunitedpatriots.web"
  var APPLE_REDIRECT_URI = "https://texasunitedpatriots.org/";

  var TEASER_BLOCKS = 2;
  var STORAGE_KEY = "tup_reader_v1";

  /* ── Guards ──────────────────────────────────────────────────────────────────────── */

  var PREVIEW = /[?&]wall=preview\b/.test(location.search);
  var HAS_PROVIDERS = !!(GOOGLE_CLIENT_ID || APPLE_CLIENT_ID) || PREVIEW;

  if (!SHEET_ENDPOINT && !PREVIEW) {
    console.warn("[wall] OFF — no SHEET_ENDPOINT. Add ?wall=preview to look at it.");
    return;
  }

  // Never wall a crawler. The HTML is complete either way, but an indexer that runs JS
  // must still see the whole piece — the search traffic IS the audience.
  if (/bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|showyoubot|outbrain|pinterest|vkshare|w3c_validator|whatsapp|telegram|discord|lighthouse|headless/i.test(navigator.userAgent)) return;

  var prose = document.querySelector(".prose");
  if (!prose) return;

  if (!PREVIEW) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { saved = null; }
    if (saved && saved.email) return;
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

    /* The site's own navbar must stay visible and ON TOP of the sheet. It ships as
       `fixed top-0 ... z-50`; the sheet sits far above that, so the nav is lifted higher
       still rather than left to chance on a short screen. */
    "nav.fixed.top-0{z-index:2200!important}",

    /* FULL-BLEED sheet anchored to the bottom, like the NYT panel. Not a card: it spans
       the entire viewport width and the content is centred inside it. */
    ".tup-ovl{position:fixed;left:0;right:0;bottom:0;z-index:2000;background:#fff;",
    "max-height:calc(100vh - 170px);overflow-y:auto;-webkit-overflow-scrolling:touch;",
    /* 170px, not 76: at 76 the sheet ran right up under the navbar on a laptop and the
       reader never saw the headline or the teaser at all — the one thing Bart asked to
       come FIRST. It scrolls internally on a short screen instead of eating the story. */
    /* the drop shadow the NYT casts UPWARD onto the article */
    "box-shadow:0 -14px 34px rgba(0,0,0,.20),0 -2px 6px rgba(0,0,0,.06)}",
    /* and a soft gradient sitting just above the top edge, so the article fades into it */
    ".tup-lift{position:fixed;left:0;right:0;z-index:1999;height:90px;pointer-events:none;",
    "background:linear-gradient(to bottom,rgba(249,249,249,0),rgba(249,249,249,.94))}",

    ".tup-inner{max-width:27rem;margin:0 auto;padding:2rem 1.25rem 2.25rem;text-align:center;",
    "font-family:'Public Sans',Helvetica,Arial,sans-serif;color:#121212}",

    ".tup-h{font-family:Newsreader,Georgia,'Times New Roman',serif;font-weight:400;font-size:1.5rem;",
    "line-height:1.25;margin:0}",
    ".tup-h b{font-weight:700}",
    ".tup-rule{width:56px;height:3px;background:#5d0011;margin:.75rem auto 1rem}",
    ".tup-sub{font-family:Newsreader,Georgia,serif;font-size:1.1rem;margin:0 0 1.5rem}",

    ".tup-field{text-align:left;margin-bottom:.9rem}",
    ".tup-field label{display:block;font-size:.8rem;font-weight:700;margin-bottom:.35rem}",
    ".tup-field input{width:100%;padding:.8rem;border:1px solid #121212;background:#fff;",
    "font-size:1rem;font-family:'Public Sans',Helvetica,Arial,sans-serif;color:#121212;",
    "border-radius:0;-webkit-appearance:none;box-sizing:border-box}",
    ".tup-field input:focus{outline:2px solid #5d0011;outline-offset:-2px}",

    ".tup-btn{width:100%;padding:.85rem 1rem;background:#121212;color:#fff;border:1px solid #121212;",
    "cursor:pointer;font-family:'Public Sans',Helvetica,Arial,sans-serif;font-weight:700;",
    "font-size:.95rem;border-radius:0;box-sizing:border-box}",
    ".tup-btn:hover{background:#000}",
    ".tup-btn[disabled]{opacity:.5;cursor:default}",

    ".tup-prov{width:100%;padding:.8rem 1rem;background:#fff;color:#121212;border:1px solid #121212;",
    "cursor:pointer;font-family:'Public Sans',Helvetica,Arial,sans-serif;font-weight:600;",
    "font-size:.95rem;border-radius:0;display:flex;align-items:center;justify-content:center;",
    "gap:.55rem;margin-top:.65rem;box-sizing:border-box}",
    ".tup-prov:hover{background:#f6f6f6}",
    ".tup-prov svg{width:18px;height:18px;flex:none}",

    ".tup-or{display:flex;align-items:center;gap:.9rem;margin:1rem 0;font-size:.95rem}",
    ".tup-or:before,.tup-or:after{content:'';flex:1;height:1px;background:#dcdcdc}",
    ".tup-err{color:#a81817;font-size:.85rem;margin-top:.55rem;min-height:1.1em;text-align:left}",
    ".tup-fine{font-size:.8rem;line-height:1.5;color:#333;margin:0 0 .9rem}",
    ".tup-fine a{color:#333;text-decoration:underline}",
    ".tup-note{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;",
    "color:#5d0011;margin:1rem 0 0}",
    /* Lock BOTH html and body. Locking body alone left the scrollbar gutter in place on
       desktop, so `left:0;right:0` measured 1265 of 1280 — a 15px white strip down the
       right edge instead of a full-bleed sheet. */
    "html.tup-locked,body.tup-locked{overflow:hidden}",
    "@media (max-width:420px){.tup-inner{padding:1.5rem 1rem 1.75rem}.tup-h{font-size:1.3rem}}",
  ].join("");
  document.head.appendChild(style);

  gated.forEach(function (el) { el.classList.add("tup-gated"); });
  var fade = document.createElement("div");
  fade.className = "tup-fade";
  fade.style.cssText = "height:6rem;pointer-events:none;margin-top:-1rem;background:linear-gradient(to bottom,rgba(249,249,249,0),rgba(249,249,249,.9))";
  prose.insertBefore(fade, gated[0]);

  /* ── The sheet ───────────────────────────────────────────────────────────────────── */

  var G_MARK = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  var A_MARK = '<svg viewBox="0 0 384 512" aria-hidden="true"><path fill="#000" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 271.5c0 25.9 4.7 52.7 14.2 80.4 12.6 36.4 44.9 121.2 90.9 119.8 24.1-.6 41.1-17.1 72.5-17.1 30.4 0 46.2 17.1 73.1 17.1 46.4-.7 75.6-77.1 87.6-113.6-62.2-29.3-63.6-115.2-13.6-89.4zM256.7 82.9C280.3 54.7 278.1 29 277.4 20c-21.2 1.2-45.7 14.4-59.7 30.7-15.4 17.5-24.1 39.1-22.2 63.2 22.9 1.8 43.9-10 61.2-31z"/></svg>';

  var ovl = document.createElement("div");
  ovl.className = "tup-ovl";
  ovl.setAttribute("role", "dialog");
  ovl.setAttribute("aria-modal", "true");
  ovl.setAttribute("aria-labelledby", "tup-title");
  ovl.innerHTML = [
    '<div class="tup-inner">',
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
    // The "or" divider renders ONLY when a provider button will follow it. Shipped without
    // this guard once: with no client ids set the sheet showed an "or" leading to blank
    // space — a control implying a choice that does not exist.
    (HAS_PROVIDERS ? '  <div class="tup-or">or</div>' : ''),
    '  <p class="tup-fine">By continuing, you agree to our <a href="/terms.html">Terms of Service</a> and <a href="/privacy.html">Privacy Policy</a>. We use your name and email to send you our updates. We do not sell your personal information.</p>',
    '  <div id="tup-providers"></div>',
    '</div>',
  ].join("");

  var lift = document.createElement("div");
  lift.className = "tup-lift";

  /* Not shown on load. Bart's spec: the headline and a sentence or two FIRST, then the
     ask. A sheet over the headline is a demand before a reason, and it gets dismissed. */
  var shown = false;
  function showModal() {
    if (shown) return;
    shown = true;
    document.body.appendChild(ovl);
    document.body.appendChild(lift);
    document.body.classList.add("tup-locked");
    document.documentElement.classList.add("tup-locked");
    positionLift();
  }
  // the upward gradient has to sit exactly on the sheet's top edge, whatever its height
  function positionLift() {
    if (!shown) return;
    lift.style.bottom = ovl.offsetHeight + "px";
  }
  window.addEventListener("resize", positionLift);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); showModal(); }
    }, { rootMargin: "0px 0px -25% 0px" });
    io.observe(fade);
  } else {
    setTimeout(showModal, 6000);
  }

  var err = ovl.querySelector("#tup-err");
  var submit = ovl.querySelector("#tup-submit");
  var providers = ovl.querySelector("#tup-providers");

  function unlock(name, email) {
    if (!PREVIEW) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name, email: email, at: Date.now() })); } catch (e) { /* private mode — they read this once */ }
    }
    gated.forEach(function (el) { el.classList.remove("tup-gated"); });
    if (fade.parentNode) fade.parentNode.removeChild(fade);
    document.body.classList.remove("tup-locked");
    document.documentElement.classList.remove("tup-locked");
    if (ovl.parentNode) ovl.parentNode.removeChild(ovl);
    if (lift.parentNode) lift.parentNode.removeChild(lift);
  }

  /* Append one row to Bart's Google Sheet via the Apps Script Web app.
     `text/plain` is deliberate: it keeps this a CORS "simple request" with no preflight,
     and Apps Script cannot answer an OPTIONS preflight — any other content type dies in
     the browser before it is sent. Verified live from texasunitedpatriots.org: the reply
     comes back readable (response type "cors"), so a save is CONFIRMED, not assumed. */
  function register(name, email, source) {
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
      return r.json().catch(function () { return { ok: true }; });
    }).then(function (j) {
      if (j && j.ok === false) throw new Error(j.error || "sheet refused");
      return true;
    });
  }

  function finish(name, email, source, onFail) {
    return register(name, email, source)
      .then(function () { unlock(name, email); })
      .catch(function () { onFail(); });
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
    finish(name, email, "form", function () {
      // Honest failure: say so and do NOT unlock. An unlock we didn't capture an email
      // from is a reader lost for nothing, which is the whole point of the wall.
      submit.disabled = false;
      submit.textContent = "Continue";
      err.textContent = "That didn't go through. Please check your connection and try again.";
    });
  });

  /* Decode the email/name out of an OIDC id_token. NOT verified here on purpose: this is
     lead capture, not a security boundary, and nothing behind it is secret. The moment
     anything is actually PAID for, this must move server-side. */
  function claims(jwt) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(String(jwt).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))));
    } catch (e) { return {}; }
  }

  function provButton(label, mark, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tup-prov";
    b.innerHTML = mark + "<span>Continue with " + label + "</span>";
    b.addEventListener("click", onClick);
    providers.appendChild(b);
    positionLift();
    return b;
  }

  /* ── Continue with Google (free) ─────────────────────────────────────────────────── */

  if (GOOGLE_CLIENT_ID) {
    var holder = document.createElement("div");
    holder.id = "tup-gbtn";
    holder.style.cssText = "display:flex;justify-content:center;margin-top:.65rem";
    providers.appendChild(holder);
    var gs = document.createElement("script");
    gs.src = "https://accounts.google.com/gsi/client";
    gs.async = true; gs.defer = true;
    gs.onload = function () {
      if (!window.google || !google.accounts || !google.accounts.id) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: function (resp) {
          var c = claims(resp.credential);
          var email = c.email || "";
          var name = c.given_name || (c.name || "").split(" ")[0] || "";
          if (!email) { err.textContent = "Google didn't return an email address. Please register above."; return; }
          finish(name, email, "google", function () { err.textContent = "That didn't go through. Please try the form above."; });
        },
      });
      google.accounts.id.renderButton(holder, { theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: 320 });
      positionLift();
    };
    document.head.appendChild(gs);
  } else if (PREVIEW) {
    provButton("Google", G_MARK, function () { err.textContent = "Preview only — a Google client id is needed to enable this."; });
  }

  /* ── Continue with Apple ($99/yr Apple Developer Program) ───────────────────────── */

  if (APPLE_CLIENT_ID) {
    var as = document.createElement("script");
    as.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    as.async = true; as.defer = true;
    as.onload = function () {
      if (!window.AppleID) return;
      AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: "name email",
        redirectURI: APPLE_REDIRECT_URI,
        usePopup: true, // keeps the whole exchange client-side — no server needed
      });
      provButton("Apple", A_MARK, function () {
        err.textContent = "";
        AppleID.auth.signIn().then(function (res) {
          var c = claims((res.authorization || {}).id_token || "");
          var email = c.email || "";
          // Apple sends the name ONLY on the very first authorisation, never again.
          var name = (res.user && res.user.name && res.user.name.firstName) || (email ? email.split("@")[0] : "");
          if (!email) { err.textContent = "Apple didn't share an email address. Please register above."; return; }
          finish(name, email, "apple", function () { err.textContent = "That didn't go through. Please try the form above."; });
        }).catch(function () { /* reader closed the Apple popup — say nothing */ });
      });
    };
    document.head.appendChild(as);
  } else if (PREVIEW) {
    provButton("Apple", A_MARK, function () { err.textContent = "Preview only — Apple needs the $99/yr Apple Developer Program."; });
  }

  if (PREVIEW && !SHEET_ENDPOINT) {
    var note = document.createElement("p");
    note.className = "tup-note";
    note.textContent = "Preview — nothing is saved until the Google Sheet is connected";
    ovl.querySelector(".tup-inner").appendChild(note);
  }
  positionLift();
})();
