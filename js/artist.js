/* =====================================================================
   artist.js — THE ARTIST ("LINER NOTES"), artist.html
   ---------------------------------------------------------------------
   Laid out like the printed insert inside a record: a big title and
   portrait, the introduction, the philosophy, then two columns of
   "fine print": experience on the left; education, software, skills
   and the rest on the right; and the résumé download.
   All the words come from js/data/site.js.
   ===================================================================== */

import { site } from "./data/site.js";
import { hasText } from "./albums.js";
import { renderNav, initReveal, escapeHTML as esc, icons, footerHTML } from "./common.js";

renderNav("artist");

const main = document.querySelector("#main");
const album = site.artistAlbum;
const back = `index.html?from=${album.id}`;

const list = (items) => (items || []).filter(hasText);

const experience = (site.experience || []).filter((job) => hasText(job.role));
const education = (site.education || []).filter((e) => hasText(e.school));
// the philosophy can be one paragraph ("…") or several (["…", "…"])
const philosophy = list([].concat(site.philosophy || []));
const extras =(site.extras || []).filter((group) => list(group.items).length);

main.innerHTML = `
  <div class="wrap">
    <a class="back-link caps" href="${back}">${icons.arrowLeft}<span>Back to the collection</span></a>

    <header class="liner__head">
      <div class="reveal">
        <p class="liner__eyebrow caps"><span>Liner notes</span><span>${esc(album.catalogue)}</span></p>
        <h1 class="liner__title">The <em>Artist</em></h1>
        <p class="liner__name"><span class="serif" style="font-size:1.4em">${esc(site.name)}</span><br><span class="caps">${esc(site.role)} · ${esc(site.brand)}</span></p>
      </div>
      <figure class="portrait reveal">
        <img src="${esc(site.portrait)}" alt="${esc(site.portraitDescription)}" width="800" height="800">
      </figure>
    </header>

    <section class="liner__intro" aria-label="Introduction">
      ${hasText(site.introduction) ? `<p class="lead reveal">${esc(site.introduction)}</p>` : ""}
      ${philosophy.length ? `
      <div class="liner__philosophy reveal">
        <p class="caps" style="color:var(--ink-muted)">Design philosophy</p>
        ${philosophy.map((text, i) => `<p class="${i === 0 ? "first" : "more"}">${esc(text)}</p>`).join("")}
      </div>` : ""}
    </section>

    <div class="liner__cols">
      <section aria-labelledby="experience-title">
        <h2 id="experience-title" class="reveal"><span class="caps">Side A</span>Experience</h2>
        <ol class="timeline">
          ${experience.map((job) => `
          <li class="reveal">
            <p class="years caps">${esc(job.years)}</p>
            <div>
              <h3>${esc(job.role)}</h3>
              <p class="where">${esc([job.organisation, job.place].filter(hasText).join(", "))}</p>
              ${list(job.points).length ? `<ul>${list(job.points).map((point) => `<li>${esc(point)}</li>`).join("")}</ul>` : ""}
            </div>
          </li>`).join("")}
        </ol>
      </section>

      <div class="liner__side">
        ${education.length ? `
        <section aria-labelledby="education-title" class="reveal">
          <h2 id="education-title"><span class="caps">Side B</span>Education</h2>
          <ul class="plain-list">
            ${education.map((e) => `
            <li>
              <span class="years caps">${esc(e.years)}</span>
              <strong>${esc(e.school)}</strong>
              <span class="detail">${esc([e.detail, e.place].filter(hasText).join(" · "))}</span>
            </li>`).join("")}
          </ul>
        </section>` : ""}

        ${list(site.software).length ? `
        <section aria-labelledby="software-title" class="reveal">
          <h2 id="software-title">Software</h2>
          <ul class="chips">${list(site.software).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        </section>` : ""}

        ${list(site.skills).length ? `
        <section aria-labelledby="skills-title" class="reveal">
          <h2 id="skills-title">Skills</h2>
          <ul class="plain-list">${list(site.skills).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        </section>` : ""}

        ${extras.map((group, i) => `
        <section aria-labelledby="extra-${i}" class="reveal">
          <h2 id="extra-${i}">${esc(group.title)}</h2>
          <ul class="plain-list">${list(group.items).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        </section>`).join("")}

        ${hasText(site.resumePdf) ? `
        <div class="resume-cta reveal">
          <p>The full résumé, on one sheet.</p>
          <a class="btn btn--solid" href="${esc(site.resumePdf)}" download="Carsen-Lepine-Resume.pdf">${icons.download}Download résumé (PDF)</a>
        </div>` : ""}
      </div>
    </div>

    <p style="padding-bottom: 64px"><a class="btn on-light" href="${back}">${icons.arrowLeft}Back to the collection</a></p>
  </div>
  <footer class="site-footer">${footerHTML()}</footer>`;

initReveal();
