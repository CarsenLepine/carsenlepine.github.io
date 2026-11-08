# Four Points Design: The Record Collection

Your portfolio, presented as a crate of records. Each project is an album; **The Artist** (about you) and **Let's Chat** (contact) are two special albums at the back of the crate.

Beside the crate stands a **turntable**. Press Play (or click the front album) and its record slides out of the sleeve, flies over to the turntable, and the needle drops. Each album plays its own music, matched to the project, and every track on it is a variation. Visitors can:

- **drag the record** to scratch it (the music follows their hand; holding it still stops the music)
- **click a groove** on the record, or a track in the list, to move the needle to that track
- **click the tonearm** to lift it (pause) or drop it again
- press **Open** to read the album's page, at the track the needle is on. **The music keeps playing the whole time**: the page opens on top of the turntable, and as visitors scroll into each section the music glides to that section's track. Links to other albums (next / previous, The Artist, Let's Chat) swap the record, and "Back to the collection" returns to the turntable, still spinning.
- press **Esc** (or the eject button) to put the record back in its sleeve

All the sound is made in the browser (`js/sound.js`), so there are no audio files. Every album is levelled to the same gentle loudness. The **Sound on / off** button in the corner is remembered on each visitor's device. On a project page, the little record in the corner shows which track (section) you're reading and plays / pauses the music. Someone who opens a project link directly starts the music from there (browsers don't allow sound before a click).

### Each album's music

Set by `sound` in each project in `js/data/projects.js` (and for The Artist and Let's Chat in `js/data/site.js`):

| Album | Style | Sounds like |
|---|---|---|
| The Pause Between | `ambient` | the music under the hospital film: slow, airy, hopeful |
| Ledger Residence | `piano` | a soft felt piano playing slow broken chords over warm pads |
| Moroccan Reverie | `moroccan` | a warm, lantern-lit groove: a breathy ney flute over soft electric piano, a rounded bass and a gentle frame drum, with a hint of Morocco |
| ModuNest | `modern` | clean electronic: soft arpeggios, a light beat, warm pads |
| The Artist, Let's Chat | `lofi` | mellow lo-fi keys, bass and brushed drums |

You can change `key` (e.g. `"F"`, `"Bb"`), `bpm` (speed) and `chords` (names like `"Fsus2"`, `"Bbmaj7"`, `"Gm7"`, `"Am9"`, `"G6"`, each lasting two bars). Leave `sound` out of a project and it gets a lo-fi tune of its own.

It's plain HTML, CSS and JavaScript. There's nothing to install and no build step.

---

## What's where

| File | What it is |
|---|---|
| `index.html` | The homepage: the 3D record crate |
| `project.html` | **One** page for every project, e.g. `project.html?id=project-02` |
| `artist.html` | The Artist (your "liner notes") |
| `chat.html` | Let's Chat (contact) |
| `cover-studio.html` | Every album cover, with **Download PNG** buttons (not linked from the site) |
| `js/data/projects.js` | **All project content**: text, images, covers |
| `js/data/site.js` | **About you and your contact details**, plus the two special albums |
| `css/style.css` | All the styling. **The colours are at the very top.** |
| `js/covers.js` | Draws the album covers, sleeve backs and records |
| `js/crate.js` | The 3D scene (Three.js): the crate, the record's flight, the turntable's moving parts, scratching |
| `js/turntable.js` | The shape of the 3D turntable |
| `js/sound.js` | The music, crackle and scratch sounds (made in the browser) |
| `js/home.js`, `js/project.js`, `js/artist.js`, `js/chat.js` | Each page's script |
| `js/lightbox.js` | The zoomable full-screen viewer for drawings |
| `js/common.js`, `js/albums.js` | Shared pieces (the navigation, the album list) |
| `assets/` | Your images, fonts, portrait and résumé |

You'll normally only edit the two files in `js/data/`, plus the top of `css/style.css`.

---

## How to preview

1. In VS Code, open the **`vinyl-portfolio`** folder (*File → Open Folder…*).
2. Right-click `index.html` and choose **Open with Live Server**.
3. When you save a file, the browser reloads.

The site has to be opened through Live Server (or any web server), not by double-clicking the HTML file. Browsers block the scripts on files opened directly.

Handy addresses to add to the end of the Live Server address:

| Add this | What it does |
|---|---|
| `index.html?from=project-03` | Opens the crate with that album in front |
| `index.html?nowebgl` | Shows the simple cover grid that visitors without 3D see |
| `index.html?debug&play=project-02` | Puts that record straight on the turntable (for testing; the sound waits for your first click) |
| `project.html?id=project-01` | Opens a project page directly |

---

## Change text

Open `js/data/projects.js` (projects) or `js/data/site.js` (about you, contact).

- Change only the words **between the quote marks**. Keep the quotes and the comma at the end of the line.
- If your text needs a double quote, use curly ones: “ ”. Apostrophes are fine.
- **Empty text (`""`) is simply not shown.** If a whole section is empty, it disappears from the page and from the track list on the back of the sleeve.
- **Anything in `[square brackets]` counts as a placeholder** and is never shown, so you can leave notes to yourself like `"[write this later]"`.

A project page has up to five sections ("tracks"):

| Track | Comes from |
|---|---|
| 01 The Brief | `brief` (a large opening line, then smaller blocks with headings) |
| 02 The Concept | `concept` (text, a large statement line, and images) |
| 03 Design Development | `development` (text blocks, then `stages`: images that change as you scroll) |
| 04 Technical Drawings | `drawings` |
| 05 The Final Experience | `experience` (your finished renders) |

**Tip:** a long opening line (`brief.lead`) is automatically set a little smaller than a short one, so both read well.

---

## Add a project

1. Make a folder for its images: `assets/projects/project-05/` (with `concept/`, `drawings/`, `renders/` inside, as you like).
2. In `js/data/projects.js`, copy a whole project block, from its opening `{` to its closing `},`, and paste it after the last project.
3. Change:
   - `id` to `"project-04"` (its address becomes `project.html?id=project-04`)
   - `catalogue` to the next number, e.g. `"FPD—05"`, then renumber The Artist and Let’s Chat in `site.js`
   - the title, subtitle, category, year, text and image paths
   - `cover.layout` to one of `"teal-wash"`, `"paper-frame"`, `"arch-window"` or `"silver-band"` (or use your own cover file, see below)
4. Save. The new album appears in the crate (before The Artist and Let's Chat), in the album list, and in the previous/next links.

---

## Add drawings (or any images)

1. Put the file in the project's folder, e.g. `assets/projects/project-02/drawings/roof-plan.png`.
2. Add a line to that project's `drawings` list in `projects.js`:

   ```js
   { file: "assets/projects/project-02/drawings/roof-plan.png", caption: "Roof plan" },
   ```

Tips for drawings:
- **PNG**, dark lines on a white or light background, at least **2400 px wide**. The viewer zooms to 300% of the file's real size and always draws from your full-size file, so a bigger file means a sharper zoom.
- The first drawing in the list is shown largest.

The same pattern works for `concept.images`, `development.stages` and `experience`.
For `stages`, add `fit: "contain"` for drawings (shows the whole sheet) or `fit: "cover"` for renders (fills the frame).

---

## Moving renders (video)

The Pause Between shows clips from the hospital film instead of still renders: the big image under the "Now Playing" band (`heroVideo`) and each render in The Final Experience (`video: "…"` on that render). They're short, silent loops in `assets/projects/project-01/video/`, and they only play while on screen. The still image is shown until a clip loads, and to visitors whose device asks for less motion.

To do the same for another project, put an `.mp4` in its folder and add `video: "assets/projects/project-0X/video/name.mp4"` to a render (keep its `file` too), or `heroVideo: "…"` beside `hero`. Keep clips short (3–8 seconds), silent, about 1600 px wide, and under ~1.5 MB each.

---

## Swap a cover

The covers are drawn automatically from your renders. To see them all, open **`cover-studio.html`**, where you can also download each as a PNG.

- **Use a different render** in the designed layout: change `cover.image` in `projects.js`.
- **Use your own finished cover**: put a square image (at least 1024 × 1024) in the project folder, e.g. `assets/projects/project-01/cover.jpg`, then set:

  ```js
  cover: { layout: "teal-wash", image: "…", file: "assets/projects/project-01/cover.jpg" },
  ```

  `file` always wins. Set it back to `""` to return to the designed layout.
- The Artist and Let's Chat covers are set in `js/data/site.js` (`artistAlbum.cover`, `chatAlbum.cover`) and work the same way.

Your original images are never changed. The covers are drawn fresh in the browser each time.

---

## Change colours

At the very top of `css/style.css`:

```css
--burgundy: #5e1a28;
--charcoal: #131112;
--cream: #efe8dc;
--silver: #b9bec2;
```

Change a value there and it updates across the site.
The covers have their own colours, so that each album keeps its identity. Those are in `js/covers.js` (`PALETTE`, and each layout's colours) and `js/albums.js` (`LAYOUT_COLOURS`, used for the sleeve edges and record labels in the crate).

---

## Your résumé

The download on The Artist page is **`assets/documents/resume.pdf`**. To update it, save your new PDF over that file with the same name (or change `resumePdf` in `js/data/site.js`).

---

## Good to know

- **Fonts:** Instrument Serif loads from Google Fonts (so it needs an internet connection); Source Sans 3 is in `assets/fonts`.
- **No 3D?** If a device can't show WebGL, the homepage shows a grid of the covers instead.
- **Reduced motion:** if a visitor's device asks for less motion, the crate stops easing between albums, the record appears on the turntable without flying, and nothing spins.
- **The music:** each album always sounds the same (its melody is worked out from its `id`), and a new project without `sound` gets a lo-fi tune of its own automatically.
- **Pages over the turntable:** when an album is opened from the turntable, its page is shown in a frame with `&embedded=1` added to its address (the address bar shows the normal address). You never need to type that yourself.
- **Navigation without a mouse:** ← → (or scroll, or swipe) flips the crate; Enter plays the front album; Tab moves through the Play button and album list. With a record on the turntable: ← → change track, Space lifts the needle, Enter opens the album, Esc puts the record back. On any album page, Esc goes back to the collection (if the drawing viewer is open, Esc closes it first), and a "Top" button appears once you scroll down. In the drawing viewer: scroll or pinch to zoom, drag to move, ← → for the next drawing, + / − to zoom, 0 to fit, Esc to close.

---

## Publish on GitHub

This folder is its own git repository (it is not part of the original site), so publishing it puts only the vinyl site online.

1. **Make a GitHub account** at github.com (free), if you don't have one.
2. **Create a new, empty repository** (the **+** at the top right → *New repository*).
   - Name it **`yourusername.github.io`** (your exact GitHub username) to get the cleanest address, `https://yourusername.github.io/`. Any other name, e.g. `portfolio`, gives `https://yourusername.github.io/portfolio/`.
   - Set it to **Public** (free GitHub Pages sites must be public).
   - **Don't** tick "Add a README", ".gitignore" or "license": it must start empty.
3. **Upload the site** (the first time, a GitHub sign-in window opens). In a terminal in this folder:

   ```
   git remote add origin https://github.com/yourusername/yourrepository.git
   git push -u origin main
   ```

4. **Turn on GitHub Pages**: in the repository, *Settings* → *Pages* → *Build and deployment*: Source **Deploy from a branch**, Branch **main**, folder **/ (root)** → **Save**. After a minute or two the address appears at the top of that page.
5. **Finish the link preview**: in `index.html`, `project.html`, `artist.html` and `chat.html`, change
   `<meta property="og:image" content="assets/social-preview.jpg">` to the full address, e.g.
   `content="https://yourusername.github.io/assets/social-preview.jpg"` (most apps need the full address to show the picture).

**Updating the live site later:** save your changes, then in a terminal in this folder:

```
git add -A
git commit -m "What I changed"
git push
```

The live site updates a minute or two after each push.

**Remember:** everything in this folder is public once published, including the résumé PDF (`assets/documents/resume.pdf`), your email and your phone number.
