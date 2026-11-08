/* =====================================================================
   albums.js — TURNS YOUR DATA INTO "ALBUMS"
   ---------------------------------------------------------------------
   The crate, the cover studio and the project pages all need the same
   list: your projects first, then The Artist and Let's Chat. This file
   builds that list once, from js/data/projects.js and js/data/site.js,
   so nothing is written twice.
   You shouldn't need to edit this file to change content.
   ===================================================================== */

import { projects } from "./data/projects.js";
import { site } from "./data/site.js";

/* ---------- Placeholders ----------
   Text that is empty, or contains [square brackets], counts as
   "not written yet" and is never shown. */
export function hasText(value) {
  return typeof value === "string" && value.trim() !== "" && !/\[[^\]]*\]/.test(value);
}

/* Keep only the list items that have a real file. */
export function realImages(list) {
  return (list || []).filter((item) => item && hasText(item.file));
}

/* ---------- The five sections ("tracks") of a project page ----------
   Each has a number, a name, and a test: does this project have
   anything to show in it? Sections with nothing are skipped, both on
   the page and on the back of the sleeve. */
export const SECTIONS = [
  {
    key: "brief",
    name: "The Brief",
    has: (p) => hasText(p.brief?.lead) || (p.brief?.blocks || []).some((b) => hasText(b.text)),
  },
  {
    key: "concept",
    name: "The Concept",
    has: (p) => hasText(p.concept?.text) || hasText(p.concept?.statement) || realImages(p.concept?.images).length > 0,
  },
  {
    key: "development",
    name: "Design Development",
    has: (p) => (p.development?.blocks || []).some((b) => hasText(b.text)) || realImages(p.development?.stages).length > 0,
  },
  {
    key: "drawings",
    name: "Technical Drawings",
    has: (p) => realImages(p.drawings).length > 0,
  },
  {
    key: "experience",
    name: "The Final Experience",
    has: (p) => realImages(p.experience).length > 0,
  },
];

/* The sections one project actually has, numbered by their fixed
   position (01 … 05), so the numbers always mean the same thing. */
export function sectionsFor(project) {
  return SECTIONS.map((section, index) => ({
    ...section,
    number: String(index + 1).padStart(2, "0"),
  })).filter((section) => section.has(project));
}

/* ---------- The full list of albums, in crate order ---------- */
export function getAlbums() {
  const projectAlbums = projects.map((project) => ({
    kind: "project",
    id: project.id,
    catalogue: project.catalogue,
    title: project.title,
    subtitle: project.subtitle,
    category: project.category,
    year: project.year,
    href: `project.html?id=${encodeURIComponent(project.id)}`,
    cover: project.cover || {},
    // The back of the sleeve lists the sections this project has
    tracks: sectionsFor(project).map((s) => s.name),
    // where each track starts on the project page (project.html?id=…#concept)
    trackKeys: sectionsFor(project).map((s) => s.key),
    sound: project.sound || null, // how it sounds on the turntable (sound.js)
    credits: project.credits || [],
    project,
  }));

  const special = [site.artistAlbum, site.chatAlbum].map((album) => ({
    kind: album.id, // "artist" or "chat"
    ...album,
    credits: [],
  }));

  return [...projectAlbums, ...special];
}

export function findAlbumIndex(albums, id) {
  return albums.findIndex((album) => album.id === id);
}

/* Each cover layout has its own colours. The crate, the label of the
   record and the project page hero all use them, so a project keeps
   one identity everywhere. */
export const LAYOUT_COLOURS = {
  "teal-wash":       { ground: "#173d3f", ink: "#efe8dc", label: "#1d4a4c" },
  "paper-frame":     { ground: "#efe8dc", ink: "#131112", label: "#efe8dc" },
  "arch-window":     { ground: "#5e1a28", ink: "#efe8dc", label: "#5e1a28" },
  "silver-band":     { ground: "#c3c7ca", ink: "#131112", label: "#b9bec2" },
  "portrait-silver": { ground: "#131112", ink: "#d7dadc", label: "#b9bec2" },
  "type-only":       { ground: "#5e1a28", ink: "#efe8dc", label: "#efe8dc" },
};

export function coloursFor(album) {
  return LAYOUT_COLOURS[album.cover?.layout] || { ground: "#131112", ink: "#efe8dc", label: "#5e1a28" };
}
