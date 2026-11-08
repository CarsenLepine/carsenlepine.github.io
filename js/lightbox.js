/* =====================================================================
   lightbox.js — FULL-SCREEN VIEWER WITH REAL ZOOM
   ---------------------------------------------------------------------
   Opens a drawing (or render) over the page.
     Zoom:  mouse wheel, pinch (two fingers), the + / − buttons, the
            + and − keys, or double-click / double-tap
     Pan:   drag with the mouse or one finger (when zoomed in)
     Move:  ← → arrow keys or the arrow buttons, between images
     Close: Esc or the × button

   Staying sharp: instead of stretching a picture with a CSS "scale"
   (which can blur), the image's real width and height are changed, so
   the browser always redraws it from your full-resolution file.

   Usage (from project.js):
     openLightbox(items, startIndex)
     items = [{ src, caption, label, kind: "drawing" | "render" }, …]
   ===================================================================== */

import { icons } from "./common.js";

let box = null;        // the lightbox element (built once)
let items = [];
let index = 0;
let returnFocus = null;

// the zoom state: scale (1 = actual pixels), and the image's top-left corner
const view = { scale: 1, fitScale: 1, x: 0, y: 0, naturalW: 1, naturalH: 1 };
const MAX_SCALE = 3;   // up to 300% of the file's real size

function build() {
  box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Image viewer");
  box.innerHTML = `
    <div class="lightbox__bar">
      <p class="lightbox__caption"><span class="caps" data-lb-label></span><span class="serif" data-lb-caption></span></p>
      <div class="lightbox__tools">
        <button class="icon-btn" type="button" data-lb-out aria-label="Zoom out">${icons.minus}</button>
        <span class="lightbox__zoom-level caps" data-lb-level aria-live="polite">100%</span>
        <button class="icon-btn" type="button" data-lb-in aria-label="Zoom in">${icons.plus}</button>
        <button class="icon-btn" type="button" data-lb-fit aria-label="Fit to screen">${icons.fit}</button>
        <button class="icon-btn" type="button" data-lb-close aria-label="Close viewer">${icons.close}</button>
      </div>
    </div>
    <div class="lightbox__viewport" data-lb-viewport>
      <img alt="" data-lb-img draggable="false">
    </div>
    <div class="lightbox__foot">
      <span class="caps" data-lb-count></span>
      <span class="lightbox__help">Scroll or pinch to zoom · drag to move · ← → for the next</span>
      <div class="lightbox__nav">
        <button class="icon-btn" type="button" data-lb-prev aria-label="Previous image">${icons.arrowLeft}</button>
        <button class="icon-btn" type="button" data-lb-next aria-label="Next image">${icons.arrowRight}</button>
      </div>
    </div>`;
  document.body.appendChild(box);

  const viewport = box.querySelector("[data-lb-viewport]");
  box.querySelector("[data-lb-close]").addEventListener("click", close);
  box.querySelector("[data-lb-in]").addEventListener("click", () => zoomBy(1.5));
  box.querySelector("[data-lb-out]").addEventListener("click", () => zoomBy(1 / 1.5));
  box.querySelector("[data-lb-fit]").addEventListener("click", fit);
  box.querySelector("[data-lb-prev]").addEventListener("click", () => show(index - 1));
  box.querySelector("[data-lb-next]").addEventListener("click", () => show(index + 1));

  /* Mouse wheel / trackpad: zoom towards the pointer */
  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0022));
      zoomAt(view.scale * factor, event.clientX, event.clientY);
    },
    { passive: false }
  );

  /* Pointers: one = drag, two = pinch */
  const pointers = new Map();
  let pinch = null;
  let lastTap = 0;
  viewport.addEventListener("pointerdown", (event) => {
    viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    }
    viewport.classList.add("is-dragging");
    // double-tap / double-click: toggle between fit and 100%
    const now = performance.now();
    if (pointers.size === 1 && now - lastTap < 300) {
      if (view.scale > view.fitScale * 1.05) fit();
      else zoomAt(Math.max(1, view.fitScale * 2.5), event.clientX, event.clientY);
      lastTap = 0;
    } else {
      lastTap = now;
    }
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(pinch.scale * (distance / pinch.distance), (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (pointers.size === 1) {
      view.x += current.x - previous.x;
      view.y += current.y - previous.y;
      apply();
    }
  });
  const release = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) viewport.classList.remove("is-dragging");
  };
  viewport.addEventListener("pointerup", release);
  viewport.addEventListener("pointercancel", release);

  /* Keys: Esc closes, arrows move between images, + / − zoom, 0 fits */
  document.addEventListener("keydown", (event) => {
    if (!box.classList.contains("is-open")) return;
    switch (event.key) {
      case "Escape": close(); break;
      case "ArrowRight": event.preventDefault(); show(index + 1); break;
      case "ArrowLeft": event.preventDefault(); show(index - 1); break;
      case "+": case "=": zoomBy(1.5); break;
      case "-": case "_": zoomBy(1 / 1.5); break;
      case "0": fit(); break;
      case "Tab": trapFocus(event); break;
      default:
    }
  });

  window.addEventListener("resize", () => {
    if (box.classList.contains("is-open")) fit();
  });
}

/* Keep keyboard focus inside the viewer while it's open */
function trapFocus(event) {
  const focusable = [...box.querySelectorAll("button:not([disabled])")];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function viewportRect() {
  return box.querySelector("[data-lb-viewport]").getBoundingClientRect();
}

/* Size and place the image from the zoom state */
function apply() {
  const img = box.querySelector("[data-lb-img]");
  const rect = viewportRect();
  const w = view.naturalW * view.scale;
  const h = view.naturalH * view.scale;
  // keep the image from being dragged away: centre it if it's smaller
  // than the screen, otherwise keep its edges past the screen edges
  view.x = w <= rect.width ? (rect.width - w) / 2 : Math.min(0, Math.max(rect.width - w, view.x));
  view.y = h <= rect.height ? (rect.height - h) / 2 : Math.min(0, Math.max(rect.height - h, view.y));
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  img.style.transform = `translate(${Math.round(view.x)}px, ${Math.round(view.y)}px)`;
  box.querySelector("[data-lb-level]").textContent = `${Math.round(view.scale * 100)}%`;
  box.querySelector("[data-lb-out]").disabled = view.scale <= view.fitScale + 0.001;
  box.querySelector("[data-lb-in]").disabled = view.scale >= MAX_SCALE - 0.001;
}

/* Zoom to a scale, keeping the point under (clientX, clientY) still */
function zoomAt(scale, clientX, clientY) {
  const rect = viewportRect();
  const next = Math.min(MAX_SCALE, Math.max(view.fitScale, scale));
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  view.x = px - ((px - view.x) * next) / view.scale;
  view.y = py - ((py - view.y) * next) / view.scale;
  view.scale = next;
  apply();
}

function zoomBy(factor) {
  const rect = viewportRect();
  zoomAt(view.scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

/* Whole image on screen, with a little breathing room */
function fit() {
  const rect = viewportRect();
  const pad = Math.min(48, rect.width * 0.04);
  view.fitScale = Math.min(1, (rect.width - pad * 2) / view.naturalW, (rect.height - pad * 2) / view.naturalH);
  view.scale = view.fitScale;
  view.x = (rect.width - view.naturalW * view.scale) / 2;
  view.y = (rect.height - view.naturalH * view.scale) / 2;
  apply();
}

function show(newIndex) {
  if (!items.length) return;
  index = (newIndex + items.length) % items.length;
  const item = items[index];
  const img = box.querySelector("[data-lb-img]");
  box.querySelector("[data-lb-caption]").textContent = item.caption || "";
  box.querySelector("[data-lb-label]").textContent = item.label || "";
  box.querySelector("[data-lb-count]").textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
  box.querySelector("[data-lb-prev]").hidden = items.length < 2;
  box.querySelector("[data-lb-next]").hidden = items.length < 2;
  img.classList.toggle("is-render", item.kind === "render");
  img.alt = item.caption || "";
  img.style.opacity = "0";
  const ready = () => {
    view.naturalW = img.naturalWidth || 1600;
    view.naturalH = img.naturalHeight || 1000;
    fit();
    img.style.opacity = "1";
  };
  img.onload = ready;
  img.src = item.src;
  if (img.complete && img.naturalWidth) ready();
}

export function openLightbox(list, startIndex = 0) {
  if (!box) build();
  items = list;
  returnFocus = document.activeElement;
  box.classList.add("is-open");
  document.documentElement.style.overflow = "hidden";
  show(startIndex);
  box.querySelector("[data-lb-close]").focus();
}

function close() {
  box.classList.remove("is-open");
  document.documentElement.style.overflow = "";
  if (returnFocus && returnFocus.focus) returnFocus.focus();
}
