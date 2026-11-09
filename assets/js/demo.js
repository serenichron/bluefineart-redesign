/* Demo mode, used only in the published concept copies (tools/build_demo.py).
   - Labels every screen as a design concept, not the live Blue Gallery site.
   - Switches off every contact action: phone, WhatsApp, booking, enquiry and
     newsletter forms. They show a short note instead.
   - Opens videos on YouTube, since the artifact frame cannot embed them.
   - Points the links between the two concept pages at each other. */
(function () {
  const CFG = window.BG_DEMO || {};
  const NOTE = "This is a design concept. Contact actions are switched off.";

  /* Videos: a real link out, instead of an embedded player. */
  window.BG_video = function (el) {
    if (!el) return;
    const a = document.createElement("a");
    a.className = el.className;
    a.href = "https://www.youtube.com/watch?v=" + el.dataset.yt;
    a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("aria-label", (el.getAttribute("aria-label") || "Play video") + " on YouTube");
    a.innerHTML = el.innerHTML;
    el.replaceWith(a);
  };

  const style = document.createElement("style");
  style.textContent = `
    .reveal { opacity: 1 !important; transform: none !important; }
    .wa-float, #shareBtn { display: none !important; }
    .site-header { padding-top: env(safe-area-inset-top, 0px); }
    .demo-pill {
      position: fixed; z-index: 90; left: calc(16px + env(safe-area-inset-left, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px;
      background: #141414; color: #fff; font: 500 12px/1.2 "Inter Tight", system-ui, sans-serif; letter-spacing: .02em;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, .45); pointer-events: none;
    }
    .demo-pill i { width: 7px; height: 7px; border-radius: 50%; background: #00aeef; }
    .demo-toast {
      position: fixed; z-index: 95; left: 50%; bottom: calc(72px + env(safe-area-inset-bottom, 0px)); transform: translate(-50%, 12px);
      max-width: calc(100% - 32px); padding: 12px 18px; border-radius: 10px; background: #141414; color: #fff;
      font: 400 14px/1.4 "Inter Tight", system-ui, sans-serif; opacity: 0; transition: opacity .25s, transform .25s; pointer-events: none; text-align: center;
    }
    .demo-toast.on { opacity: 1; transform: translate(-50%, 0); }
    .demo-note { margin: 12px 0 0; padding: 10px 12px; border-radius: 6px; background: #efece6; color: #3d3d3b; font-size: 13px; }
    @media (max-width: 760px) { .demo-pill { bottom: calc(80px + env(safe-area-inset-bottom, 0px)); } }
  `;
  document.head.appendChild(style);

  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "demo-toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg || NOTE;
    toastEl.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("on"), 3200);
  }

  const isAction = (href) => /^(tel:|mailto:|sms:)/.test(href) || /wa\.me|whatsapp\.com/.test(href) || /bluefineart\.com\/contact/.test(href);

  /* Links between the two concept pages. */
  function fixLinks(root) {
    (root || document).querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href");
      if (CFG.page === "home") {
        if (h.startsWith("index.html#")) a.setAttribute("href", h.slice(10));
        else if (h === "index.html") a.setAttribute("href", "#");
        else if (h.startsWith("exhibition.html") && CFG.exhibition) a.setAttribute("href", CFG.exhibition);
      } else if (CFG.page === "exhibition") {
        if (h.startsWith("index.html") && CFG.home) a.setAttribute("href", CFG.home + (h.includes("#") ? h.slice(h.indexOf("#")) : ""));
        else if (h.startsWith("exhibition.html")) a.setAttribute("href", "#");
      }
      const now = a.getAttribute("href");
      if (now.startsWith("https://claude.ai/")) { a.target = "_blank"; a.rel = "noopener"; }
      if (isAction(now)) a.removeAttribute("target");
    });
  }

  /* Contact actions: stop them and say why. */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (a && isAction(a.getAttribute("href"))) { e.preventDefault(); e.stopPropagation(); toast(); }
  }, true);

  document.addEventListener("submit", (e) => {
    e.preventDefault(); e.stopPropagation();
    const f = e.target;
    if (!f.querySelector(".demo-note")) {
      const p = document.createElement("p");
      p.className = "demo-note"; p.textContent = "In this design concept the form does not send anything.";
      f.appendChild(p);
    }
    toast();
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    const pill = document.createElement("div");
    pill.className = "demo-pill"; pill.innerHTML = "<i></i>Design concept, not the live website";
    document.body.appendChild(pill);
    const base = document.querySelector(".foot-base span");
    if (base) base.textContent = "Redesign concept for Blue Gallery. Not the live website.";
    fixLinks();
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && fixLinks(n)))).observe(document.body, { childList: true, subtree: true });
  });
})();
