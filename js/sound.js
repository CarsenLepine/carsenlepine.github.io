/* =====================================================================
   sound.js — THE RECORDS' MUSIC
   ---------------------------------------------------------------------
   Nothing is downloaded: every sound is made in the browser with the
   Web Audio API.

   Each album has its own style, chosen in its data ("sound" in
   js/data/projects.js and js/data/site.js):

     ambient    slow, airy film-score music (pads, pulsing plucks, bells)
     piano      soft felt piano, slow broken chords, warm pads
     moroccan   ney flute, warm keys, rounded bass, a gentle frame drum
     modern     clean electronic: soft arpeggios, light beat, warm pads
     lofi       mellow keys, bass and brushed drums (the default)

   Every track on an album is a variation of its tune (the chords start
   elsewhere, the patterns change), so moving the needle, or scrolling
   into the next section of a project, changes the music. All tunes are
   evened out to the same, gentle loudness.

   Also here: vinyl crackle while the needle is down, a soft thump when
   it drops, and speed that follows the record (scratching).

   Browsers only allow sound after a click or a key press, so the
   first Play wakes the audio up (unlock()). Visitors can turn the
   sound off; that choice is remembered on their device.
   ===================================================================== */

const STORAGE_KEY = "fpd-sound";
const VOLUME = 0.42;          // overall volume (0 … 1)
const TARGET_RMS = 0.085;     // every tune is levelled to this loudness

/* ---------- Seeded random numbers (so each album always sounds the same) ---------- */
function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ---------- Chord names ("Fsus2", "Bbmaj7", "Gm7" …) to notes ---------- */
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITIES = {
  "": [0, 4, 7], m: [0, 3, 7], sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], 6: [0, 4, 7, 9],
  maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 7: [0, 4, 7, 10], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14],
};
function parseNote(name) {
  const m = /^([A-G])([b#]?)/.exec(name || "");
  if (!m) return 0;
  return (NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
}
function parseChord(name) {
  const m = /^([A-G][b#]?)(.*)$/.exec(String(name).trim());
  if (!m) return { root: 0, intervals: QUALITIES[""] };
  return { root: parseNote(m[1]), intervals: QUALITIES[m[2]] || QUALITIES[""] };
}
/* the lowest MIDI note with this pitch class at or above `floor` */
function above(pitchClass, floor) {
  return floor + ((((pitchClass - floor) % 12) + 12) % 12);
}
/* the chord's notes as MIDI, spread upwards from `floor` */
function voicing(chord, floor) {
  const root = above(chord.root, floor);
  return chord.intervals.map((iv) => root + iv);
}
/* chord tones placed between MIDI notes `low` and `high` */
function tonesBetween(chord, low, high) {
  const out = [];
  for (let m = low; m <= high; m += 1) {
    if (chord.intervals.some((iv) => (chord.root + iv) % 12 === m % 12)) out.push(m);
  }
  return out;
}

/* =====================================================================
   THE STUDIO: a mixing desk and instruments inside an offline render
   ===================================================================== */

function noiseBuffer(ctx, seconds = 1) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < data.length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  return buffer;
}

function reverbImpulse(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  const rand = seeded(4242);
  for (let ch = 0; ch < 2; ch += 1) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < length; i += 1) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / length, 3.2);
  }
  return ir;
}

function makeStudio(ctx, { reverb = 2.6, wet = 0.35, tone = 7000 } = {}) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 2.5;
  comp.attack.value = 0.01;
  comp.release.value = 0.25;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = tone;
  lowpass.Q.value = 0.4;
  lowpass.connect(comp).connect(ctx.destination);
  const dry = ctx.createGain();
  dry.connect(lowpass);
  const room = ctx.createConvolver();
  room.buffer = reverbImpulse(ctx, reverb);
  const wetGain = ctx.createGain();
  wetGain.gain.value = wet;
  room.connect(wetGain).connect(lowpass);
  const noise = noiseBuffer(ctx, 1);

  const s = {
    ctx,
    noise,
    /* a mixer channel: placed left/right, with some of it sent to the room */
    bus(pan = 0, send = 0.3, gain = 1) {
      const level = ctx.createGain();
      level.gain.value = gain;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      level.connect(p);
      p.connect(dry);
      const sendGain = ctx.createGain();
      sendGain.gain.value = send;
      p.connect(sendGain).connect(room);
      return level;
    },
    osc(type, freq, time, stop, out, detune = 0) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(out);
      o.start(time);
      o.stop(stop);
      return o;
    },
    /* a volume envelope: [[time, value, how], …] (how: "lin" or { tc }) */
    env(out, points) {
      const g = ctx.createGain();
      g.gain.value = 0;
      points.forEach(([t, v, how]) => {
        if (how === "lin") g.gain.linearRampToValueAtTime(v, t);
        else if (how && how.tc) g.gain.setTargetAtTime(v, t, how.tc);
        else g.gain.setValueAtTime(v, t);
      });
      g.connect(out);
      return g;
    },
    filter(type, freq, q, out) {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      f.connect(out);
      return f;
    },
    noiseHit(out, time, { freq = 2000, type = "bandpass", q = 0.8, gain = 0.2, decay = 0.1 }) {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, time);
      g.gain.exponentialRampToValueAtTime(0.0008, time + decay);
      g.connect(out);
      src.connect(s.filter(type, freq, q, g));
      src.start(time, (time * 7.31) % 0.5);
      src.stop(time + decay + 0.05);
    },
  };
  return s;
}

/* ---------- Instruments (shared by the styles) ---------- */
const play = {
  pad(s, out, time, midi, length, { gain = 0.045, attack = 1.2, cutoff = [1000, 2200, 1200], wave = "sawtooth", pump = null } = {}) {
    const lp = s.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.3;
    lp.frequency.setValueAtTime(cutoff[0], time);
    lp.frequency.linearRampToValueAtTime(cutoff[1], time + length * 0.5);
    lp.frequency.linearRampToValueAtTime(cutoff[2], time + length);
    const g = s.env(out, [[time, 0], [time + attack, gain, "lin"], [time + length - 0.2, gain], [time + length - 0.2, 0, { tc: 0.5 }]]);
    if (pump) {
      // the gentle "breathing" of modern electronic music: a dip on every beat
      const p = s.ctx.createGain();
      p.gain.value = 1;
      for (let t = time; t < time + length - 0.01; t += pump) {
        p.gain.setValueAtTime(0.45, t);
        p.gain.linearRampToValueAtTime(1, t + pump * 0.6);
      }
      lp.connect(p).connect(g);
    } else {
      lp.connect(g);
    }
    [-7, 7].forEach((c) => s.osc(wave, midiToHz(midi), time, time + length + 3, lp, c));
  },
  pluck(s, out, time, midi, velocity, { gain = 0.15, decay = 0.16, wave = "triangle", octave = 0.3 } = {}) {
    const g = s.env(out, [[time, 0], [time + 0.006, gain * velocity, "lin"], [time + 0.01, 0, { tc: decay }]]);
    s.osc(wave, midiToHz(midi), time, time + decay * 8, g);
    if (octave) {
      const o = s.ctx.createGain();
      o.gain.value = octave;
      o.connect(g);
      s.osc("sine", midiToHz(midi) * 2, time, time + decay * 8, o);
    }
  },
  sub(s, out, time, midi, length, gain = 0.32) {
    const g = s.env(out, [[time, 0], [time + Math.min(0.08, length / 4), gain, "lin"], [time + length - Math.min(0.12, length / 4), gain], [time + length, 0, "lin"]]);
    s.osc("sine", midiToHz(midi), time, time + length + 0.1, g);
  },
  kick(s, out, time, gain = 0.45, { from = 95, to = 42, decay = 0.5 } = {}) {
    const o = s.ctx.createOscillator();
    o.frequency.setValueAtTime(from, time);
    o.frequency.exponentialRampToValueAtTime(to, time + 0.16);
    const g = s.ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, time + decay);
    o.connect(g).connect(out);
    o.start(time);
    o.stop(time + decay + 0.05);
  },
  bell(s, out, time, midi, length, gain = 0.035) {
    const g = s.env(out, [[time, 0], [time + 0.3, gain, "lin"], [time + 0.35, 0, { tc: length / 3 }]]);
    [[1, 1], [2.01, 0.25], [3, 0.08]].forEach(([mult, level]) => {
      const l = s.ctx.createGain();
      l.gain.value = level;
      l.connect(g);
      s.osc("sine", midiToHz(midi) * mult, time, time + length + 1, l);
    });
  },
  /* soft electric piano (lo-fi), or felt piano (acoustic) */
  keys(s, out, time, midi, length, velocity, { gain = 0.16, felt = false } = {}) {
    const g = s.env(out, [[time, 0], [time + 0.012, gain * velocity, "lin"], [time + 0.02, gain * velocity * (felt ? 0.25 : 0.38), { tc: felt ? 0.5 : 0.35 }], [time + length, 0, { tc: 0.18 }]]);
    const f = midiToHz(midi);
    [[1, "sine", 1], [2, "sine", felt ? 0.12 : 0.22], [1.003, "triangle", felt ? 0.2 : 0.35]].forEach(([mult, type, level]) => {
      const l = s.ctx.createGain();
      l.gain.value = level;
      l.connect(g);
      s.osc(type, f * mult, time, time + length + 1.2, l);
    });
  },
  bass(s, out, time, midi, length, gain = 0.42) {
    const env = s.env(out, [[time, 0], [time + 0.015, gain, "lin"], [time + 0.03, gain * 0.6, { tc: 0.2 }], [time + length, 0, { tc: 0.06 }]]);
    s.osc("triangle", midiToHz(midi), time, time + length + 0.5, s.filter("lowpass", 420, 0.7, env));
  },
  /* a soft, rounded plucked note: a gentle stand-in for the oud, with no
     sharp edge (a slow-ish start, mostly the pure tone, darkened) */
  softPluck(s, out, time, midi, velocity, { gain = 0.16, decay = 1.3, tone = 1600 } = {}) {
    const g = s.env(out, [[time, 0], [time + 0.018, gain * velocity, "lin"], [time + 0.03, 0, { tc: decay / 4 }]]);
    const lp = s.filter("lowpass", tone, 0.5, g);
    [[1, "sine", 1], [2, "sine", 0.18], [3, "triangle", 0.05]].forEach(([mult, type, level]) => {
      const l = s.ctx.createGain();
      l.gain.value = level;
      l.connect(lp);
      s.osc(type, midiToHz(midi) * mult, time, time + decay + 0.3, l);
    });
  },
  /* a breathy flute (the Moroccan ney) */
  flute(s, out, time, midi, length, gain = 0.05) {
    const g = s.env(out, [[time, 0], [time + 0.18, gain, "lin"], [time + length - 0.2, gain * 0.8, "lin"], [time + length, 0, "lin"]]);
    const o = s.osc("sine", midiToHz(midi), time, time + length + 0.1, g);
    const vibrato = s.ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const depth = s.ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(7, time + 0.6);
    vibrato.connect(depth).connect(o.detune);
    vibrato.start(time);
    vibrato.stop(time + length + 0.1);
    s.noiseHit(out, time, { freq: midiToHz(midi) * 2, q: 3, gain: gain * 0.15, decay: Math.min(length, 0.4) });
  },
};

/* =====================================================================
   THE STYLES. Each returns the loop's length and how to fill it.
   ===================================================================== */

/* ---------- ambient: The Pause Between (modelled on its film's music) ---------- */
function ambient(settings, track, rand) {
  const bpm = Number(settings.bpm) || 80;
  const beat = 60 / bpm;
  const bar = 4 * beat;
  const keyPc = parseNote(settings.key || "F");
  const names = settings.chords && settings.chords.length ? settings.chords : ["Fsus2", "Bbmaj7", "Gm7", "C"];
  const chords = names.map((_, i) => parseChord(names[(i + track) % names.length]));
  const per = 2 * bar;
  const patterns = [[0, 1, 2, 1, 3, 1, 2, 1], [0, 2, 1, 3, 0, 2, 1, 3], [0, 1, 2, 3, 2, 1, 2, 3], [3, 2, 1, 0, 1, 2, 1, 2], [0, 2, 3, 2, 1, 2, 3, 2]];
  const pattern = patterns[track % patterns.length];
  return {
    seconds: chords.length * per,
    tail: 4,
    studio: { reverb: 3.2, wet: 0.5, tone: 7000 },
    schedule(s) {
      const padBus = s.bus(0, 0.7);
      const pluckL = s.bus(-0.35, 0.55);
      const pluckR = s.bus(0.35, 0.55);
      const low = s.bus(0, 0.05);
      const bells = s.bus(0.15, 0.9);
      chords.forEach((chord, ci) => {
        const t0 = ci * per;
        voicing(chord, 50).forEach((m) => play.pad(s, padBus, t0, m, per));
        play.pad(s, padBus, t0, above(chord.root, 50) + 12, per);
        play.sub(s, low, t0, above(chord.root, 34), per);
        const tones = [...new Set(chord.intervals.map((iv) => above((chord.root + iv) % 12, 64)))].sort((a, b) => a - b);
        if (tones.length < 4) tones.push(tones[0] + 12);
        for (let b = 0; b < 2; b += 1) {
          for (let e = 0; e < 8; e += 1) {
            const accent = e % 4 === 0 ? 1 : e % 2 === 0 ? 0.75 : 0.55;
            play.pluck(s, e % 2 ? pluckR : pluckL, t0 + b * bar + e * beat * 0.5, tones[pattern[e] % tones.length], accent);
          }
          if (track > 0) [0, 2].forEach((q) => play.kick(s, low, t0 + b * bar + q * beat, b === 0 && q === 0 ? 0.5 : 0.38));
        }
        if (rand() < (track === 4 ? 0.9 : 0.6)) {
          const step = [0, 2, 4, 7, 9][Math.floor(rand() * 5)];
          play.bell(s, bells, t0 + beat * (rand() > 0.5 ? 0 : 2), above((keyPc + step) % 12, 81), bar * 1.5);
        }
      });
    },
  };
}

/* ---------- piano: Ledger Residence (soft, warm, natural) ----------
   A soft felt piano playing slow broken chords, with a low note under
   each chord and, on later tracks, a few gentle melody notes, over
   warm pads. No drums, nothing plucked: calm, like a sunlit room. */
function piano(settings, track, rand) {
  const bpm = Number(settings.bpm) || 66;
  const beat = 60 / bpm;
  const bar = 4 * beat;
  const keyPc = parseNote(settings.key || "G");
  const names = settings.chords && settings.chords.length ? settings.chords : ["Gmaj7", "Em9", "Cmaj7", "Dsus4"];
  const chords = names.map((_, i) => parseChord(names[(i + track) % names.length]));
  const per = 2 * bar;
  // which chord tone on each beat (two bars of quarter notes); -1 = rest
  const patterns = [
    [0, 1, 2, 1, 0, 2, 3, -1],
    [0, 2, 1, 3, 0, 2, 1, -1],
    [0, 1, 2, 3, 2, 1, 0, -1],
    [0, 2, 3, 2, 1, 2, 0, -1],
    [0, 1, 3, 2, 0, 1, 2, -1],
  ];
  const pattern = patterns[track % patterns.length];
  const pentatonic = [0, 2, 4, 7, 9];
  return {
    seconds: chords.length * per,
    tail: 5,
    studio: { reverb: 3, wet: 0.45, tone: 2800 },
    schedule(s) {
      const left = s.bus(-0.12, 0.45);
      const right = s.bus(0.12, 0.5);
      const melody = s.bus(0.05, 0.6);
      const padBus = s.bus(0, 0.7);
      chords.forEach((chord, ci) => {
        const t0 = ci * per;
        voicing(chord, 52).forEach((m) => play.pad(s, padBus, t0, m, per, { gain: 0.016, attack: 2.2, cutoff: [500, 850, 600], wave: "triangle" }));
        // the left hand: a low root, then its fifth
        const low = above(chord.root, 41);
        play.keys(s, left, t0, low, bar * 1.6, 0.55, { gain: 0.13, felt: true });
        play.keys(s, left, t0 + bar, low + 7, bar * 0.9, 0.4, { gain: 0.13, felt: true });
        // the right hand: a slow broken chord
        const tones = tonesBetween(chord, 60, 74);
        pattern.forEach((which, q) => {
          if (which < 0) return;
          const note = tones[which % tones.length];
          play.keys(s, right, t0 + q * beat + rand() * 0.015, note, beat * 1.8, q % 4 === 0 ? 0.5 : 0.38, { gain: 0.13, felt: true });
        });
        // a few quiet melody notes, higher up
        if (track > 0) {
          const count = 1 + (rand() < 0.5 ? 1 : 0);
          for (let n = 0; n < count; n += 1) {
            const step = pentatonic[Math.floor(rand() * pentatonic.length)];
            play.keys(s, melody, t0 + (n === 0 ? 0 : 4) * beat + beat * (rand() < 0.5 ? 0 : 2), above((keyPc + step) % 12, 72), beat * 3, 0.45, { gain: 0.13, felt: true });
          }
        }
      });
    },
  };
}

/* ---------- moroccan: Moroccan Reverie (warm, lantern-lit, with a hint of Morocco) ----------
   A soft but present groove for a warm dining room: a breathy ney flute
   carries the melody over warm electric-piano chords, a rounded bass
   line and a gentle frame drum playing the traditional "dum-tek"
   rhythm (the teks are soft pitched taps, nothing sharp). A soft
   plucked note answers now and then, a hint of the oud. Minor key;
   over a major chord on the fifth (e.g. A in D minor) the melody
   borrows its raised note, the Moroccan colour. Track 1 is the quiet
   intro, without drums. */
function moroccan(settings, track, rand) {
  const bpm = Number(settings.bpm) || 88;
  const beat = 60 / bpm;
  const bar = 4 * beat;
  const keyPc = parseNote(settings.key || "D");
  const names = settings.chords && settings.chords.length ? settings.chords : ["Dm9", "Bbmaj7", "Gm7", "A"];
  const chords = names.map((_, i) => parseChord(names[(i + track) % names.length]));
  const per = 2 * bar;
  const minor = [0, 2, 3, 5, 7, 8, 10];
  const borrowed = [0, 2, 3, 5, 7, 8, 11]; // the hint: a raised seventh
  const scaleFor = (chord, low, high) => {
    const steps = chord.root === (keyPc + 7) % 12 && chord.intervals.includes(4) ? borrowed : minor;
    const notes = [];
    for (let m = low; m <= high; m += 1) if (steps.includes((((m - keyPc) % 12) + 12) % 12)) notes.push(m);
    return notes;
  };
  // the dum-tek rhythm on eighths: D = dum (low), T = tek (soft tap), - = rest
  const rhythm = "DT-TD-T-";
  // melody rhythms (in eighths from the start of the chord), varied per track
  const phrases = [[0, 3, 4, 6, 8], [0, 2, 4, 7, 10], [1, 2, 4, 8, 11], [0, 4, 6, 7, 12], [0, 3, 6, 8, 10]];
  const phrase = phrases[track % phrases.length];
  return {
    seconds: chords.length * per,
    tail: 4,
    studio: { reverb: 2.6, wet: 0.36, tone: 4200 },
    schedule(s) {
      const padBus = s.bus(0, 0.6);
      const keysBus = s.bus(-0.18, 0.35);
      const bassBus = s.bus(0, 0.05);
      const ney = s.bus(0.15, 0.55);
      const plucks = s.bus(-0.3, 0.5);
      const drum = s.bus(0.1, 0.22);
      let pitch = above(keyPc, 69);
      chords.forEach((chord, ci) => {
        const t0 = ci * per;
        // warm pads underneath
        voicing(chord, 50).forEach((m) => play.pad(s, padBus, t0, m, per, { gain: 0.02, attack: 1.4, cutoff: [600, 1100, 700], wave: "triangle" }));
        const root = above(chord.root, 38);
        for (let b = 0; b < 2; b += 1) {
          const bt = t0 + b * bar;
          // a rounded bass line: root, fifth, and a step back to the root
          play.bass(s, bassBus, bt, root, beat * 1.4, 0.34);
          play.bass(s, bassBus, bt + 1.5 * beat, root + 7, beat * 0.9, 0.26);
          play.bass(s, bassBus, bt + 3 * beat, root + (b ? 12 : 0), beat * 0.8, 0.24);
          // warm electric piano on the off-beats
          const tones = tonesBetween(chord, 57, 70).slice(0, 4);
          [1.5, 3.5].forEach((q, i) => tones.forEach((m, k) => play.keys(s, keysBus, bt + q * beat + k * 0.012, m, beat * 0.9, i ? 0.32 : 0.4, { gain: 0.11 })));
          // the frame drum
          if (track > 0) {
            [...rhythm].forEach((hit, e) => {
              const time = bt + e * beat * 0.5;
              if (hit === "D") play.kick(s, drum, time, e === 0 ? 0.3 : 0.22, { from: 105, to: 62, decay: 0.42 });
              else if (hit === "T") play.pluck(s, drum, time, 79, e === 1 ? 0.8 : 0.6, { gain: 0.07, decay: 0.035, wave: "sine", octave: 0 });
              else if (track > 1 && e === 7) play.pluck(s, drum, time, 79, 0.35, { gain: 0.07, decay: 0.03, wave: "sine", octave: 0 });
            });
          }
        }
        // the ney's melody: a short phrase stepping through the scale
        const scale = scaleFor(chord, 62, 81);
        const notes = track === 0 ? phrase.slice(0, 3) : phrase;
        notes.forEach((eighth, n) => {
          let i = scale.findIndex((m) => m >= pitch);
          if (i < 0) i = scale.length - 1;
          i = Math.max(0, Math.min(scale.length - 1, i + (n === 0 ? 0 : [-1, -1, 1, 1, 2, -2][Math.floor(rand() * 6)])));
          pitch = scale[i];
          const next = notes[n + 1] !== undefined ? notes[n + 1] : 16;
          const length = Math.max(beat * 0.6, (next - eighth) * beat * 0.5 - 0.05);
          play.flute(s, ney, t0 + eighth * beat * 0.5, pitch, length, 0.05);
        });
        // now and then a soft plucked note answers, a hint of the oud
        if (rand() < (track === 0 ? 0.4 : 0.7)) {
          const answer = scaleFor(chord, 57, 69);
          play.softPluck(s, plucks, t0 + (13 + Math.floor(rand() * 2)) * beat * 0.5, answer[Math.floor(rand() * answer.length)], 0.8, { gain: 0.13 });
        }
      });
    },
  };
}

/* ---------- modern: ModuNest (clean, future-forward, calm focus) ---------- */
function modern(settings, track, rand) {
  const bpm = Number(settings.bpm) || 102;
  const beat = 60 / bpm;
  const bar = 4 * beat;
  const keyPc = parseNote(settings.key || "A");
  const names = settings.chords && settings.chords.length ? settings.chords : ["Am9", "Fmaj7", "Cmaj7", "G6"];
  const chords = names.map((_, i) => parseChord(names[(i + track) % names.length]));
  const per = 2 * bar;
  const arps = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 1, 2, 3, 2, 1], [3, 2, 1, 0], [0, 2, 3, 1]];
  const arp = arps[track % arps.length];
  return {
    seconds: chords.length * per,
    tail: 3,
    studio: { reverb: 2.4, wet: 0.32, tone: 6000 },
    schedule(s) {
      const padBus = s.bus(0, 0.55);
      const arpL = s.bus(-0.4, 0.4);
      const arpR = s.bus(0.4, 0.4);
      const low = s.bus(0, 0.04);
      const drums = s.bus(0.05, 0.12);
      const glass = s.bus(0.2, 0.8);
      chords.forEach((chord, ci) => {
        const t0 = ci * per;
        voicing(chord, 52).forEach((m) => play.pad(s, padBus, t0, m, per, { gain: 0.03, attack: 0.5, cutoff: [900, 1900, 1100], pump: track > 0 ? beat : null }));
        const tones = tonesBetween(chord, 64, 83);
        for (let b = 0; b < 2; b += 1) {
          const bt = t0 + b * bar;
          // the arpeggio, in sixteenths, bouncing left and right
          for (let n = 0; n < 16; n += 1) {
            const note = tones[(arp[n % arp.length] + (n >= 8 ? 1 : 0)) % tones.length];
            play.pluck(s, n % 2 ? arpR : arpL, bt + n * beat * 0.25, note, n % 4 === 0 ? 1 : 0.6, { gain: 0.06, decay: 0.09, wave: "square", octave: 0 });
          }
          // a pulsing bass on eighths
          for (let e = 0; e < 8; e += 1) play.sub(s, low, bt + e * beat * 0.5, above(chord.root, 33), beat * 0.42, e % 2 ? 0.16 : 0.24);
          if (track > 0) {
            [0, 2].forEach((q) => play.kick(s, low, bt + q * beat, 0.5, { from: 110, to: 45, decay: 0.38 }));
            if (track > 1) play.kick(s, low, bt + 2.5 * beat, 0.28, { from: 110, to: 45, decay: 0.3 });
            [1, 3].forEach((q) => {
              [0, 0.011, 0.022].forEach((d) => s.noiseHit(drums, bt + q * beat + d, { freq: 1500, q: 0.8, gain: 0.06, decay: 0.12 })); // a soft clap
            });
            for (let e = 1; e < 8; e += 2) s.noiseHit(drums, bt + e * beat * 0.5, { freq: 9000, type: "highpass", q: 0.5, gain: 0.035, decay: 0.04 });
          }
        }
        if (rand() < 0.65) {
          const step = [0, 2, 3, 7, 10][Math.floor(rand() * 5)];
          play.bell(s, glass, t0 + beat * Math.floor(rand() * 4), above((keyPc + step) % 12, 76), bar, 0.03);
        }
      });
    },
  };
}

/* ---------- lofi: the default (and The Artist, Let's Chat) ---------- */
const PROGRESSIONS = [
  [1, 4, 0, 5],   // ii  V  I  vi
  [0, 5, 1, 4],   // I  vi  ii  V
  [3, 2, 5, 1],   // IV iii vi  ii
  [5, 3, 0, 4],   // vi IV  I   V
  [0, 3, 2, 5],   // I  IV  iii vi
  [3, 4, 2, 5],   // IV V   iii vi
];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
function lofi(settings, track, rand, albumId) {
  const albumRand = seeded(hashString(albumId) + 1);
  const key = settings.key ? above(parseNote(settings.key), 50) : 50 + Math.floor(albumRand() * 9);
  const bpm = (Number(settings.bpm) || 74 + Math.floor(albumRand() * 16)) + (track % 3) * 3;
  const base = PROGRESSIONS[Math.floor(albumRand() * PROGRESSIONS.length)];
  const progression = base.map((_, i) => base[(i + track) % base.length]);
  const beat = 60 / bpm;
  const swing = 0.08 + rand() * 0.1;
  const busy = 0.2 + rand() * 0.25;
  const bars = 8;
  const chordNotes = (degree) => [0, 2, 4, 6].map((step) => {
    const d = degree + step;
    return key + MAJOR[d % 7] + 12 * Math.floor(d / 7);
  });
  return {
    seconds: bars * 4 * beat,
    tail: 2.5,
    studio: { reverb: 1.6, wet: 0.22, tone: 3600 },
    schedule(s) {
      const keysBus = s.bus(-0.12, 0.3);
      const bassBus = s.bus(0, 0.02);
      const drumBus = s.bus(0.08, 0.1);
      const bellBus = s.bus(0.22, 0.5);
      const sw = (eighth) => (eighth % 2 ? swing * beat : 0);
      for (let barN = 0; barN < bars; barN += 1) {
        const t0 = barN * 4 * beat;
        const notes = chordNotes(progression[barN % 4]);
        const root = notes[0];
        notes.forEach((n, i) => play.keys(s, keysBus, t0 + i * 0.012, n, beat * 1.7, 1));
        notes.slice(1).forEach((n, i) => play.keys(s, keysBus, t0 + 1.5 * beat + sw(3) + i * 0.01, n, beat * 1.2, 0.6));
        if (rand() > 0.4) notes.slice(1).forEach((n) => play.keys(s, keysBus, t0 + 3 * beat, n, beat * 0.9, 0.45));
        play.bass(s, bassBus, t0, root - 12, beat * 1.6);
        play.bass(s, bassBus, t0 + 2 * beat, root - 12 + 7, beat * 0.9);
        play.bass(s, bassBus, t0 + 3.5 * beat + sw(7), root - 12 + (rand() > 0.5 ? 12 : 5), beat * 0.4);
        play.kick(s, drumBus, t0, 0.6, { from: 120, to: 44, decay: 0.38 });
        play.kick(s, drumBus, t0 + 2.5 * beat + sw(5), 0.5, { from: 120, to: 44, decay: 0.38 });
        [1, 3].forEach((b) => s.noiseHit(drumBus, t0 + b * beat, { freq: 1900, q: 0.7, gain: 0.16, decay: 0.16 }));
        for (let e = 0; e < 8; e += 1) s.noiseHit(drumBus, t0 + e * beat * 0.5 + sw(e), { freq: 8200, type: "highpass", q: 0.5, gain: e % 2 ? 0.035 : 0.05, decay: 0.045 });
        // the melody only in the second half of the loop (and on later tracks), so it breathes
        if (barN >= 4 || track > 2) {
          for (let e = 0; e < 8; e += 1) {
            if (rand() < busy) play.bell(s, bellBus, t0 + e * beat * 0.5 + sw(e), key + 24 + [0, 2, 4, 7, 9][Math.floor(rand() * 5)], 1, 0.06);
          }
        }
      }
    },
  };
}

// "acoustic" is the old name of the piano style (it used to be a guitar)
const STYLES = { ambient, piano, acoustic: piano, moroccan, modern, lofi };

/* Renders one album's track into a seamless, levelled loop */
export async function renderLoop(album, track, sampleRate) {
  const settings = album.sound || {};
  const style = STYLES[settings.style] || lofi;
  const rand = seeded(hashString(`${album.id}~${track}`) + 3);
  const piece = style(settings, track, rand, album.id);
  const ctx = new OfflineAudioContext(2, Math.ceil((piece.seconds + piece.tail) * sampleRate), sampleRate);
  piece.schedule(makeStudio(ctx, piece.studio));
  const rendered = await ctx.startRendering();

  // fold the ringing tail back onto the start, so the loop is seamless
  const length = Math.floor(piece.seconds * sampleRate);
  const loop = new AudioBuffer({ numberOfChannels: 2, length, sampleRate });
  let sum = 0;
  let peak = 0;
  for (let ch = 0; ch < 2; ch += 1) {
    const src = rendered.getChannelData(ch);
    const dst = loop.getChannelData(ch);
    dst.set(src.subarray(0, length));
    for (let i = length; i < src.length && i - length < length; i += 1) dst[i - length] += src[i];
    for (let i = 0; i < length; i += 1) {
      sum += dst[i] * dst[i];
      peak = Math.max(peak, Math.abs(dst[i]));
    }
  }
  // even out the loudness, so no album is louder than another
  const rms = Math.sqrt(sum / (length * 2)) || 1;
  const gain = Math.min(TARGET_RMS / rms, 0.85 / (peak || 1));
  for (let ch = 0; ch < 2; ch += 1) {
    const d = loop.getChannelData(ch);
    for (let i = 0; i < length; i += 1) d[i] *= gain;
  }
  return loop;
}

/* Vinyl surface noise: a faint hiss with the odd soft tick */
function crackleBuffer(ctx) {
  const seconds = 3.3;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rand = seeded(99);
  let lp = 0;
  let pop = 0;
  for (let i = 0; i < data.length; i += 1) {
    lp += (rand() * 2 - 1 - lp) * 0.2;
    if (rand() < 0.00016) pop = (rand() > 0.9 ? 0.32 : 0.12) * (rand() > 0.5 ? 1 : -1);
    data[i] = lp * 0.022 + pop;
    pop *= 0.55;
  }
  return buffer;
}

/* =====================================================================
   THE PLAYER
   ===================================================================== */

export function createSound() {
  let enabled = true;
  try { enabled = localStorage.getItem(STORAGE_KEY) !== "off"; } catch (error) { /* private mode */ }

  let ctx = null;
  let master, musicGain, crackleGain, scratchGain, scratchFilter, crackleSource;
  let music = null;            // { source, gain, key }
  let wantKey = null;          // the loop that should be playing
  let lastRate = 1;
  let crackleLevel = 0;
  const loops = new Map();     // "album#track" → Promise<AudioBuffer>

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? VOLUME : 0;
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.connect(master);

    crackleGain = ctx.createGain();
    crackleGain.gain.value = 0;
    const crackleTone = ctx.createBiquadFilter();
    crackleTone.type = "bandpass";
    crackleTone.frequency.value = 2500;
    crackleTone.Q.value = 0.5;
    crackleGain.connect(crackleTone).connect(master);
    crackleSource = ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer(ctx);
    crackleSource.loop = true;
    crackleSource.connect(crackleGain);
    crackleSource.start();

    // the "zzzt" of a scratch: band-passed noise that follows the hand
    scratchGain = ctx.createGain();
    scratchGain.gain.value = 0;
    scratchFilter = ctx.createBiquadFilter();
    scratchFilter.type = "bandpass";
    scratchFilter.Q.value = 1.6;
    scratchFilter.frequency.value = 900;
    const scratchSource = ctx.createBufferSource();
    scratchSource.buffer = noiseBuffer(ctx, 2);
    scratchSource.loop = true;
    scratchSource.connect(scratchFilter).connect(scratchGain).connect(master);
    scratchSource.start();
    return ctx;
  }

  function loopFor(album, track) {
    const key = `${album.id}#${track}`;
    if (!loops.has(key)) {
      const rate = (ctx && ctx.sampleRate) || 44100;
      loops.set(key, renderLoop(album, track, rate).catch((error) => {
        console.warn("Could not make the music:", error);
        loops.delete(key);
        return null;
      }));
    }
    return loops.get(key);
  }

  function fadeOutMusic(seconds) {
    if (!music) return;
    const { source, gain } = music;
    music = null;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + seconds);
    try { source.stop(now + seconds + 0.05); } catch (error) { /* already stopped */ }
  }

  function setCrackle(level, seconds = 0.05) {
    crackleLevel = level;
    if (ctx) crackleGain.gain.setTargetAtTime(level, ctx.currentTime, seconds / 3);
  }

  /* A short soft sound: the needle landing, lifting, the record settling */
  function thump(freq, gain, decay, clickGain = 0.1) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + decay);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + decay);
    osc.connect(env).connect(master);
    osc.start(now);
    osc.stop(now + decay + 0.05);
    if (clickGain > 0) {
      const src = ctx.createBufferSource();
      src.buffer = crackleSource.buffer;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(clickGain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      src.connect(lp).connect(g).connect(master);
      src.start(now, 0.37);
      src.stop(now + 0.06);
    }
  }

  /* Start an album's track. fade: how long the old music takes to hand
     over; lead: a moment of groove before the music (when the needle drops) */
  async function start(album, track, { fade = 0.1, lead = 0 } = {}) {
    if (!ensure()) return;
    const key = `${album.id}#${track}`;
    if (music && music.key === key && wantKey === key) return; // already playing
    wantKey = key;
    const buffer = await loopFor(album, track);
    if (!buffer || wantKey !== key) return; // something else was asked for meanwhile
    fadeOutMusic(fade);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = Math.max(0, lastRate);
    const gain = ctx.createGain();
    source.connect(gain).connect(musicGain);
    const at = ctx.currentTime + lead;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(1, at + Math.max(0.12, fade));
    source.start(at);
    music = { source, gain, key };
  }

  return {
    get enabled() { return enabled; },
    /* is music meant to be playing? */
    get playing() { return !!wantKey; },

    /* Call from a click / key press: browsers only start audio then */
    unlock() {
      if (!enabled) return;
      if (!ensure()) return;
      if (ctx.state === "suspended") ctx.resume();
    },

    setEnabled(on) {
      enabled = !!on;
      try { localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off"); } catch (error) { /* private mode */ }
      if (enabled) this.unlock();
      if (ctx) master.gain.setTargetAtTime(enabled ? VOLUME : 0, ctx.currentTime, 0.05);
    },

    /* Start making a loop now, so it's ready when it's wanted */
    prepare(album, track = 0) {
      if (!enabled || !ensure()) return;
      if (track >= 0 && track < Math.max(1, (album.tracks || []).length)) loopFor(album, track);
    },

    /* The needle lands on a track: a soft thump, crackle, then the music */
    needleDown(album, track) {
      if (!ensure()) return;
      thump(70, 0.3, 0.2, 0.12);
      setCrackle(0.55, 0.05);
      start(album, track, { fade: 0.05, lead: 0.5 });
    },

    /* Move smoothly to another track (or album) without lifting the needle */
    crossfade(album, track, seconds = 2.5) {
      if (!ensure()) return;
      start(album, track, { fade: seconds });
    },

    /* The needle lifts: the music and crackle stop */
    needleUp() {
      wantKey = null;
      if (!ctx) return;
      fadeOutMusic(0.08);
      setCrackle(0, 0.05);
      thump(1800, 0.015, 0.03, 0.05);
    },

    /* Stop gently (no needle sounds) */
    stop(seconds = 1) {
      wantKey = null;
      if (!ctx) return;
      fadeOutMusic(seconds);
      setCrackle(0, seconds);
    },

    /* Quieter crackle while reading a project (it's background music then) */
    setBackground(on) {
      if (ctx && wantKey) setCrackle(on ? 0.2 : 0.55, 1);
    },

    /* The record lands on the platter */
    settle() { thump(55, 0.22, 0.3, 0.03); },

    /* Called every frame with how fast the record turns (1 = normal),
       and whether a hand is on it */
    setRate(rate, held) {
      if (!ctx) return;
      const now = ctx.currentTime;
      const playback = Math.max(0, Math.min(2.6, rate));
      if (Math.abs(playback - lastRate) > 0.004) {
        if (music) music.source.playbackRate.setTargetAtTime(playback, now, 0.015);
        crackleSource.playbackRate.setTargetAtTime(Math.max(0.05, playback), now, 0.02);
        lastRate = playback;
      }
      // scratch noise only while a hand moves the record off its speed
      const amount = held ? Math.min(1, Math.abs(rate - 1) * 0.5) * (Math.abs(rate) > 0.08 ? 1 : 0) : 0;
      scratchGain.gain.setTargetAtTime(amount * 0.16, now, 0.012);
      scratchFilter.frequency.setTargetAtTime(500 + Math.min(4, Math.abs(rate)) * 700, now, 0.012);
    },

    /* For testing: what is the sound doing? */
    debug() {
      return { context: ctx ? ctx.state : "none", playing: music ? music.key : null, rate: +lastRate.toFixed(3), made: [...loops.keys()] };
    },

    /* Leaving: fade everything */
    fadeOut(seconds = 0.4) {
      if (!ctx) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, seconds / 3);
    },
  };
}
