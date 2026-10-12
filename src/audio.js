// Audio: Tone.js instruments per robot, a step clock on the Transport, and Tone.Draw callbacks
// so every robot's dance move is triggered on the exact frame its note sounds.
import * as Tone from 'tone';
import { midiToFreq } from './music.js';
import { FAMILIES } from './catalog.js';

const PIANO_NOTES = ['A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A6', 'C7'];
const REVERB_SEND = { piano: 0.25, keys: 0.25, synth: 0.2, pad: 0.45, brass: 0.2, pluck: 0.3, bass: 0.03, drum: 0.08, perc: 0.12 };

const poly = (voice, opts, max = 8) => { const p = new Tone.PolySynth(voice, opts); p.maxPolyphony = max; return p; };
const safe = (fn) => { try { fn(); } catch { /* a monophonic voice re-triggered at the same instant: skip */ } };

/** Build one robot's instrument. Returns { out, play(time, midi, dur, vel), dispose }. */
function buildVoice(preset, pianoBuffers) {
  const nodes = [];
  const keep = (n) => (nodes.push(n), n);
  const chain = (src, ...fx) => { keep(src); fx.forEach(keep); if (fx.length) src.chain(...fx); return fx.length ? fx[fx.length - 1] : src; };
  const tonal = (src, ...fx) => ({ out: chain(src, ...fx), play: (t, m, d, v) => safe(() => src.triggerAttackRelease(midiToFreq(m), d, t, v)) });
  const drum = (src, note, ...fx) => ({ out: chain(src, ...fx), play: (t, m, d, v) => safe(() => src.triggerAttackRelease(note * Math.pow(2, (m - 60) / 12), d, t, v)) });
  let v;
  const sampler = () => (pianoBuffers ? new Tone.Sampler({ urls: pianoBuffers, release: 1.2 }) : poly(Tone.FMSynth, { harmonicity: 2, modulationIndex: 1.6, envelope: { attack: 0.002, decay: 1.4, sustain: 0.1, release: 1 }, modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0 } }, 12));
  switch (preset) {
    // piano
    case 'grand': v = tonal(sampler()); break;
    case 'upright': v = tonal(sampler(), new Tone.Filter(2600, 'lowpass')); break;
    case 'honky': v = tonal(sampler(), new Tone.Chorus(5, 2, 0.6).start()); break;
    case 'toy': v = tonal(poly(Tone.FMSynth, { harmonicity: 3.5, modulationIndex: 9, envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.3 }, modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0 }, volume: -6 })); break;
    case 'celesta': v = tonal(poly(Tone.FMSynth, { harmonicity: 7, modulationIndex: 2, envelope: { attack: 0.001, decay: 1.3, sustain: 0, release: 1 }, modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0 }, volume: -6 })); break;
    case 'harpsichord': v = tonal(poly(Tone.Synth, { oscillator: { type: 'pulse', width: 0.18 }, envelope: { attack: 0.001, decay: 0.7, sustain: 0, release: 0.3 }, volume: -16 }), new Tone.Filter(350, 'highpass')); break;
    // keys
    case 'rhodes': v = tonal(poly(Tone.FMSynth, { harmonicity: 1, modulationIndex: 3.5, envelope: { attack: 0.002, decay: 1.3, sustain: 0.2, release: 0.9 }, modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0 }, volume: -8 }), new Tone.Tremolo(4, 0.25).start()); break;
    case 'marimba': v = tonal(poly(Tone.FMSynth, { harmonicity: 3.01, modulationIndex: 2, envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.3 }, modulationEnvelope: { attack: 0.001, decay: 0.08, sustain: 0 }, volume: -4 })); break;
    case 'organ': v = tonal(poly(Tone.Synth, { oscillator: { type: 'custom', partials: [1, 0.7, 0.35, 0, 0.25, 0, 0, 0.12] }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.12 }, volume: -14 })); break;
    case 'vibes': v = tonal(poly(Tone.FMSynth, { harmonicity: 4, modulationIndex: 1.3, envelope: { attack: 0.001, decay: 1.8, sustain: 0, release: 1.2 }, modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0 }, volume: -6 }), new Tone.Tremolo(5.5, 0.45).start()); break;
    case 'clav': v = tonal(poly(Tone.MonoSynth, { oscillator: { type: 'pulse', width: 0.3 }, filter: { Q: 4, type: 'lowpass' }, filterEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.1, baseFrequency: 500, octaves: 3.5 }, envelope: { attack: 0.001, decay: 0.25, sustain: 0.1, release: 0.1 }, volume: -12 })); break;
    // lead synths
    case 'sawLead': v = tonal(poly(Tone.MonoSynth, { oscillator: { type: 'sawtooth' }, filter: { Q: 2 }, filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, baseFrequency: 400, octaves: 4 }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 }, volume: -14 })); break;
    case 'squareLead': v = tonal(poly(Tone.MonoSynth, { oscillator: { type: 'square' }, filter: { Q: 1 }, filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.6, baseFrequency: 700, octaves: 3 }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.7, release: 0.2 }, volume: -16 })); break;
    case 'fatLead': v = tonal(poly(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 30 }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 }, volume: -18 }), new Tone.Filter(3800, 'lowpass')); break;
    case 'chip': v = tonal(poly(Tone.Synth, { oscillator: { type: 'pulse', width: 0.25 }, envelope: { attack: 0, decay: 0.1, sustain: 0.45, release: 0.05 }, volume: -18 })); break;
    case 'sine': v = tonal(poly(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.04, decay: 0.1, sustain: 0.8, release: 0.3 }, volume: -6 }), new Tone.Vibrato(5.5, 0.12)); break;
    case 'arp': v = tonal(poly(Tone.Synth, { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.1 }, volume: -12 }), new Tone.Filter(2600, 'lowpass'), new Tone.FeedbackDelay(0.19, 0.3)); break;
    case 'portaLead': v = tonal(poly(Tone.MonoSynth, { portamento: 0.04, oscillator: { type: 'fatsawtooth', count: 2, spread: 18 }, filter: { Q: 2 }, filterEnvelope: { attack: 0.02, decay: 0.4, sustain: 0.6, baseFrequency: 500, octaves: 3.5 }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.4 }, volume: -18 })); break;
    // chord pads
    case 'warmPad': v = tonal(poly(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 20 }, envelope: { attack: 0.35, decay: 0.3, sustain: 0.8, release: 1.4 }, volume: -20 }, 12), new Tone.Filter(1300, 'lowpass')); break;
    case 'glassPad': v = tonal(poly(Tone.AMSynth, { harmonicity: 2, envelope: { attack: 0.3, decay: 0.5, sustain: 0.7, release: 1.6 }, volume: -12 }, 12)); break;
    case 'choir': v = tonal(poly(Tone.Synth, { oscillator: { type: 'fattriangle', count: 3, spread: 25 }, envelope: { attack: 0.45, decay: 0.2, sustain: 0.9, release: 1.5 }, volume: -12 }, 12), new Tone.Filter(2200, 'lowpass'), new Tone.Chorus(2, 3, 0.5).start()); break;
    case 'strings': v = tonal(poly(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 14 }, envelope: { attack: 0.25, decay: 0.2, sustain: 0.9, release: 1 }, volume: -20 }, 12), new Tone.Filter(2600, 'lowpass')); break;
    case 'shimmer': v = tonal(poly(Tone.FMSynth, { harmonicity: 2, modulationIndex: 1.2, envelope: { attack: 0.4, decay: 0.4, sustain: 0.7, release: 2 }, volume: -12 }, 12), new Tone.FeedbackDelay(0.3, 0.35)); break;
    // brass
    case 'trumpet': v = tonal(poly(Tone.MonoSynth, { oscillator: { type: 'sawtooth' }, filter: { Q: 1 }, filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.7, baseFrequency: 320, octaves: 3.4 }, envelope: { attack: 0.04, decay: 0.1, sustain: 0.8, release: 0.15 }, volume: -14 })); break;
    case 'tuba': v = tonal(poly(Tone.MonoSynth, { oscillator: { type: 'sawtooth' }, filter: { Q: 1 }, filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.6, baseFrequency: 140, octaves: 2.6 }, envelope: { attack: 0.03, decay: 0.1, sustain: 0.8, release: 0.15 }, volume: -8 })); break;
    case 'trombone': v = tonal(poly(Tone.MonoSynth, { portamento: 0.05, oscillator: { type: 'sawtooth' }, filter: { Q: 1 }, filterEnvelope: { attack: 0.07, decay: 0.2, sustain: 0.6, baseFrequency: 220, octaves: 3 }, envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.2 }, volume: -12 })); break;
    case 'horns': v = tonal(poly(Tone.Synth, { oscillator: { type: 'fatsawtooth', count: 3, spread: 12 }, envelope: { attack: 0.08, decay: 0.2, sustain: 0.8, release: 0.3 }, volume: -20 }), new Tone.Filter(1700, 'lowpass')); break;
    case 'sax': v = tonal(poly(Tone.MonoSynth, { oscillator: { type: 'square' }, filter: { Q: 3 }, filterEnvelope: { attack: 0.03, decay: 0.2, sustain: 0.6, baseFrequency: 450, octaves: 2.6 }, envelope: { attack: 0.03, decay: 0.1, sustain: 0.8, release: 0.15 }, volume: -16 }), new Tone.Vibrato(5, 0.08)); break;
    // plucked strings (PluckSynth is monophonic: round-robin a small pool)
    case 'guitar': case 'banjo': case 'koto': case 'uke': {
      const o = { guitar: { dampening: 3200, resonance: 0.97 }, banjo: { dampening: 6500, resonance: 0.9 }, koto: { dampening: 2400, resonance: 0.985 }, uke: { dampening: 4800, resonance: 0.93 } }[preset];
      const bus = keep(new Tone.Gain(1.6)), pool = [0, 1, 2, 3].map(() => keep(new Tone.PluckSynth({ attackNoise: 1.2, ...o }).connect(bus)));
      let k = 0;
      v = { out: bus, play: (t, m) => safe(() => pool[k++ % pool.length].triggerAttack(midiToFreq(m), t)) };
      break;
    }
    case 'harp': v = tonal(poly(Tone.FMSynth, { harmonicity: 2, modulationIndex: 0.6, envelope: { attack: 0.002, decay: 1.6, sustain: 0, release: 1.2 }, modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0 }, volume: -6 })); break;
    // bass
    case 'moog': v = tonal(poly(Tone.MonoSynth, { oscillator: { type: 'sawtooth' }, filter: { Q: 3 }, filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.3, baseFrequency: 120, octaves: 3 }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.2 }, volume: -8 })); break;
    case 'sub': v = tonal(poly(Tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.2 }, volume: 0 })); break;
    case 'acid': v = tonal(poly(Tone.MonoSynth, { oscillator: { type: 'square' }, filter: { Q: 10 }, filterEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.1, baseFrequency: 200, octaves: 4 }, envelope: { attack: 0.002, decay: 0.2, sustain: 0.5, release: 0.1 }, volume: -14 })); break;
    case 'wobble': v = tonal(poly(Tone.MonoSynth, { oscillator: { type: 'sawtooth' }, filter: { Q: 2 }, filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.8, baseFrequency: 200, octaves: 2 }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.2 }, volume: -8 }), new Tone.AutoFilter('8n', 180, 3).start()); break;
    case 'fmBass': v = tonal(poly(Tone.FMSynth, { harmonicity: 1, modulationIndex: 5, envelope: { attack: 0.002, decay: 0.3, sustain: 0.4, release: 0.2 }, modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.1 }, volume: -6 })); break;
    // drums (frequencies are the base pitch; robot "pitch" shifts them)
    case 'kick': v = drum(new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6, envelope: { attack: 0.001, decay: 0.4, sustain: 0 }, volume: 2 }), 50); break;
    case 'kick808': v = drum(new Tone.MembraneSynth({ pitchDecay: 0.09, octaves: 4, envelope: { attack: 0.001, decay: 1.1, sustain: 0 }, volume: 2 }), 42); break;
    case 'tomHi': v = drum(new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 2, envelope: { attack: 0.001, decay: 0.3, sustain: 0 }, volume: -4 }), 196); break;
    case 'tomLo': v = drum(new Tone.MembraneSynth({ pitchDecay: 0.025, octaves: 2, envelope: { attack: 0.001, decay: 0.45, sustain: 0 }, volume: -2 }), 98); break;
    case 'conga': v = drum(new Tone.MembraneSynth({ pitchDecay: 0.008, octaves: 1.5, envelope: { attack: 0.001, decay: 0.25, sustain: 0 }, volume: -6 }), 220); break;
    case 'snare': case 'rim': {
      const rim = preset === 'rim';
      const body = keep(new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 1.5, envelope: { attack: 0.001, decay: rim ? 0.05 : 0.12, sustain: 0 }, volume: rim ? -10 : -8 }));
      const noise = keep(new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: rim ? 0.04 : 0.18, sustain: 0 }, volume: rim ? -12 : -8 }));
      const out = keep(new Tone.Gain(1)), hp = keep(new Tone.Filter(rim ? 3000 : 1200, rim ? 'bandpass' : 'highpass'));
      body.connect(out); noise.chain(hp, out);
      v = { out, play: (t, m, d, vel) => { const f = Math.pow(2, (m - 60) / 12); safe(() => body.triggerAttackRelease((rim ? 330 : 190) * f, 0.1, t, vel)); safe(() => noise.triggerAttackRelease(0.15, t, vel)); } };
      break;
    }
    case 'hat': v = drum(new Tone.MetalSynth({ harmonicity: 5.1, modulationIndex: 32, resonance: 4200, octaves: 1.5, envelope: { attack: 0.001, decay: 0.06, release: 0.02 }, volume: -22 }), 320); break;
    case 'tambourine': v = drum(new Tone.MetalSynth({ harmonicity: 8, modulationIndex: 20, resonance: 6000, octaves: 1, envelope: { attack: 0.001, decay: 0.22, release: 0.05 }, volume: -22 }), 450); break;
    case 'shaker': {
      const n = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.006, decay: 0.07, sustain: 0 }, volume: -14 });
      v = { out: chain(n, new Tone.Filter(5200, 'highpass')), play: (t, m, d, vel) => safe(() => n.triggerAttackRelease(0.06, t, vel)) };
      break;
    }
    case 'clap': {
      const n = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 }, volume: -6 });
      v = { out: chain(n, new Tone.Filter(1300, 'bandpass')), play: (t, m, d, vel) => [0, 0.011, 0.023].forEach((o) => safe(() => n.triggerAttackRelease(0.1, t + o, vel))) };
      break;
    }
    case 'cowbell': {
      const s = poly(Tone.Synth, { oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.05 }, volume: -18 }, 4);
      v = { out: chain(s, new Tone.Filter(2000, 'bandpass')), play: (t, m, d, vel) => { const f = Math.pow(2, (m - 60) / 12); safe(() => s.triggerAttackRelease([540 * f, 800 * f], 0.2, t, vel)); } };
      break;
    }
    default: v = tonal(poly(Tone.Synth, { volume: -10 }));
  }
  return { ...v, dispose: () => nodes.forEach((n) => n.dispose()) };
}

// ---------------------------------------------------------------- sample bank
// Live Tone.js synths are far too heavy for 50 robots (hundreds of JS-automated oscillators,
// filters and always-running chorus/tremolo/delay effects). Instead every preset is rendered
// once per pitch "anchor" in an OfflineAudioContext (off the main thread), and notes are played
// back as plain AudioBufferSourceNodes, pitched by playbackRate. That costs ~2 native nodes per
// note on the audio thread and almost no main-thread work, so playback survives heavy frames.
const ANCHOR = 4; // render a sample every 4 semitones (max ±2 semitone repitch)
const HOLD = { pad: 2.4 }; // how long the rendered note is held before its release
const TAIL = { pad: 2.2, piano: 1.4, pluck: 1.6, keys: 1.2, drum: 0, perc: 0 };
const PERCUSSIVE = new Set(['drum', 'perc', 'pluck']);
const REL_TC = { pad: 0.35, piano: 0.22, keys: 0.12, brass: 0.05, synth: 0.06, bass: 0.04 };
const MAX_VOICES_PER_ROBOT = 10;
// loudness targets (RMS of the first 300 ms) so every robot sits in the mix regardless of its patch
const TARGET_RMS = { piano: 0.055, keys: 0.045, synth: 0.038, pad: 0.03, brass: 0.042, pluck: 0.05, bass: 0.075, drum: 0.1, perc: 0.035 };
const PRESET_TRIM = { snare: 0.6, rim: 0.45, hat: 0.6, shaker: 0.6, tambourine: 0.75, kick808: 1.1, sub: 0.85, clap: 0.9 };

const anchorOf = (fam, midi) => (fam === 'drum' || fam === 'perc' ? 60 : Math.round(midi / ANCHOR) * ANCHOR);
const renderLen = (fam, preset) => (fam === 'drum' || fam === 'perc' ? (preset === 'kick808' ? 1.4 : 0.8) : (HOLD[fam] || 1.2) + (TAIL[fam] ?? 0.6) + (preset === 'arp' || preset === 'shimmer' ? 1 : 0));

class SampleBank {
  constructor(engine) { this.engine = engine; this.buf = new Map(); this.pending = new Map(); this.queue = []; this.active = 0; this.bytes = 0; this.gains = new Map(); }
  key(preset, anchor) { return preset + ':' + anchor; }
  get(preset, anchor) { return this.buf.get(this.key(preset, anchor)); }
  /** Best available sample for a note: exact anchor, else the nearest rendered anchor of that preset. */
  find(preset, fam, midi) {
    const a = anchorOf(fam, midi);
    const hit = this.get(preset, a);
    if (hit) return { buffer: hit, anchor: a };
    let best = null;
    for (let d = ANCHOR; d <= 36 && !best; d += ANCHOR) for (const x of [a - d, a + d]) { const b = this.get(preset, x); if (b && !best) best = { buffer: b, anchor: x }; }
    return best;
  }
  /** Queue a render (priority = lower runs first). Resolves when the sample exists. */
  want(preset, fam, midi, priority = 1) {
    const anchor = anchorOf(fam, midi), k = this.key(preset, anchor);
    if (this.buf.has(k)) return Promise.resolve();
    let p = this.pending.get(k);
    if (p) { if (priority < p.priority) { p.priority = priority; this.queue.sort((x, y) => x.priority - y.priority); } return p.promise; }
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    p = { k, preset, fam, anchor, priority, promise, resolve };
    this.pending.set(k, p);
    this.queue.push(p);
    this.queue.sort((x, y) => x.priority - y.priority);
    this._pump();
    return promise;
  }
  get busy() { return this.pending.size; }
  _pump() {
    while (this.active < 3 && this.queue.length) {
      const job = this.queue.shift();
      this.active++;
      this._render(job).catch((e) => console.warn('render failed', job.k, e)).finally(() => {
        this.active--; this.pending.delete(job.k); job.resolve(); this._pump();
        this.engine.onBankProgress && this.engine.onBankProgress(this.pending.size);
      });
    }
  }
  async _render({ k, preset, fam, anchor }) {
    const len = renderLen(fam, preset), hold = HOLD[fam] || 1.2;
    const pianoBuffers = this.engine.pianoBuffers;
    // Build the patch inside an offline context synchronously (several renders run in parallel,
    // so the global context must never be left swapped across an await), then render it.
    const real = Tone.getContext();
    const ctx = new Tone.OfflineContext(1, len, real.sampleRate);
    Tone.setContext(ctx);
    try {
      const v = buildVoice(preset, pianoBuffers);
      v.out.toDestination();
      v.play(0.005, anchor, PERCUSSIVE.has(fam) ? 0.3 : hold, 0.85);
    } finally { Tone.setContext(real); }
    const ab = await ctx.render();
    // trim trailing silence so short notes don't hold big buffers
    const d = ab.getChannelData(0);
    let end = d.length - 1;
    while (end > 0 && Math.abs(d[end]) < 1e-4) end--;
    const n = Math.min(d.length, end + 256);
    const raw = Tone.getContext().rawContext;
    const trimmed = raw.createBuffer(1, Math.max(1, n), ab.sampleRate);
    trimmed.copyToChannel(d.subarray(0, n), 0);
    // 4 ms fade-out so a cut never clicks
    const ch = trimmed.getChannelData(0), f = Math.min(n, Math.round(ab.sampleRate * 0.004));
    for (let i = 0; i < f; i++) ch[n - 1 - i] *= i / f;
    // loudness-normalise: one gain per preset (from its first render) so pitch dynamics stay natural
    if (!this.gains.has(preset)) {
      const w = Math.min(n, Math.round(ab.sampleRate * 0.3));
      let ss = 0, pk = 0;
      for (let i = 0; i < w; i++) ss += ch[i] * ch[i];
      for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(ch[i]));
      const rms = Math.sqrt(ss / Math.max(1, w)) || 1e-3;
      let gain = ((TARGET_RMS[fam] || 0.08) * (PRESET_TRIM[preset] || 1)) / rms;
      gain = Math.min(gain, 12, 0.95 / Math.max(pk, 1e-3));
      this.gains.set(preset, gain);
    }
    const gain = this.gains.get(preset);
    for (let i = 0; i < n; i++) ch[i] *= gain;
    this.buf.set(k, trimmed);
    this.bytes += n * 4;
  }
}

export class AudioEngine {
  constructor() {
    this.ready = false;
    this.voices = new Map(); // robot uid → { gain, pan, send, live: [{ src, g, end }] }
    this.bank = new SampleBank(this);
    this.step = 0;
    this.abs = 0; // steps since play (for the dance clock)
    this.playing = false;
    this.onStep = null; // (step, events, dur, absStep) called on the animation frame of that step (visuals)
    this.onLogicStep = null; // (step) called on the audio clock for every step (game logic)
    this.onEnded = null;
    this.onLoop = null;
    this.onBankProgress = null;
    this.volume = 0;
  }

  async init() {
    if (this.ready) return;
    // "balanced" output buffering + a generous scheduling look-ahead: notes are queued 150 ms
    // ahead on the audio thread, so a slow 3D frame on the main thread can't make them late.
    if (Tone.getContext().state !== 'running') {
      try { Tone.setContext(new Tone.Context({ latencyHint: 'balanced', lookAhead: 0.15 })); } catch { /* keep default */ }
    }
    await Tone.start();
    Tone.getContext().lookAhead = 0.15;
    Tone.getDraw().expiration = 0.5;
    const raw = (this.raw = Tone.getContext().rawContext);
    this.master = new Tone.Volume(this.volume);
    const comp = new Tone.Compressor(-16, 3), limiter = new Tone.Limiter(-1);
    this.master.chain(comp, limiter, Tone.getDestination());
    this.reverb = new Tone.Reverb({ decay: 2.6, preDelay: 0.02, wet: 1 }).connect(this.master);
    this.applauseNoise = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.3, decay: 1.2, sustain: 0.4, release: 1.5 }, volume: -18 }).connect(new Tone.Filter(2500, 'bandpass').connect(this.master));
    this.chime = poly(Tone.FMSynth, { harmonicity: 3, modulationIndex: 2, envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.6 }, volume: -10 }, 6);
    this.chime.connect(this.reverb); this.chime.connect(this.master);
    // native entry points for the per-robot strips
    this.masterIn = raw.createGain(); Tone.connect(this.masterIn, this.master);
    this.reverbIn = raw.createGain(); Tone.connect(this.reverbIn, this.reverb);
    try {
      const base = import.meta.env.BASE_URL + 'samples/piano/';
      const bufs = await Promise.all(PIANO_NOTES.map((n) => Tone.ToneAudioBuffer.fromUrl(base + n + '.mp3')));
      this.pianoBuffers = Object.fromEntries(PIANO_NOTES.map((n, i) => [n.replace('s', '#'), bufs[i]]));
    } catch (e) {
      console.warn('piano samples unavailable, using FM piano', e);
      this.pianoBuffers = null;
    }
    const transport = Tone.getTransport();
    transport.bpm.value = this.song ? this.song.settings.bpm : 110;
    this.ready = true;
    this._reschedule();
    if (this.song) this.syncRobots();
  }

  setSong(song) {
    this.stop();
    this.song = song;
    if (this.ready) { Tone.getTransport().bpm.value = song.settings.bpm; this._reschedule(); this.syncRobots(); }
  }

  /**
   * Make sure every note in the song has a rendered sample. Each robot's most common pitch is
   * rendered first so the whole band can sound (via nearest-sample repitching) within a moment.
   * Resolves when everything is rendered.
   */
  prepare() {
    if (!this.ready || !this.song) return Promise.resolve();
    const song = this.song, first = [], rest = [];
    for (const r of song.robots) {
      const fam = r.def.family, notes = song.visibleNotes(r);
      const mids = notes.length ? notes.map((n) => song.midi(r, n.row)) : [song.isMelodic(r) ? song.baseMidi(r) + 7 : 60];
      const counts = new Map();
      for (const m of mids) { const a = anchorOf(fam, m); counts.set(a, (counts.get(a) || 0) + 1); }
      const ranked = [...counts.entries()].sort((x, y) => y[1] - x[1]);
      first.push(this.bank.want(r.def.preset, fam, ranked[0][0], 0));
      for (const [a] of ranked.slice(1)) rest.push(this.bank.want(r.def.preset, fam, a, 1));
    }
    return Promise.all([...first, ...rest]);
  }
  /** Resolves once every robot has at least one sample (so pressing play is never silent). */
  prepareFirst() {
    if (!this.ready || !this.song) return Promise.resolve();
    const song = this.song;
    return Promise.all(song.robots.map((r) => {
      const fam = r.def.family, notes = song.visibleNotes(r);
      const m = notes.length ? song.midi(r, notes[0].row) : song.isMelodic(r) ? song.baseMidi(r) + 7 : 60;
      return this.bank.find(r.def.preset, fam, m) ? null : this.bank.want(r.def.preset, fam, m, 0);
    }));
  }

  /** Create mixer strips for new robots, drop strips for removed ones, apply volume/pan/mute. */
  syncRobots(panFor = this.panFor) {
    if (!this.ready || !this.song) return;
    this.panFor = panFor;
    const live = new Set(), raw = this.raw, now = raw.currentTime;
    for (const r of this.song.robots) {
      live.add(r.uid);
      let v = this.voices.get(r.uid);
      if (!v) {
        const gain = raw.createGain(), pan = raw.createStereoPanner(), send = raw.createGain();
        gain.connect(pan); pan.connect(this.masterIn); pan.connect(send); send.connect(this.reverbIn);
        send.gain.value = REVERB_SEND[r.def.family] || 0.15;
        v = { gain, pan, send, live: [] };
        this.voices.set(r.uid, v);
      }
      const g = r.muted ? 0 : Math.pow(10, r.volume / 20);
      v.gain.gain.setTargetAtTime(g, now, 0.015);
      if (panFor) v.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, panFor(r))), now, 0.02);
    }
    // ~uncorrelated parts add up as √n: keep a big band from slamming the limiter
    const n = this.song.robots.filter((r) => !r.muted).length;
    const head = Math.min(1, 2.8 / Math.sqrt(Math.max(1, n)));
    this.masterIn.gain.setTargetAtTime(head, now, 0.05);
    this.reverbIn.gain.setTargetAtTime(head, now, 0.05);
    for (const [uid, v] of this.voices) if (!live.has(uid)) {
      v.gain.gain.setTargetAtTime(0, now, 0.02);
      setTimeout(() => { v.gain.disconnect(); v.pan.disconnect(); v.send.disconnect(); }, 200);
      this.voices.delete(uid);
    }
    this.prepare();
  }

  /** Start one note on a robot's strip at audio time t. */
  _note(r, t, midi, len, vel) {
    const v = this.voices.get(r.uid);
    if (!v) return;
    const fam = r.def.family;
    const s = this.bank.find(r.def.preset, fam, midi);
    if (!s) { this.bank.want(r.def.preset, fam, midi, 0); return; }
    if (s.anchor !== anchorOf(fam, midi)) this.bank.want(r.def.preset, fam, midi, 0);
    const raw = this.raw, src = raw.createBufferSource(), g = raw.createGain();
    src.buffer = s.buffer;
    const semis = fam === 'drum' || fam === 'perc' ? r.transpose : midi - s.anchor;
    if (semis) src.playbackRate.value = Math.pow(2, semis / 12);
    g.gain.value = vel / 0.85;
    src.connect(g); g.connect(v.gain);
    src.start(t);
    let end = t + s.buffer.duration / (src.playbackRate.value || 1);
    const tc = REL_TC[fam];
    if (tc && len < (HOLD[fam] || 1.2)) {
      g.gain.setTargetAtTime(0, t + len, tc);
      end = Math.min(end, t + len + tc * 7);
    }
    src.stop(end);
    src.onended = () => { g.disconnect(); };
    // voice cap per robot: fade out the oldest
    v.live = v.live.filter((x) => x.end > t);
    v.live.push({ src, g, end });
    if (v.live.length > MAX_VOICES_PER_ROBOT) {
      const old = v.live.shift();
      try { old.g.gain.setTargetAtTime(0, t, 0.01); old.src.stop(t + 0.06); } catch { /* already stopped */ }
    }
  }

  _reschedule() {
    if (!this.ready || !this.song) return;
    const transport = Tone.getTransport();
    if (this.repeatId != null) transport.clear(this.repeatId);
    const ticks = Math.round(transport.PPQ / this.song.settings.stepsPerBeat);
    this.repeatId = transport.scheduleRepeat((time) => this._tick(time), `${ticks}i`, 0);
    this._spb = this.song.settings.stepsPerBeat;
  }

  _tick(time) {
    const song = this.song;
    if (this._spb !== song.settings.stepsPerBeat) { Tone.getDraw().schedule(() => this._reschedule(), time); }
    if (this.step >= song.steps) this.step = 0;
    const step = this.step;
    if (step === 0 && this._played && !song.settings.loop) {
      Tone.getDraw().schedule(() => { this.stop(); this.onEnded && this.onEnded(); }, time);
      return;
    }
    if (step === 0 && this._played) Tone.getDraw().schedule(() => this.onLoop && this.onLoop(), time);
    // game logic runs on the audio clock (never dropped); visuals go through Tone.Draw below
    if (this.onLogicStep) this.onLogicStep(step);
    const events = song.stepTable()[step] || [];
    const dur = song.stepSeconds;
    for (const e of events) {
      if (e.r.muted) continue;
      const fam = e.r.def.family;
      const len = fam === 'pad' ? dur * 1.9 : fam === 'brass' || fam === 'synth' || fam === 'bass' ? dur * 0.92 : Math.max(dur, 0.25);
      this._note(e.r, time, e.midi, len, 0.85);
    }
    const abs = this.abs;
    Tone.getDraw().schedule(() => this.onStep && this.onStep(step, events, dur, abs), time);
    this.abs++;
    this.step = step + 1;
    if (this.step >= song.steps) { this.step = 0; this._played = true; }
  }

  setBpm(bpm) { if (this.ready) Tone.getTransport().bpm.rampTo(bpm, 0.05); }
  settingsChanged() { if (this.ready) { this.setBpm(this.song.settings.bpm); if (this._spb !== this.song.settings.stepsPerBeat) this._reschedule(); this.syncRobots(); } }
  /** Notes changed: render any new pitches in the background. */
  notesChanged() { if (this.ready) this.prepare(); }

  play() {
    if (!this.ready) return;
    if (this.raw.state !== 'running') this.raw.resume();
    this.step = 0; this.abs = 0; this._played = false; this.playing = true;
    const t = Tone.getTransport();
    t.stop(); t.position = 0; t.start('+0.05');
  }
  stop() {
    this.playing = false;
    if (!this.ready) return;
    Tone.getTransport().stop();
    this.step = 0;
    // quick fade on anything still ringing
    const now = this.raw.currentTime;
    for (const v of this.voices.values()) {
      for (const x of v.live) if (x.end > now) { try { x.g.gain.setTargetAtTime(0, now, 0.03); x.src.stop(now + 0.2); } catch { /* ended */ } }
      v.live = [];
    }
  }

  /** Audition one note right now (when clicking a cell). */
  preview(r, midi) {
    if (!this.ready || r.muted) return;
    const fam = r.def.family;
    if (this.bank.find(r.def.preset, fam, midi)) this._note(r, this.raw.currentTime + 0.01, midi, 0.3, 0.8);
    else { const t0 = performance.now(); this.bank.want(r.def.preset, fam, midi, -1).then(() => { if (performance.now() - t0 < 400) this._note(r, this.raw.currentTime + 0.01, midi, 0.3, 0.8); }); }
  }

  setMasterVolume(db) { this.volume = db; if (this.master) this.master.volume.value = db; }

  applause() {
    if (!this.ready) return;
    const now = Tone.now();
    this.applauseNoise.triggerAttackRelease(2.2, now + 0.05, 0.9);
    [72, 76, 79, 84].forEach((m, i) => this.chime.triggerAttackRelease(midiToFreq(m), 0.4, now + i * 0.09, 0.6));
  }
  /** Small "ding" when a request becomes satisfied. */
  ding(up = true) {
    if (!this.ready) return;
    const now = Tone.now();
    (up ? [79, 84] : [76, 72]).forEach((m, i) => this.chime.triggerAttackRelease(midiToFreq(m), 0.25, now + i * 0.07, 0.35));
  }
}

export { FAMILIES, buildVoice, Tone };
