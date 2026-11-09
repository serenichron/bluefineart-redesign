/* Blue Gallery redesign. Shared behaviour for all pages. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LIVE = "https://www.bluefineart.com";
  const WA = "19546092165";

  const icon = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8h18M3 16h18"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 5l14 14M19 5 5 19"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 12H4m6-6-6 6 6 6"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.6A21 21 0 0 0 14.6 2.5C12.2 2.5 10.6 4 10.6 6.6v1.9H8v3.2h2.6V21.5H14v-9.8h2.6l.4-3.2z"/></svg>',
    yt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12a31 31 0 0 0 .4 3.8 3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8zM10 15V9l5.2 3z"/></svg>',
  };
  window.BG_ICON = icon;

  const NAV = [
    ["Artists", "index.html#artists"],
    ["Exhibitions", "exhibition.html"],
    ["Collections", "index.html#collections"],
    ["Our galleries", "index.html#visit"],
    ["Videos", LIVE + "/videos"],
    ["Blog", LIVE + "/blog"],
    ["Virtual tour", LIVE + "/virtual"],
  ];

  /* Opening hours, the main site's version. 0 = Sunday. */
  const HOURS = { 0: [10, 18], 1: [10, 18], 2: [10, 18], 3: [10, 18], 4: [10, 18], 5: [10, 19], 6: [10, 20] };
  const fmt = (h) => (h > 12 ? h - 12 + "pm" : h + (h === 12 ? "pm" : "am"));
  function openState() {
    const ny = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    const [o, c] = HOURS[ny.getDay()];
    const now = ny.getHours() + ny.getMinutes() / 60;
    if (now >= o && now < c) return { open: true, text: "Open now, until " + fmt(c) };
    const next = now < o ? "today at " + fmt(o) : "tomorrow at " + fmt(HOURS[(ny.getDay() + 1) % 7][0]);
    return { open: false, text: "Closed, opens " + next };
  }
  window.BG_OPEN = openState;

  /* ---------- Header ---------- */
  function header(mode, current) {
    const h = document.createElement("header");
    h.className = "site-header" + (mode === "static" ? " static" : "");
    h.innerHTML = `
      <div class="wrap header-row">
        <a class="logo" href="index.html" aria-label="Blue Gallery home">${window.BG_LOGO}</a>
        <nav class="main-nav" aria-label="Main">
          ${NAV.map(([t, u]) => `<a href="${u}"${t === current ? ' aria-current="page"' : ""}>${t}</a>`).join("")}
        </nav>
        <div class="header-actions">
          <a class="icon-btn search-btn" href="${LIVE}/search" aria-label="Search">${icon.search}</a>
          <a class="btn btn-ghost" href="${LIVE}/contact">Book a visit</a>
          <button class="icon-btn menu-btn" aria-label="Open menu" aria-expanded="false">${icon.menu}</button>
        </div>
      </div>`;
    document.body.prepend(h);

    const m = document.createElement("div");
    m.className = "mobile-menu";
    m.setAttribute("aria-hidden", "true");
    m.innerHTML = `
      <div class="top"><a class="logo" href="index.html" style="color:var(--blue)">${window.BG_LOGO}</a>
        <button class="icon-btn" aria-label="Close menu">${icon.close}</button></div>
      <nav aria-label="Mobile">${NAV.map(([t, u]) => `<a href="${u}">${t}</a>`).join("")}<a href="${LIVE}/contact">Contact</a></nav>
      <div class="meta"><span>600 E. Atlantic Avenue, Delray Beach</span><a href="tel:+15612650020">561-265-0020</a></div>`;
    document.body.appendChild(m);
    const btn = $(".menu-btn", h);
    const toggle = (on) => { m.classList.toggle("open", on); btn.setAttribute("aria-expanded", on); m.setAttribute("aria-hidden", !on); document.body.style.overflow = on ? "hidden" : ""; };
    btn.addEventListener("click", () => toggle(true));
    $(".top .icon-btn", m).addEventListener("click", () => toggle(false));
    $$("nav a", m).forEach((a) => a.addEventListener("click", () => toggle(false)));

    if (mode !== "static") {
      const onScroll = () => h.classList.toggle("solid", window.scrollY > window.innerHeight * 0.6);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  /* ---------- Footer ---------- */
  function footer() {
    const f = document.createElement("footer");
    f.className = "site-footer";
    const days = [["Mon to Thu", "10am to 6pm"], ["Friday", "10am to 7pm"], ["Saturday", "10am to 8pm"], ["Sunday", "10am to 6pm"]];
    f.innerHTML = `
      <div class="wrap">
        <div class="newsletter">
          <div><p class="eyebrow">Newsletter</p><h2 class="h2">New works and openings,<br><span class="serif-it">before anyone else.</span></h2></div>
          <div>
            <form onsubmit="event.preventDefault(); this.querySelector('button').textContent='Thank you';">
              <label class="sr-only" for="nl-email">Email address</label>
              <input id="nl-email" type="email" placeholder="Your email address" required>
              <button type="submit">Subscribe ${icon.arrow}</button>
            </form>
            <small>Unsubscribe any time.</small>
          </div>
        </div>
        <div class="foot-grid">
          <div>
            <div class="foot-logo">${window.BG_LOGO}</div>
            <p style="max-width:34ch">Original art from internationally acclaimed artists, in Delray Beach since 2006.</p>
            <div class="socials">
              <a href="https://www.instagram.com/bluefineart/" aria-label="Instagram">${icon.ig}</a>
              <a href="https://www.facebook.com/bluegallery" aria-label="Facebook">${icon.fb}</a>
              <a href="https://www.youtube.com/@blue.gallery" aria-label="YouTube">${icon.yt}</a>
            </div>
          </div>
          <div>
            <h4>Blue Gallery</h4>
            <p><a href="https://maps.google.com/?q=600+E+Atlantic+Ave+Delray+Beach+FL+33483">600 E. Atlantic Avenue<br>Delray Beach, FL 33483</a></p>
            <p><a href="tel:+15612650020">561-265-0020</a></p>
            <h4 style="margin-top:24px">Designer showroom</h4>
            <p><a href="https://maps.google.com/?q=11975+W+Sample+Rd+Coral+Springs+FL+33065">11975 W. Sample Road<br>Coral Springs, FL 33065</a></p>
            <p><a href="tel:+19542826945">954-282-6945</a></p>
          </div>
          <div>
            <h4>Opening hours</h4>
            <div class="hours">${days.map(([d, h]) => `<span>${d}</span><span>${h}</span>`).join("")}</div>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>${NAV.map(([t, u]) => `<li><a href="${u}">${t}</a></li>`).join("")}<li><a href="${LIVE}/contact">Contact</a></li></ul>
          </div>
        </div>
        <div class="foot-base">
          <span>&copy; ${new Date().getFullYear()} Blue Gallery. All rights reserved.</span>
          <nav><a href="${LIVE}/terms-of-use">Terms of use</a><a href="${LIVE}/privacy-policy">Privacy policy</a></nav>
        </div>
      </div>`;
    document.body.appendChild(f);

    const wa = document.createElement("a");
    wa.className = "wa-float";
    wa.href = `https://wa.me/${WA}?text=${encodeURIComponent("Hello Blue Gallery, I have a question.")}`;
    wa.target = "_blank"; wa.rel = "noopener";
    wa.innerHTML = icon.wa + "<span>WhatsApp</span>";
    if (!document.body.dataset.noFloat) document.body.appendChild(wa);
    if (document.body.dataset.header !== "static") {
      const t = () => wa.classList.toggle("hide", window.scrollY < window.innerHeight * 0.7);
      t(); window.addEventListener("scroll", t, { passive: true });
    }
  }

  /* ---------- Local images ----------
     img(url, sizes) returns src, srcset, sizes and a placeholder color for a
     remote image, using the WebP copies made by tools/optimize_images.py.
     big(url) returns the largest local copy, for the zoom viewer. */
  const M = window.BG_IMG || {};
  window.BG_img = function (url, sizes) {
    const i = M[url];
    if (!i) return `src="${url}"`;
    if (i.f) return `src="${i.f}" decoding="async"`;
    const mid = i.w[Math.min(1, i.w.length - 1)];
    return `src="${i.b}-${mid}.webp" srcset="${i.w.map((w) => `${i.b}-${w}.webp ${w}w`).join(", ")}" sizes="${sizes || "100vw"}" style="background:${i.c}" decoding="async"`;
  };
  window.BG_big = (url) => (M[url] ? `${M[url].b}-${M[url].w[M[url].w.length - 1]}.webp` : url);
  window.BG_src = (url, w) => { const i = M[url]; if (!i) return url; if (i.f) return i.f; const pick = i.w.find((x) => x >= (w || 0)) || i.w[i.w.length - 1]; return `${i.b}-${pick}.webp`; };

  /* ---------- Helpers used by pages ---------- */
  window.BG_waLink = (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  window.BG_LIVE = LIVE;

  window.BG_rail = function (railEl, prevBtn, nextBtn) {
    const step = () => railEl.firstElementChild.getBoundingClientRect().width + 20;
    prevBtn.addEventListener("click", () => railEl.scrollBy({ left: -step() * 2, behavior: "smooth" }));
    nextBtn.addEventListener("click", () => railEl.scrollBy({ left: step() * 2, behavior: "smooth" }));
  };

  window.BG_video = function (el) {
    el.addEventListener("click", function play() {
      const id = el.dataset.yt;
      /* YouTube refuses to play inside a page opened straight from disk (error 153:
         no referrer). Opened as a file, send people to YouTube instead. */
      if (location.protocol === "file:") { window.open("https://www.youtube.com/watch?v=" + id, "_blank", "noopener"); return; }
      el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="${el.dataset.title || "Video"}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
      el.removeEventListener("click", play);
    });
  };

  window.BG_reveal = function () {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal:not(.in)").forEach((el) => io.observe(el));
  };

  document.addEventListener("DOMContentLoaded", () => {
    header(document.body.dataset.header, document.body.dataset.nav);
    footer();
    window.BG_reveal();
  });
})();
