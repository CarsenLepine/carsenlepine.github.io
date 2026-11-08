/* =====================================================================
   turntable.js — THE RECORD PLAYER BESIDE THE CRATE (homepage only)
   ---------------------------------------------------------------------
   Builds the 3D turntable out of simple shapes (nothing to download):
     - a walnut plinth with a dark brushed-metal deck, on metal feet
     - an aluminium platter with strobe dots and a rubber mat
     - a tonearm that swings over the record, lifts and lowers
     - start / speed buttons, a pitch slider and a power light

   crate.js places it in the scene and animates it. This file only
   knows its shape, and the geometry of the tonearm: which angle puts
   the needle at a given distance from the centre of the record.
   ===================================================================== */

import * as THREE from "three";

/* ---------------- Layout (scene units, same as the crate) ---------------- */
const PLINTH = { w: 4.5, d: 3.6, h: 0.3, feet: 0.07, corner: 0.2 };
export const DECK_Y = PLINTH.feet + PLINTH.h + 0.025;  // top of the metal deck
const PLATTER = { r: 1.6, h: 0.13, gap: 0.02 };
const MAT = 0.012;
const RECORD_THICK = 0.014;
// where the record sits (its centre), relative to the turntable
export const SEAT = new THREE.Vector3(-0.42, DECK_Y + PLATTER.gap + PLATTER.h + MAT + RECORD_THICK / 2, 0.05);
const PIVOT = new THREE.Vector3(SEAT.x + 1.78, DECK_Y, SEAT.z - 1.45);
const ARM_LENGTH = 2.25;        // pivot to needle
const ARM_HEIGHT = 0.31;        // arm tube above the deck
const LIFT_ANGLE = 0.075;       // how far the arm tips up when lifted
const PIVOT_TO_SEAT = Math.hypot(SEAT.x - PIVOT.x, SEAT.z - PIVOT.z);
// the arm's angle (around y) when it points straight at the spindle
const YAW_TO_CENTRE = Math.atan2(-(SEAT.z - PIVOT.z), SEAT.x - PIVOT.x);
export const REST_YAW = YAW_TO_CENTRE + 0.95;

/* Which arm angle puts the needle `radius` from the record's centre */
export function yawForRadius(radius) {
  const d = PIVOT_TO_SEAT;
  const L = ARM_LENGTH;
  const cos = (d * d + L * L - radius * radius) / (2 * d * L);
  return YAW_TO_CENTRE + Math.acos(Math.max(-1, Math.min(1, cos)));
}
/* …and the reverse: how far from the centre the needle is at an angle */
export function radiusForYaw(yaw) {
  const d = PIVOT_TO_SEAT;
  const L = ARM_LENGTH;
  const t = yaw - YAW_TO_CENTRE;
  return Math.sqrt(Math.max(0, d * d + L * L - 2 * d * L * Math.cos(t)));
}

/* Strobe dots around the platter's edge (as on a classic deck) */
function strobeCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, "#d9dcde");
  g.addColorStop(0.5, "#9fa4a8");
  g.addColorStop(1, "#c9cdd0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2048, 64);
  ctx.fillStyle = "#2a2729";
  for (let row = 0; row < 3; row += 1) {
    const count = [100, 108, 120][row];
    for (let i = 0; i < count; i += 1) {
      ctx.fillRect((i / count) * 2048, 10 + row * 16, 6, 7);
    }
  }
  return canvas;
}

/* A rounded rectangle, extruded upwards (for the plinth and deck) */
function roundedSlab(w, d, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r);
  shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d);
  shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 6 });
  geometry.rotateX(-Math.PI / 2); // extrude upwards
  return geometry;
}

/* =====================================================================
   BUILD
   options: keep (registers things to free later), woodMaterial,
            metalMaterial, badgeTexture, shadows
   ===================================================================== */
export function buildTurntable({ keep, woodMaterial, metalMaterial, badgeTexture, shadows = true }) {
  const group = new THREE.Group();
  const meshes = []; // everything the pointer can hit (the deck as a whole)

  const add = (geometry, material, parent = group, { cast = true, receive = true, hit = true } = {}) => {
    const mesh = new THREE.Mesh(keep(geometry), material);
    mesh.castShadow = cast && shadows;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    if (hit) meshes.push(mesh);
    return mesh;
  };

  const deckMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x1d1a1b, metalness: 0.55, roughness: 0.42, envMapIntensity: 1.1 }));
  const blackMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x0f0e0e, metalness: 0.2, roughness: 0.5 }));
  const rubberMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x161415, roughness: 0.95, metalness: 0 }));
  const strobeTexture = keep(new THREE.CanvasTexture(strobeCanvas()));
  strobeTexture.colorSpace = THREE.SRGBColorSpace;
  strobeTexture.wrapS = THREE.RepeatWrapping;
  const strobeMaterial = keep(new THREE.MeshStandardMaterial({ map: strobeTexture, metalness: 0.85, roughness: 0.3, envMapIntensity: 1.4 }));
  const ledMaterial = keep(new THREE.MeshStandardMaterial({ color: 0x3a1015, emissive: 0xff4a3d, emissiveIntensity: 0, roughness: 0.3 }));

  /* ---- Feet, plinth, deck ---- */
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const foot = add(new THREE.CylinderGeometry(0.17, 0.19, PLINTH.feet, 24), metalMaterial, group, { hit: false });
    foot.position.set(sx * (PLINTH.w / 2 - 0.35), PLINTH.feet / 2, sz * (PLINTH.d / 2 - 0.32));
  });
  const plinth = add(roundedSlab(PLINTH.w - 0.03, PLINTH.d - 0.03, PLINTH.h - 0.03, PLINTH.corner), woodMaterial);
  plinth.position.y = PLINTH.feet + 0.015;
  const deck = add(roundedSlab(PLINTH.w - 0.12, PLINTH.d - 0.12, 0.012, PLINTH.corner * 0.8), deckMaterial);
  deck.position.y = DECK_Y - 0.027;

  // the little brushed badge on the front edge
  if (badgeTexture) {
    const badge = add(new THREE.PlaneGeometry(1.0, 0.16), keep(new THREE.MeshStandardMaterial({ map: badgeTexture, metalness: 0.8, roughness: 0.4, envMapIntensity: 1.3 })), group, { cast: false });
    badge.position.set(-1.1, PLINTH.feet + PLINTH.h / 2, PLINTH.d / 2 + 0.018);
  }

  /* ---- Platter (spins), mat and spindle ---- */
  const platter = new THREE.Group();
  platter.position.set(SEAT.x, DECK_Y + PLATTER.gap, SEAT.z);
  group.add(platter);
  const platterMesh = add(new THREE.CylinderGeometry(PLATTER.r, PLATTER.r, PLATTER.h, 96, 1), [strobeMaterial, metalMaterial, metalMaterial], platter);
  platterMesh.position.y = PLATTER.h / 2;
  const mat = add(new THREE.CylinderGeometry(PLATTER.r - 0.07, PLATTER.r - 0.07, MAT, 96, 1), rubberMaterial, platter, { cast: false });
  mat.position.y = PLATTER.h + MAT / 2;
  // a few fine rings on the mat, so you can see it turn
  for (let i = 0; i < 3; i += 1) {
    const ring = add(new THREE.RingGeometry(0.5 + i * 0.42, 0.515 + i * 0.42, 96), keep(new THREE.MeshStandardMaterial({ color: 0x2a2627, roughness: 0.9 })), platter, { cast: false, hit: false });
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = PLATTER.h + MAT + 0.0015;
  }
  const mark = add(new THREE.PlaneGeometry(0.06, 0.4), keep(new THREE.MeshStandardMaterial({ color: 0x8a3446, roughness: 0.8 })), platter, { cast: false, hit: false });
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(0, PLATTER.h + MAT + 0.002, -1.2);
  const spindle = add(new THREE.CylinderGeometry(0.028, 0.032, 0.09, 16), metalMaterial, group, { hit: false });
  spindle.position.set(SEAT.x, SEAT.y + 0.04, SEAT.z);

  // the record sits in here; crate.js turns it
  const spinner = new THREE.Group();
  spinner.position.copy(SEAT);
  group.add(spinner);

  /* ---- Tonearm ---- */
  const armBase = add(new THREE.CylinderGeometry(0.24, 0.26, 0.08, 40), metalMaterial);
  armBase.position.set(PIVOT.x, DECK_Y + 0.04, PIVOT.z);
  const armPost = add(new THREE.CylinderGeometry(0.075, 0.085, ARM_HEIGHT - 0.02, 24), deckMaterial);
  armPost.position.set(PIVOT.x, DECK_Y + (ARM_HEIGHT - 0.02) / 2, PIVOT.z);

  const armYaw = new THREE.Group();     // turns around the pivot
  armYaw.position.copy(PIVOT);
  group.add(armYaw);
  const armLift = new THREE.Group();    // tips the arm up and down
  armLift.position.y = ARM_HEIGHT;
  armYaw.add(armLift);

  const armMeshes = [];
  const armPart = (geometry, material, setup) => {
    const mesh = add(geometry, material, armLift, { hit: false });
    setup(mesh);
    armMeshes.push(mesh);
    return mesh;
  };
  // the tube runs along local +x, from just behind the pivot to the headshell
  armPart(new THREE.CylinderGeometry(0.026, 0.026, ARM_LENGTH - 0.15, 16), metalMaterial, (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = (ARM_LENGTH - 0.15) / 2 - 0.12;
  });
  armPart(new THREE.SphereGeometry(0.07, 20, 14), metalMaterial, (m) => (m.position.x = 0));
  armPart(new THREE.CylinderGeometry(0.115, 0.115, 0.24, 28), blackMaterial, (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = -0.33;
  });
  armPart(new THREE.CylinderGeometry(0.118, 0.118, 0.03, 28), metalMaterial, (m) => {
    m.rotation.z = Math.PI / 2;
    m.position.x = -0.2;
  });
  // headshell, cartridge, finger lift
  const head = new THREE.Group();
  head.position.x = ARM_LENGTH - 0.06;
  head.rotation.y = 0.32; // the headshell's offset angle
  armLift.add(head);
  armPart(new THREE.BoxGeometry(0.34, 0.03, 0.15), blackMaterial, (m) => { head.add(m); m.position.set(0, -0.01, 0); });
  armPart(new THREE.BoxGeometry(0.16, 0.09, 0.1), keep(new THREE.MeshStandardMaterial({ color: 0x5e1a28, roughness: 0.45, metalness: 0.2 })), (m) => { head.add(m); m.position.set(0.06, -0.075, 0); });
  armPart(new THREE.ConeGeometry(0.012, 0.04, 8), metalMaterial, (m) => { head.add(m); m.rotation.z = Math.PI; m.position.set(0.06, -0.135, 0); });
  armPart(new THREE.BoxGeometry(0.14, 0.015, 0.03), metalMaterial, (m) => { head.add(m); m.position.set(0.2, 0.0, 0.06); m.rotation.y = -0.4; });

  // a bigger invisible box around the arm, so it's easy to click
  const armHit = new THREE.Mesh(keep(new THREE.BoxGeometry(ARM_LENGTH + 0.75, 0.3, 0.34)), keep(new THREE.MeshBasicMaterial({ visible: false })));
  armHit.position.x = (ARM_LENGTH + 0.75) / 2 - 0.5;
  armLift.add(armHit);

  // the arm rest
  const restAt = new THREE.Vector3(Math.cos(REST_YAW), 0, -Math.sin(REST_YAW)).multiplyScalar(ARM_LENGTH - 0.55).add(PIVOT);
  const rest = add(new THREE.CylinderGeometry(0.035, 0.05, ARM_HEIGHT - 0.03, 12), deckMaterial);
  rest.position.set(restAt.x, DECK_Y + (ARM_HEIGHT - 0.03) / 2, restAt.z);
  const cradle = add(new THREE.BoxGeometry(0.16, 0.04, 0.05), blackMaterial);
  cradle.position.set(restAt.x, DECK_Y + ARM_HEIGHT - 0.045, restAt.z);
  cradle.rotation.y = REST_YAW + Math.PI / 2;

  /* ---- Buttons, pitch slider, power light ---- */
  const frontZ = PLINTH.d / 2 - 0.3;
  const button = (x, label) => {
    const b = add(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 32), label === "start" ? metalMaterial : deckMaterial);
    b.position.set(x, DECK_Y + 0.025, frontZ);
    return b;
  };
  const startButton = button(-1.92, "start");
  button(-1.55, "33");
  button(-1.22, "45");
  const led = add(new THREE.SphereGeometry(0.035, 16, 10), ledMaterial, group, { cast: false });
  led.position.set(-1.55, DECK_Y + 0.07, frontZ);
  const slot = add(new THREE.BoxGeometry(0.06, 0.01, 1.2), blackMaterial, group, { cast: false });
  slot.position.set(1.85, DECK_Y + 0.005, -0.15);
  const fader = add(new THREE.BoxGeometry(0.22, 0.07, 0.12), metalMaterial);
  fader.position.set(1.85, DECK_Y + 0.035, -0.15);

  return {
    group,
    platter,
    spinner,
    armYaw,
    armLift,
    armHit,
    deckMeshes: meshes,
    led: ledMaterial,
    startButton,
    /* Put the arm at an angle and lift (0 = needle down, 1 = up) */
    setArm(yaw, lift) {
      armYaw.rotation.y = yaw;
      armLift.rotation.z = lift * LIFT_ANGLE;
    },
  };
}
