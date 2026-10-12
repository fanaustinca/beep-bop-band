// Music theory helpers: scales, note names, grid row → MIDI mapping.

export const SCALES = {
  major: { name: 'Major', steps: [0, 2, 4, 5, 7, 9, 11], happy: true },
  pentatonic: { name: 'Pentatonic', steps: [0, 2, 4, 7, 9], happy: true },
  chromatic: { name: 'Chromatic', steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], happy: false },
  minor: { name: 'Minor', steps: [0, 2, 3, 5, 7, 8, 10], happy: false, freeOnly: true },
  minorPent: { name: 'Minor Pentatonic', steps: [0, 3, 5, 7, 10], happy: false, freeOnly: true },
  blues: { name: 'Blues', steps: [0, 3, 5, 6, 7, 10], happy: false, freeOnly: true },
  dorian: { name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10], happy: false, freeOnly: true },
};
export const LEVEL_SCALES = ['major', 'pentatonic', 'chromatic'];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const midiName = (m) => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Number of pitch rows a melodic robot gets: `octaves` full octaves plus the top root. */
export function rowCount(scaleKey, octaves) {
  return SCALES[scaleKey].steps.length * octaves + 1;
}

/** Row 0 is the bottom (the root). Rows climb through the scale. */
export function rowToMidi(row, scaleKey, baseMidi) {
  const s = SCALES[scaleKey].steps;
  const oct = Math.floor(row / s.length);
  return baseMidi + oct * 12 + s[((row % s.length) + s.length) % s.length];
}

export const isRootRow = (row, scaleKey) => row % SCALES[scaleKey].steps.length === 0;

/** Seeded PRNG (mulberry32) so riffs and level prefills are reproducible. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
