/* =====================================================================
   common.js — PIECES EVERY PAGE SHARES
   ---------------------------------------------------------------------
   - the fixed navigation (The Collection / The Artist / Let's Chat)
   - the colour veil pages fade in from and out to
   - reveal-on-scroll
   - small helpers (escaping text, icons, reduced motion)
   ===================================================================== */

import { site } from "./data/site.js";

/* Does this visitor prefer less motion? (a setting on their device) */
export const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Shown over the turntable? ----------
   When an album is opened from the homepage, its page is shown inside
   a frame on top of the turntable, so the music keeps playing (see
   home.js). The page then asks the homepage to do the navigating:
   links back to the collection close the frame, and links to another
   album swap the record on the turntable and show that album. */
export const embedded = window.parent !== window && new URLSearchParams(window.location.search).has("embedded");

export function tellTurntable(message) {
  if (embedded) window.parent.postMessage(message, window.location.origin);
}

/* Which album a page address belongs to ("project-02", "artist", "chat"), or null */
export function albumIdFor(url) {
  const page = url.pathname.split("/").pop() || "index.html";
  if (page === "project.html") return url.searchParams.get("id");
  if (page === "artist.html") return "artist";
  if (page === "chat.html") return "chat";
  return null;
}

if (embedded) {
  document.documentElement.classList.add("is-embedded");
  document.addEventListener("click", (event) => {
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.getAttribute("href"), window.location.href);
    if (url.origin !== window.location.origin) return;
    const page = url.pathname.split("/").pop() || "index.html";
    if (page === "index.html") {
      event.preventDefault();
      tellTurntable({ type: "fpd-close" });
      return;
    }
    const id = albumIdFor(url);
    if (!id) return;
    // a link within this same page (e.g. the track list): let it scroll
    if (id === albumIdFor(new URL(window.location.href)) && url.hash) return;
    event.preventDefault();
    tellTurntable({ type: "fpd-open", id, hash: url.hash.slice(1) });
  });
}

/* Make text safe to put inside HTML (so a stray < or & in your
   content can't break the page). */
export function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Small line icons, drawn in SVG so they stay crisp */
export const icons = {
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M20 12H4M10 6l-6 6 6 6"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 4v16M6 14l6 6 6-6"/></svg>',
  arrowUpRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
};

/* ---------- The navigation ----------
   active: "collection", "artist" or "chat" (which link is current) */
export function renderNav(active) {
  const header = document.querySelector("[data-nav]");
  if (!header) return;
  const link = (key, href, long, short) =>
    `<li><a class="caps" href="${href}"${active === key ? ' aria-current="page"' : ""}><span class="long">${long}</span><span class="short">${short}</span></a></li>`;
  header.classList.add("site-nav");
  // just the three links, on the right (the name is on each page itself)
  header.innerHTML = `
    <nav aria-label="Main">
      <ul class="site-nav__links">
        ${link("collection", "index.html", "The Collection", "Collection")}
        ${link("artist", "artist.html", "The Artist", "Artist")}
        ${link("chat", "chat.html", "Let’s Chat", "Chat")}
      </ul>
    </nav>`;

  // A solid band behind the nav once the page has scrolled, and light
  // text while it's over a dark band at the top of the page (data-dark-top)
  const update = () => {
    header.classList.toggle("is-solid", window.scrollY > 24);
    const dark = document.querySelector("[data-dark-top]");
    const overDark = !!dark && window.scrollY < dark.offsetTop + dark.offsetHeight - header.offsetHeight;
    header.classList.toggle("is-over-dark", overDark);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  return update; // pages that build their content later call this again
}

/* ---------- Reveal on scroll ----------
   Anything with class "reveal" fades up the first time it comes into
   view. Without IntersectionObserver (very old browsers), or with
   reduced motion, everything is simply shown. */
export function initReveal(root = document) {
  const items = root.querySelectorAll(".reveal:not(.is-visible)");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  items.forEach((el) => observer.observe(el));
}

/* ---------- The colour veil ----------
   Pages start covered by their own colour and fade it away (done in
   style.css), so arriving from the crate, which fades TO that colour,
   is seamless. */

/* Fade the veil up (in a given colour), then go to a page. */
export function leaveTo(href, colour) {
  const veil = document.querySelector("[data-veil]");
  if (!veil || reducedMotion) {
    window.location.href = href;
    return;
  }
  if (colour) veil.style.background = colour;
  veil.classList.add("is-on");
  setTimeout(() => (window.location.href = href), 520);
}

/* Coming back with the browser's Back button can restore a page exactly
   as it was left (veil up). Clear it so the page is visible again. */
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    const veil = document.querySelector("[data-veil]");
    if (veil) veil.classList.remove("is-on");
  }
});

/* The year, for the footer */
export function footerHTML() {
  return `
    <span class="caps">© ${new Date().getFullYear()} ${escapeHTML(site.brand)} · ${escapeHTML(site.name)}</span>
    <span class="caps"><a href="mailto:${escapeHTML(site.email)}">${escapeHTML(site.email)}</a></span>`;
}

/* ---------- Leaving, from anywhere ----------
   On every album page (projects, The Artist, Let's Chat):
   - a "Back to the top" button appears once the page has scrolled
   - Esc leaves the page and goes back to the collection (over the
     turntable: the record keeps playing). If the drawing viewer is
     open, Esc closes that first. */
export function initPageTools() {
  const albumId = albumIdFor(new URL(window.location.href));
  const button = document.createElement("button");
  button.type = "button";
  button.className = "to-top";
  button.setAttribute("aria-label", "Back to the top");
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 20V4M6 10l6-6 6 6"/></svg><span class="caps">Top</span>`;
  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    const heading = document.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  });
  document.body.appendChild(button);
  const update = () => button.classList.toggle("is-on", window.scrollY > window.innerHeight * 0.8);
  update();
  window.addEventListener("scroll", update, { passive: true });

  // capture: this runs before the drawing viewer's own Esc
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (document.querySelector(".lightbox.is-open")) return; // the viewer closes itself
    const field = event.target.closest && event.target.closest("input, textarea, select");
    if (field) return;
    event.preventDefault();
    if (embedded) {
      tellTurntable({ type: "fpd-close" });
    } else {
      const href = `index.html${albumId ? `?from=${encodeURIComponent(albumId)}` : ""}`;
      leaveTo(href, "#131112");
    }
  }, true);
}
if (/\bpage-(project|artist|chat)\b/.test(document.body.className)) initPageTools();
