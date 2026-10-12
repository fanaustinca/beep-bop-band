// Song model: the active robots, their step patterns and the global musical settings.
import { FAMILIES, ROBOT_BY_ID } from './catalog.js';
import { SCALES, rowCount, rowToMidi, rng } from './music.js';
import { PRESET_OCTAVE } from './presets.js';

export const DEFAULT_SETTINGS = {
  bpm: 110, scale: 'major', root: 60, octaves: 2,
  beatsPerBar: 4, stepsPerBeat: 2, bars: 2, loop: true,
};

let uidCounter = 1;

export class Song {
  constructor(settings = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.robots = [];
    this.version = 0;
    this._cache = null;
  }

  get steps() { const s = this.settings; return s.bars * s.beatsPerBar * s.stepsPerBeat; }
  get stepsPerBar() { return this.settings.beatsPerBar * this.settings.stepsPerBeat; }
  get scaleLen() { return SCALES[this.settings.scale].steps.length; }
  /** Seconds per step at the current tempo. */
  get stepSeconds() { return 60 / this.settings.bpm / this.settings.stepsPerBeat; }

  touch() { this.version++; this._cache = null; }

  addRobot(id, opts = {}) {
    const def = ROBOT_BY_ID[id];
    if (!def) throw new Error('unknown robot ' + id);
    const r = { uid: uidCounter++, def, notes: new Map(), octave: opts.octave || 0, transpose: opts.transpose || 0, volume: opts.volume || 0, muted: false };
    this.robots.push(r);
    this.touch();
    return r;
  }
  removeRobot(uid) { this.robots = this.robots.filter((r) => r.uid !== uid); this.touch(); }
  robot(uid) { return this.robots.find((r) => r.uid === uid); }

  isMelodic(r) { return FAMILIES[r.def.family].melodic; }
  rows(r) { return this.isMelodic(r) ? rowCount(this.settings.scale, this.settings.octaves) : 1; }
  baseMidi(r) {
    return this.settings.root + FAMILIES[r.def.family].octave * 12 + (PRESET_OCTAVE[r.def.preset] || 0) * 12 + r.octave * 12 + r.transpose;
  }
  midi(r, row) { return this.isMelodic(r) ? rowToMidi(row, this.settings.scale, this.baseMidi(r)) : 60 + r.transpose; }

  has(r, step, row) { const s = r.notes.get(step); return !!s && s.has(row); }
  set(r, step, row, on) {
    let s = r.notes.get(step);
    if (on) { if (!s) r.notes.set(step, (s = new Set())); s.add(row); }
    else if (s) { s.delete(row); if (!s.size) r.notes.delete(step); }
    this.touch();
  }
  clearRobot(r) { r.notes.clear(); this.touch(); }
  clearAll() { for (const r of this.robots) r.notes.clear(); this.touch(); }

  /** Notes that are actually audible with the current grid size (steps/rows may have shrunk). */
  visibleNotes(r) {
    const out = [], steps = this.steps, rows = this.rows(r);
    for (const [step, set] of r.notes) if (step < steps) for (const row of set) if (row < rows) out.push({ step, row });
    out.sort((a, b) => a.step - b.step || a.row - b.row);
    return out;
  }

  /** Per-step list of { r, row, midi } for the sequencer clock; cached until the song changes. */
  stepTable() {
    if (this._cache) return this._cache;
    const table = Array.from({ length: this.steps }, () => []);
    for (const r of this.robots) for (const n of this.visibleNotes(r)) table[n.step].push({ r, row: n.row, midi: this.midi(r, n.row) });
    return (this._cache = table);
  }

  noteCount() { return this.robots.reduce((a, r) => a + this.visibleNotes(r).length, 0); }

  /** Fill a robot with a family-appropriate pattern in the current scale. */
  riff(r, seed = Math.random() * 1e9) {
    r.notes.clear();
    const R = rng(seed), steps = this.steps, spb = this.settings.stepsPerBeat, bar = this.stepsPerBar;
    const rows = this.rows(r), L = this.scaleLen;
    const put = (step, row) => { if (step < steps && row >= 0 && row < rows) { let s = r.notes.get(step); if (!s) r.notes.set(step, (s = new Set())); s.add(row); } };
    const chordRoots = [0, 3, 4, 5].map((d) => Math.min(d, L - 1));
    const chordOf = (barIdx) => chordRoots[Math.floor(R() * 4 + barIdx) % 4];
    const fam = r.def.family, p = r.def.preset;
    if (fam === 'drum') {
      for (let s = 0; s < steps; s++) {
        const inBar = s % bar, beat = inBar / spb;
        if (p.startsWith('kick')) { if (inBar % (spb * 2) === 0 || (R() < 0.15 && s % spb === spb - 1)) put(s, 0); }
        else if (p === 'snare' || p === 'rim') { if (Number.isInteger(beat) && beat % 2 === 1) put(s, 0); }
        else if (inBar >= bar - spb && R() < 0.8) put(s, 0);
      }
    } else if (fam === 'perc') {
      for (let s = 0; s < steps; s++) {
        const inBar = s % bar;
        if (p === 'hat') { if (s % Math.max(1, spb / 2) === 0 || R() < 0.2) put(s, 0); }
        else if (p === 'shaker') put(s, 0);
        else if (p === 'clap') { if (inBar === spb || inBar === spb * 3) put(s, 0); }
        else if (s % spb !== 0 && R() < 0.4) put(s, 0);
      }
    } else if (fam === 'bass') {
      for (let b = 0; b < steps / bar; b++) {
        const root = chordOf(b);
        for (let s = 0; s < bar; s += spb) if (s === 0 || R() < 0.5) put(b * bar + s, (s / spb) % 2 && R() < 0.5 ? root + 4 : root);
      }
    } else if (fam === 'pad') {
      for (let b = 0; b < steps / bar; b++) { const root = chordOf(b); for (const d of [0, 2, 4]) put(b * bar, root + d); }
    } else if (fam === 'brass') {
      for (let b = 0; b < steps / bar; b++) {
        const root = chordOf(b) + L;
        put(b * bar + spb, root); put(b * bar + spb, root + 2);
        if (R() < 0.6) put(b * bar + spb * 3 - 1, root + 4);
      }
    } else if (fam === 'synth') {
      let row = L + Math.floor(R() * 3);
      for (let s = 0; s < steps; s++) if (R() < 0.45) { row = Math.max(0, Math.min(rows - 1, row + Math.floor(R() * 5) - 2)); put(s, row); }
    } else {
      // piano, keys, pluck: broken-chord arpeggios
      for (let b = 0; b < steps / bar; b++) {
        const root = chordOf(b), tones = [0, 2, 4, L];
        for (let s = 0; s < bar; s++) if (s % Math.max(1, spb / 2) === 0 && R() < 0.8) put(b * bar + s, root + tones[s % tones.length]);
      }
    }
    if (!r.notes.size) put(0, 0);
    this.touch();
  }

  serialize() {
    return {
      settings: this.settings,
      robots: this.robots.map((r) => ({ id: r.def.id, octave: r.octave, transpose: r.transpose, volume: r.volume, muted: r.muted, notes: this.visibleNotes(r).map((n) => [n.step, n.row]) })),
    };
  }
  static deserialize(data) {
    const s = new Song(data.settings);
    for (const d of data.robots || []) {
      if (!ROBOT_BY_ID[d.id]) continue;
      const r = s.addRobot(d.id, d);
      r.muted = !!d.muted;
      for (const [step, row] of d.notes || []) s.set(r, step, row, true);
    }
    return s;
  }
}
