/* =====================================================================
   covers.js — DRAWS THE ALBUM COVERS, SLEEVE BACKS AND RECORDS
   ---------------------------------------------------------------------
   Every cover is drawn with the HTML Canvas from your renders, so they
   always match your latest images. Your original image files are only
   READ, never changed.

   All covers share ONE system (so the collection feels like a series):
     - equal margins all round (MARGIN below)
     - catalogue number top-left, category top-right
     - title in Instrument Serif, subtitle in spaced capitals
     - year bottom-left, "Four Points Design" bottom-right
   Each album then gets its own layout and colour ("cover.layout" in
   the data files):
     teal-wash        render fills the sleeve under a deep teal wash
     paper-frame      cream paper, render in an off-centre frame,
                      a drawing faintly layered behind
     arch-window      burgundy, a render seen through an arched window
     silver-band      brushed silver, a render as a full-width band
     portrait-silver  charcoal, the portrait in silver tones
     type-only        burgundy, typography only

   If an album's cover has a "file", that image is used as-is instead.

   Main functions (used by the crate, project pages and cover studio):
     drawCover(album, size)   → a square canvas, the front
     drawBack(album, size)    → a square canvas, the back (track list)
     drawRecord(album, size)  → a square canvas, the vinyl seen from above
   ===================================================================== */

import { coloursFor, hasText } from "./albums.js";
import { site } from "./data/site.js";

/* ---------- The shared grid (as fractions of the cover size) ---------- */
const MARGIN = 0.07;        // the equal margin on all four sides
const SMALL_TYPE = 0.0185;  // size of the small spaced capitals
const TRACKING = 0.24;      // letter spacing of the capitals (in ems)

const SERIF = '"Instrument Serif", "Times New Roman", serif';
const SANS = '"Source Sans 3", "Segoe UI", system-ui, sans-serif';

/* ---------- Where the tracks are on a record ----------
   As fractions of the record's radius: the music runs from the outer
   edge (track 1) inwards. The turntable uses the same bands to put
   its needle on a track. */
export const GROOVES = { outer: 0.95, inner: 0.4 };
export function trackBands(count) {
  const n = Math.max(1, count);
  const span = GROOVES.outer - GROOVES.inner;
  return Array.from({ length: n }, (_, i) => ({
    outer: GROOVES.outer - (span * i) / n,
    inner: GROOVES.outer - (span * (i + 1)) / n,
  }));
}

const PALETTE = {
  burgundy: "#5e1a28",
  charcoal: "#131112",
  cream: "#efe8dc",
  silver: "#b9bec2",
};

/* =====================================================================
   LOADING: images and fonts
   ===================================================================== */

const imageCache = new Map();

/* Load an image once and reuse it. Resolves to null if it can't be
   loaded, so a missing file never breaks the page. */
export function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => {
          console.warn("Cover image not found:", src);
          resolve(null);
        };
        img.src = src;
      })
    );
  }
  return imageCache.get(src);
}

let fontsPromise = null;

/* Canvas can only use a web font once it has loaded, so wait for the
   four styles the covers use (with a time limit, in case the network
   is slow: the covers then use the fallback fonts). */
export function ensureFonts() {
  if (!fontsPromise) {
    if (!document.fonts || !document.fonts.load) {
      fontsPromise = Promise.resolve();
    } else {
      const wanted = Promise.all([
        document.fonts.load(`400 80px ${SERIF}`),
        document.fonts.load(`italic 400 80px ${SERIF}`),
        document.fonts.load(`400 20px ${SANS}`),
        document.fonts.load(`300 20px ${SANS}`),
      ]).catch(() => {});
      const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
      fontsPromise = Promise.race([wanted, timeout]);
    }
  }
  return fontsPromise;
}

/* =====================================================================
   SMALL DRAWING HELPERS
   ===================================================================== */

function makeCanvas(width, height = width) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/* A repeatable "random" generator, so the paper grain looks the same
   every time a cover is drawn (and downloaded). */
function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}

/* Draw an image so it fills a box completely, cropping the overflow
   (like CSS object-fit: cover). focusX / focusY (0 – 1) choose which
   part stays visible. */
function drawImageCover(ctx, img, x, y, w, h, focusX = 0.5, focusY = 0.5) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) * focusX;
  const sy = (img.height - sh) * focusY;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/* Draw an image whole inside a box (like object-fit: contain). */
function drawImageContain(ctx, img, x, y, w, h, alignX = 0.5, alignY = 0.5) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) * alignX, y + (h - dh) * alignY, dw, dh);
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* Turn an image into two tones (dark → light), like a duotone print.
   Done pixel by pixel, so it looks the same in every browser
   (including iPhone Safari). "contrast" > 1 deepens it; "keep" (0 – 1)
   lets a little of the original colour show through. */
function duotone(img, w, h, darkHex, lightHex, { contrast = 1, keep = 0, focusX = 0.5, focusY = 0.5 } = {}) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  drawImageCover(ctx, img, 0, 0, w, h, focusX, focusY);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const dark = hexToRgb(darkHex);
  const light = hexToRgb(lightHex);
  for (let i = 0; i < px.length; i += 4) {
    // perceived brightness, 0 – 1
    let t = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    t = Math.min(1, Math.max(0, (t - 0.5) * contrast + 0.5));
    for (let c = 0; c < 3; c += 1) {
      const toned = dark[c] + (light[c] - dark[c]) * t;
      px[i + c] = toned * (1 - keep) + px[i + c] * keep;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

/* Text in spaced capitals. align: "left", "right" or "center".
   (Drawn letter by letter, because not every browser supports
   canvas letter-spacing yet.) */
function spacedCaps(ctx, text, x, y, fontSize, align = "left", tracking = TRACKING) {
  const upper = text.toUpperCase();
  ctx.font = `400 ${fontSize}px ${SANS}`;
  const gap = fontSize * tracking;
  const widths = [...upper].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  let cursor = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
  const previousAlign = ctx.textAlign;
  ctx.textAlign = "left";
  [...upper].forEach((ch, i) => {
    ctx.fillText(ch, cursor, y);
    cursor += widths[i] + gap;
  });
  ctx.textAlign = previousAlign;
  return total;
}

function capsWidth(ctx, text, fontSize, tracking = TRACKING) {
  ctx.font = `400 ${fontSize}px ${SANS}`;
  const chars = [...text.toUpperCase()];
  return chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + fontSize * tracking * (chars.length - 1);
}

/* Split text into lines that fit a width (ctx.font must already be set). */
function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = attempt;
    }
  });
  if (line) lines.push(line);
  return lines;
}

/* Fine paper grain: thousands of tiny light and dark specks. */
function paperGrain(ctx, size, seed, strength = 1) {
  const random = seededRandom(seed);
  const count = Math.round(size * size * 0.018);
  for (let i = 0; i < count; i += 1) {
    const light = random() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${0.05 * strength})` : `rgba(40,30,20,${0.05 * strength})`;
    const s = random() * 1.6 + 0.4;
    ctx.fillRect(random() * size, random() * size, s, s);
  }
}

/* The shared furniture of every cover: catalogue, category, year, brand. */
function drawFrameText(ctx, album, size, ink) {
  const m = size * MARGIN;
  const small = size * SMALL_TYPE;
  ctx.fillStyle = ink;
  ctx.textBaseline = "alphabetic";
  const top = m + small * 0.8;
  const bottom = size - m;
  spacedCaps(ctx, album.catalogue || "", m, top, small, "left");
  spacedCaps(ctx, album.category || "", size - m, top, small, "right");
  if (hasText(album.year)) spacedCaps(ctx, album.year, m, bottom, small, "left");
  spacedCaps(ctx, site.brand, size - m, bottom, small, "right");
}

/* Title lines in Instrument Serif. Returns the y just below the block. */
function drawTitle(ctx, text, x, y, fontSize, maxWidth, { italic = false, align = "left", lineHeight = 0.92 } = {}) {
  ctx.font = `${italic ? "italic " : ""}400 ${fontSize}px ${SERIF}`;
  ctx.textAlign = align;
  const lines = wrapLines(ctx, text, maxWidth);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * fontSize * lineHeight));
  ctx.textAlign = "left";
  return { lines, bottom: y + (lines.length - 1) * fontSize * lineHeight };
}

/* =====================================================================
   THE FIVE COVER LAYOUTS
   Each receives (ctx, album, size, images) and paints the whole cover.
   ===================================================================== */

const layouts = {

  /* ---- The Pause Between: render under a deep teal wash ---- */
  "teal-wash"(ctx, album, size, { image }) {
    const m = size * MARGIN;
    const ink = PALETTE.cream;
    ctx.fillStyle = "#123335";
    ctx.fillRect(0, 0, size, size);
    if (image) {
      // The render as a teal duotone, with a little of its colour kept
      const toned = duotone(image, size, size, "#0b2526", "#cfe3dc", { contrast: 1.12, keep: 0.16, focusX: 0.42 });
      ctx.drawImage(toned, 0, 0);
    }
    // A soft darkening at the bottom so the title always reads
    const shade = ctx.createLinearGradient(0, size * 0.45, 0, size);
    shade.addColorStop(0, "rgba(9,30,31,0)");
    shade.addColorStop(1, "rgba(9,30,31,0.82)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, size, size);
    // and a little at the top, for the small capitals
    const top = ctx.createLinearGradient(0, 0, 0, size * 0.18);
    top.addColorStop(0, "rgba(9,30,31,0.55)");
    top.addColorStop(1, "rgba(9,30,31,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, size, size * 0.18);

    ctx.fillStyle = ink;
    // Large italic title, set bottom-left
    const titleSize = size * 0.15;
    ctx.font = `italic 400 ${titleSize}px ${SERIF}`;
    const lines = wrapLines(ctx, album.title, size - m * 2);
    const firstLine = size - m - size * 0.075 - (lines.length - 1) * titleSize * 0.9;
    drawTitle(ctx, album.title, m - size * 0.004, firstLine, titleSize, size - m * 2, { italic: true, lineHeight: 0.9 });
    const subY = firstLine - titleSize * 0.95;
    spacedCaps(ctx, album.subtitle || "", m, subY, size * SMALL_TYPE);
    drawFrameText(ctx, album, size, ink);
  },

  /* ---- Ledger Residence: cream paper, framed render, drawing behind ---- */
  "paper-frame"(ctx, album, size, { image, drawing }) {
    const m = size * MARGIN;
    const ink = PALETTE.charcoal;
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(0, 0, size, size);
    paperGrain(ctx, size, 7);

    // The exploded drawing, faint, bleeding off the right edge
    if (drawing) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.globalCompositeOperation = "multiply";
      drawImageContain(ctx, drawing, size * 0.38, size * 0.02, size * 0.74, size * 0.98, 0.5, 0.5);
      ctx.restore();
    }

    // The render, in an off-centre frame
    const fx = m;
    const fy = size * 0.15;
    const fw = size * 0.62;
    const fh = fw * 0.72;
    ctx.fillStyle = "rgba(19,17,18,0.10)";
    ctx.fillRect(fx + size * 0.008, fy + size * 0.01, fw, fh); // soft offset shadow
    if (image) drawImageCover(ctx, image, fx, fy, fw, fh, 0.55, 0.5);
    else { ctx.fillStyle = "#d8cfbf"; ctx.fillRect(fx, fy, fw, fh); }
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, size * 0.0015);
    const pad = size * 0.012;
    ctx.strokeRect(fx - pad, fy - pad, fw + pad * 2, fh + pad * 2);

    // A short burgundy rule, then the title
    const titleTop = fy + fh + size * 0.12;
    ctx.fillStyle = PALETTE.burgundy;
    ctx.fillRect(m, fy + fh + size * 0.045, size * 0.06, Math.max(2, size * 0.003));
    ctx.fillStyle = ink;
    const block = drawTitle(ctx, album.title, m - size * 0.003, titleTop, size * 0.1, size * 0.62, { lineHeight: 0.95 });
    spacedCaps(ctx, album.subtitle || "", m, block.bottom + size * 0.055, size * SMALL_TYPE);
    drawFrameText(ctx, album, size, ink);
  },

  /* ---- Moroccan Reverie: burgundy, a view through an arch ---- */
  "arch-window"(ctx, album, size, { image }) {
    const m = size * MARGIN;
    const ink = PALETTE.cream;
    ctx.fillStyle = PALETTE.burgundy;
    ctx.fillRect(0, 0, size, size);
    paperGrain(ctx, size, 11, 0.9);

    const w = size * 0.42;
    const x = (size - w) / 2;
    const top = size * 0.15;
    const bottom = size * 0.63;
    const r = w / 2;
    const archPath = (inset) => {
      ctx.beginPath();
      ctx.moveTo(x - inset, bottom + inset);
      ctx.lineTo(x - inset, top + r);
      ctx.arc(size / 2, top + r, r + inset, Math.PI, 0);
      ctx.lineTo(x + w + inset, bottom + inset);
      ctx.closePath();
    };
    // the view through the window
    ctx.save();
    archPath(0);
    ctx.clip();
    if (image) drawImageCover(ctx, image, x, top, w, bottom - top, 0.5, 0.35);
    else { ctx.fillStyle = "#3b1018"; ctx.fill(); }
    ctx.restore();
    // a thin silver reveal around it
    ctx.strokeStyle = PALETTE.silver;
    ctx.lineWidth = Math.max(1, size * 0.0016);
    archPath(size * 0.016);
    ctx.stroke();
    // a sill
    ctx.fillStyle = PALETTE.silver;
    ctx.fillRect(x - size * 0.04, bottom + size * 0.016, w + size * 0.08, Math.max(1, size * 0.0016));

    ctx.fillStyle = ink;
    const block = drawTitle(ctx, album.title, size / 2, size * 0.76, size * 0.085, size * 0.8, { align: "center", lineHeight: 0.95 });
    spacedCaps(ctx, album.subtitle || "", size / 2, block.bottom + size * 0.06, size * SMALL_TYPE, "center");
    drawFrameText(ctx, album, size, ink);
  },

  /* ---- ModuNest: brushed silver, the render as a full-width band ---- */
  "silver-band"(ctx, album, size, { image }) {
    const m = size * MARGIN;
    const ink = PALETTE.charcoal;
    ctx.fillStyle = "#c3c7ca";
    ctx.fillRect(0, 0, size, size);
    // fine horizontal brushing, like the crate's metal trim
    const random = seededRandom(41);
    for (let i = 0; i < size * 1.4; i += 1) {
      const shade = 150 + random() * 100;
      ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 6},0.22)`;
      ctx.fillRect(random() * size - size * 0.1, random() * size, size * (0.05 + random() * 0.3), Math.max(1, size * 0.001));
    }

    // the title, large, above the band
    ctx.fillStyle = ink;
    const titleSize = size * 0.155;
    const block = drawTitle(ctx, album.title, m - size * 0.006, size * 0.31, titleSize, size - m * 2, { lineHeight: 0.9 });

    // the render, edge to edge
    const top = Math.max(size * 0.37, block.bottom + size * 0.06);
    const h = size * 0.36;
    if (image) drawImageCover(ctx, image, 0, top, size, h, 0.5, 0.45);
    else { ctx.fillStyle = "#8c9296"; ctx.fillRect(0, top, size, h); }
    // a charcoal hairline above and below the band
    ctx.fillStyle = ink;
    ctx.fillRect(0, top - size * 0.012, size, Math.max(1, size * 0.0016));
    ctx.fillRect(0, top + h + size * 0.011, size, Math.max(1, size * 0.0016));

    // subtitle, with a small burgundy mark before it
    const subY = top + h + size * 0.085;
    ctx.fillStyle = PALETTE.burgundy;
    ctx.fillRect(m, subY - size * 0.012, size * 0.04, Math.max(2, size * 0.003));
    ctx.fillStyle = ink;
    spacedCaps(ctx, album.subtitle || "", m + size * 0.06, subY, size * SMALL_TYPE);
    drawFrameText(ctx, album, size, ink);
  },

  /* ---- The Artist: charcoal, the portrait in silver ---- */
  "portrait-silver"(ctx, album, size, { image }) {
    const m = size * MARGIN;
    const ink = "#d9dcdf";
    ctx.fillStyle = PALETTE.charcoal;
    ctx.fillRect(0, 0, size, size);

    const px = size * 0.38;
    const py = size * 0.13;
    const pw = size - m - px;
    const ph = size * 0.66;
    if (image) {
      const silver = duotone(image, Math.round(pw), Math.round(ph), "#141314", "#e4e7e9", { contrast: 1.18, focusX: 0.5, focusY: 0.3 });
      ctx.drawImage(silver, px, py);
    }
    ctx.strokeStyle = "rgba(185,190,194,0.55)";
    ctx.lineWidth = Math.max(1, size * 0.0015);
    ctx.strokeRect(px - size * 0.012, py - size * 0.012, pw + size * 0.024, ph + size * 0.024);

    // Title overlapping the bottom-left corner of the portrait
    ctx.fillStyle = ink;
    const titleSize = size * 0.14;
    const block = drawTitle(ctx, album.title, m - size * 0.004, size * 0.66, titleSize, size * 0.55, { lineHeight: 0.9 });
    spacedCaps(ctx, album.subtitle || "", m, block.bottom + size * 0.075, size * SMALL_TYPE);
    drawFrameText(ctx, album, size, ink);
  },

  /* ---- Let's Chat: burgundy, typography only ---- */
  "type-only"(ctx, album, size) {
    const m = size * MARGIN;
    const ink = PALETTE.cream;
    ctx.fillStyle = PALETTE.burgundy;
    ctx.fillRect(0, 0, size, size);
    paperGrain(ctx, size, 23, 0.9);

    // The title split into words, alternating upright and italic
    const words = album.title.split(/\s+/);
    const big = size * (words.length > 2 ? 0.2 : 0.29);
    ctx.fillStyle = ink;
    let y = size * 0.42;
    words.forEach((word, i) => {
      ctx.font = `${i % 2 ? "italic " : ""}400 ${big}px ${SERIF}`;
      ctx.fillText(word, m + (i % 2 ? size * 0.16 : -size * 0.008), y);
      y += big * 0.86;
    });
    // a silver hairline and the subtitle
    ctx.fillStyle = PALETTE.silver;
    ctx.fillRect(m, size * 0.8, size - m * 2, Math.max(1, size * 0.0015));
    ctx.fillStyle = ink;
    spacedCaps(ctx, album.subtitle || "", m, size * 0.8 + size * 0.05, size * SMALL_TYPE);
    drawFrameText(ctx, album, size, ink);
  },
};

/* =====================================================================
   PUBLIC: draw a cover, a back, a record
   ===================================================================== */

/* The front of the sleeve, as a square canvas. */
export async function drawCover(album, size = 1024) {
  await ensureFonts();
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d");
  const cover = album.cover || {};

  // Your own finished cover image wins over the designed layout
  if (hasText(cover.file)) {
    const own = await loadImage(cover.file);
    if (own) {
      drawImageCover(ctx, own, 0, 0, size, size);
      return canvas;
    }
  }

  const [image, drawing] = await Promise.all([loadImage(cover.image), loadImage(cover.drawing)]);
  const paint = layouts[cover.layout] || layouts["type-only"];
  paint(ctx, album, size, { image, drawing });
  return canvas;
}

/* The back of the sleeve: title, track list and credits. */
export async function drawBack(album, size = 1024) {
  await ensureFonts();
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d");
  const colours = coloursFor(album);
  const light = colours.ground === PALETTE.cream || colours.ground === "#c3c7ca";
  const ink = light ? PALETTE.charcoal : colours.ink;
  const m = size * MARGIN;
  const small = size * SMALL_TYPE;

  ctx.fillStyle = colours.ground;
  ctx.fillRect(0, 0, size, size);
  // backs are a touch darker than fronts, like printed card
  ctx.fillStyle = light ? "rgba(120,100,80,0.06)" : "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 0, size, size);
  paperGrain(ctx, size, 31, 0.8);

  ctx.fillStyle = ink;
  spacedCaps(ctx, album.catalogue || "", m, m + small * 0.8, small);
  spacedCaps(ctx, site.brand, size - m, m + small * 0.8, small, "right");

  // title
  const block = drawTitle(ctx, album.title, m, size * 0.25, size * 0.09, size - m * 2, { italic: true });
  spacedCaps(ctx, album.subtitle || "", m, block.bottom + size * 0.06, small);

  // track list
  let y = block.bottom + size * 0.17;
  ctx.globalAlpha = 0.6;
  spacedCaps(ctx, "Side A", m, y, small);
  ctx.globalAlpha = 1;
  y += size * 0.065;
  const tracks = album.tracks || [];
  const trackSize = size * 0.042;
  tracks.forEach((track, i) => {
    ctx.font = `300 ${trackSize * 0.62}px ${SANS}`;
    ctx.globalAlpha = 0.65;
    ctx.fillText(String(i + 1).padStart(2, "0"), m, y);
    ctx.globalAlpha = 1;
    ctx.font = `400 ${trackSize}px ${SERIF}`;
    ctx.fillText(track, m + size * 0.07, y);
    // a hairline under each track
    ctx.globalAlpha = 0.18;
    ctx.fillRect(m, y + trackSize * 0.42, size - m * 2, Math.max(1, size * 0.001));
    ctx.globalAlpha = 1;
    y += trackSize * 1.45;
  });

  // credits (projects only)
  const credits = (album.credits || []).filter(([, value]) => hasText(value));
  if (credits.length) {
    ctx.font = `300 ${small * 1.15}px ${SANS}`;
    let cy = size - m - small * 2.4 - (credits.length - 1) * small * 1.7;
    credits.forEach(([label, value]) => {
      ctx.globalAlpha = 0.6;
      spacedCaps(ctx, label, m, cy, small * 0.85);
      ctx.globalAlpha = 1;
      ctx.font = `300 ${small * 1.15}px ${SANS}`;
      ctx.fillText(value, m + size * 0.2, cy);
      cy += small * 1.7;
    });
  }
  ctx.globalAlpha = 0.6;
  spacedCaps(ctx, `${site.name}`, size - m, size - m, small * 0.85, "right");
  ctx.globalAlpha = 1;
  return canvas;
}

/* The vinyl record seen from above: grooves, a label in the album's
   colour, and the centre hole. Used as the top of the 3D record and on
   project pages. */
export async function drawRecord(album, size = 512) {
  await ensureFonts();
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d");
  const c = size / 2;
  const R = size / 2;
  const colours = coloursFor(album);

  // the disc
  ctx.fillStyle = "#0c0b0b";
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fill();
  // grooves: fine rings of slightly different blacks
  for (let r = R * 0.36; r < R * 0.97; r += size * 0.0045) {
    ctx.strokeStyle = Math.round(r) % 3 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // the gaps between tracks: glossy bands of smooth vinyl, where the
  // turntable's needle drops (see trackBands)
  const bands = trackBands((album.tracks || []).length);
  bands.slice(1).forEach((band) => {
    const r = band.outer * R;
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = size * 0.007;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.11)";
    ctx.lineWidth = Math.max(1, size * 0.0016);
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  // the lead-in and run-out rings
  [R * 0.37, R * 0.96].forEach((r) => {
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  // two soft light reflections across the grooves
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R * 0.97, 0, Math.PI * 2);
  ctx.clip();
  [0.65, 0.65 + Math.PI].forEach((angle) => {
    const sheen = ctx.createLinearGradient(
      c + Math.cos(angle - 0.4) * R, c + Math.sin(angle - 0.4) * R,
      c + Math.cos(angle + 0.4) * R, c + Math.sin(angle + 0.4) * R
    );
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0.07)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, R, angle - 0.35, angle + 0.35);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  // the label
  const labelR = R * 0.33;
  ctx.fillStyle = colours.label;
  ctx.beginPath();
  ctx.arc(c, c, labelR, 0, Math.PI * 2);
  ctx.fill();
  const labelInk = colours.label === PALETTE.cream || colours.label === PALETTE.silver ? PALETTE.charcoal : PALETTE.cream;
  ctx.fillStyle = labelInk;
  ctx.textAlign = "center";
  ctx.font = `italic 400 ${size * 0.045}px ${SERIF}`;
  const lines = wrapLines(ctx, album.title, labelR * 1.5);
  lines.forEach((line, i) => ctx.fillText(line, c, c - labelR * 0.42 + i * size * 0.045));
  ctx.textAlign = "left";
  spacedCaps(ctx, album.catalogue || "", c, c + labelR * 0.55, size * 0.017, "center");
  spacedCaps(ctx, site.brand, c, c + labelR * 0.75, size * 0.012, "center");
  // centre hole
  ctx.fillStyle = "#0c0b0b";
  ctx.beginPath();
  ctx.arc(c, c, size * 0.012, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

/* A safe file name for downloads: "FPD-01-the-pause-between-cover.png" */
export function coverFileName(album, side = "cover") {
  const slug = `${album.catalogue}-${album.title}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${slug}-${side}.png`;
}
