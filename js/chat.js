/* =====================================================================
   chat.js — LET'S CHAT, chat.html
   ---------------------------------------------------------------------
   A warm invitation and three ways to get in touch: email (opens the
   visitor's email app), phone (starts a call on phones) and LinkedIn.
   No contact form. Everything comes from js/data/site.js.
   ===================================================================== */

import { site } from "./data/site.js";
import { hasText } from "./albums.js";
import { renderNav, initReveal, escapeHTML as esc, icons, footerHTML } from "./common.js";

renderNav("chat");

const album = site.chatAlbum;
const back = `index.html?from=${album.id}`;
const main = document.querySelector("#main");

// "905-251-8010" → "tel:+19052518010" (a North American number)
const digits = (site.phone || "").replace(/\D/g, "");
const tel = digits.length === 10 ? `+1${digits}` : digits;

const ways = [
  hasText(site.email) && { label: "Email", value: site.email, href: `mailto:${site.email}` },
  hasText(site.phone) && { label: "Phone", value: site.phone, href: `tel:${tel}` },
  hasText(site.linkedin) && { label: "LinkedIn", value: "View my profile", href: site.linkedin, external: true },
].filter(Boolean);

// The heading: "Let’s Chat" → "Let’s" upright, "Chat" in italics
const words = (site.chat?.heading || "Let’s Chat").split(" ");
const heading = words.length > 1 ? `${esc(words.slice(0, -1).join(" "))} <em>${esc(words[words.length - 1])}</em>` : esc(words[0]);

main.innerHTML = `
  <div class="wrap">
    <a class="back-link caps" href="${back}">${icons.arrowLeft}<span>Back to the collection</span></a>
    <p class="chat__eyebrow caps"><span>${esc(album.catalogue)}</span><span>${esc(site.name)} · ${esc(site.role)}</span></p>
    <h1 class="chat__title reveal">${heading}</h1>
    ${hasText(site.chat?.invitation) ? `<p class="chat__invite reveal">${esc(site.chat.invitation)}</p>` : ""}
    <ul class="contact-list">
      ${ways.map((way) => `
      <li class="reveal">
        <a href="${esc(way.href)}"${way.external ? ' target="_blank" rel="noopener"' : ""}>
          <span class="caps">${esc(way.label)}</span>
          <span class="value">${esc(way.value)}</span>
          ${icons.arrowUpRight}
        </a>
      </li>`).join("")}
    </ul>
  </div>`;

document.body.insertAdjacentHTML("beforeend", `<footer class="site-footer">${footerHTML()}</footer>`);
initReveal();
