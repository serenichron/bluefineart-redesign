/* Password screen for the Blue Gallery preview.

   Every page loads this first. Until the visitor types the password, the page
   stays hidden behind a plain screen with one field. There is no user name.
   Once they get it right, this browser remembers, on every page of the site.

   WHAT THIS IS NOT. This is a curtain, not a lock. The site is plain files on
   GitHub Pages, which cannot check a password before it sends a page. So the
   check runs here, in the visitor's browser, after the files have arrived.
   Anyone who knows how can read the page source, or open an image by its
   address, without the password. It keeps out passers-by and search engines.
   It does not protect anything secret. For a real lock the site needs a host
   that checks the password on its own side.

   The password itself is not written here. What is stored is its SHA-256
   fingerprint. To change the password, replace the fingerprint below with the
   one for the new word. */
(function () {
  var WANT = "76f9f5e371bc991f97085b4dd5d02b3633a513abf28c2c6953c5adce5378ba64";
  var KEY = "bg-preview-pass";
  var root = document.documentElement;

  function recall() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private window: ask again next time */ } }
  if (recall() === WANT) return;

  /* hide the page at once, before any of it is drawn */
  root.classList.add("bg-locked");
  var css = document.createElement("style");
  css.textContent =
    "html.bg-locked body > *:not(.bg-gate) { visibility: hidden !important; }" +
    "html.bg-locked, html.bg-locked body { overflow: hidden !important; }" +
    ".bg-gate { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; padding: 24px; background: #f7f5f1; color: #141414; font: 400 16px/1.5 'Inter Tight', system-ui, -apple-system, 'Segoe UI', sans-serif; }" +
    ".bg-gate form { width: min(360px, 100%); text-align: center; }" +
    ".bg-gate h1 { margin: 0; font: 400 44px/1.05 'Instrument Serif', 'Times New Roman', serif; }" +
    ".bg-gate p { margin: 10px 0 28px; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #77746e; }" +
    ".bg-gate label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }" +
    ".bg-gate .row { display: flex; border-bottom: 1px solid #141414; }" +
    ".bg-gate input { flex: 1; min-width: 0; border: 0; background: none; padding: 12px 0; font: inherit; font-size: 18px; color: inherit; outline: none; }" +
    ".bg-gate button { border: 0; background: none; padding: 0 2px 0 14px; font: 500 14px/1 inherit; font-family: inherit; color: inherit; cursor: pointer; }" +
    ".bg-gate button:hover { color: #0077a8; }" +
    ".bg-gate input:focus-visible, .bg-gate button:focus-visible { outline: 2px solid #00aeef; outline-offset: 3px; }" +
    ".bg-gate .note { min-height: 21px; margin: 12px 0 0; font-size: 14px; letter-spacing: 0; text-transform: none; color: #a32d2d; }";
  (document.head || root).appendChild(css);

  function hex(buf) {
    var out = "", view = new Uint8Array(buf);
    for (var i = 0; i < view.length; i++) out += (view[i] < 16 ? "0" : "") + view[i].toString(16);
    return out;
  }
  function fingerprint(text) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(hex);
  }

  function build() {
    var gate = document.createElement("div");
    gate.className = "bg-gate";
    gate.innerHTML =
      '<form novalidate>' +
      '<h1>Blue Gallery</h1><p>Private preview</p>' +
      '<div class="row"><label for="bg-pass">Password</label>' +
      '<input id="bg-pass" type="password" placeholder="Password" autocomplete="current-password" autofocus>' +
      '<button type="submit">Enter</button></div>' +
      '<p class="note" role="alert"></p></form>';
    document.body.appendChild(gate);
    var input = gate.querySelector("input"), note = gate.querySelector(".note");
    input.focus();
    input.addEventListener("input", function () { note.textContent = ""; });
    gate.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!input.value) { note.textContent = "Enter the password."; return; }
      if (!window.crypto || !crypto.subtle) { note.textContent = "This browser cannot check the password here. Open the page over https."; return; }
      fingerprint(input.value).then(function (got) {
        if (got !== WANT) { note.textContent = "That password is not right. Try again."; input.select(); return; }
        remember(WANT);
        root.classList.remove("bg-locked");
        gate.remove();
      });
    });
  }
  if (document.body) build(); else document.addEventListener("DOMContentLoaded", build);
})();
