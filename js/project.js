/* =====================================================================
   project.js — ONE TEMPLATE FOR EVERY PROJECT PAGE
   ---------------------------------------------------------------------
   project.html?id=project-01 shows project-01, and so on. Everything
   comes from js/data/projects.js; this file only arranges it:

     "Now Playing" band   cover (its record slides out), title,
                          subtitle, summary, credits, track list
     lead image           the hero render, full width
     01 The Brief         … only the sections that have content
     02 The Concept
     03 Design Development
     04 Technical Drawings   (click to open the zoom viewer)
     05 The Final Experience
     album navigation     previous / next album, back to the crate
   ===================================================================== */

import { projects } from "./data/projects.js";
import { getAlbums, sectionsFor, hasText, realImages } from "./albums.js";
import { drawCover, drawRecord } from "./covers.js";
import { renderNav, initReveal, escapeHTML as esc, icons, footerHTML, embedded, tellTurntable, reducedMotion } from "./common.js";
import { openLightbox } from "./lightbox.js";

const updateNav = renderNav("collection");

const main = document.querySelector("#main");
const params = new URLSearchParams(window.location.search);
const project = projects.find((p) => p.id === params.get("id"));

if (!project) {
  showNotFound();
} else {
  render(project);
}

/* =====================================================================
   BUILDING THE PAGE
   ===================================================================== */

function render(p) {
  const albums = getAlbums();
  const albumIndex = albums.findIndex((a) => a.id === p.id);
  const album = albums[albumIndex];
  const sections = sectionsFor(p);
  const backHref = `index.html?from=${encodeURIComponent(p.id)}`;

  document.title = `${p.title} · ${p.subtitle ? `${p.subtitle} · ` : ""}Four Points Design`;

  /* Every image that can open in the viewer, grouped by section */
  const viewerGroups = {};

  main.innerHTML = `
    ${nowPlaying(p, sections, backHref)}
    ${hasText(p.hero) ? `<figure class="lead-image">${hasText(p.heroVideo) && !reducedMotion
      ? `<video src="${esc(p.heroVideo)}" poster="${esc(p.hero)}" muted loop playsinline preload="auto" data-autoplay aria-label="${esc(p.title)}, main view, moving"></video>`
      : `<img src="${esc(p.hero)}" alt="${esc(p.title)}, main render" fetchpriority="high">`}</figure>` : ""}
    ${sections.map((s) => sectionHTML(p, s, viewerGroups)).join("")}
    ${albumNav(albums, albumIndex, backHref)}
    <footer class="site-footer">${footerHTML()}</footer>`;

  // the cover and record in the "Now Playing" band
  const sleeve = main.querySelector("[data-sleeve]");
  Promise.all([drawCover(album, 1024), drawRecord(album, 1024)]).then(([cover, record]) => {
    cover.setAttribute("role", "img");
    cover.setAttribute("aria-label", `${p.title} album cover`);
    sleeve.querySelector("[data-cover]").appendChild(cover);
    sleeve.querySelector("[data-record]").appendChild(record);
    requestAnimationFrame(() => requestAnimationFrame(() => sleeve.classList.add("is-out")));
  });

  // small covers on the previous / next links
  main.querySelectorAll("[data-mini-cover]").forEach((slot) => {
    drawCover(albums[Number(slot.dataset.miniCover)], 320).then((canvas) => slot.replaceWith(canvas));
  });

  // clicking an image opens the viewer, on that image of its section
  main.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const [group, i] = button.dataset.view.split(":");
      openLightbox(viewerGroups[group], Number(i));
    });
  });

  initStepper();
  initVideos();
  initMiniPlayer(album, sections);
  initReveal();
  updateNav();
}

/* ---------- The "Now Playing" band ---------- */
function nowPlaying(p, sections, backHref) {
  const credits = (p.credits || []).filter(([, value]) => hasText(value));
  return `
  <section class="now-playing" data-dark-top aria-labelledby="np-title">
    <div class="wrap">
      <div>
        <a class="back-link caps" href="${backHref}">${icons.arrowLeft}<span>Back to the collection</span></a>
        <div class="sleeve" data-sleeve>
          <div class="sleeve__record" data-record aria-hidden="true"></div>
          <div class="sleeve__cover" data-cover></div>
        </div>
      </div>
      <div class="np-info">
        <p class="np-eyebrow caps"><span>Now playing</span><span>${esc(p.catalogue)}</span></p>
        <h1 class="np-title" id="np-title">${esc(p.title)}</h1>
        ${hasText(p.subtitle) ? `<p class="np-subtitle caps">${esc(p.subtitle)}</p>` : ""}
        ${hasText(p.summary) ? `<p class="np-summary">${esc(p.summary)}</p>` : ""}
        ${credits.length ? `<dl class="np-credits">${credits.map(([label, value]) => `<dt class="caps">${esc(label)}</dt><dd>${esc(value)}</dd>`).join("")}</dl>` : ""}
        ${sections.length ? `
        <nav aria-label="Track list">
          <ol class="tracklist">
            ${sections.map((s) => `
            <li><a href="#${s.key}">
              <span class="num">${s.number}</span>
              <span class="name">${esc(s.name)}</span>
              <span class="arrow">${icons.arrowDown.replace("<svg", '<svg width="16" height="16"')}</span>
            </a></li>`).join("")}
          </ol>
        </nav>` : ""}
      </div>
    </div>
  </section>`;
}

/* ---------- One section ("track") ---------- */
function sectionHTML(p, section, viewerGroups) {
  const head = `
    <header class="track__head reveal">
      <p class="track__num caps">Track ${section.number}</p>
      <h2 class="track__name" id="${section.key}-title">${esc(section.name)}</h2>
    </header>`;
  const builders = { brief, concept, development, drawings, experience };
  const body = builders[section.key](p, viewerGroups);
  return `<section class="track wrap" id="${section.key}" aria-labelledby="${section.key}-title">${head}${body}</section>`;
}

/* Text blocks with their own small headings */
function textBlocks(blocks, extraClass = "") {
  const real = (blocks || []).filter((b) => hasText(b.text));
  if (!real.length) return "";
  return `
    <div class="text-blocks ${extraClass}">
      ${real.map((b) => `
      <div class="text-block reveal">
        ${hasText(b.heading) ? `<h3 class="caps">${esc(b.heading)}</h3>` : ""}
        <p>${esc(b.text)}</p>
      </div>`).join("")}
    </div>`;
}

/* A clickable figure that opens the viewer */
function viewFigure(item, group, i, { label = "", kind = "render", sheet = false, lazy = true } = {}) {
  const img = hasText(item.video) && !reducedMotion
    // a moving render: a short muted loop, showing the still until it plays
    ? `<video src="${esc(item.video)}" poster="${esc(item.file)}" muted loop playsinline preload="none" data-autoplay aria-label="${esc(item.caption || "")}, moving"></video>`
    : `<img src="${esc(item.file)}" alt="${esc(item.caption || "")}"${lazy ? ' loading="lazy"' : ""} decoding="async">`;
  return `
    <figure class="reveal">
      <button class="media-button" type="button" data-view="${group}:${i}" aria-label="Open ${esc(item.caption || "image")} full screen">
        ${sheet ? `<span class="drawing-sheet">${img}</span>` : img}
      </button>
      ${hasText(item.caption) || label ? `<figcaption>${label ? `<span class="caps">${esc(label)}</span>` : ""}<span>${esc(item.caption || "")}</span>${sheet ? '<span class="zoom-hint caps">Zoom</span>' : ""}</figcaption>` : ""}
    </figure>`;
}

function toViewer(list, kind, prefix) {
  return list.map((item, i) => ({
    src: item.file,
    caption: item.caption || "",
    label: `${prefix} ${String(i + 1).padStart(2, "0")}`,
    kind,
  }));
}

/* 01 — The Brief */
function brief(p) {
  const b = p.brief || {};
  return `
    ${hasText(b.lead) ? `
    <p class="brief-lead reveal${b.lead.split(/\s+/).length > 45 ? " is-long" : ""}">
      ${hasText(b.heading) ? `<span class="brief-lead__label caps">${esc(b.heading)}</span>` : ""}
      ${esc(b.lead)}
    </p>` : ""}
    ${textBlocks(b.blocks)}`;
}

/* 02 — The Concept */
function concept(p, viewerGroups) {
  const c = p.concept || {};
  const images = realImages(c.images);
  viewerGroups.concept = toViewer(images, "render", "Concept");
  return `
    ${hasText(c.text) ? `
    <div class="concept-intro">
      <div class="text-block reveal">
        ${hasText(c.heading) ? `<h3 class="caps">${esc(c.heading)}</h3>` : ""}
        <p>${esc(c.text)}</p>
      </div>
    </div>` : ""}
    ${hasText(c.statement) ? `<p class="concept-statement reveal">${esc(c.statement)}</p>` : ""}
    ${images.length ? `
    <div class="collage">
      ${images.map((img, i) => viewFigure(img, "concept", i, { label: String(i + 1).padStart(2, "0") })).join("")}
    </div>` : ""}`;
}

/* 03 — Design Development: text, then a scroll-through of stages */
function development(p, viewerGroups) {
  const d = p.development || {};
  const stages = realImages(d.stages);
  viewerGroups.development = toViewer(stages, "drawing", "Stage");
  return `
    ${textBlocks(d.blocks)}
    ${stages.length ? `
    <div class="stepper" data-stepper>
      <div class="stepper__stage reveal">
        ${stages.map((s, i) => `<img src="${esc(s.file)}" alt="${esc(s.caption || "")}" class="${s.fit === "contain" ? "fit-contain" : ""}${i === 0 ? " is-active" : ""}" decoding="async" loading="${i < 2 ? "eager" : "lazy"}">`).join("")}
        <button class="media-button" type="button" data-view="development:0" data-stepper-open aria-label="Open this stage full screen"></button>
      </div>
      <ol class="stepper__steps">
        ${stages.map((s, i) => `
        <li data-step="${i}"${i === 0 ? ' class="is-active"' : ""}>
          <p class="caps">Stage ${String(i + 1).padStart(2, "0")} / ${String(stages.length).padStart(2, "0")}</p>
          <h3>${esc(s.caption || "")}</h3>
          <div class="stepper__progress" aria-hidden="true">${stages.map((_, j) => `<span${j <= i ? ' class="on"' : ""}></span>`).join("")}</div>
        </li>`).join("")}
      </ol>
    </div>` : ""}`;
}

/* 04 — Technical Drawings */
function drawings(p, viewerGroups) {
  const list = realImages(p.drawings);
  viewerGroups.drawings = toViewer(list, "drawing", "Drawing");
  return `
    <div class="drawings">
      ${list.map((d, i) => viewFigure(d, "drawings", i, { label: String(i + 1).padStart(2, "0"), sheet: true })).join("")}
    </div>`;
}

/* 05 — The Final Experience */
function experience(p, viewerGroups) {
  const list = realImages(p.experience);
  viewerGroups.experience = toViewer(list, "render", "View");
  return `
    <div class="gallery">
      ${list.map((r, i) => viewFigure(r, "experience", i, { label: String(i + 1).padStart(2, "0") })).join("")}
    </div>`;
}

/* ---------- Previous / next album, back to the crate ---------- */
function albumNav(albums, index, backHref) {
  const prev = albums[(index - 1 + albums.length) % albums.length];
  const next = albums[(index + 1) % albums.length];
  const prevIndex = albums.indexOf(prev);
  const nextIndex = albums.indexOf(next);
  return `
  <nav class="album-nav" aria-label="More albums">
    <div class="wrap album-nav__grid">
      <a class="album-nav__link prev" href="${esc(prev.href)}">
        <span data-mini-cover="${prevIndex}"></span>
        <span><span class="caps">${icons.arrowLeft.replace("<svg", '<svg width="14" height="14" style="display:inline;vertical-align:-2px"')} Previous album</span><span class="serif" style="display:block">${esc(prev.title)}</span></span>
      </a>
      <a class="btn album-nav__back" href="${backHref}">${icons.arrowLeft}Back to the collection</a>
      <a class="album-nav__link next" href="${esc(next.href)}">
        <span data-mini-cover="${nextIndex}"></span>
        <span><span class="caps">Next album ${icons.arrowRight.replace("<svg", '<svg width="14" height="14" style="display:inline;vertical-align:-2px"')}</span><span class="serif" style="display:block">${esc(next.title)}</span></span>
      </a>
    </div>
  </nav>`;
}

/* ---------- Design development: swap the picture as steps scroll by ---------- */
function initStepper() {
  const stepper = main.querySelector("[data-stepper]");
  if (!stepper) return;
  const images = [...stepper.querySelectorAll(".stepper__stage img")];
  const steps = [...stepper.querySelectorAll("[data-step]")];
  const openButton = stepper.querySelector("[data-stepper-open]");
  const activate = (i) => {
    images.forEach((img, j) => img.classList.toggle("is-active", j === i));
    steps.forEach((step, j) => step.classList.toggle("is-active", j === i));
    openButton.dataset.view = `development:${i}`;
    openButton.setAttribute("aria-label", `Open stage ${i + 1}, ${images[i].alt}, full screen`);
  };
  if (!("IntersectionObserver" in window)) return;
  // a step is "active" when it crosses the middle band of the screen
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.isIntersecting && activate(Number(entry.target.dataset.step))),
    { rootMargin: "-45% 0px -45% 0px" }
  );
  steps.forEach((step) => observer.observe(step));
}

/* ---------- Unknown id ---------- */
function showNotFound() {
  document.title = "Album not found · Four Points Design";
  main.innerHTML = `
    <section class="not-found">
      <div>
        <p class="caps" style="color:var(--burgundy)">Album not found</p>
        <h1>This record isn’t in the crate.</h1>
        <a class="btn on-light" href="index.html">${icons.arrowLeft}Back to the collection</a>
      </div>
    </section>`;
}

/* ---------- The mini player ----------
   A little record in the corner: it shows which track (section) you're
   reading, spins while the music plays, and plays / pauses it.
   - Opened from the turntable (embedded): the homepage plays the music;
     this page tells it which section is being read, so the music
     follows (each section is a track of the record).
   - Opened directly (a shared link): the music starts when the visitor
     presses play (browsers don't allow sound before a click). */
function initMiniPlayer(album, sections) {
  if (!sections.length) return;
  const player = document.createElement("div");
  player.className = "mini-player";
  player.innerHTML = `
    <button class="mini-player__toggle" type="button" data-mini-toggle aria-label="Play this record">
      <span class="mini-player__disc" data-mini-disc aria-hidden="true"></span>
      <span class="mini-player__icon" aria-hidden="true">
        <svg class="i-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <svg class="i-pause" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
      </span>
    </button>
    <a class="mini-player__text" href="#np-title" aria-label="Back to the track list">
      <span class="caps" data-mini-num></span>
      <span class="mini-player__name" data-mini-name></span>
    </a>`;
  document.body.appendChild(player);
  drawRecord(album, 160).then((canvas) => player.querySelector("[data-mini-disc]").appendChild(canvas));

  const toggle = player.querySelector("[data-mini-toggle]");
  const num = player.querySelector("[data-mini-num]");
  const name = player.querySelector("[data-mini-name]");
  let reading = 0;      // the section on screen
  let playing = false;
  let localSound = null; // only when opened directly

  const showPlaying = (on) => {
    playing = on;
    player.classList.toggle("is-playing", on);
    toggle.setAttribute("aria-label", on ? "Pause the music" : "Play this record");
  };
  const show = (index) => {
    reading = index;
    num.textContent = `Track ${sections[index].number}`;
    name.textContent = sections[index].name;
  };
  // start on the track in the address (#concept …), or the first
  const fromHash = sections.findIndex((s) => `#${s.key}` === window.location.hash);
  show(Math.max(0, fromHash));

  if (embedded) {
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = event.data || {};
      if (message.type === "fpd-state") showPlaying(!!message.playing && message.album === album.id);
    });
    tellTurntable({ type: "fpd-ready" });
    toggle.addEventListener("click", () => tellTurntable({ type: "fpd-toggle" }));
  } else {
    toggle.addEventListener("click", async () => {
      if (!localSound) {
        const { createSound } = await import("./sound.js");
        localSound = createSound();
      }
      if (playing) {
        localSound.stop(0.6);
        showPlaying(false);
      } else {
        if (!localSound.enabled) localSound.setEnabled(true);
        localSound.unlock();
        localSound.crossfade(album, reading, 0.8);
        localSound.prepare(album, reading + 1);
        showPlaying(true);
      }
    });
  }

  // as a new section crosses the middle of the screen, the music moves to its track
  if (!("IntersectionObserver" in window)) return;
  let settle = 0;
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const index = sections.findIndex((s) => s.key === entry.target.id);
      if (index < 0 || index === reading) return;
      show(index);
      // wait until the reader stays a moment, so fast scrolling doesn't flick through the music
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (embedded) tellTurntable({ type: "fpd-track", album: album.id, track: reading });
        else if (localSound && playing) {
          localSound.crossfade(album, reading, 2.5);
          localSound.prepare(album, reading + 1);
        }
      }, 900);
    }),
    { rootMargin: "-45% 0px -45% 0px" }
  );
  sections.forEach((s) => {
    const el = document.getElementById(s.key);
    if (el) observer.observe(el);
  });
  // the album navigation at the bottom is dark too: step aside there
  const nav = main.querySelector(".album-nav");
  if (nav) new IntersectionObserver(([entry]) => player.classList.toggle("is-hidden", entry.isIntersecting)).observe(nav);
}

/* ---------- Moving renders ----------
   Videos (heroVideo, and "video" on a render) play only while they're
   on screen, muted and looping, so the page stays light. */
function initVideos() {
  const videos = [...main.querySelectorAll("video[data-autoplay]")];
  if (!videos.length) return;
  const play = (video) => {
    if (video.preload === "none") video.preload = "auto";
    const attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(() => { /* the still stays: fine */ });
  };
  if (!("IntersectionObserver" in window)) {
    videos.forEach(play);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => (entry.isIntersecting ? play(entry.target) : entry.target.pause())),
    { rootMargin: "200px 0px" }
  );
  videos.forEach((video) => observer.observe(video));
}
