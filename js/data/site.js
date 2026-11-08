/* =====================================================================
   site.js — ABOUT YOU, CONTACT DETAILS, AND THE TWO SPECIAL ALBUMS
   ---------------------------------------------------------------------
   The Artist page (artist.html), the Let's Chat page (chat.html), the
   navigation and the footer all read from this file.

   Same editing rules as projects.js: change the words between the
   quote marks, keep the quotes and commas. Anything in [square
   brackets] is treated as a placeholder and never shown.
   ===================================================================== */

export const site = {

  /* ---------------- WHO YOU ARE ---------------- */
  name: "Carsen Lepine",
  role: "Interior Designer",
  brand: "Four Points Design",

  /* ---------------- CONTACT ---------------- */
  email: "carsenlepine@gmail.com",
  phone: "905-251-8010",
  linkedin: "https://www.linkedin.com/in/carsen-lepine-b16028386",

  /* ---------------- THE ARTIST (artist.html) ---------------- */
  portrait: "assets/portrait/portrait.jpg",
  portraitDescription: "Portrait of Carsen Lepine",
  // The résumé visitors can download
  resumePdf: "assets/documents/resume.pdf",

  // The opening paragraph (from your résumé's professional summary)
  introduction: "Motivated and creative fourth-year Interior Design student passionate about expanding my creative and technical skills while developing independence, confidence, and strong client collaboration. With hands-on experience in sustainable residential, hospitality, and retail projects, I strive to create innovative, functional, and meaningful spaces. I am particularly passionate about biophilic and community-based design, focusing on environments that enhance user experiences and overall wellbeing.",

  // Your design philosophy, one paragraph per line. The first is set
  // large in italics; any others follow in regular text.
  philosophy: [
    "I believe interior design is about more than creating beautiful spaces. It is about understanding how people live, move, interact, and feel within their environments. My approach combines creativity with functionality, focusing on thoughtful design solutions that enhance everyday experiences while reflecting the individuality of those who use them.",
    "I am passionate about creating spaces that encourage connection, support wellbeing, and respond naturally to human needs. Through intentional spatial planning, sustainable choices, and meaningful details, I strive to design environments that not only look beautiful but also have a lasting, positive impact on the people who experience them.",
  ],

  // Experience, most recent first. "points" are the bullet lines.
  experience: [
    {
      years: "Summer 2026",
      role: "Junior Design Assistant",
      organisation: "Firefly Cabinet Co.",
      place: "Lindsay, Ontario",
      points: [
        "Created working drawings for custom kitchens, closets, and cabinetry.",
        "Used Mozaik software for cabinetry layouts, plans, elevations, and details.",
        "Produced 3D renderings to communicate design concepts.",
        "Assisted with client meetings, material selections, and project coordination.",
        "Supported shop operations and cabinetry production.",
      ],
    },
    {
      years: "2026 – Present",
      role: "Sales Associate",
      organisation: "Winners",
      place: "Barrie, Ontario",
      points: [
        "Provided customer service and assisted with product inquiries.",
        "Operated cash registers and processed transactions.",
        "Received, organized, and stocked merchandise.",
        "Maintained sales floor displays and store organization.",
      ],
    },
    {
      years: "2024 – 2025",
      role: "Waitress",
      organisation: "72 Bolton",
      place: "Bobcaygeon, Ontario",
      points: ["Hostess · Customer service (phone & direct) · Waited tables · Bartender · Food runner"],
    },
    {
      years: "2022 – 2024",
      role: "Sales Associate",
      organisation: "Carter’s OshKosh",
      place: "Lindsay, Ontario",
      points: ["Cashier · Customer service (phone & direct) · Backstock · Opened select shipment"],
    },
  ],

  education: [
    { years: "2023 – Present", school: "Georgian College", place: "Barrie, Ontario", detail: "BA Interior Design" },
    { years: "2020 – 2023", school: "Uxbridge Secondary School", place: "Uxbridge, Ontario", detail: "Ontario Secondary School Diploma with Honours" },
    { years: "2017 – 2020", school: "Our Lady of the Lake", place: "Keswick, Ontario", detail: "" },
  ],

  software: ["AutoCAD", "Revit", "SketchUp", "Twinmotion", "Mozaik"],

  skills: [
    "Floorplans, details, millwork, elevations, sections, 3D models and renders",
    "Design research",
    "Sustainable design practice",
    "Creative problem solving",
    "Strong collaboration skills",
    "Strong communication",
    "Customer relation skills",
  ],

  // Smaller lists at the end of the liner notes. Empty [] hides one.
  extras: [
    { title: "Award", items: ["Napoleon Design Competition — Third Place, Best Portable Electric Heater"] },
    { title: "Certifications", items: ["Smart Serve Certificate", "Health and Safety Certificate"] },
    { title: "Interests", items: ["Photography", "Music", "Skiing", "Art & Design", "Cleaning and Organization"] },
  ],

  /* ---------------- LET'S CHAT (chat.html) ---------------- */
  chat: {
    heading: "Let’s Chat",
    // A short invitation I wrote as a starting point: change it freely
    invitation: "Whether it’s a project, a position, or a question about my work, I’d love to hear from you.",
  },

  /* ---------------- THE TWO SPECIAL ALBUMS IN THE CRATE ---------------- */
  // They sit behind the projects. "tracks" are printed on the back of
  // the sleeve. "cover" works like a project cover (layout, or your own
  // file).
  artistAlbum: {
    id: "artist",
    catalogue: "FPD—05",
    title: "The Artist",
    subtitle: "Carsen Lepine, Interior Designer",
    category: "Liner Notes",
    year: "",
    href: "artist.html",
    tracks: ["Introduction", "Philosophy", "Experience", "Education", "Software & Skills", "Résumé"],
    // On the turntable: mellow lo-fi keys (see js/sound.js)
    sound: { style: "lofi", key: "Eb", bpm: 76 },
    cover: { layout: "portrait-silver", image: "assets/portrait/portrait.jpg", file: "" },
  },
  chatAlbum: {
    id: "chat",
    catalogue: "FPD—06",
    title: "Let’s Chat",
    subtitle: "Get in touch",
    category: "Contact",
    year: "",
    href: "chat.html",
    tracks: ["Email", "Phone", "LinkedIn"],
    // On the turntable: a brighter, friendlier lo-fi groove
    sound: { style: "lofi", key: "Bb", bpm: 90 },
    cover: { layout: "type-only", image: "", file: "" },
  },
};
