// Audio/visual load probe: 50-robot free play. Measures sample-bank render time, notes started,
// audio-thread health (late callbacks) and main-thread frame times.   node tests/perf.mjs
import { serve, launch, openPage } from './harness.mjs';
const srv = await serve();
const browser = await launch();
const { page, errors } = await openPage(browser, `http://127.0.0.1:${srv.address().port}/?test&fresh&free`, { width: 1400, height: 860 });
await page.waitForFunction(() => window.RO && window.RO.ready);
await page.mouse.click(5, 5);
const r = await page.evaluate(async () => {
  await RO.ensureAudio();
  RO.openPicker(); document.getElementById('pickAll').click(); document.getElementById('picker').classList.remove('show');
  const t0 = performance.now();
  await RO.audio.prepareFirst(); const first = performance.now() - t0;
  await RO.audio.prepare(); const all = performance.now() - t0;
  let notes = 0, tickMs = 0, ticks = 0, worst = 0; const orig = RO.audio._note.bind(RO.audio), ot = RO.audio._tick.bind(RO.audio);
  RO.audio._note = (...a) => { notes++; return orig(...a); };
  RO.audio._tick = (t) => { const a = performance.now(); ot(t); const d = performance.now() - a; tickMs += d; ticks++; worst = Math.max(worst, d); };
  RO.audio._reschedule();
  // master level meter
  const an = RO.audio.raw.createAnalyser(); an.fftSize = 2048; RO.audio.masterIn.connect(an);
  let peak = 0; const buf = new Float32Array(2048);
  const iv = setInterval(() => { an.getFloatTimeDomainData(buf); for (const x of buf) peak = Math.max(peak, Math.abs(x)); }, 20);
  RO.setPlaying(true);
  await new Promise((res) => setTimeout(res, 4000));
  RO.setPlaying(false); clearInterval(iv);
  return { tickAvgMs: (tickMs / ticks).toFixed(2), tickWorstMs: worst.toFixed(2), masterPeak: peak.toFixed(2), robots: RO.S.song.robots.length, samples: RO.audio.bank.buf.size, mb: (RO.audio.bank.bytes / 1e6).toFixed(1), firstMs: first | 0, allMs: all | 0, notes, lat: RO.audio.raw.baseLatency };
});
console.log(r, errors);
await browser.close(); srv.close();
