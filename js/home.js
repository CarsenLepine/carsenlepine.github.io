/* =====================================================================
   home.js — THE HOMEPAGE (index.html)
   ---------------------------------------------------------------------
   Connects the 3D crate and turntable (crate.js) to the text around it:
     - the "Now browsing" label (title, subtitle, Play, ← →)
     - the "On the turntable" panel, shown while a record plays:
       its tracks (each moves the needle), Open, lift the needle, eject
     - the list of all albums (hovering one flips the crate to it)
     - scroll wheel and keys
     - the sound (sound.js) and its on / off switch
     - ?from=project-02 in the address puts that album in front
       (used by every "Back to the collection" link)
     - if WebGL isn't available, a simple grid of covers instead
       (add ?nowebgl to the address to preview that)
   ===================================================================== */

import { getAlbums, findAlbumIndex, coloursFor, hasText } from "./albums.js";
import { drawCover } from "./covers.js";
import { renderNav, reducedMotion, escapeHTML, leaveTo } from "./common.js";
import { createSound } from "./sound.js";

renderNav("collection");

const albums = getAlbums();
const params = new URLSearchParams(window.location.search);
const fromIndex = findAlbumIndex(albums, params.get("from"));
let current = fromIndex >= 0 ? fromIndex : 0;
const sound = createSound();

/* ---------- Elements ---------- */
const $ = (selector) => document.querySelector(selector);
const stage = $("[data-stage]");
const list = $("[data-list]");
const label = {
  counter: $("[data-counter]"),
  meta: $("[data-meta]"),
  title: $("[data-title]"),
  subtitle: $("[data-subtitle]"),
  swap: $("[data-swap]"),
  live: $("[data-live]"),
  play: $("[data-play]"),
  prev: $("[data-prev]"),
  next: $("[data-next]"),
};
const deck = {
  panel: $("[data-deck]"),
  status: $("[data-deck-status]"),
  meta: $("[data-deck-meta]"),
  title: $("[data-deck-title]"),
  tracks: $("[data-deck-tracks]"),
  open: $("[data-deck-open]"),
  openLabel: $("[data-deck-open-label]"),
  pause: $("[data-deck-pause]"),
  eject: $("[data-deck-eject]"),
};
const soundButton = $("[data-sound]");

/* ---------- The album list ---------- */
list.innerHTML = albums
  .map(
    (album, index) => `
    <li>
      <a href="${escapeHTML(album.href)}" data-index="${index}">
        <span class="num">${String(index + 1).padStart(2, "0")}</span>
        <span class="name">${escapeHTML(album.title)}</span>
        <span class="cat">${escapeHTML(album.category)}</span>
      </a>
    </li>`
  )
  .join("");
const listLinks = [...list.querySelectorAll("a")];

/* What colour the page fades to when opening an album: the colour at
   the top of the page it opens (so the arrival is seamless). */
function veilColourFor(album) {
  if (album.kind === "chat") return "#5e1a28";
  if (album.kind === "artist") return "#efe8dc";
  return "#131112";
}

/* The address of an album's page, at one of its tracks */
function hrefFor(album, track = 0) {
  const key = album.trackKeys && album.trackKeys[track];
  // the first track starts at the top of the page (the "Now Playing" band)
  return track > 0 && key ? `${album.href}#${key}` : album.href;
}

function go(album, track = 0) {
  sound.fadeOut(0.45);
  leaveTo(hrefFor(album, track), veilColourFor(album));
}

/* ---------- The "Now browsing" label ---------- */
let swapTimer = 0;
function showLabel(index, animate = true) {
  const album = albums[index];
  const meta = [album.catalogue, album.category, album.year].filter(hasText).join("  ·  ");
  const fill = () => {
    label.counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(albums.length).padStart(2, "0")}`;
    label.meta.textContent = meta;
    label.title.textContent = album.title;
    label.subtitle.textContent = album.subtitle || "";
    label.play.setAttribute("aria-label", `Play ${album.title}`);
    label.swap.classList.remove("is-swapping");
  };
  clearTimeout(swapTimer);
  if (animate && !reducedMotion) {
    label.swap.classList.add("is-swapping");
    swapTimer = setTimeout(fill, 180);
  } else {
    fill();
  }
  label.live.textContent = `Now browsing ${album.title}, ${index + 1} of ${albums.length}`;
  listLinks.forEach((link, i) => link.setAttribute("aria-current", i === index ? "true" : "false"));
  label.prev.disabled = index === 0;
  label.next.disabled = index === albums.length - 1;
  // remember it, so the browser's Back button returns to the same album
  // (not while an album's page is open over the turntable: the address
  // shows that page then)
  if (frame.el) return;
  const url = new URL(window.location.href);
  url.searchParams.set("from", album.id);
  history.replaceState(null, "", url);
}

/* =====================================================================
   THE ALBUM'S PAGE, OPENED OVER THE TURNTABLE
   Browsers stop all sound when a page changes, so an album's page is
   shown in a full-screen frame on top of this one: the record keeps
   turning (and the music playing) while visitors read. The address
   bar still shows the album's own address, so it can be shared.
   The page inside talks to this one (see "embedded" in common.js):
   which section is being read (the music follows), play / pause,
   open another album (the record is swapped), back to the crate.
   ===================================================================== */
const frame = { el: null, album: null };
const veil = $("[data-veil]");

function embeddedSrc(album, track) {
  const [path, hash] = hrefFor(album, track).split("#");
  return `${path}${path.includes("?") ? "&" : "?"}embedded=1${hash ? `#${hash}` : ""}`;
}

/* Fade the veil up, do something, then let the frame's page fade in */
function underVeil(colour, action) {
  if (reducedMotion) {
    action();
    return;
  }
  veil.style.background = colour;
  veil.classList.add("is-on");
  setTimeout(action, 520);
}
function liftVeil() {
  veil.classList.remove("is-on");
}

function openFrame(album, track = 0, hooks = {}) {
  underVeil(veilColourFor(album), () => {
    const src = embeddedSrc(album, track);
    if (!frame.el) {
      const el = document.createElement("iframe");
      el.className = "album-frame";
      el.title = album.title;
      el.addEventListener("load", () => {
        liftVeil();
        try { el.contentWindow.focus(); } catch (error) { /* fine */ }
      });
      el.src = src;
      document.body.appendChild(el);
      document.body.classList.add("frame-open");
      frame.el = el;
      history.pushState({ frame: true }, "", hrefFor(album, track));
      if (hooks.opened) hooks.opened();
    } else {
      // another album, in the same frame (no new history entry)
      frame.el.title = album.title;
      frame.el.contentWindow.location.replace(src);
      history.replaceState({ frame: true }, "", hrefFor(album, track));
    }
    frame.album = album;
  });
}

function closeFrame(hooks = {}) {
  if (!frame.el) return;
  underVeil("#131112", () => {
    frame.el.remove();
    frame.el = null;
    frame.album = null;
    document.body.classList.remove("frame-open");
    const url = new URL("index.html", window.location.href);
    url.searchParams.set("from", albums[current].id);
    history.replaceState(null, "", url);
    if (hooks.closed) hooks.closed();
    requestAnimationFrame(liftVeil);
  });
}

/* ---------- The sound switch ---------- */
function showSound() {
  soundButton.setAttribute("aria-pressed", String(sound.enabled));
  soundButton.querySelector("[data-sound-label]").textContent = sound.enabled ? "Sound on" : "Sound off";
}
soundButton.addEventListener("click", () => {
  sound.setEnabled(!sound.enabled);
  showSound();
});
showSound();

/* =====================================================================
   WITH WEBGL: the 3D crate and turntable
   ===================================================================== */
async function startCrate() {
  const { createCrate, webglAvailable } = await import("./crate.js");
  if (params.has("nowebgl") || !webglAvailable()) throw new Error("WebGL not available");

  let deckAlbum = null;   // the album on the turntable
  let deckTrack = -1;     // the track the needle is on (-1: lifted)

  /* ---------- The "On the turntable" panel ---------- */
  function fillDeck(album) {
    deck.meta.textContent = [album.catalogue, album.category, album.year].filter(hasText).join("  ·  ");
    deck.title.textContent = album.title;
    const tracks = album.tracks && album.tracks.length ? album.tracks : ["Side A"];
    deck.tracks.innerHTML = tracks
      .map(
        (name, i) => `
        <li>
          <button type="button" data-track="${i}">
            <span class="num">${String(i + 1).padStart(2, "0")}</span>
            <span class="name">${escapeHTML(name)}</span>
            <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
          </button>
        </li>`
      )
      .join("");
    deck.tracks.querySelectorAll("[data-track]").forEach((button) => {
      button.addEventListener("click", () => {
        sound.unlock();
        crate.setTrack(Number(button.dataset.track));
      });
    });
  }

  function showTrack() {
    const tracks = deckAlbum && deckAlbum.tracks && deckAlbum.tracks.length ? deckAlbum.tracks : ["Side A"];
    const state = crate.getState();
    // the track the needle is on, or heading to
    const target = deckTrack >= 0 ? deckTrack : state.track;
    deck.tracks.querySelectorAll("[data-track]").forEach((button, i) => {
      button.classList.toggle("is-on", i === target);
      button.classList.toggle("is-playing", i === deckTrack);
      button.setAttribute("aria-current", i === target ? "true" : "false");
    });
    const name = tracks[Math.max(0, target)];
    if (state.mode === "loading") deck.status.textContent = "Cueing…";
    else if (state.mode === "ejecting") deck.status.textContent = "Putting it back…";
    else if (deckTrack >= 0) deck.status.textContent = `Playing · Track ${String(deckTrack + 1).padStart(2, "0")}`;
    else if (state.paused) deck.status.textContent = "Needle up";
    else deck.status.textContent = "Moving the needle…";
    deck.openLabel.textContent = target > 0 ? `Open · ${name}` : "Open the album";
    deck.pause.classList.toggle("is-paused", state.paused);
    deck.pause.setAttribute("aria-label", state.paused ? "Drop the needle" : "Lift the needle");
  }

  const crate = createCrate({
    container: stage,
    albums,
    startIndex: current,
    reducedMotion,
    debugFast: params.has("fast"),
    onChange(index) {
      current = index;
      showLabel(index);
    },
    onListen(state, album) {
      const listening = state !== "browse";
      document.body.classList.toggle("is-listening", listening);
      refit();
      stage.classList.toggle("is-listening", listening);
      deck.panel.hidden = !listening;
      if (album && album !== deckAlbum) {
        deckAlbum = album;
        deckTrack = -1;
        fillDeck(album);
        sound.prepare(album, 0);
      }
      if (!listening) {
        deckAlbum = null;
        deckTrack = -1;
      }
      if (state === "playing") label.live.textContent = `${album.title} is on the turntable`;
      if (state === "browse") label.live.textContent = "The record is back in the crate";
      if (deckAlbum) showTrack();
    },
    onNeedle(track, album) {
      deckTrack = track === null ? -1 : track;
      if (track === null) {
        sound.needleUp();
      } else {
        sound.needleDown(album, track);
        sound.prepare(album, track + 1); // the next one, ready when wanted
        const name = (album.tracks || [])[track];
        if (name) label.live.textContent = `Now playing track ${track + 1}, ${name}`;
      }
      showTrack();
      tellFrame();
    },
    onRate(rate, held) {
      sound.setRate(rate, held);
    },
    onSettle() {
      sound.settle();
    },
    onContextLost() {
      crate.dispose();
      showFallback();
    },
  });

  if (params.has("debug")) Object.assign(window, { crate, sound }); // lets tests look inside

  /* ---------- The album's page over the turntable ---------- */
  function tellFrame() {
    if (!frame.el || !frame.el.contentWindow) return;
    frame.el.contentWindow.postMessage({
      type: "fpd-state",
      album: deckAlbum ? deckAlbum.id : null,
      track: deckTrack,
      playing: deckTrack >= 0 && sound.enabled,
      enabled: sound.enabled,
    }, window.location.origin);
  }
  function openAlbumPage(album, track) {
    openFrame(album, track, {
      opened() {
        crate.setHidden(true);
        sound.setBackground(true);
      },
    });
  }
  function backToTurntable() {
    closeFrame({
      closed() {
        crate.setHidden(false);
        sound.setBackground(false);
        showTrack();
      },
    });
  }
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || !frame.el || event.source !== frame.el.contentWindow) return;
    const message = event.data || {};
    if (message.type === "fpd-ready") {
      tellFrame();
    } else if (message.type === "fpd-track" && deckAlbum && message.album === deckAlbum.id) {
      // the visitor scrolled into another section: the music follows
      const track = Math.max(0, Math.min((deckAlbum.tracks || []).length - 1, Number(message.track) || 0));
      if (track !== deckTrack && deckTrack >= 0) {
        crate.glideToTrack(track);
        deckTrack = track;
        sound.crossfade(deckAlbum, track, 2.5);
        sound.prepare(deckAlbum, track + 1);
        showTrack();
        tellFrame();
      }
    } else if (message.type === "fpd-toggle") {
      sound.unlock();
      if (!sound.enabled) {
        sound.setEnabled(true);
        showSound();
        if (deckTrack >= 0 && deckAlbum) sound.crossfade(deckAlbum, deckTrack, 0.8);
      } else {
        crate.togglePause();
      }
      setTimeout(tellFrame, 50);
    } else if (message.type === "fpd-open") {
      // another album from inside the page: swap the record, then its page
      const index = findAlbumIndex(albums, message.id);
      if (index < 0) return;
      const album = albums[index];
      const keyIndex = (album.trackKeys || []).indexOf(message.hash);
      const track = keyIndex > 0 ? keyIndex : 0;
      if (!deckAlbum || deckAlbum.id !== album.id) {
        crate.swapNow(index, track);
        deckTrack = track;
        sound.crossfade(album, track, 2);
        sound.prepare(album, track + 1);
      }
      openAlbumPage(album, track);
      setTimeout(tellFrame, 700);
    } else if (message.type === "fpd-close") {
      backToTurntable();
    }
  });
  // the browser's Back button closes the page and shows the turntable again
  window.addEventListener("popstate", (event) => {
    if (frame.el && !(event.state && event.state.frame)) backToTurntable();
  });

  // the panel's status follows the arm while it moves
  setInterval(() => { if (deckAlbum) showTrack(); }, 250);

  /* Buttons */
  const playCurrent = () => { sound.unlock(); crate.play(current); };
  label.play.addEventListener("click", playCurrent);
  label.prev.addEventListener("click", () => crate.prev());
  label.next.addEventListener("click", () => crate.next());
  deck.open.addEventListener("click", () => {
    const state = crate.getState();
    if (deckAlbum) openAlbumPage(deckAlbum, Math.max(0, state.track));
  });
  deck.pause.addEventListener("click", () => { sound.unlock(); crate.togglePause(); });
  deck.eject.addEventListener("click", () => crate.eject());
  // the first touch anywhere on the stage also wakes the sound up
  stage.addEventListener("pointerdown", () => sound.unlock());

  /* The list: hover flips, click plays */
  listLinks.forEach((link) => {
    const index = Number(link.dataset.index);
    link.addEventListener("mouseenter", () => { if (!deckAlbum) crate.setIndex(index); });
    link.addEventListener("focus", () => { if (!deckAlbum) crate.setIndex(index); });
    link.addEventListener("click", (event) => {
      // let Ctrl/⌘-click open a new tab as usual
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      sound.unlock();
      crate.play(index);
    });
  });

  /* Scroll wheel / trackpad flips one album per gesture "notch" */
  let wheelSum = 0;
  let wheelLock = 0;
  let wheelReset = 0;
  function onWheel(event) {
    // On phones/tablets the page scrolls normally; only the crate area flips
    const stacked = getComputedStyle(stage).position !== "fixed";
    if (stacked && !stage.contains(event.target)) return;
    event.preventDefault();
    if (deckAlbum) return; // the crate is out of view while a record plays
    const now = performance.now();
    clearTimeout(wheelReset);
    wheelReset = setTimeout(() => (wheelSum = 0), 180);
    if (now < wheelLock) return;
    wheelSum += Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(wheelSum) > 40) {
      if (wheelSum > 0) crate.next(); else crate.prev();
      wheelSum = 0;
      wheelLock = now + 280;
    }
  }
  window.addEventListener("wheel", onWheel, { passive: false });

  /* Keys. Browsing: arrows flip, Enter plays.
     On the turntable: arrows change track, Enter opens, Space lifts
     the needle, Esc puts the record back. */
  function onKey(event) {
    if (frame.el) return; // an album's page is open over the turntable
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const onControl = event.target.closest && event.target.closest("a, button, input, textarea");
    const state = crate.getState();
    if (deckAlbum && state.mode === "playing") {
      const count = (deckAlbum.tracks || []).length || 1;
      const at = Math.max(0, state.track);
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          sound.unlock();
          crate.setTrack(Math.min(count - 1, at + 1));
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          sound.unlock();
          crate.setTrack(Math.max(0, at - 1));
          break;
        case "Escape":
          crate.eject();
          break;
        case " ":
          if (!onControl) {
            event.preventDefault();
            crate.togglePause();
          }
          break;
        case "Enter":
          if (!onControl) openAlbumPage(deckAlbum, at);
          break;
        default:
      }
      return;
    }
    if (deckAlbum) return; // a record is flying: wait
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        crate.next();
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        crate.prev();
        break;
      case "Home":
        event.preventDefault();
        crate.setIndex(0);
        break;
      case "End":
        event.preventDefault();
        crate.setIndex(albums.length - 1);
        break;
      case "Enter":
        if (!onControl) playCurrent();
        break;
      default:
    }
  }
  document.addEventListener("keydown", onKey);

  // for testing: ?debug&play=project-02 puts that record on straight away
  if (params.has("debug") && params.has("play")) {
    const index = findAlbumIndex(albums, params.get("play"));
    if (index >= 0) setTimeout(() => crate.play(index), 400);
  }

  /* Free the GPU memory when leaving the page. If the browser later
     restores this page from its back/forward cache, rebuild it. */
  window.addEventListener("pagehide", () => {
    crate.dispose();
    window.removeEventListener("wheel", onWheel);
    document.removeEventListener("keydown", onKey);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.location.reload();
  });
}

/* =====================================================================
   WITHOUT WEBGL: a simple grid of covers
   ===================================================================== */
async function showFallback() {
  document.body.classList.add("no-webgl");
  soundButton.hidden = true;
  const grid = $("[data-fallback]");
  grid.hidden = false;
  grid.innerHTML = albums
    .map(
      (album, index) => `
      <a href="${escapeHTML(album.href)}" data-index="${index}">
        <div class="cover-box" style="background:${coloursFor(album).ground}"></div>
        <p class="serif" style="font-size:24px;line-height:1.1">${escapeHTML(album.title)}</p>
        <p class="caps">${escapeHTML([album.catalogue, album.category].filter(hasText).join(" · "))}</p>
      </a>`
    )
    .join("");
  // draw each cover and swap it in for its coloured placeholder
  for (const link of grid.querySelectorAll("a")) {
    const album = albums[Number(link.dataset.index)];
    const canvas = await drawCover(album, 640);
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${album.title} album cover`);
    link.querySelector(".cover-box").replaceWith(canvas);
  }
}

/* ---------- Go ---------- */
showLabel(current, false);
startCrate().catch((error) => {
  if (!/WebGL/.test(error.message)) console.error(error);
  showFallback();
  // without the crate, the label buttons simply open / move through the list
  label.play.addEventListener("click", () => go(albums[current]));
});

/* ---------- Make the panel fit the screen ----------
   On shorter screens the panel beside the crate (the album, its tracks,
   the list) may not fit. Tighten it step by step (style.css, section
   11) until everything is on screen. Phones (crate on top, text below)
   simply scroll, so they're left alone. */
const FIT_STEPS = ["fit-1", "fit-2", "fit-3", "fit-4"];
function fitPanel() {
  const root = document.body;
  root.classList.remove(...FIT_STEPS);
  if (getComputedStyle(stage).position !== "fixed" || root.classList.contains("no-webgl")) return;
  const panel = document.querySelector(".home-panel");
  const overflows = () => {
    let bottom = 0;
    for (const child of panel.children) {
      if (child.offsetParent === null) continue;
      bottom = Math.max(bottom, child.getBoundingClientRect().bottom);
    }
    return bottom > window.innerHeight - 8;
  };
  for (const step of FIT_STEPS) {
    if (!overflows()) return;
    root.classList.add(step);
  }
}
let fitFrame = 0;
function refit() {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(fitPanel);
}
window.addEventListener("resize", refit);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
new MutationObserver(refit).observe(document.querySelector(".home-panel"), { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden", "class"] });
refit();
