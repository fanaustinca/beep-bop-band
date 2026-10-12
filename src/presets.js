// Plain-data facts about each sound preset (no Tone.js import, so the song/level logic runs in Node).

/** Octave shift applied on top of the family's octave, so e.g. the tuba sits below the trumpet. */
export const PRESET_OCTAVE = {
  tuba: -2, trombone: -1, horns: -1, sax: 0,
  toy: 1, celesta: 1, vibes: 0, marimba: 0,
  chip: 0, sine: 0, arp: 0,
  sub: 0, wobble: 0, fmBass: 0,
  harp: 0, koto: 0, banjo: 0, uke: 0,
};

export const PRESET_LABELS = {
  grand: 'Grand piano', upright: 'Upright piano', toy: 'Toy piano', celesta: 'Celesta', honky: 'Honky-tonk piano', harpsichord: 'Harpsichord',
  rhodes: 'Electric piano', marimba: 'Marimba', organ: 'Organ', vibes: 'Vibraphone', clav: 'Clavinet',
  sawLead: 'Saw lead', squareLead: 'Square lead', fatLead: 'Supersaw lead', chip: '8-bit lead', sine: 'Whistle lead', arp: 'Arp pluck', portaLead: 'Glide lead',
  warmPad: 'Warm pad', glassPad: 'Glass pad', choir: 'Choir pad', strings: 'String ensemble', shimmer: 'Shimmer pad',
  trumpet: 'Trumpet', tuba: 'Tuba', trombone: 'Trombone', horns: 'Horn section', sax: 'Saxophone',
  guitar: 'Guitar', harp: 'Harp', banjo: 'Banjo', koto: 'Koto', uke: 'Ukulele',
  moog: 'Analog bass', sub: 'Sub bass', acid: 'Acid bass', wobble: 'Wobble bass', fmBass: 'FM bass',
  kick: 'Kick drum', snare: 'Snare drum', tomHi: 'High tom', kick808: '808 kick', tomLo: 'Floor tom', rim: 'Rimshot',
  hat: 'Hi-hat', shaker: 'Shaker', clap: 'Hand clap', cowbell: 'Cowbell', tambourine: 'Tambourine', conga: 'Conga',
};
