/* =====================================================================
   cover-studio.js — COVER STUDIO, cover-studio.html
   ---------------------------------------------------------------------
   Shows every album's front and back, drawn exactly as the crate
   draws them, with buttons to download each as a PNG file.
   ===================================================================== */

import { getAlbums, hasText } from "./albums.js";
import { drawCover, drawBack, coverFileName } from "./covers.js";
import { renderNav, escapeHTML as esc, icons } from "./common.js";

renderNav("");

const grid = document.querySelector("[data-studio]");
const albums = getAlbums();

/* Save a canvas as a PNG file */
function download(canvas, name) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, "image/png");
}

albums.forEach((album, index) => {
  const item = document.createElement("section");
  item.className = "studio__item";
  const own = hasText(album.cover?.file);
  item.innerHTML = `
    <div data-front></div>
    <div data-back></div>
    <div class="studio__info">
      <p class="caps">${esc(album.catalogue)} · ${esc(album.category)}</p>
      <h2>${esc(album.title)}</h2>
      <p class="note">${own ? `Using your own cover file: <code>${esc(album.cover.file)}</code>` : `Layout: <code>${esc(album.cover?.layout || "")}</code>${hasText(album.cover?.image) ? ` · built from <code>${esc(album.cover.image)}</code>` : ""}`}</p>
      <div class="studio__buttons">
        <button class="btn" type="button" data-save="front">${icons.download}Cover PNG</button>
        <button class="btn" type="button" data-save="print">${icons.download}Cover, print size</button>
        <button class="btn" type="button" data-save="back">${icons.download}Back PNG</button>
      </div>
    </div>`;
  grid.appendChild(item);

  Promise.all([drawCover(album, 1024), drawBack(album, 1024)]).then(([front, back]) => {
    front.setAttribute("role", "img");
    front.setAttribute("aria-label", `${album.title}, front cover`);
    back.setAttribute("role", "img");
    back.setAttribute("aria-label", `${album.title}, back of sleeve`);
    item.querySelector("[data-front]").appendChild(front);
    item.querySelector("[data-back]").appendChild(back);
    item.querySelector('[data-save="front"]').addEventListener("click", () => download(front, coverFileName(album, "cover")));
    item.querySelector('[data-save="back"]').addEventListener("click", () => download(back, coverFileName(album, "back")));
    item.querySelector('[data-save="print"]').addEventListener("click", async () => {
      download(await drawCover(album, 3000), coverFileName(album, "cover-3000"));
    });
  });
  item.dataset.index = index;
});
