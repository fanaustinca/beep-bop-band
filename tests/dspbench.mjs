// DSP cost: render 4 s of the 50-robot "Everybody Jam" offline with (a) the old approach — one live
// Tone.js synth per robot — and (b) the sample engine (one AudioBufferSourceNode per note).
//   node tests/dspbench.mjs
import { serve, launch, openPage } from './harness.mjs';
const srv = await serve(); const browser = await launch();
const { page } = await openPage(browser, `http://127.0.0.1:${srv.address().port}/?test&fresh`, { width: 1000, height: 700 });
await page.waitForFunction(() => window.RO && window.RO.ready);
await page.mouse.click(5, 5);
console.log(await page.evaluate(async () => {
  const { Tone, buildVoice } = RO.dev;
  await RO.ensureAudio();
  await RO.loadSong(RO.buildSong(RO.SONGS.find((s) => s.id === 'jam')), { name: 'jam' });
  await RO.audio.prepare();
  const song = RO.S.song, SEC = 4, table = song.stepTable(), dur = song.stepSeconds;
  const notes = [];
  for (let s = 0, t = 0.05; t < SEC - 0.5; s++, t += dur) for (const e of table[s % song.steps]) notes.push({ t, e });
  // (a) live synths
  const real = Tone.getContext();
  const ctx = new Tone.OfflineContext(2, SEC, real.sampleRate);
  Tone.setContext(ctx);
  const voices = new Map();
  for (const r of song.robots) { const v = buildVoice(r.def.preset, RO.audio.pianoBuffers); const ch = new Tone.Channel().toDestination(); v.out.connect(ch); voices.set(r.uid, v); }
  for (const { t, e } of notes) voices.get(e.r.uid).play(t, e.midi, dur, 0.85);
  Tone.setContext(real);
  let t0 = performance.now(); await ctx.render(); const live = performance.now() - t0;
  // (b) samples
  const off = new OfflineAudioContext(2, SEC * real.sampleRate, real.sampleRate);
  const strips = new Map();
  for (const r of song.robots) { const g = off.createGain(), p = off.createStereoPanner(); g.connect(p); p.connect(off.destination); strips.set(r.uid, g); }
  for (const { t, e } of notes) {
    const s = RO.audio.bank.find(e.r.def.preset, e.r.def.family, e.midi); if (!s) continue;
    const src = off.createBufferSource(), g = off.createGain(); src.buffer = s.buffer; src.playbackRate.value = Math.pow(2, (e.midi - s.anchor) / 12);
    src.connect(g); g.connect(strips.get(e.r.uid)); src.start(t); g.gain.setTargetAtTime(0, t + dur, 0.05); src.stop(t + Math.min(s.buffer.duration, dur + 0.4));
  }
  t0 = performance.now(); await off.startRendering(); const sampled = performance.now() - t0;
  return { notes: notes.length, seconds: SEC, liveSynthRenderMs: live | 0, sampleRenderMs: sampled | 0, speedup: (live / sampled).toFixed(1) + 'x', liveRealtimeLoad: (live / (SEC * 10)).toFixed(0) + '% of one core', sampleRealtimeLoad: (sampled / (SEC * 10)).toFixed(1) + '% of one core' };
}));
await browser.close(); srv.close();
