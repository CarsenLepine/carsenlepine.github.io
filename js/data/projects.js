/* =====================================================================
   projects.js — EVERY PROJECT ("ALBUM") IN THE COLLECTION
   ---------------------------------------------------------------------
   This is the ONE file that holds your project content. The crate on
   the homepage, the album covers, and every project page are all built
   from it. Change something here, save, and Live Server reloads.

   How to edit safely:
   - Change only the text between the quote marks "like this".
   - Keep the quote marks, and the comma at the end of each line.
   - If your text needs a double quote, use “ ” instead of " ".
     Apostrophes are fine: ’ or '.
   - Anything left empty ("" or []) is simply not shown. A whole
     section (e.g. "The Concept") disappears if it has nothing in it.
   - Anything written in [square brackets] is treated as a placeholder
     and is never shown on the site.

   THE FIVE SECTIONS ("TRACKS") OF A PROJECT PAGE
     01 The Brief               → brief
     02 The Concept             → concept
     03 Design Development      → development
     04 Technical Drawings      → drawings
     05 The Final Experience    → experience

   THE COVER
     cover.layout  one of the designed layouts (see js/covers.js):
                   "teal-wash", "paper-frame", "arch-window", "silver-band"
     cover.image   the render the layout is built around
     cover.file    YOUR OWN finished cover image instead (a square
                   .jpg/.png, ideally 1024 × 1024 or larger). Leave it
                   "" to use the designed layout.

   To ADD A PROJECT: copy one whole { … } block (from its opening {
   to its closing }, plus the comma), paste it after the last project,
   then change the id to the next number (e.g. "project-05"), the
   catalogue number ("FPD—05"; then move The Artist and Let’s Chat up one
   in site.js), and the content. Put its images in
   assets/projects/project-05/.
   ===================================================================== */

export const projects = [

  /* ======================= ALBUM ONE ======================= */
  {
    id: "project-01",                       // its address: project.html?id=project-01
    catalogue: "FPD—01",                    // printed top-left on the cover
    title: "The Pause Between",
    subtitle: "Redefining Healthcare Waiting",
    category: "Healthcare",
    year: "2026",
    // One or two sentences, shown under the title on the project page
    summary: "A spa-inspired waiting environment that reframes waiting as part of the healing journey rather than lost time.",

    // The credits beside the cover. Each line is [ "Label", "Value" ].
    credits: [
      ["Location", "Royal Victoria Regional Health Centre, Barrie"],
      ["Year", "2026"],
      ["Type", "Healthcare"],
      ["Team", "Group project"],
      ["Software", "SketchUp, Revit, Twinmotion"],
      ["Visualization", "AI-assisted"],
    ],

    // How this album sounds on the turntable (made by js/sound.js).
    // Modelled on the music under the hospital film ("My Movie"): slow,
    // airy and hopeful, in F major, about 80 beats a minute, with soft
    // pads, pulsing plucked notes and a gentle kick. Each chord lasts two
    // bars. Leave "sound" out of a project to give it the default lo-fi tune.
    sound: { style: "ambient", key: "F", bpm: 80, chords: ["Fsus2", "Bbmaj7", "Gm7", "Dm7", "Bbsus2", "C"] },

    // The large image at the top of the project page
    hero: "assets/projects/project-01/hero.jpg",
    // …shown moving: a clip from the hospital film (the image above is shown
    // until it loads, and to visitors who prefer less motion). "" = image only.
    heroVideo: "assets/projects/project-01/video/hero.mp4",

    cover: {
      layout: "teal-wash",
      image: "assets/projects/project-01/hero.jpg",
      file: "",
    },

    // ---------- 01 THE BRIEF ----------
    brief: {
      // The opening statement, set large
      lead: "What if the hospital wasn’t just a place for treatment, but a place for restoration? Imagine arriving at the hospital burdened by uncertainty, and leaving feeling restored, cared for and grounded.",
      // Smaller blocks underneath, each with its own heading
      blocks: [
        { heading: "The Current Problem", text: "The waiting experience at RVH places a significant psychological burden on patients and visitors. Uncertainty during wait times fosters feelings of anguish, loss of control, and stagnation, transforming waiting from a neutral pause into a source of emotional distress. This experience can heighten anxiety, reduce comfort, and negatively shape overall perceptions of care." },
        { heading: "User Strategies", text: "Our design proposal responds to all user groups by creating spaces where ER patients are supported through uncertainty, inpatients experience renewal between treatments, employees are provided opportunities for micro-recovery and resilience for less burn out, and the broader community is engaged through preventative and holistic wellness." },
      ],
    },

    // ---------- 02 THE CONCEPT ----------
    concept: {
      heading: "Our Concept",
      text: "The Pause Between reframes waiting as part of the healing journey rather than lost time. Inspired by spa rituals, the design transforms hospital waiting into a restorative experience through hot and cold therapy, gentle transitions, and supportive zones that regulate stress. The Pause Between shifts the focus toward what happens emotionally in the in-between.",
      // One or two short sentences, set very large
      statement: "Healing does not begin only in the exam room, it begins the moment someone walks through the door.",
      // Moodboard, research, sketches: placed off-grid in this order
      images: [
        { file: "assets/projects/project-01/concept/biophilic-water-wall.jpg",        caption: "Research: sensory design for nervous system regulation" },
        { file: "assets/projects/project-01/concept/sensory-design.jpg",              caption: "Research: fear conditioned society" },
        { file: "assets/projects/project-01/concept/acoustic-decompression-pods.jpg", caption: "Research: acoustic decompression pods" },
        { file: "assets/projects/project-01/concept/ultraviolet-sleeping-pods.jpg",   caption: "Research: ultraviolet sleeping pods" },
        { file: "assets/projects/project-01/concept/front-lounge.jpg",                caption: "Front lounge" },
        { file: "assets/projects/project-01/concept/cafe-seating.jpg",                caption: "Café seating" },
        { file: "assets/projects/project-01/concept/health-bar.jpg",                  caption: "Health bar" },
        { file: "assets/projects/project-01/concept/spa-area.jpg",                    caption: "Spa area" },
      ],
    },

    // ---------- 03 DESIGN DEVELOPMENT ----------
    development: {
      blocks: [
        { heading: "Design Intentions", text: "Through hot and cold therapy and calming sensory elements, users can help regulate stress and relax their nervous system. These small wellness moments can make waiting feel less overwhelming and more like a chance to reset. The goal is not to replace medical care, but to support emotional and physical well-being during the waiting process, helping them feel more grounded, comfortable, and prepared for the next stage of their healthcare journey." },
      ],
      // Steps shown one after another as the visitor scrolls.
      // fit: "contain" shows the whole image (best for drawings);
      // fit: "cover" fills the frame (best for renders).
      stages: [
        { file: "assets/projects/project-01/drawings/build-bubble-diagram.jpg",   caption: "Bubble diagram",   fit: "contain" },
        { file: "assets/projects/project-01/drawings/build-plan-partition.png",   caption: "Partition plan",   fit: "contain" },
        { file: "assets/projects/project-01/drawings/build-plan-furniture.png",   caption: "Furniture plan",   fit: "contain" },
        { file: "assets/projects/project-01/drawings/build-plan-finishes.png",    caption: "Finishes plan",    fit: "contain" },
        { file: "assets/projects/project-01/drawings/build-material-palette.jpg", caption: "Material palette", fit: "contain" },
      ],
    },

    // ---------- 04 TECHNICAL DRAWINGS ----------
    // Click any drawing to open it full screen with zoom.
    drawings: [
      { file: "assets/projects/project-01/drawings/main-level-floor-plan.jpg",   caption: "Main level floor plan" },
      { file: "assets/projects/project-01/drawings/second-level-floor-plan.jpg", caption: "Second level floor plan" },
      { file: "assets/projects/project-01/drawings/third-level-floor-plan.jpg",  caption: "Third level floor plan" },
      { file: "assets/projects/project-01/drawings/rendered-section.jpg",        caption: "Rendered section" },
      { file: "assets/projects/project-01/drawings/level-2-partition-plan.png",  caption: "Level 2 partition plan" },
      { file: "assets/projects/project-01/drawings/level-2-furniture-plan.png",  caption: "Level 2 furniture plan" },
      { file: "assets/projects/project-01/drawings/level-2-finishes-plan.png",   caption: "Level 2 finishes plan" },
      { file: "assets/projects/project-01/drawings/level-3-furniture-plan.png",  caption: "Level 3 furniture plan" },
      { file: "assets/projects/project-01/drawings/level-4-furniture-plan.png",  caption: "Level 4 furniture plan" },
      { file: "assets/projects/project-01/drawings/reflected-ceiling-plans.png", caption: "Reflected ceiling plans" },
    ],

    // ---------- 05 THE FINAL EXPERIENCE ----------
    // The finished renders, in the order a visitor walks through.
    experience: [
      { file: "assets/projects/project-01/renders/reception.webp",          caption: "Reception", video: "assets/projects/project-01/video/reception.mp4" },
      { file: "assets/projects/project-01/renders/front-lounge.webp",       caption: "Front Lounge", video: "assets/projects/project-01/video/front-lounge.mp4" },
      { file: "assets/projects/project-01/renders/cafe-seating.webp",       caption: "Café Seating", video: "assets/projects/project-01/video/cafe-seating.mp4" },
      { file: "assets/projects/project-01/renders/health-cafe-bar.webp",    caption: "Health Café & Bar", video: "assets/projects/project-01/video/health-cafe-bar.mp4" },
      { file: "assets/projects/project-01/renders/red-light-therapy.webp",  caption: "Red Light Therapy Rooms", video: "assets/projects/project-01/video/red-light-therapy.mp4" },
      { file: "assets/projects/project-01/renders/fireplace-lounge.webp",   caption: "Fireplace Lounge", video: "assets/projects/project-01/video/fireplace-lounge.mp4" },
      { file: "assets/projects/project-01/renders/pool.webp",               caption: "Pool", video: "assets/projects/project-01/video/pool.mp4" },
      { file: "assets/projects/project-01/renders/cold-plunge-saunas.webp", caption: "Cold Plunge / Saunas", video: "assets/projects/project-01/video/cold-plunge-saunas.mp4" },
      { file: "assets/projects/project-01/renders/changerooms.webp",        caption: "Changerooms", video: "assets/projects/project-01/video/changerooms.mp4" },
      { file: "assets/projects/project-01/renders/mezzanine-lounge.webp",   caption: "Mezzanine Lounge", video: "assets/projects/project-01/video/mezzanine-lounge.mp4" },
    ],
  },

  /* ======================= ALBUM TWO ======================= */
  {
    id: "project-02",
    catalogue: "FPD—02",
    title: "Ledger Residence",
    subtitle: "Passive House Residential Design",
    category: "Residential",
    year: "2024",
    summary: "Modern farmhouse charm meets sustainable Passive House design: light-filled spaces, warm natural finishes and refined details, balancing comfort, functionality and energy efficiency.",
    credits: [
      ["Location", "375 Livingstone St, Barrie"],
      ["Area", "2,500 sq ft"],
      ["Year", "2024"],
      ["Type", "Residential"],
      ["Software", "SketchUp, Revit"],
    ],
    // On the turntable: a soft felt piano playing slow broken chords over
    // warm pads; calm and natural like the house (see js/sound.js)
    sound: { style: "piano", key: "G", bpm: 66, chords: ["Gmaj7", "Em9", "Cmaj7", "Dsus4"] },
    // The large image at the top of the page: a SketchUp view from your own
    // files (living, dining and kitchen)
    hero: "assets/projects/project-02/hero-sketchup.jpg",
    cover: {
      layout: "paper-frame",
      image: "assets/projects/project-02/concept/living-room.jpg",  // the living room, with the front door behind
      // The drawing faintly layered behind (paper-frame layout only)
      drawing: "assets/projects/project-02/drawings/exploded-3d.png",
      file: "",
    },

    brief: {
      heading: "Problem Statement",
      lead: "“To design a free standing sustainable structure with an emphasis on form to provide an inclusive for healthy living.”",
      blocks: [
        { heading: "Client / Users", text: "A couple nearing retirement, with two grown children who have moved out and a border collie, building a new home together. They live a clean, organized lifestyle and want an open-concept home with plenty of storage, comfort and fun outdoor spaces. They love to entertain family and friends with food, music, games and drinks, so the home must be functional, easy to clean and ready for guests now and in the future, while feeling homey, serene, minimalistic and calm." },
        { heading: "Design Criteria / Problem Solvers", text: "Ease of Cleanliness, Light Colour Palette, Ease of Use & Comfort, Quality, Dog Friendly, Traditional mixed with modern farmhouse." },
      ],
    },

    concept: {
      heading: "The Concept",
      text: "Embracing a dynamic design approach, this concept will be seeking to create a bright and welcoming space with ample natural lighting, complemented by soft modern elements, as well as subtle line and colour being represented throughout the design, which will enhance a modern farmhouse aesthetic. Touches of greenery and a balance of warm, natural materials will bring a harmonious blend of comfort and simplicity.",
      statement: "",
      images: [],
    },

    development: {
      blocks: [
        { heading: "Passive House & OBC Requirements", text: "The Ledger Residence effectively integrates Passive House principles while meeting the Ontario Building Code (OBC) requirements. The home incorporates high-performance features such as triple-glazed windows, strategic sun-path orientation, and enhanced insulation for superior thermal performance and energy efficiency, all aligning with Passive House standards and principles of minimizing energy demand and maximizing comfort. At the same time, the design adheres to OBC regulations, including minimum ceiling and stair heights, required doorway dimensions, and proper window sizing for natural light and ventilation. By blending sustainable technologies with strict code compliance, the Ledger Residence ensures both ecological responsibility and occupant safety." },
      ],
      // The SketchUp model being built, one step at a time
      stages: [
        { file: "assets/projects/project-02/renders/build-stage-02.webp", caption: "Walls",             fit: "cover" },
        { file: "assets/projects/project-02/renders/build-stage-03.webp", caption: "Windows & doors",   fit: "cover" },
        { file: "assets/projects/project-02/renders/build-stage-04.webp", caption: "Millwork",          fit: "cover" },
        { file: "assets/projects/project-02/renders/build-stage-05.webp", caption: "Furnishings",       fit: "cover" },
        { file: "assets/projects/project-02/renders/build-stage-06.webp", caption: "Finished",          fit: "cover" },
      ],
    },

    drawings: [
      { file: "assets/projects/project-02/drawings/exploded-3d.png",         caption: "Exploded 3D" },
      { file: "assets/projects/project-02/drawings/basement-plan.png",       caption: "Basement plan" },
      { file: "assets/projects/project-02/drawings/main-floor-plan.png",     caption: "Main floor plan" },
      { file: "assets/projects/project-02/drawings/second-floor-plan.png",   caption: "Second level plan" },
      { file: "assets/projects/project-02/drawings/exterior-elevations.png", caption: "Exterior elevations" },
      { file: "assets/projects/project-02/drawings/building-section.png",    caption: "Building section & wall section" },
      { file: "assets/projects/project-02/drawings/stair-details.png",       caption: "Stair details" },
    ],

    experience: [
      { file: "assets/projects/project-02/concept/living-room.jpg",           caption: "Living room" },
      { file: "assets/projects/project-02/concept/exterior-pool-terrace.jpg", caption: "Exterior, pool terrace" },
      { file: "assets/projects/project-02/concept/primary-bedroom.jpg",       caption: "Primary bedroom" },
      { file: "assets/projects/project-02/concept/bathroom-vanity.jpg",       caption: "Bathroom vanity" },
    ],
  },

  /* ======================= ALBUM THREE ======================= */
  {
    id: "project-03",
    catalogue: "FPD—03",
    title: "Moroccan Reverie",
    subtitle: "Culture Driven Restaurant Design",
    category: "Hospitality",
    year: "2025",
    summary: "Introducing Moroccan Reverie, a culturally inspired restaurant and bar that transforms Georgian College’s existing dining room into a warm and immersive experience, where traditional Moroccan influences meet contemporary design.",
    credits: [
      ["Location", "Georgian College, Barrie"],
      ["Area", "4,300 sq ft"],
      ["Year", "2025"],
      ["Type", "Hospitality"],
      ["Software", "SketchUp, Revit, Twinmotion"],
    ],
    // On the turntable: a warm, lantern-lit groove: a breathy ney flute over
    // soft electric piano, a rounded bass and a gentle frame drum, in a minor
    // key with a hint of Morocco (see js/sound.js)
    sound: { style: "moroccan", key: "D", bpm: 88, chords: ["Dm9", "Bbmaj7", "Gm7", "A"] },
    hero: "assets/projects/project-03/hero.jpg",
    cover: {
      layout: "arch-window",
      image: "assets/projects/project-03/concept/host-stand.jpg",   // the front desk (host stand)
      file: "",
    },

    brief: {
      heading: "Project Summary",
      lead: "Moroccan Reverie is a restaurant and bar renovation inspired by the warmth, culture, and architectural beauty of Morocco. Located within Georgian College’s existing dining room, the design reimagines the space through rich textures, warm earthy tones, traditional Moroccan detailing, and contemporary finishes. Through thoughtful space planning, layered lighting, and a balance of intimate and communal seating, the restaurant creates a welcoming atmosphere that celebrates culture while supporting functionality, comfort, and the overall dining experience.",
      blocks: [
        { heading: "The Client", text: "Georgian College provided the existing dining room as the setting for a proposed restaurant and bar renovation. The project required a functional commercial kitchen, dining for a minimum of 60 guests, an eight-seat bar, reception, and supporting guest and staff facilities." },
        { heading: "The Problem", text: "The existing dining room required a more cohesive design that balanced functionality, accessibility, and the overall guest experience. Working within the existing building presented challenges involving circulation, seating arrangements, structural limitations, and the connection between dining and service areas." },
        { heading: "The Goals", text: "The goal was to transform the existing dining room into a culturally immersive restaurant that remained comfortable, functional, and welcoming. The design focused on improving circulation, creating a variety of seating experiences, incorporating Moroccan cultural influences, and establishing a strong visual identity through materials, lighting, and architectural details." },
        { heading: "The Design Approach", text: "The approach focused on combining traditional Moroccan design elements with a more contemporary restaurant setting. Natural materials, decorative tile, warm lighting, and rich textures helped establish the atmosphere, while curved forms, architectural partitions, and varied seating arrangements supported both social interaction and intimate dining experiences." },
      ],
    },

    concept: {
      heading: "Concept Statement",
      text: "Moroccan Reverie draws inspiration from the warmth of the Moroccan desert, traditional architecture, and the country’s rich cultural identity. Through earthy tones, vibrant accents, intricate tilework, dark wood, and handcrafted brass lighting, the design creates a layered and immersive dining experience. The contrast between ornate detailing and contemporary forms allows the space to feel both culturally expressive and refined. Curved architectural features, soft partitions, and intimate seating arrangements establish a sense of enclosure within the larger dining area, while textures, lighting, and music work together to create an inviting atmosphere that encourages connection, comfort, and exploration.",
      statement: "",
      images: [
        { file: "assets/projects/project-03/concept/host-stand.jpg",    caption: "Host stand" },
        { file: "assets/projects/project-03/concept/booth-seating.jpg", caption: "Booth seating" },
        { file: "assets/projects/project-03/concept/tiled-bar.jpg",     caption: "Bar" },
        { file: "assets/projects/project-03/concept/arched-niche.jpg",  caption: "Arched niche" },
      ],
    },

    development: {
      blocks: [
        { heading: "01 — Research & Inspiration", text: "The design began with research into Moroccan culture, cuisine, and traditional architectural features, alongside restaurant precedents and environmental psychology. These studies informed the selection of materials, colours, lighting, and seating arrangements to create an immersive yet functional dining environment." },
        { heading: "02 — Space Planning & Exploration", text: "Initial block planning, floor plans, and elevations explored the relationship between dining, bar, kitchen, and circulation areas. The layout was developed to balance seating capacity with guest comfort, staff movement, and a variety of social and private dining experiences." },
        { heading: "03 — Design Refinement", text: "As the design progressed, materials, furnishings, and architectural details were refined to strengthen the Moroccan-inspired concept. The final design brought together curved partitions, decorative tilework, upholstered seating, and layered lighting to establish a cohesive identity throughout the restaurant." },
      ],
      stages: [
        { file: "assets/projects/project-03/drawings/build-plan-partition.png", caption: "Partition & millwork", fit: "contain" },
        { file: "assets/projects/project-03/drawings/build-plan-furniture.png", caption: "Furniture plan",       fit: "contain" },
      ],
    },

    drawings: [
      { file: "assets/projects/project-03/drawings/demolition-plan.png",                  caption: "Demolition plan" },
      { file: "assets/projects/project-03/drawings/partition-and-millwork-pandm.png",     caption: "Partition & millwork plan" },
      { file: "assets/projects/project-03/drawings/partition-and-millwork-furniture.png", caption: "Furniture plan" },
      { file: "assets/projects/project-03/drawings/finish-plan.png",                      caption: "Finish plan" },
      { file: "assets/projects/project-03/drawings/rcp.png",                              caption: "Reflected ceiling plan" },
      { file: "assets/projects/project-03/drawings/powerandcommunicationsplan.png",       caption: "Power & communications plan" },
      { file: "assets/projects/project-03/drawings/interior-elevations-and-details.png",  caption: "Interior elevations & details" },
    ],

    experience: [
      { file: "assets/projects/project-03/renders/01-view-7.jpg",  caption: "Dining Room" },
      { file: "assets/projects/project-03/renders/02-view-6.jpg",  caption: "Window Seating" },
      { file: "assets/projects/project-03/renders/03-view-5.jpg",  caption: "Host Stand" },
      { file: "assets/projects/project-03/renders/04-view-3.jpg",  caption: "Booth Seating" },
      { file: "assets/projects/project-03/renders/05-view-4.jpg",  caption: "Dining Room" },
      { file: "assets/projects/project-03/renders/06-view-11.jpg", caption: "The Bar" },
      { file: "assets/projects/project-03/renders/07-view-12.jpg", caption: "Bar Seating" },
      { file: "assets/projects/project-03/renders/08-view-13.jpg", caption: "Behind the Bar" },
      { file: "assets/projects/project-03/renders/09-view-20.jpg", caption: "Bar Counter" },
      { file: "assets/projects/project-03/renders/10-view-15.jpg", caption: "Lounge" },
      { file: "assets/projects/project-03/renders/11-view-17.jpg", caption: "Arched Niche" },
      { file: "assets/projects/project-03/renders/12-view-2.jpg",  caption: "Exterior" },
    ],
  },

  /* ======================= ALBUM FOUR ======================= */
  {
    id: "project-04",
    catalogue: "FPD—04",
    title: "ModuNest",
    subtitle: "The Future of Workplace Design",
    category: "Workplace",
    year: "2025",
    summary: "A future-forward, innovative office concept with multi-functional spaces, integrating finishes, technology, biophilic design, and workplace wellness strategies to balance focus, collaboration, and restoration.",
    credits: [
      ["Project", "ModuNest Corporate Office"],
      ["Software", "Revit, SketchUp, Twinmotion"],
      ["Year", "2025"],
      ["Type", "Workplace"],
    ],
    // On the turntable: clean, future-forward electronic music for calm
    // focus: soft arpeggios, a light beat, warm pads (see js/sound.js)
    sound: { style: "modern", key: "A", bpm: 100, chords: ["Am9", "Fmaj7", "Cmaj7", "G6"] },
    hero: "assets/projects/project-04/hero.jpg",
    cover: {
      layout: "silver-band",
      image: "assets/projects/project-04/renders/07-central-gathering-space.jpg",
      file: "",
    },

    brief: {
      heading: "Problem Statement",
      lead: "The current office environment negatively affects employee well-being and focus due to high noise levels, poor lighting, and a great lack of restorative spaces.",
      blocks: [],
    },

    concept: {
      heading: "Design Strategy",
      text: "The parti for ModuNest is built around the idea that an office should be more than just a place to work. It should be a place to feel well, connected, balanced, and grounded. Inspired by lots of research, including in-class research, discussions, and Miro Board studies, workplace wellness, biophilic designs, and emotional architecture supports the final design, which proposes a futuristic office built as if it were a minimized living ark, with a layered ecosystem of co-existence, where humans and animals cohabitate in collaboration and friendship. When looking at how the design came along through final research, a 2002 study by the National Center for Health Research showed that interacting with pets lowers stress, improves heart rate and blood pressure, and even enhances task performance, highlighting the real benefits of integrating animals into the workplace (Casciotti & Zuckerman, 2002). The concept is seen as both a conceptual and strategic framework of ideas, blending work, wellness, and care into a single adaptable system, which also reflects ModuNest’s mission of technology innovation. This is more than just an office space, it’s a living sanctuary, as well as a design strategy where architecture, empathy, and sustainability intersect, showing how spaces can both save and support both people and animals.",
      statement: "",
      images: [
        { file: "assets/projects/project-04/concept/key-research-future-forward.jpg",  caption: "Key research: “Future Forward”, key trends to watch" },
        { file: "assets/projects/project-04/concept/key-research-day-in-the-life.jpg", caption: "Key research: “Day in the life of the modern office”" },
        { file: "assets/projects/project-04/concept/initial-illustration-exterior.jpg", caption: "Initial visual illustration" },
        { file: "assets/projects/project-04/concept/initial-illustration-atrium.jpg",   caption: "Initial visual illustration" },
      ],
    },

    development: {
      // The key research findings ("Day in the life of the modern office")
      blocks: [
        { heading: "Exposure vs. Retreat", text: "Good workplaces balance exposure vs. retreat, giving people agency over when they’re “seen” and when they’re “hidden.”" },
        { heading: "Speed vs. Depth", text: "People need time sovereignty, the ability to modulate between high-speed tasks and slower, deeper work rhythms." },
        { heading: "Reflection of Self", text: "Workplaces are identity machines: they constantly signal inclusion, status, and recognition, or invisibility and exclusion." },
        { heading: "Emotional Landscape", text: "Offices aren’t neutral containers, they are emotional landscapes that drive how people feel about their work and themselves." },
        { heading: "Work to Live vs. Live to Work", text: "The boundary between work and life is porous; spaces that acknowledge this (communal meals, flexible rhythms, wellness cues) support human sustainability." },
      ],
      stages: [
        { file: "assets/projects/project-04/concept/journey-map.jpg",          caption: "Journey map",         fit: "contain" },
        { file: "assets/projects/project-04/drawings/floor-plan.png",          caption: "Floor plan",          fit: "contain" },
        { file: "assets/projects/project-04/drawings/floor-plan-rendered.png", caption: "Rendered floor plan", fit: "contain" },
      ],
    },

    drawings: [
      { file: "assets/projects/project-04/drawings/floor-plan.png",            caption: "Floor plan" },
      { file: "assets/projects/project-04/drawings/floor-plan-rendered.png",   caption: "Rendered floor plan" },
      { file: "assets/projects/project-04/drawings/ceiling-plan.png",          caption: "Ceiling plan" },
      { file: "assets/projects/project-04/drawings/ceiling-plan-rendered.png", caption: "Rendered ceiling plan" },
    ],

    // Captions are my best reading of each view: check and rename freely
    experience: [
      { file: "assets/projects/project-04/renders/02-reception.jpg",                 caption: "Reception" },
      { file: "assets/projects/project-04/renders/03-office-corridor.jpg",           caption: "Corridor to the offices" },
      { file: "assets/projects/project-04/renders/04-corridor-lounge.jpg",           caption: "Corridor lounge" },
      { file: "assets/projects/project-04/renders/05-private-offices.jpg",           caption: "Private offices" },
      { file: "assets/projects/project-04/renders/06-private-offices-2.jpg",         caption: "Private offices" },
      { file: "assets/projects/project-04/renders/07-central-gathering-space.jpg",   caption: "Central gathering space" },
      { file: "assets/projects/project-04/renders/08-tech-support-3d-printing.jpg",  caption: "Tech Support & 3D Printing" },
      { file: "assets/projects/project-04/renders/09-pet-room.jpg",                  caption: "View of 3D printing from Co-Existence Space" },
      { file: "assets/projects/project-04/renders/10-open-workstations.jpg",         caption: "Open workstations" },
      { file: "assets/projects/project-04/renders/11-board-room-tiered-seating.jpg", caption: "Board room & tiered seating" },
      { file: "assets/projects/project-04/renders/12-reception-2.jpg",               caption: "Reception" },
      { file: "assets/projects/project-04/renders/01-exterior-feature.jpg",          caption: "Exterior feature design" },
    ],
  },
];
