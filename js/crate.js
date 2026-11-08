/* =====================================================================
   crate.js — THE 3D RECORD CRATE (homepage only)
   ---------------------------------------------------------------------
   Built with Three.js (js/vendor/three.module.js, loaded through the
   import map in index.html).

   What's in the scene:
     - a dark wooden crate with brushed-metal trim, on a softly lit
       floor that fades into the page background
     - one "album" per entry: a thin box (the sleeve) with the cover on
       the front and the track list on the back, and a record inside

   How browsing works (like flipping through real records):
     - one album is "current" (in front, facing you)
     - albums in front of it are flipped forward, towards you
     - albums behind it lean back
     - hover an album to flip to it; hover the current one and it lifts
       slightly while its record peeks out of the top
     - scroll, arrow keys and swipes flip too (handled here and in home.js)
     - click the current album (or Play): it lifts out, its record
       slides out of the sleeve and flies over to the TURNTABLE beside
       the crate (turntable.js), the camera follows, the tonearm swings
       over and the needle drops: the album "plays"

   On the turntable (the "listening" mode):
     - drag the record to scratch it (the music follows your hand)
     - click a groove on the record to move the needle to that track
     - click the tonearm to lift it (pause) or drop it again
     - eject: the motor winds down, the arm returns, and the record
       flies back into its sleeve
   home.js opens the album's page, at the track the needle is on.

   Everything moves with "damping": each frame, every value moves a
   fraction of the way towards its target, scaled by the time since the
   last frame (delta time), so the motion is the same speed on a 60 Hz
   laptop and a 120 Hz iPhone.

   createCrate(options) returns a small control object; see the bottom.
   ===================================================================== */

import * as THREE from "three";
import { drawCover, drawBack, drawRecord, trackBands } from "./covers.js";
import { coloursFor } from "./albums.js";
import { buildTurntable, yawForRadius, radiusForYaw, REST_YAW } from "./turntable.js";

/* Where the turntable stands, beside the crate */
const TURNTABLE_AT = new THREE.Vector3(6.1, 0, 0.35);
const SPIN = -(100 / 3 / 60) * Math.PI * 2;  // 33⅓ rpm, clockwise seen from above (radians per second)

/* ---------------- Sizes (in scene units, roughly feet) ---------------- */
const SLEEVE = 3.1;          // a sleeve is square: width = height
const THICK = 0.05;          // sleeve thickness
const RECORD_R = 1.47;       // record radius (a little smaller than the sleeve)
const CRATE = {
  width: 3.42,               // inside width (x)
  depth: 2.5,                // inside depth (z), front to back
  backHeight: 1.45,          // the back wall is taller …
  frontHeight: 0.72,         // … than the front, so the sides slope
  wall: 0.13,                // wall thickness
  base: 0.12,                // floor of the crate
};
const FRONT_Z = CRATE.depth / 2;   // inside face of the front wall
const BASE_Y = CRATE.base;         // where sleeves stand

/* ---------------- Browsing poses ----------------
   Angles are in radians: positive tips the top towards the camera. */
const POSE = {
  flippedAngle: 1.0,         // albums in front of the current one lie forward over the front edge
  flippedStep: 0.06,         // each one higher in the pile tips a little less
  flippedFirstZ: 0.32,       // where the first flipped sleeve stands
  flippedGap: 0.08,          // spacing between flipped sleeves
  currentGap: 0.42,          // space opened up in front of the current album
  firstCurrentZ: 0.05,       // where the current album stands when nothing is flipped
  currentAngle: -0.3,        // the current album leans back, facing up at you
  behindGap: 0.2,
  behindStep: 0.13,
  behindAngle: -0.36,
  behindAngleStep: -0.035,
  hoverLift: 0.32,           // how far the current album rises on hover
  recordPeek: 0.78,          // how far its record slides up out of the top
};

/* Moves `value` towards `target`; higher `speed` = snappier. */
function damp(value, target, speed, dt) {
  return value + (target - value) * (1 - Math.exp(-speed * dt));
}
function clamp01(t) { return Math.min(1, Math.max(0, t)); }
function easeInOut(t) { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

/* Can this browser draw WebGL at all? */
export function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch (error) {
    return false;
  }
}

/* =====================================================================
   PROCEDURAL TEXTURES (drawn once with Canvas: nothing to download)
   ===================================================================== */

function canvasTexture(canvas, { srgb = true, repeat = null } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}

/* Dark walnut: long wavy grain lines over a deep brown. */
function woodCanvas(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#2b1c15";
  ctx.fillRect(0, 0, size, size);
  let seed = 4;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i += 1) {
    const y = random() * size;
    const dark = random() > 0.45;
    ctx.strokeStyle = dark ? `rgba(14,8,6,${0.25 + random() * 0.4})` : `rgba(92,62,44,${0.12 + random() * 0.22})`;
    ctx.lineWidth = 0.6 + random() * 2.2;
    const wave = 2 + random() * 6;
    const freq = 0.004 + random() * 0.01;
    const phase = random() * 10;
    ctx.beginPath();
    for (let x = -4; x <= size + 4; x += 8) {
      const yy = y + Math.sin(x * freq + phase) * wave;
      if (x < 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  return canvas;
}

/* Brushed metal: fine horizontal streaks. */
function brushedCanvas(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#b9bec2";
  ctx.fillRect(0, 0, size, size);
  let seed = 9;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i += 1) {
    const shade = Math.round(150 + random() * 90);
    ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 6},0.35)`;
    ctx.fillRect(random() * size - 40, random() * size, 40 + random() * 180, 1);
  }
  return canvas;
}

/* A soft round pool: white in the middle, fading to nothing.
   Used as the floor's transparency (so it melts into the page) and,
   darker, as the soft contact shadow under the crate. */
function radialCanvas(size, stops) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, colour]) => gradient.addColorStop(at, colour));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/* The small brushed plate on the front of the crate. */
function plateCanvas(text) {
  const canvas = brushedCanvas(512);
  const scaled = document.createElement("canvas");
  scaled.width = 512;
  scaled.height = 128;
  const ctx = scaled.getContext("2d");
  ctx.drawImage(canvas, 0, 0, 512, 128);
  ctx.fillStyle = "rgba(30,28,30,0.78)";
  ctx.font = '400 30px "Source Sans 3", "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const spaced = text.toUpperCase().split("").join("  ");
  ctx.fillText(spaced, 256, 66);
  return scaled;
}

/* A tiny studio, rendered once into an environment map, so the metal
   and the glossy sleeves have something soft to reflect. */
function buildEnvironment(renderer) {
  const envScene = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0x1c1819, side: THREE.BackSide })
  );
  envScene.add(room);
  const panel = (w, h, colour, strength, position, lookAt) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(strength), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(...position);
    mesh.lookAt(...lookAt);
    envScene.add(mesh);
  };
  panel(8, 4, 0xfff1e2, 3.2, [-3, 8, 4], [0, 0, 0]);   // warm softbox above-left
  panel(5, 6, 0xdfe6ec, 1.1, [9, 3, 0], [0, 0, 0]);    // cool fill, right
  panel(6, 2, 0xffe6cc, 0.8, [0, 2, -9], [0, 0, 0]);   // rim, behind
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  envScene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return target;
}

/* =====================================================================
   THE CRATE
   ===================================================================== */

/* -π … π */
function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
function bezier(out, a, b, c, t) {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    u * u * a.y + 2 * u * t * b.y + t * t * c.y,
    u * u * a.z + 2 * u * t * b.z + t * t * c.z
  );
}

export function createCrate(options) {
  const {
    container,                // element the canvas goes into
    albums,                   // from albums.js
    startIndex = 0,
    reducedMotion = false,
    onChange = () => {},      // (index) the current album changed
    onListen = () => {},      // (state, album) "loading" | "playing" | "ejecting" | "browse"
    onNeedle = () => {},      // (trackIndex or null, album) the needle landed on a track / lifted
    onRate = () => {},        // (rate, held) every frame while a record is on: how fast it turns (1 = normal)
    onSettle = () => {},      // the record landed on the platter
    debugFast = false,        // tests only: let time run at full speed on a very slow machine
  } = options;

  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 600;
  const maxStep = debugFast ? 0.35 : 0.05;

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const envTarget = buildEnvironment(renderer);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 80);

  // Everything we create, so it can all be freed when the page closes
  const disposables = new Set();
  const keep = (thing) => { disposables.add(thing); return thing; };

  /* ---------- Lights ---------- */
  scene.add(new THREE.HemisphereLight(0xf6ece0, 0x1a1415, 0.85));

  const key = new THREE.SpotLight(0xfff0de, 3.4, 0, 0.62, 0.85, 0);
  key.position.set(-3.2, 10, 6.5);
  key.target.position.set(0, 0.8, 0.4);
  key.castShadow = true;
  key.shadow.mapSize.set(isSmall ? 512 : 1024, isSmall ? 512 : 1024);
  key.shadow.camera.near = 5;
  key.shadow.camera.far = 22;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);

  // a second warm lamp over the turntable
  const lamp = new THREE.SpotLight(0xffe8d2, 4.4, 0, 0.5, 0.8, 0);
  lamp.position.set(TURNTABLE_AT.x - 1.6, 9.5, TURNTABLE_AT.z + 5.5);
  lamp.target.position.set(TURNTABLE_AT.x - 0.3, 0.3, TURNTABLE_AT.z);
  lamp.castShadow = !isSmall;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.camera.near = 5;
  lamp.shadow.camera.far = 20;
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.03;
  scene.add(lamp, lamp.target);

  const fill = new THREE.DirectionalLight(0xd6dee6, 0.55);
  fill.position.set(7, 4, 3);
  scene.add(fill);

  /* ---------- Floor: a soft pool of light fading into the page ---------- */
  const floorAlpha = keep(canvasTexture(radialCanvas(256, [[0, "#ffffff"], [0.35, "#bdbdbd"], [0.7, "#3a3a3a"], [1, "#000000"]]), { srgb: false }));
  const floor = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(34, 30)),
    keep(new THREE.MeshStandardMaterial({ color: 0x2e2627, roughness: 1, metalness: 0, transparent: true, alphaMap: floorAlpha, depthWrite: false, dithering: true }))
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(TURNTABLE_AT.x / 2, 0, 0.6);
  floor.receiveShadow = true;
  scene.add(floor);

  const contactTexture = keep(canvasTexture(radialCanvas(128, [[0, "rgba(0,0,0,0.75)"], [0.55, "rgba(0,0,0,0.45)"], [1, "rgba(0,0,0,0)"]])));
  const contactMaterial = keep(new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false }));
  const contact = new THREE.Mesh(keep(new THREE.PlaneGeometry(CRATE.width + 1.6, CRATE.depth + 1.6)), contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.004;
  scene.add(contact);
  const contactTT = new THREE.Mesh(keep(new THREE.PlaneGeometry(5.8, 4.8)), contactMaterial);
  contactTT.rotation.x = -Math.PI / 2;
  contactTT.position.set(TURNTABLE_AT.x, 0.004, TURNTABLE_AT.z);
  scene.add(contactTT);

  /* ---------- The crate: wood + brushed metal ---------- */
  const woodMaterial = keep(new THREE.MeshStandardMaterial({
    map: keep(canvasTexture(woodCanvas(), { repeat: [1, 1] })),
    color: 0xd8c8bc,
    roughness: 0.72,
    metalness: 0,
  }));
  const sideWoodMaterial = keep(new THREE.MeshStandardMaterial({
    map: keep(canvasTexture(woodCanvas(), { repeat: [0.42, 0.42] })),
    color: 0xd8c8bc,
    roughness: 0.72,
    metalness: 0,
  }));
  const brushed = keep(canvasTexture(brushedCanvas(), { repeat: [2, 1] }));
  const metalMaterial = keep(new THREE.MeshStandardMaterial({
    color: 0xc4c9cd,
    map: brushed,
    metalness: 0.92,
    roughness: 0.36,
    envMapIntensity: 1.4,
  }));

  const crate = new THREE.Group();
  scene.add(crate);
  const outerW = CRATE.width + CRATE.wall * 2;
  const outerD = CRATE.depth + CRATE.wall * 2;

  const addBox = (w, h, d, x, y, z, material, group = crate) => {
    const mesh = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // base, front wall, back wall
  addBox(outerW, CRATE.base, outerD, 0, CRATE.base / 2, 0, woodMaterial);
  addBox(outerW, CRATE.frontHeight, CRATE.wall, 0, CRATE.frontHeight / 2, FRONT_Z + CRATE.wall / 2, woodMaterial);
  addBox(outerW, CRATE.backHeight, CRATE.wall, 0, CRATE.backHeight / 2, -FRONT_Z - CRATE.wall / 2, woodMaterial);

  // the two sloping sides (a four-sided shape, extruded to the wall thickness)
  const sideShape = new THREE.Shape();
  sideShape.moveTo(-outerD / 2, 0);
  sideShape.lineTo(outerD / 2, 0);
  sideShape.lineTo(outerD / 2, CRATE.frontHeight);
  sideShape.lineTo(-outerD / 2, CRATE.backHeight);
  sideShape.closePath();
  const sideGeometry = keep(new THREE.ExtrudeGeometry(sideShape, { depth: CRATE.wall, bevelEnabled: false }));
  [-1, 1].forEach((side) => {
    const wall = new THREE.Mesh(sideGeometry, sideWoodMaterial);
    // the shape is drawn in (z, y); turn it so its length runs front to back
    wall.rotation.y = -Math.PI / 2;
    wall.position.x = side * (CRATE.width / 2) + (side > 0 ? CRATE.wall : 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    crate.add(wall);

    // brushed trim along the sloping top edge
    const rise = CRATE.backHeight - CRATE.frontHeight;
    const length = Math.hypot(outerD, rise);
    const trim = addBox(CRATE.wall + 0.03, 0.035, length, side * (CRATE.width / 2 + CRATE.wall / 2), (CRATE.backHeight + CRATE.frontHeight) / 2 + 0.017, 0, metalMaterial);
    trim.rotation.x = Math.atan2(rise, outerD);

    // a handle bar on each side
    const handle = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 16)), metalMaterial);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(side * (outerW / 2 + 0.07), CRATE.frontHeight * 0.72, -0.1);
    handle.castShadow = true;
    crate.add(handle);
    [-0.36, 0.36].forEach((dz) => addBox(0.08, 0.05, 0.05, side * (outerW / 2 + 0.035), CRATE.frontHeight * 0.72, -0.1 + dz, metalMaterial));
  });

  // trim on the front and back tops, and on the four corners
  addBox(outerW + 0.03, 0.035, CRATE.wall + 0.03, 0, CRATE.frontHeight + 0.017, FRONT_Z + CRATE.wall / 2, metalMaterial);
  addBox(outerW + 0.03, 0.035, CRATE.wall + 0.03, 0, CRATE.backHeight + 0.017, -FRONT_Z - CRATE.wall / 2, metalMaterial);
  [[-1, 1, CRATE.frontHeight], [1, 1, CRATE.frontHeight], [-1, -1, CRATE.backHeight], [1, -1, CRATE.backHeight]].forEach(([sx, sz, h]) => {
    addBox(0.05, h, 0.05, sx * (outerW / 2 + 0.005), h / 2, sz * (outerD / 2 + 0.005), metalMaterial);
  });

  // the name plate on the front
  const plate = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(1.1, 0.275)),
    keep(new THREE.MeshStandardMaterial({ map: keep(canvasTexture(plateCanvas("Four Points Design"))), metalness: 0.85, roughness: 0.4, envMapIntensity: 1.3 }))
  );
  plate.position.set(0, CRATE.frontHeight * 0.52, outerD / 2 + 0.003);
  crate.add(plate);

  /* ---------- The turntable ---------- */
  const turntable = buildTurntable({
    keep,
    woodMaterial: keep(new THREE.MeshStandardMaterial({ map: keep(canvasTexture(woodCanvas(), { repeat: [0.24, 0.24] })), color: 0xd8c8bc, roughness: 0.6, metalness: 0 })),
    metalMaterial,
    badgeTexture: keep(canvasTexture(plateCanvas("33 ⅓  ·  FPD"))),
    shadows: true,
  });
  turntable.group.position.copy(TURNTABLE_AT);
  scene.add(turntable.group);
  scene.updateMatrixWorld(true);

  /* ---------- The albums ---------- */
  const sleeveGeometry = keep(new THREE.BoxGeometry(SLEEVE, SLEEVE, THICK));
  const recordGeometry = keep(new THREE.CylinderGeometry(RECORD_R, RECORD_R, 0.014, 72, 1));
  const recordEdge = keep(new THREE.MeshStandardMaterial({ color: 0x0b0a0a, roughness: 0.4 }));

  const items = albums.map((album, index) => {
    const colours = coloursFor(album);
    // Plain colour until the real cover is drawn (a moment later)
    const front = keep(new THREE.MeshStandardMaterial({ color: colours.ground, roughness: 0.55 }));
    const back = keep(new THREE.MeshStandardMaterial({ color: colours.ground, roughness: 0.65 }));
    const edge = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(colours.ground).multiplyScalar(0.7), roughness: 0.7 }));
    // a box has six faces: +x, -x, +y, -y, +z (front), -z (back)
    const sleeve = new THREE.Mesh(sleeveGeometry, [edge, edge, edge, edge, front, back]);
    sleeve.position.y = SLEEVE / 2; // the group's origin is the sleeve's bottom edge
    sleeve.castShadow = true;
    sleeve.receiveShadow = true;
    sleeve.userData.index = index;

    const recordTop = keep(new THREE.MeshStandardMaterial({ color: 0x111010, roughness: 0.32, metalness: 0.1 }));
    const record = new THREE.Mesh(recordGeometry, [recordEdge, recordTop, recordTop]);
    record.rotation.x = Math.PI / 2; // stand it up, facing the same way as the cover
    record.position.y = SLEEVE / 2;
    record.castShadow = true;
    record.userData.index = index;

    const group = new THREE.Group();
    group.add(sleeve, record);
    scene.add(group);

    return {
      album, index, group, sleeve, record, front, back, recordTop,
      bands: trackBands((album.tracks || []).length),
      away: false,       // true while its record is out of the sleeve
      receiving: false,  // true while it lifts to take its record back
      // animated values
      z: 0, angle: 0, lift: 0, peek: 0,
    };
  });

  /* Draw the real covers, backs and records (in the background) */
  let disposed = false;
  (async () => {
    for (const item of items) {
      const [coverCanvas, backCanvas, recordCanvas] = await Promise.all([
        drawCover(item.album, 1024),
        drawBack(item.album, 512),
        drawRecord(item.album, 1024),
      ]);
      if (disposed) return;
      const apply = (material, canvasSource) => {
        const texture = keep(canvasTexture(canvasSource));
        texture.anisotropy = maxAnisotropy;
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
      };
      apply(item.front, coverCanvas);
      apply(item.back, backCanvas);
      apply(item.recordTop, recordCanvas);
    }
  })();

  /* ---------- Browsing state ---------- */
  let current = Math.max(0, Math.min(items.length - 1, startIndex));
  let hoverIndex = -1;        // album under the mouse
  let hoverSince = 0;
  let cooldownUntil = 0;      // ignore hover flips just after a flip
  let peekCurrent = isCoarse; // touch screens: the current record always peeks

  /* ---------- Turntable state ---------- */
  let mode = "browse";        // browse | loading | playing | ejecting
  let deckItem = null;        // the album whose record is on (or flying to) the turntable
  let flight = null;          // the record's journey to or from the turntable
  let pendingPlay = -1;       // an album to play once the current one is back in its sleeve
  let motorOn = false;
  let platterSpeed = 0;       // radians per second
  let platterAngle = 0;
  let recordSpeed = 0;        // the record can be held back or pushed (scratching)
  let recordAngle = 0;
  let held = null;            // a hand on the record
  const arm = { yaw: REST_YAW, lift: 0, liftTarget: 0, task: null, down: false, track: -1 };
  let viewBlend = 0;          // camera: 0 = the crate, 1 = the turntable
  let viewTarget = 0;
  let hidden = false;         // a page covers the scene: keep the record turning, skip drawing

  /* Where every album should be, for the current album `c` */
  function targetsFor(c) {
    return items.map((item, k) => {
      if (k < c) {
        // in front: flipped forward, resting on each other
        const pileIndex = k;
        return {
          z: POSE.flippedFirstZ - pileIndex * POSE.flippedGap,
          angle: POSE.flippedAngle - pileIndex * POSE.flippedStep,
        };
      }
      const currentZ = POSE.flippedFirstZ - Math.max(0, c - 1) * POSE.flippedGap - (c > 0 ? POSE.currentGap : POSE.flippedFirstZ - POSE.firstCurrentZ);
      if (k === c) return { z: currentZ, angle: POSE.currentAngle };
      const j = k - c - 1;
      return {
        z: Math.max(-FRONT_Z + 0.35, currentZ - POSE.behindGap - j * POSE.behindStep),
        angle: POSE.behindAngle + j * POSE.behindAngleStep,
      };
    });
  }

  // Start already in place (no animation on load)
  targetsFor(current).forEach((t, k) => { items[k].z = t.z; items[k].angle = t.angle; });

  function setIndex(index) {
    const next = Math.max(0, Math.min(items.length - 1, index));
    if (next === current) return;
    // while a record flies out of its sleeve, the crate stays put
    if (flight && flight.kind === "in" && flight.t < 0.75) return;
    current = next;
    cooldownUntil = performance.now() + 420;
    onChange(current);
  }

  /* ---------- Camera framing ---------- */
  const views = {
    crate: { target: new THREE.Vector3(0.75, 1.2, 0.25), azimuth: THREE.MathUtils.degToRad(24), elevation: THREE.MathUtils.degToRad(38), distance: 14 },
    deck: {
      target: new THREE.Vector3(TURNTABLE_AT.x - 0.15, 0.5, TURNTABLE_AT.z + 0.1),
      azimuth: THREE.MathUtils.degToRad(12),
      elevation: THREE.MathUtils.degToRad(50),
      distance: 12,
    },
  };
  const view = { shift: 0, parallaxX: 0, parallaxY: 0 };
  const pointerTarget = { x: 0, y: 0 };
  const lookTarget = new THREE.Vector3();

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;

    // Wide screens: the text sits on the left, so the scene moves right
    const wide = width >= 900 && width / height >= 1;
    view.shift = wide ? 0.34 : 0;

    // Step back until the whole crate (and the album lifting out of it)
    // fits, whatever the shape of the screen. Same for the turntable.
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const usableH = wide ? hfov * (1 - view.shift) * 1.12 : hfov;
    const fitFov = Math.min(vfov, usableH);
    views.crate.distance = (3.2 / Math.sin(fitFov / 2)) * (wide ? 1.0 : 0.94);
    views.deck.distance = (3.0 / Math.sin(fitFov / 2)) * (wide ? 1.0 : 0.92);
    camera.updateProjectionMatrix();
    applyShift();
  }

  // Shift the picture sideways without turning the camera (a "lens
  // shift", like an architectural camera), so lines stay straight.
  function applyShift() {
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] -= view.shift;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function placeCamera() {
    const b = easeInOut(viewBlend);
    const a = views.crate;
    const d = views.deck;
    lookTarget.lerpVectors(a.target, d.target, b);
    const az = THREE.MathUtils.lerp(a.azimuth, d.azimuth, b) + view.parallaxX;
    const el = THREE.MathUtils.lerp(a.elevation, d.elevation, b) + view.parallaxY;
    // travelling between the two, the camera rises a little
    const distance = THREE.MathUtils.lerp(a.distance, d.distance, b) * (1 + Math.sin(b * Math.PI) * 0.12);
    camera.position.set(
      lookTarget.x + distance * Math.sin(az) * Math.cos(el),
      lookTarget.y + distance * Math.sin(el),
      lookTarget.z + distance * Math.cos(az) * Math.cos(el)
    );
    camera.lookAt(lookTarget);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  placeCamera();

  /* ---------- Pointer: hover, click, swipe, scratch, parallax ---------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(9, 9);
  let pointerInside = false;
  let pointerDirty = false;
  const recordPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const tmpHit = new THREE.Vector3();
  const seatWorld = new THREE.Vector3();
  turntable.spinner.getWorldPosition(seatWorld);
  recordPlane.constant = -(seatWorld.y + 0.007);

  function aim(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  /* What is under the pointer?
     { kind: "album", index } | { kind: "record" } | { kind: "arm" } | { kind: "deck" } | null */
  function pickAt(clientX, clientY) {
    aim(clientX, clientY);
    const targets = [turntable.armHit, ...turntable.deckMeshes];
    items.forEach((item) => {
      targets.push(item.sleeve);
      if (!item.away || item === deckItem) targets.push(item.record);
    });
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    const object = hit.object;
    if (deckItem && object === deckItem.record && deckItem.away && !flight) return { kind: "record", point: hit.point };
    if (object === turntable.armHit) return { kind: "arm" };
    if (turntable.deckMeshes.includes(object)) return { kind: "deck" };
    if (object.userData.index !== undefined) return { kind: "album", index: object.userData.index };
    return null;
  }

  /* Pointer angle around the spindle, and distance from it (on the record's surface) */
  function recordPolar(clientX, clientY) {
    aim(clientX, clientY);
    if (!raycaster.ray.intersectPlane(recordPlane, tmpHit)) return null;
    const dx = tmpHit.x - seatWorld.x;
    const dz = tmpHit.z - seatWorld.z;
    // the same direction convention as rotation.y
    return { angle: Math.atan2(-dz, dx), radius: Math.hypot(dx, dz) };
  }

  let lastMouse = null;
  let hoverKind = null;
  function onPointerMove(event) {
    // gentle camera parallax follows the mouse anywhere on the page
    if (event.pointerType === "mouse") {
      pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = (event.clientY / window.innerHeight) * 2 - 1;
    }
    if (event.pointerType === "mouse" && event.target === canvas) {
      lastMouse = { x: event.clientX, y: event.clientY };
      pointerInside = true;
      pointerDirty = true;
    }
  }
  function onPointerLeave() {
    pointerInside = false;
    hoverIndex = -1;
    setCursor(null);
  }
  function setCursor(kind) {
    hoverKind = kind;
    const stage = canvas.parentElement;
    stage.classList.toggle("is-pointer", kind === "album" || kind === "arm" || kind === "deck");
    stage.classList.toggle("is-grab", kind === "record");
    stage.classList.toggle("is-grabbing", kind === "grabbing");
  }

  let down = null;
  function onPointerDown(event) {
    // swipeX: where the finger was at the last flip (a long drag can flip several)
    down = { x: event.clientX, y: event.clientY, swipeX: event.clientX, swiped: false, type: event.pointerType, time: performance.now(), hit: null };
    if (mode === "playing") {
      const hit = pickAt(event.clientX, event.clientY);
      down.hit = hit;
      if (hit && hit.kind === "record") {
        const polar = recordPolar(event.clientX, event.clientY);
        if (polar) {
          held = { angle: polar.angle, delta: 0, travelled: 0 };
          try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* fine */ }
          setCursor("grabbing");
          event.preventDefault();
        }
      }
    }
  }
  // A sideways swipe flips as soon as the finger has moved far enough
  // (left = next album). Up/down movement is left to the page's scrolling.
  function onCanvasPointerMove(event) {
    if (held) {
      const polar = recordPolar(event.clientX, event.clientY);
      if (!polar) return;
      const delta = wrapAngle(polar.angle - held.angle);
      held.angle = polar.angle;
      held.delta += delta;
      held.travelled += Math.abs(delta);
      recordAngle += delta;
      return;
    }
    if (!down || down.type === "mouse" || mode !== "browse") return;
    const dx = event.clientX - down.swipeX;
    const dy = event.clientY - down.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      setIndex(current + (dx < 0 ? 1 : -1));
      down.swipeX = event.clientX;
      down.swiped = true;
    }
  }
  function onPointerUp(event) {
    const start = down;
    down = null;
    if (held) {
      const wasTap = held.travelled < 0.06 && start && performance.now() - start.time < 400;
      held = null;
      setCursor("record");
      // a tap on the record (not a scratch): move the needle to that groove
      if (wasTap) {
        const polar = recordPolar(event.clientX, event.clientY);
        if (polar) needleToRadius(polar.radius);
      }
      return;
    }
    if (!start || start.swiped) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) >= 10) return; // a drag, not a click

    const hit = start.hit || pickAt(event.clientX, event.clientY);
    if (!hit) return;
    if (mode === "browse") {
      if (hit.kind === "album") {
        if (hit.index === current) play(current);
        else setIndex(hit.index);
      } else if (hit.kind === "deck" || hit.kind === "arm") {
        play(current); // clicking the turntable plays the front album
      }
    } else if (mode === "playing") {
      if (hit.kind === "arm") togglePause();
      else if (hit.kind === "album") play(hit.index); // swap records
    }
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onCanvasPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", () => {
    down = null;
    held = null;
  });

  /* =====================================================================
     THE TONEARM
     It moves in small steps: lift → swing → lower. A new request
     simply replaces the old one (from wherever the arm is).
     ===================================================================== */
  function trackRadius(item, track) {
    const band = item.bands[Math.max(0, Math.min(item.bands.length - 1, track))];
    return (band.outer - 0.012) * RECORD_R; // just inside the start of the track
  }
  function trackAtRadius(item, radius) {
    const frac = radius / RECORD_R;
    let best = 0;
    item.bands.forEach((band, i) => { if (frac <= band.outer + 0.02) best = i; });
    return best;
  }

  function liftNeedle() {
    if (arm.down) {
      arm.down = false;
      onNeedle(null, deckItem ? deckItem.album : null);
    }
  }

  function armTo(track) {
    // track: a track number, or "rest"
    if (!deckItem && track !== "rest") return;
    liftNeedle();
    const yaw = track === "rest" ? REST_YAW : yawForRadius(trackRadius(deckItem, track));
    arm.task = { phase: "up", yaw, lower: track !== "rest", track: track === "rest" ? -1 : track };
    if (reducedMotion) {
      arm.yaw = yaw;
      arm.lift = arm.liftTarget = 0;
      finishArm();
    }
  }
  function finishArm() {
    const task = arm.task;
    arm.task = null;
    if (task.lower && deckItem && mode === "playing") {
      arm.down = true;
      arm.track = task.track;
      onNeedle(task.track, deckItem.album);
    }
  }

  function needleToRadius(radius) {
    if (mode !== "playing") return;
    armTo(trackAtRadius(deckItem, radius));
  }

  function togglePause() {
    if (mode !== "playing") return;
    if (arm.down || (arm.task && arm.task.lower)) {
      // lift the arm where it is
      liftNeedle();
      arm.task = { phase: "up", yaw: arm.yaw, lower: false, track: -1, hold: true };
    } else {
      // drop it again on whichever track it's over (or the first)
      const r = radiusForYaw(arm.yaw);
      const onRecord = r < RECORD_R * 0.97 && r > RECORD_R * 0.38;
      armTo(onRecord ? trackAtRadius(deckItem, r) : 0);
    }
  }

  function updateArm(dt) {
    const task = arm.task;
    if (task) {
      if (task.phase === "up") {
        arm.liftTarget = 1;
        if (arm.lift > 0.93) task.phase = "swing";
      }
      if (task.phase === "swing") {
        // constant speed with a soft finish
        const diff = task.yaw - arm.yaw;
        const step = Math.sign(diff) * Math.min(Math.abs(diff), dt * (0.25 + Math.abs(diff) * 3.2));
        arm.yaw += step;
        if (Math.abs(task.yaw - arm.yaw) < 0.0015) {
          arm.yaw = task.yaw;
          task.phase = task.lower ? "down" : "done";
        }
      }
      if (task.phase === "down") {
        arm.liftTarget = 0;
        if (arm.lift < 0.04) {
          arm.lift = 0;
          finishArm();
        }
      } else if (task.phase === "done") {
        arm.liftTarget = task.hold ? 1 : 0;
        if (task.hold || arm.lift < 0.04) arm.task = null;
      }
    } else if (arm.down && deckItem && arm.glide !== undefined) {
      // gliding to another track without lifting (the music crossfades)
      arm.yaw = damp(arm.yaw, arm.glide, 3, dt);
      if (Math.abs(arm.yaw - arm.glide) < 0.002) arm.glide = undefined;
    } else if (arm.down && deckItem) {
      // while playing, the needle slowly travels inwards along the groove
      const band = deckItem.bands[arm.track] || deckItem.bands[0];
      const r = radiusForYaw(arm.yaw) - dt * 0.004 * Math.max(0, recordSpeed / SPIN);
      arm.yaw = yawForRadius(Math.max((band.inner + 0.01) * RECORD_R, r));
    }
    arm.lift = damp(arm.lift, arm.liftTarget, 7, dt);
    turntable.setArm(arm.yaw, arm.lift);
  }

  /* =====================================================================
     PUTTING A RECORD ON, AND TAKING IT OFF
     ===================================================================== */
  const tmpVec = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const standUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

  function play(index = current) {
    index = Math.max(0, Math.min(items.length - 1, index));
    if (flight) { pendingPlay = index; return; }
    if (index !== current) {
      current = index;
      onChange(current);
    }
    const item = items[index];
    if (deckItem === item) return;     // already on
    if (deckItem) {                    // another record is on: put it away first
      pendingPlay = index;
      eject();
      return;
    }
    deckItem = item;
    mode = "loading";
    viewTarget = 1;
    onListen("loading", item.album);
    setCursor(null);

    if (reducedMotion) {
      // no flying: the record is simply there
      item.away = true;
      turntable.spinner.add(item.record);
      item.record.position.set(0, 0, 0);
      item.record.rotation.set(0, 0, 0);
      viewBlend = 1;
      land();
      return;
    }
    flight = {
      kind: "in",
      item,
      t: 0,
      startY: item.lift,
      startZ: item.z,
      startAngle: item.angle,
      startPeek: item.peek,
    };
  }

  function land() {
    mode = "playing";
    motorOn = true;
    onSettle();
    onListen("playing", deckItem.album);
    armTo(0);
  }

  function eject() {
    if (!deckItem || flight) return;
    if (mode !== "playing") return;
    mode = "ejecting";
    held = null;
    onListen("ejecting", deckItem.album);
    if (reducedMotion) {
      motorOn = false;
      platterSpeed = recordSpeed = 0;
      liftNeedle();
      arm.task = null;
      arm.yaw = REST_YAW;
      arm.lift = arm.liftTarget = 0;
      putBack(deckItem);
      viewBlend = 0;
      viewTarget = 0;
      done();
      return;
    }
    // the motor stops first (with the needle still down, the music
    // winds down), then the arm returns and the record flies home
    motorOn = false;
    flight = { kind: "out", item: deckItem, t: 0, stage: 0 };
  }

  /* No animation: the old record goes back, the new one is on, needle down */
  function swapNow(index, track) {
    index = Math.max(0, Math.min(items.length - 1, index));
    const item = items[index];
    if (flight) {
      // finish whatever was flying, instantly
      const f = flight;
      flight = null;
      if (f.item !== item) putBack(f.item);
    }
    if (deckItem && deckItem !== item) putBack(deckItem);
    pendingPlay = -1;
    if (index !== current) {
      current = index;
      onChange(current);
    }
    deckItem = item;
    item.away = true;
    item.receiving = false;
    turntable.spinner.add(item.record);
    item.record.position.set(0, 0, 0);
    item.record.rotation.set(0, 0, 0);
    mode = "playing";
    motorOn = true;
    platterSpeed = recordSpeed = SPIN;
    viewBlend = viewTarget = 1;
    arm.task = null;
    arm.glide = undefined;
    arm.track = Math.max(0, Math.min(item.bands.length - 1, track));
    arm.yaw = yawForRadius(trackRadius(item, arm.track));
    arm.lift = arm.liftTarget = 0;
    arm.down = true;
    onListen("playing", item.album);
  }

  function putBack(item) {
    item.group.add(item.record);
    item.record.position.set(0, SLEEVE / 2, 0);
    item.record.rotation.set(Math.PI / 2, 0, 0);
    item.away = false;
    item.receiving = false;
  }

  function done() {
    deckItem = null;
    mode = "browse";
    onListen("browse", null);
    if (pendingPlay >= 0) {
      const next = pendingPlay;
      pendingPlay = -1;
      setTimeout(() => play(next), 120);
    }
  }

  function updateFlight(dt) {
    const f = flight;
    f.t += dt;
    const { item } = f;
    const t = f.t;

    if (f.kind === "in") {
      if (!f.detached) {
        // 1. the album rises out of the crate, standing upright; its record slides up
        const a = easeInOut(t / 0.5);
        item.lift = THREE.MathUtils.lerp(f.startY, 0.75, a);
        item.z = THREE.MathUtils.lerp(f.startZ, f.startZ + 0.35, a);
        item.angle = THREE.MathUtils.lerp(f.startAngle, 0, a);
        item.peek = THREE.MathUtils.lerp(f.startPeek, SLEEVE * 0.92, easeInOut((t - 0.15) / 0.55));
        item.group.position.set(0, BASE_Y + item.lift, item.z);
        item.group.rotation.set(item.angle, 0, 0);
        item.record.position.set(0, SLEEVE / 2 + item.peek, 0);
        if (t >= 0.72) {
          // 2. the record leaves the sleeve (the sleeve settles back into the crate)
          item.away = true;
          item.peek = 0;
          scene.attach(item.record);
          f.detached = true;
          f.from = item.record.position.clone();
          f.fromQ = item.record.quaternion.clone();
          f.t0 = t;
          turntable.spinner.getWorldQuaternion(tmpQuat);
          f.toQ = tmpQuat.clone();
          f.hover = seatWorld.clone().add(new THREE.Vector3(0, 0.55, 0));
          f.via = f.from.clone().lerp(f.hover, 0.5);
          f.via.y = Math.max(f.from.y, f.hover.y) + 0.45;
        }
        return;
      }
      // 3. it arcs over to the turntable, turning flat, with a little spin
      const local = t - f.t0;
      const b = easeInOut(local / 1.05);
      bezier(item.record.position, f.from, f.via, f.hover, b);
      item.record.quaternion.slerpQuaternions(f.fromQ, f.toQ, easeInOut((local - 0.05) / 0.9));
      tmpQuat.setFromAxisAngle(tmpVec.set(0, 1, 0), (1 - b) * -2.4);
      item.record.quaternion.multiply(tmpQuat);
      // 4. and lowers onto the spindle
      const c = easeInOut((local - 1.05) / 0.35);
      if (c > 0) item.record.position.lerpVectors(f.hover, seatWorld, c);
      if (local >= 1.4) {
        turntable.spinner.attach(item.record);
        item.record.position.set(0, 0, 0);
        item.record.quaternion.identity();
        flight = null;
        land();
      }
      return;
    }

    // kind "out"
    if (f.stage === 0) {
      // the motor winds down; then the arm goes home
      if (t > 0.85 && !f.armSent) { f.armSent = true; armTo("rest"); }
      if (t > 1.3) {
        f.stage = 1;
        f.t0 = t;
        viewTarget = 0;
        item.receiving = true; // the sleeve lifts to take its record back
        scene.attach(item.record);
        f.from = item.record.position.clone();
        f.fromQ = item.record.quaternion.clone();
        f.hover = seatWorld.clone().add(new THREE.Vector3(0, 0.55, 0));
      }
      return;
    }
    const local = t - f.t0;
    // where the record goes: just above its sleeve (which may be moving)
    item.group.updateMatrixWorld();
    const above = item.group.localToWorld(tmpVec.set(0, SLEEVE / 2 + SLEEVE * 0.92, 0));
    const aboveQ = item.group.getWorldQuaternion(tmpQuat).multiply(standUp);
    if (f.stage === 1) {
      // lift off the platter, then arc back to the crate, standing up
      const lift = easeInOut(local / 0.3);
      const b = easeInOut((local - 0.2) / 1.0);
      const start = f.from.clone().lerp(f.hover, lift);
      const via = start.clone().lerp(above, 0.5);
      via.y = Math.max(start.y, above.y) + 0.45;
      bezier(item.record.position, start, via, above, b);
      item.record.quaternion.slerpQuaternions(f.fromQ, aboveQ, easeInOut((local - 0.25) / 0.85));
      if (local >= 1.2) {
        f.stage = 2;
        f.t1 = t;
        item.group.attach(item.record);
        f.fromLocal = item.record.position.clone();
        f.fromLocalQ = item.record.quaternion.clone();
      }
      return;
    }
    // slide down into the sleeve
    const s = easeInOut((t - f.t1) / 0.45);
    item.record.position.lerpVectors(f.fromLocal, tmpVec.set(0, SLEEVE / 2, 0), s);
    item.record.quaternion.slerpQuaternions(f.fromLocalQ, standUp, s);
    if (s >= 1) {
      putBack(item);
      flight = null;
      done();
    }
  }

  /* ---------- The animation loop ---------- */
  let frame = 0;
  let last = performance.now();

  function update() {
    // seconds since the last frame, kept between 0 and 0.05 (a long pause,
    // e.g. a hidden tab, must not make everything jump)
    const now = performance.now();
    const dt = Math.min(maxStep, Math.max(0, (now - last) / 1000));
    last = now;
    const speed = reducedMotion ? 30 : 7.5;

    // hover: what is under the mouse? (only re-checked when it moved)
    if (pointerDirty && lastMouse && !held) {
      pointerDirty = false;
      const hit = pickAt(lastMouse.x, lastMouse.y);
      const index = mode === "browse" && hit && hit.kind === "album" ? hit.index : -1;
      if (index !== hoverIndex) {
        hoverIndex = index;
        hoverSince = now;
      }
      let kind = hit ? hit.kind : null;
      if (mode === "browse" && kind === "record") kind = null;
      if (mode !== "browse" && mode !== "playing") kind = null;
      setCursor(kind);
    }
    // hovering another album for a moment flips to it
    if (mode === "browse" && !flight && pointerInside && hoverIndex !== -1 && hoverIndex !== current && now > cooldownUntil && now - hoverSince > 110) {
      setIndex(hoverIndex);
      pointerDirty = true; // the albums moved: check again what's under the mouse
    }

    // camera: parallax, and the glide between crate and turntable
    if (!reducedMotion) {
      view.parallaxX = damp(view.parallaxX, -pointerTarget.x * 0.05, 3, dt);
      view.parallaxY = damp(view.parallaxY, pointerTarget.y * 0.035, 3, dt);
      viewBlend = damp(viewBlend, viewTarget, 2.4, dt);
      if (Math.abs(viewBlend - viewTarget) < 0.0005) viewBlend = viewTarget;
    } else {
      viewBlend = viewTarget;
    }
    placeCamera();

    // every album eases towards its pose
    const targets = targetsFor(current);
    items.forEach((item, k) => {
      if (flight && flight.kind === "in" && flight.item === item && !flight.detached) return;
      const isCurrent = k === current;
      const hovered = mode === "browse" && isCurrent && ((pointerInside && hoverIndex === k) || peekCurrent) && !item.away;
      const lifted = hovered || item.receiving;
      item.z = damp(item.z, targets[k].z, speed, dt);
      item.angle = damp(item.angle, targets[k].angle + (hovered ? 0.06 : 0), speed, dt);
      item.lift = damp(item.lift, lifted ? POSE.hoverLift : 0, speed * 0.9, dt);
      item.peek = damp(item.peek, hovered ? POSE.recordPeek : 0, speed * 0.7, dt);
      item.group.position.set(0, BASE_Y + item.lift, item.z);
      item.group.rotation.set(item.angle, 0, 0);
      if (!item.away) item.record.position.set(0, SLEEVE / 2 + item.peek, 0);
    });

    if (flight) updateFlight(dt);

    // the platter and the record
    platterSpeed = damp(platterSpeed, motorOn ? SPIN : 0, motorOn ? 2.6 : 1.5, dt);
    if (Math.abs(platterSpeed) < 0.002 && !motorOn) platterSpeed = 0;
    if (held) {
      // the hand sets the speed (worked out from how far it moved this frame)
      recordSpeed = damp(recordSpeed, dt > 0 ? held.delta / dt : 0, 30, dt);
      held.delta = 0;
    } else {
      // let go: the slip mat drags it back to the platter's speed
      recordSpeed = damp(recordSpeed, platterSpeed, 9, dt);
      recordAngle += recordSpeed * dt;
    }
    platterAngle += platterSpeed * dt;
    if (!reducedMotion || held) {
      turntable.platter.rotation.y = platterAngle;
      turntable.spinner.rotation.y = recordAngle;
    }
    turntable.led.emissiveIntensity = damp(turntable.led.emissiveIntensity, motorOn ? 2.2 : 0, 6, dt);
    turntable.startButton.position.y = THREE.MathUtils.damp(turntable.startButton.position.y, motorOn ? 0.41 : 0.42, 10, dt);
    updateArm(dt);
    if (deckItem) {
      const rate = reducedMotion && !held ? (motorOn ? 1 : 0) : recordSpeed / SPIN;
      onRate(rate, !!held);
    }

    if (!hidden) renderer.render(scene, camera);
    frame = requestAnimationFrame(update);
  }
  frame = requestAnimationFrame(update);

  /* ---------- WebGL can be lost (e.g. a phone under memory pressure) ---------- */
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    if (options.onContextLost) options.onContextLost();
  });

  /* ---------- Cleaning up (when leaving the page) ---------- */
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    disposables.forEach((thing) => thing.dispose && thing.dispose());
    items.forEach((item) => {
      [item.front, item.back, item.recordTop].forEach((m) => m.map && m.map.dispose());
    });
    envTarget.dispose();
    renderer.dispose();
    canvas.remove();
  }

  /* Where a point in the scene is on screen, in CSS pixels */
  function toScreen(point) {
    const p = point.clone().project(camera);
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
  }

  /* ---------- The controls home.js uses ---------- */
  return {
    setIndex,
    next: () => setIndex(current + 1),
    prev: () => setIndex(current - 1),
    getIndex: () => current,
    play: (index = current) => play(index),
    eject,
    // move the needle to a track of the record that's on
    setTrack: (track) => { if (mode === "playing") armTo(track); },
    // move the needle to a track without lifting it (no needle sounds)
    glideToTrack: (track) => {
      if (mode !== "playing" || !arm.down || arm.task || !deckItem) return;
      arm.track = Math.max(0, Math.min(deckItem.bands.length - 1, track));
      arm.glide = yawForRadius(trackRadius(deckItem, arm.track));
    },
    // put another record on straight away, needle down (used while a page covers the scene)
    swapNow: (index, track = 0) => swapNow(index, track),
    setHidden: (on) => {
      hidden = !!on;
      if (hidden) { held = null; setCursor(null); }
    },
    togglePause,
    getState: () => ({
      mode,
      album: deckItem ? deckItem.album : null,
      track: arm.down ? arm.track : (arm.task && arm.task.lower ? arm.task.track : -1),
      paused: mode === "playing" && !arm.down && !(arm.task && arm.task.lower),
    }),
    setPeek: (on) => { peekCurrent = on || isCoarse; },
    dispose,
    // for testing only: where every album is right now
    debug: () => items.map((i) => ({ title: i.album.title, z: +i.z.toFixed(3), angle: +i.angle.toFixed(3), lift: +i.lift.toFixed(3), y: +i.group.position.y.toFixed(3), away: i.away })),
    // for testing only: where an album's cover is on screen
    screenPoint: (index, up = 0.25) => {
      items[index].group.updateMatrixWorld();
      return toScreen(new THREE.Vector3(0, SLEEVE / 2 + SLEEVE * up, THICK).applyMatrix4(items[index].group.matrixWorld));
    },
    // for testing only: a point on the turntable's record (radius as a fraction, angle in radians)
    recordPoint: (radius = 0.7, angle = 0) =>
      toScreen(new THREE.Vector3(seatWorld.x + Math.cos(angle) * radius * RECORD_R, seatWorld.y, seatWorld.z - Math.sin(angle) * radius * RECORD_R)),
    armPoint: () => {
      turntable.armLift.updateMatrixWorld();
      return toScreen(turntable.armLift.localToWorld(new THREE.Vector3(1.2, 0, 0)));
    },
    deckPoint: () => toScreen(new THREE.Vector3(TURNTABLE_AT.x + 1.85, 0.42, TURNTABLE_AT.z + 1.2)),
    speeds: () => ({ platter: +(platterSpeed / SPIN).toFixed(3), record: +(recordSpeed / SPIN).toFixed(3), armYaw: +arm.yaw.toFixed(3), lift: +arm.lift.toFixed(3), held: !!held }),
  };
}
