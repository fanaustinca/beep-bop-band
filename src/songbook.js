// The Song Book: premade happy songs, written as little pattern scripts.
//
// Each part is a string with one token per grid step (bars may be separated with "|", which is
// ignored). A part shorter than the song repeats to fill it.
//   .        rest
//   4        melodic robots: a scale row (0 = the robot's start note, 7 = an octave up in major)
//   0+2+4    a chord (several rows on the same step)
//   x        drum / percussion hit
// Part options: { p: 'pattern', oct: octave shift, vol: dB }
// Songs with `make()` build their parts in code (used for the 50-robot jam).

const SONGS = [
  {
    id: 'sunny', title: 'Sunny Side Up', emoji: '🌞', by: 'Original', blurb: 'A bouncy piano pop tune with a happy bass melody.',
    settings: { bpm: 112, scale: 'major', root: 60, beatsPerBar: 4, stepsPerBeat: 2, bars: 4 },
    parts: {
      pip: '7 . 4 . 5 4 2 . | 4 . 2 . 3 2 0 . | 5 . 7 . 9 . 8 7 | 6 . 4 . 2 . 4 .',
      rumble: '0 . 0 7 . 0 4 . | 5 . 5 12 . 5 2 . | 3 . 3 10 . 3 5 . | 4 . 4 11 . 4 6 .',
      nimbus: { p: '0+2+4 . . . . . . . | 5+7+9 . . . . . . . | 3+5+7 . . . . . . . | 4+6+8 . . . . . . .', vol: -4 },
      thump: 'x . . . x . . x | x . . . x . . .',
      snap: '. . x . . . x .',
      tik: 'x x x x x x x x',
      shaka: { p: '. x . x . x . x', vol: -4 },
    },
  },
  {
    id: 'ode', title: 'Ode to Joy', emoji: '🎼', by: 'Beethoven (public domain)', blurb: 'The classic, played by a grand piano robot with strings and a little beat.',
    settings: { bpm: 120, scale: 'major', root: 60, beatsPerBar: 4, stepsPerBeat: 2, bars: 8 },
    parts: {
      pip: '2 . 2 . 3 . 4 . | 4 . 3 . 2 . 1 . | 0 . 0 . 1 . 2 . | 2 . . 1 1 . . . | 2 . 2 . 3 . 4 . | 4 . 3 . 2 . 1 . | 0 . 0 . 1 . 2 . | 1 . . 0 0 . . .',
      ivory: { p: '0+4 . 7 . 0+4 . 7 . | 4+8 . 6 . 4+8 . 6 . | 0+4 . 7 . 0+4 . 7 . | 4+8 . 6 . 4+8 . 6 .', oct: -1, vol: -6 },
      strings: { p: '0+2+4 . . . . . . . | 4+6+8 . . . . . . . | 0+2+4 . . . . . . . | 4+6+8 . . . . . . . | 0+2+4 . . . . . . . | 4+6+8 . . . . . . . | 0+2+4 . . . . . . . | 4+6+8 . . . 0+2+4 . . .', vol: -6 },
      rumble: '0 . . . 4 . . . | 4 . . . 1 . . . | 0 . . . 4 . . . | 4 . . . 1 . . . | 0 . . . 4 . . . | 4 . . . 1 . . . | 0 . . . 4 . . . | 4 . . . 0 . . .',
      thump: 'x . . . x . . .',
      snap: '. . x . . . x .',
      tik: '. x . x . x . x',
    },
  },
  {
    id: 'twinkle', title: 'Twinkle Twinkle', emoji: '⭐', by: 'Traditional (public domain)', blurb: 'Toy piano and celesta under a starry chord pad.',
    settings: { bpm: 100, scale: 'major', root: 60, beatsPerBar: 4, stepsPerBeat: 2, bars: 8 },
    parts: {
      tinker: '0 . 0 . 4 . 4 . | 5 . 5 . 4 . . . | 3 . 3 . 2 . 2 . | 1 . 1 . 0 . . . | 4 . 4 . 3 . 3 . | 2 . 2 . 1 . . . | 4 . 4 . 3 . 3 . | 2 . 2 . 1 . . .',
      celeste: { p: '. . 7 . . . 11 . | . . 10 . . . 7 . | . . 10 . . . 7 . | . . 8 . . . 7 . | . . 7 . . . 10 . | . . 7 . . . 8 . | . . 7 . . . 10 . | . . 7 . . . 8 .', oct: -1, vol: -6 },
      harpo: '0 2 4 7 4 2 0 2 | 3 5 7 5 0 2 4 2 | 3 5 7 5 0 2 4 2 | 4 6 8 6 0 2 4 2 | 0 2 4 7 3 5 7 5 | 0 2 4 2 4 6 8 6 | 0 2 4 7 3 5 7 5 | 0 2 4 2 4 6 8 6',
      nimbus: { p: '0+2+4 . . . . . . . | 3+5+7 . . . 0+2+4 . . . | 3+5+7 . . . 0+2+4 . . . | 4+6+8 . . . 0+2+4 . . . | 0+2+4 . . . 3+5+7 . . . | 0+2+4 . . . 4+6+8 . . .', vol: -5 },
      subby: '0 . . . . . . . | 3 . . . 0 . . . | 3 . . . 0 . . . | 4 . . . 0 . . . | 0 . . . 3 . . . | 0 . . . 4 . . .',
      shaka: { p: 'x . x . x . x .', vol: -6 },
    },
  },
  {
    id: 'disco', title: 'Robot Disco', emoji: '🪩', by: 'Original', blurb: 'Four-on-the-floor kick, octave bass, offbeat hats and a glittering synth hook.',
    settings: { bpm: 122, scale: 'major', root: 60, beatsPerBar: 4, stepsPerBeat: 2, bars: 4 },
    parts: {
      zap: '4 . 4 7 . 6 4 . | 2 . 2 4 . 2 0 . | 3 . 3 5 . 3 2 . | 1 . 2 4 . 6 7 .',
      rumble: '0 7 0 7 0 7 0 7 | 5 12 5 12 5 12 5 12 | 3 10 3 10 3 10 3 10 | 4 11 4 11 4 11 4 11',
      rhoda: '. 0+2+4 . . . 0+2+4 . . | . 5+7+9 . . . 5+7+9 . . | . 3+5+7 . . . 3+5+7 . . | . 4+6+8 . . . 4+6+8 . .',
      halo: { p: '7+9+11 . . . . . . . | 5+7+9 . . . . . . . | 3+5+7 . . . . . . . | 4+6+8 . . . . . . .', vol: -6 },
      thump: 'x . x . x . x .',
      clapper: '. . x . . . x .',
      tik: '. x . x . x . x',
      tamb: { p: '. . . . . . . x', vol: -3 },
    },
  },
  {
    id: 'susanna', title: 'Oh! Susanna', emoji: '🪕', by: 'Stephen Foster (public domain)', blurb: 'Banjo, tuba oom-pah and a snare shuffle.',
    settings: { bpm: 132, scale: 'major', root: 60, beatsPerBar: 4, stepsPerBeat: 2, bars: 8 },
    parts: {
      banjo: '. . . . . . 0 1 | 2 . 4 . 4 . 5 . | 4 . 2 . 0 . . 1 | 2 . 2 . 1 . 0 . | 1 . . . . . 0 1 | 2 . 4 . 4 . 5 . | 4 . 2 . 0 . . 1 | 2 . 2 . 1 . 1 . | 0 . . . . . . .',
      strum: { p: '0+2+4 . . 0+2+4 . 0+2+4 . . | 0+2+4 . . 0+2+4 . 0+2+4 . . | 0+2+4 . . 0+2+4 . 0+2+4 . . | 4+6+8 . . 4+6+8 . 4+6+8 . . | 0+2+4 . . 0+2+4 . 0+2+4 . . | 0+2+4 . . 0+2+4 . 0+2+4 . . | 0+2+4 . . 0+2+4 . 4+6+8 . . | 0+2+4 . . . . . . .', vol: -5 },
      tuba: '7 . . . 11 . . . | 7 . . . 11 . . . | 7 . . . 11 . . . | 11 . . . 8 . . . | 7 . . . 11 . . . | 7 . . . 11 . . . | 7 . . . 11 . . . | 7 . . . 4 . . .',
      snap: '. . x . . . x x',
      thump: 'x . . . x . . .',
      bell: { p: 'x . . . . . . .', vol: -6 },
    },
  },
  {
    id: 'saints', title: 'When the Saints', emoji: '🎺', by: 'Traditional (public domain)', blurb: 'A marching brass band: trumpet tune, trombone answers, tuba bass.',
    settings: { bpm: 126, scale: 'major', root: 60, beatsPerBar: 4, stepsPerBeat: 2, bars: 8 },
    parts: {
      blare: '. . 0 . 2 . 3 . | 4 . . . . . . . | . . 0 . 2 . 3 . | 4 . . . . . . . | . . 0 . 2 . 3 . | 4 . . . 2 . . . | 0 . . . 2 . . . | 1 . . . . . . .',
      slide: { p: '. . . . . . . . | . . 7 . 9 . 11 . | . . . . . . . . | . . 7 . 9 . 11 . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . 4 . 6 . 8 .', vol: -4 },
      horn: { p: '0+2+4 . . . . . . . | . . . . . . . . | 0+2+4 . . . . . . . | . . . . . . . . | 0+2+4 . . . . . . . | . . . . . . . . | 0+2+4 . . . . . . . | 4+6+8 . . . . . . .', vol: -6 },
      tuba: '7 . . . 11 . . . | 7 . . . 11 . . . | 7 . . . 11 . . . | 7 . . . 11 . . . | 7 . . . 11 . . . | 7 . . . 11 . . . | 7 . . . 11 . . . | 11 . . . 8 . . .',
      snap: 'x . x x x . x . | x . x x x x x x',
      thump: 'x . . . x . . .',
    },
  },
  {
    id: 'island', title: 'Island Breeze', emoji: '🏝️', by: 'Original', blurb: 'Ukulele strums, marimba melody, conga and shaker.',
    settings: { bpm: 104, scale: 'major', root: 62, beatsPerBar: 4, stepsPerBeat: 2, bars: 4 },
    parts: {
      marimbo: '4 . 5 4 2 . 0 . | 3 . 5 . 7 . 5 . | 6 . 4 . 1 . 4 . | 2 . . 0 . . . .',
      uke: '0+2+4 . 0+2+4 0+2+4 . 0+2+4 0+2+4 . | 3+5+7 . 3+5+7 3+5+7 . 3+5+7 3+5+7 . | 4+6+8 . 4+6+8 4+6+8 . 4+6+8 4+6+8 . | 0+2+4 . 0+2+4 0+2+4 . 0+2+4 0+2+4 .',
      subby: '0 . . 0 . . 4 . | 3 . . 3 . . 0 . | 4 . . 4 . . 1 . | 0 . . 0 . . 4 .',
      conga: 'x . . x . . x . | x . . x . x x .',
      shaka: 'x x x x x x x x',
      vibe: { p: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . 7 . 9 .', vol: -4 },
    },
  },
  {
    id: 'chip', title: '8-Bit Adventure', emoji: '👾', by: 'Original', blurb: 'A chiptune quest theme with a racing arpeggio.',
    settings: { bpm: 138, scale: 'major', root: 60, beatsPerBar: 4, stepsPerBeat: 2, bars: 4 },
    parts: {
      chip: '0 . 4 . 7 . 4 7 | 9 . 7 . 4 . 2 . | 3 . 5 . 7 . 9 . | 8 . 7 . 6 . 4 .',
      arp: { p: '0 2 4 7 0 2 4 7 | 5 7 9 12 5 7 9 12 | 3 5 7 10 3 5 7 10 | 4 6 8 11 4 6 8 11', oct: -1, vol: -3 },
      volt: { p: '. . . . . . 7 . | . . . . . . 5 . | . . . . . . 3 . | . . . 4 . 6 7 .', vol: -6 },
      fm: '0 . 0 . 7 . 0 . | 5 . 5 . 12 . 5 . | 3 . 3 . 10 . 3 . | 4 . 4 . 11 . 4 .',
      thump: 'x . . . x . x .',
      snap: '. . x . . . x .',
      tik: 'x x x x x x x x',
    },
  },
  {
    id: 'waltz', title: 'Morning Waltz', emoji: '🌼', by: 'Original', blurb: 'A sunny waltz in 3/4: piano tune, harp, and an oom-pah-pah.',
    settings: { bpm: 132, scale: 'major', root: 60, beatsPerBar: 3, stepsPerBeat: 2, bars: 8 },
    parts: {
      pip: '2 . 4 . 7 . | 6 . . . 5 4 | 5 . 3 . 7 . | 4 . . . . . | 3 . 5 . 8 . | 6 . . . 5 4 | 3 . 2 . 1 . | 0 . . . . .',
      rhoda: { p: '. . 0+2+4 . 0+2+4 . | . . 4+6+8 . 4+6+8 . | . . 3+5+7 . 3+5+7 . | . . 0+2+4 . 0+2+4 . | . . 1+3+5 . 1+3+5 . | . . 4+6+8 . 4+6+8 . | . . 4+6+8 . 4+6+8 . | . . 0+2+4 . 0+2+4 .', vol: -5 },
      subby: '0 . . . . . | 4 . . . . . | 3 . . . . . | 0 . . . . . | 1 . . . . . | 4 . . . . . | 4 . . . . . | 0 . . . . .',
      harpo: { p: '. . . . . 7 | . . . . . 8 | . . . . . 7 | . . . . 9 11 | . . . . . 8 | . . . . . 8 | . . . . . 6 | 7 9 11 14 . .', vol: -6 },
      nimbus: { p: '0+2+4 . . . . . | 4+6+8 . . . . . | 3+5+7 . . . . . | 0+2+4 . . . . . | 1+3+5 . . . . . | 4+6+8 . . . . . | 4+6+8 . . . . . | 0+2+4 . . . . .', vol: -9 },
      shaka: { p: '. . x . x .', vol: -6 },
    },
  },
  {
    id: 'jam', title: 'Everybody Jam!', emoji: '🎉', by: 'Original · all 50 robots', blurb: 'The whole orchestra: every robot plays a part over I–V–vi–IV.',
    settings: { bpm: 116, scale: 'major', root: 60, beatsPerBar: 4, stepsPerBeat: 2, bars: 4 },
    make: bigJam,
  },
];

/** The 50-robot jam: every family gets parts built from the same chord progression. */
function bigJam() {
  const CH = [[0, 2, 4], [4, 6, 8], [5, 7, 9], [3, 5, 7]]; // C G Am F
  const bar = 8, steps = 32;
  const parts = {};
  const gen = (fn) => { const t = []; for (let s = 0; s < steps; s++) { const b = Math.floor(s / bar), i = s % bar, c = CH[b]; const v = fn(s, b, i, c); t.push(v == null ? '.' : Array.isArray(v) ? v.join('+') : String(v)); } return t.join(' '); };
  const hook = [7, null, 4, null, 5, 4, 2, null, 4, null, 6, null, 8, 6, 4, null, 5, null, 7, null, 9, 7, 5, null, 3, null, 5, 4, 3, 2, 1, null];
  // piano
  parts.pip = gen((s) => hook[s]);
  parts.ivory = { p: gen((s, b, i, c) => (i % 2 === 0 ? c[(i / 2) % 3] : null)), oct: -1, vol: -4 };
  parts.tinker = { p: gen((s, b, i, c) => (i === 3 || i === 7 ? c[2] + 7 : null)), vol: -6 };
  parts.celeste = { p: gen((s, b, i, c) => (i === 6 ? c.map((x) => x + 7) : null)), vol: -8 };
  parts.honky = { p: gen((s, b, i, c) => (i === 2 || i === 6 ? c : null)), vol: -8 };
  parts.harpsi = { p: gen((s, b, i, c) => (i % 2 === 1 ? c[i % 3] + 7 : null)), vol: -10 };
  // keys
  parts.rhoda = { p: gen((s, b, i, c) => (i === 1 || i === 5 ? c : null)), vol: -5 };
  parts.marimbo = { p: gen((s, b, i, c) => c[i % 3] + (i >= 4 ? 7 : 0)), vol: -8 };
  parts.keytar = { p: gen((s, b, i, c) => (i === 0 ? c : null)), vol: -10 };
  parts.vibe = { p: gen((s, b, i, c) => (i === 4 ? c[0] + 7 : null)), vol: -6 };
  parts.clav = { p: gen((s, b, i, c) => (i === 3 || i === 7 ? c[1] : null)), vol: -8 };
  // synth
  parts.zap = { p: gen((s) => (s >= 16 ? hook[s] : null)), vol: -3 };
  parts.volt = { p: gen((s, b, i, c) => (i === 6 ? c[2] : i === 7 ? c[2] + 1 : null)), vol: -8 };
  parts.laser = { p: gen((s, b, i, c) => (b === 3 && i >= 4 ? 4 + i - 4 : null)), vol: -6 };
  parts.chip = { p: gen((s, b, i, c) => (i % 4 === 2 ? c[0] + 7 : null)), vol: -10 };
  parts.whistle = { p: gen((s, b, i, c) => (i === 0 ? c[2] + 7 : null)), vol: -8 };
  parts.arp = { p: gen((s, b, i, c) => c[i % 3] + (i % 6 >= 3 ? 7 : 0)), oct: -1, vol: -8 };
  parts.maestro = { p: gen((s) => (s < 16 ? null : hook[s - 16] != null && s % 2 === 0 ? hook[s - 16] : null)), vol: -9 };
  // pads
  parts.nimbus = { p: gen((s, b, i, c) => (i === 0 ? c : null)), vol: -6 };
  parts.halo = { p: gen((s, b, i, c) => (i === 0 ? c.map((x) => x + 7) : null)), vol: -10 };
  parts.choir = { p: gen((s, b, i, c) => (i === 4 ? [c[0] + 7, c[2] + 7] : null)), vol: -10 };
  parts.strings = { p: gen((s, b, i, c) => (i === 0 ? [c[0], c[2]] : null)), vol: -8 };
  parts.glass = { p: gen((s, b, i, c) => (b === 3 && i === 4 ? [11, 13] : null)), vol: -10 };
  // brass
  parts.blare = { p: gen((s, b, i, c) => (i === 2 || i === 3 ? c[2] : null)), vol: -6 };
  parts.horn = { p: gen((s, b, i, c) => (i === 2 ? c : null)), vol: -8 };
  parts.slide = { p: gen((s, b, i, c) => (i === 6 ? c[0] + 7 : null)), vol: -8 };
  parts.sax = { p: gen((s, b, i, c) => (b % 2 === 1 && i >= 4 ? [c[0] + 7, c[1] + 7, c[2] + 7, c[1] + 7][i - 4] : null)), vol: -8 };
  parts.tuba = { p: gen((s, b, i, c) => (i === 0 ? c[0] + 7 : i === 4 ? c[2] + 7 : null)), vol: -6 };
  // strings
  parts.strum = { p: gen((s, b, i, c) => (i === 0 || i === 3 || i === 6 ? c : null)), vol: -6 };
  parts.harpo = { p: gen((s, b, i, c) => c[i % 3] + 7), vol: -10 };
  parts.banjo = { p: gen((s, b, i, c) => (i % 2 === 1 ? c[(i >> 1) % 3] : null)), vol: -10 };
  parts.koto = { p: gen((s, b, i, c) => (i === 7 ? c[1] + 7 : null)), vol: -8 };
  parts.uke = { p: gen((s, b, i, c) => (i === 2 || i === 5 ? c : null)), vol: -8 };
  // bass
  parts.rumble = gen((s, b, i, c) => (i === 0 || i === 3 || i === 6 ? c[0] : null));
  parts.subby = { p: gen((s, b, i, c) => (i === 0 ? c[0] : null)), vol: -4 };
  parts.acid = { p: gen((s, b, i, c) => (i === 5 || i === 7 ? c[0] + 7 : null)), vol: -10 };
  parts.wobble = { p: gen((s, b, i, c) => (b === 3 && i === 4 ? c[0] : null)), vol: -8 };
  parts.fm = { p: gen((s, b, i, c) => (i === 4 ? c[2] : null)), vol: -8 };
  // drums
  parts.thump = 'x . x . x . x .';
  parts.boom = { p: 'x . . . . . . . | . . . . . . . . ', vol: -3 };
  parts.snap = '. . x . . . x .';
  parts.snare2 = { p: '. . . x . . . x', vol: -6 };
  parts.tomtom = { p: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . x x . .', vol: -4 };
  parts.tomlow = { p: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . x x', vol: -4 };
  // percussion
  parts.tik = '. x . x . x . x';
  parts.shaka = { p: 'x x x x x x x x', vol: -6 };
  parts.clapper = '. . x . . . x .';
  parts.bell = { p: 'x . . . . . . .', vol: -6 };
  parts.tamb = { p: '. . . . . . . x', vol: -4 };
  parts.conga = { p: '. . . x . . x .', vol: -4 };
  return parts;
}

/** Turn a pattern string into [[step, row], ...] for a song of `steps` steps. */
export function parsePattern(p, steps) {
  const toks = p.replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean);
  const out = [];
  if (!toks.length) return out;
  for (let s = 0; s < steps; s++) {
    const t = toks[s % toks.length];
    if (t === '.' || t === '-') continue;
    if (t === 'x' || t === 'X') { out.push([s, 0]); continue; }
    for (const n of t.split('+')) { const row = parseInt(n, 10); if (Number.isFinite(row) && row >= 0) out.push([s, row]); }
  }
  return out;
}

/** Build a song script into Song.serialize()-shaped data. */
export function buildSong(def) {
  const st = { bpm: 110, scale: 'major', root: 60, octaves: 2, beatsPerBar: 4, stepsPerBeat: 2, bars: 2, loop: true, ...def.settings };
  const steps = st.bars * st.beatsPerBar * st.stepsPerBeat;
  const parts = def.make ? def.make() : def.parts;
  const robots = Object.entries(parts).map(([id, part]) => {
    const o = typeof part === 'string' ? { p: part } : part;
    return { id, octave: o.oct || 0, transpose: 0, volume: o.vol || 0, muted: false, notes: parsePattern(o.p, steps) };
  });
  // widen the pitch range if a part reaches above it (major: 7 rows per octave + the top root)
  const top = Math.max(0, ...robots.flatMap((r) => r.notes.map((n) => n[1])));
  const perOct = { major: 7, pentatonic: 5, chromatic: 12 }[st.scale] || 7;
  while (st.octaves < 3 && top > st.octaves * perOct) st.octaves++;
  return { settings: st, robots };
}

export { SONGS };
