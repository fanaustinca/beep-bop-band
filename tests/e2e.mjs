// Headless end-to-end tests (Puppeteer + Chromium/SwiftShader).
//   npm test            build + logic + e2e
//   ONLY=audio npm run test:e2e
import { serve, launch, openPage, test, assert, summary, shot } from './harness.mjs';

const srv = await serve();
const BASE = `http://127.0.0.1:${srv.address().port}/`;
const browser = await launch();
const only = process.env.ONLY;
const T = (name, fn) => (!only || name.toLowerCase().includes(only.toLowerCase()) ? test(name, fn) : null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { page, errors } = await openPage(browser, BASE + '?test&fresh', { width: 1400, height: 860 });
const E = (fn, arg) => page.evaluate(fn, arg);

console.log('\nBoot');
await T('title screen boots with no console errors', async () => {
  assert(await E(() => document.getElementById('title').classList.contains('show')), 'title not shown');
  await shot(page, 'e2e-title.png');
  assert(errors.length === 0, errors.join('\n'));
});

console.log('\nRobots');
await T('all 50 robots build, render, and have unique designs per family', async () => {
  const r = await E(() => {
    RO.stage.lineup();
    RO.stage.update(0.016); RO.stage.render();
    const fams = {};
    for (const e of RO.stage.robots.values()) {
      let meshes = 0; e.bot.root.traverse((o) => o.isMesh && meshes++);
      (fams[e.r.def.family] ||= []).push(meshes);
    }
    return { n: RO.stage.robots.size, fams };
  });
  assert(r.n === 50, 'expected 50 robots, got ' + r.n);
  const sig = Object.entries(r.fams).map(([f, m]) => f + ':' + m[0]);
  assert(Object.keys(r.fams).length === 9, '9 families: ' + sig);
  await shot(page, 'e2e-lineup.png');
});
await T('every robot dances: a hit moves its rig away from the idle pose', async () => {
  const still = await E(() => {
    const pose = (b) => { const a = []; b.root.updateMatrixWorld(true); b.root.traverse((o) => o.isMesh && a.push(...o.matrixWorld.elements.slice(12, 15))); return a; };
    const bad = [];
    for (const e of RO.stage.robots.values()) {
      const b = e.bot;
      b.update(0.016, 10, 0); const p0 = pose(b);
      b.hit(1, 0.8, 0.25); b.update(0.12, 10, 0); const p1 = pose(b);
      let d = 0; for (let i = 0; i < p0.length; i++) d = Math.max(d, Math.abs(p0[i] - p1[i]));
      if (d < 0.02) bad.push(`${e.r.def.id}(${e.r.def.move}) moved ${d.toFixed(3)}`);
      b.update(1, 11, 0);
    }
    return bad;
  });
  assert(!still.length, 'robots that did not move: ' + still.join(', '));
});
await T('robot picker thumbnails render (non-empty portraits)', async () => {
  const r = await E(async () => {
    const out = [];
    for (const d of Object.values(RO.ROBOT_BY_ID)) {
      const url = RO.stage.thumbnail(d);
      const img = new Image(); img.src = url; await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 64);
      const px = g.getImageData(0, 0, 64, 64).data;
      let opaque = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 10) opaque++;
      out.push([d.id, opaque]);
    }
    return out.filter(([, o]) => o < 150);
  });
  assert(!r.length, 'empty thumbnails: ' + JSON.stringify(r));
});

console.log('\nLevel 1 with real mouse input');
await T('clicking 4 grid cells satisfies the request, a full loop wins the show', async () => {
  await E(() => RO.startLevel(1));
  await sleep(300);
  const cells = await E(() => {
    const L = RO.seq.L, rect = document.getElementById('grid').getBoundingClientRect();
    return [0, 2, 4, 6].map((s, i) => ({ x: rect.left + 46 + (s + 0.5) * L.cellW, y: rect.top + (L.rows - 1 - i * 2 + 0.5) * L.rowH }));
  });
  for (const c of cells) await page.mouse.click(c.x, c.y);
  const st = await E(() => ({ ok: RO.S.allOk, notes: RO.S.song.noteCount() }));
  assert(st.notes === 4, 'notes placed: ' + st.notes);
  assert(st.ok, 'request not satisfied');
  await E(() => RO.simulateSteps(RO.S.song.steps + 1));
  await sleep(1200);
  const w = await E(() => ({ won: RO.S.won, modal: document.getElementById('win').classList.contains('show'), stars: JSON.parse(localStorage.getItem('robot-orchestra.progress')).stars[1] }));
  assert(w.won && w.modal, 'win modal not shown');
  assert(w.stars === 3, 'expected 3 stars, got ' + w.stars);
  await shot(page, 'e2e-win.png');
});
await T('drag-painting fills a row and undo restores it', async () => {
  await E(() => { document.getElementById('win').classList.remove('show'); RO.startLevel(2); });
  await sleep(200);
  const g = await E(() => { const L = RO.seq.L, rect = document.getElementById('grid').getBoundingClientRect(); return { x0: rect.left + 46 + L.cellW * 0.5, x1: rect.left + 46 + L.cellW * (L.steps - 0.5), y: rect.top + L.percTop + L.laneH / 2 }; });
  await page.mouse.move(g.x0, g.y); await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(g.x0 + ((g.x1 - g.x0) * i) / 12, g.y);
  await page.mouse.up();
  const n = await E(() => RO.S.song.robots.find((r) => r.def.id === 'thump').notes.size);
  assert(n === 8, 'drag should fill all 8 kick steps, got ' + n);
  await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control');
  const after = await E(() => RO.S.song.noteCount());
  assert(after === 0, 'undo left ' + after + ' notes');
});

console.log('\nCampaign');
await T('all 50 shows load and can be won', async () => {
  const fails = await E(async () => {
    const out = [];
    for (let n = 1; n <= 50; n++) {
      RO.startLevel(n);
      const startOk = RO.S.allOk;
      RO.solveAll();
      if (!RO.S.allOk) { out.push(`L${n}: unsolved ${RO.S.results.map((r) => r.label).join(',')}`); continue; }
      if (startOk) out.push(`L${n}: solved at start`);
      RO.simulateSteps(RO.S.song.steps + 1);
      if (!RO.S.won) out.push(`L${n}: not won after a full loop`);
      document.getElementById('win').classList.remove('show');
      await new Promise((r) => setTimeout(r, 0));
    }
    return out;
  });
  assert(!fails.length, fails.join('\n'));
});
await T('levels 21–40 field 15–30 robots, 41–50 field 30+', async () => {
  const counts = await E(() => RO.LEVELS.map((l) => l.robots.length));
  for (let i = 20; i < 40; i++) assert(counts[i] >= 15 && counts[i] <= 30, `L${i + 1}: ${counts[i]}`);
  for (let i = 40; i < 50; i++) assert(counts[i] >= 30, `L${i + 1}: ${counts[i]}`);
  assert(counts[49] === 50, 'finale should field all 50');
});

console.log('\nAudio');
await T('Tone.js clock drives the robots on the beat', async () => {
  await E(() => { document.getElementById('win').classList.remove('show'); RO.startLevel(5); RO.solveAll(); });
  await page.mouse.click(5, 5); // user gesture
  const r = await E(async () => {
    await RO.ensureAudio();
    let steps = 0, hits = 0;
    const orig = RO.audio.onStep;
    RO.audio.onStep = (s, ev, d) => { steps++; hits += ev.length; orig(s, ev, d); };
    RO.setPlaying(true);
    await new Promise((res) => setTimeout(res, 2500));
    RO.setPlaying(false);
    RO.audio.onStep = orig;
    return { steps, hits, voices: RO.audio.voices.size, ctx: RO.audio.ready, piano: !!RO.audio.pianoBuffers, bpm: RO.S.song.settings.bpm };
  });
  assert(r.ctx, 'audio not ready');
  assert(r.piano, 'piano samples failed to load');
  assert(r.voices === 4, 'expected 4 voices, got ' + r.voices);
  const expected = 2.5 * (r.bpm / 60) * 2; // eighth-note steps in 2.5 s
  assert(r.steps >= expected * 0.4, `only ${r.steps} steps in 2.5s (expected ~${expected.toFixed(0)})`);
  assert(r.hits > 0, 'no notes triggered');
});

console.log('\nFree play');
await T('free play with all 50 robots on stage plays and keeps a usable frame rate', async () => {
  await E(() => { RO.startFree(); RO.openPicker(); });
  await page.click('#pickAll');
  await sleep(500);
  const r = await E(async () => {
    const n = RO.S.song.robots.length, playing = RO.S.song.robots.filter((r) => RO.S.song.visibleNotes(r).length).length;
    RO.setPlaying(true);
    const t0 = performance.now(); let frames = 0;
    await new Promise((res) => { const f = () => { frames++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
    RO.setPlaying(false);
    return { n, playing, voices: RO.audio.voices.size, fps: frames / 3 };
  });
  assert(r.n === 50, '50 robots on stage, got ' + r.n);
  assert(r.playing === 50, 'all robots riffed, got ' + r.playing);
  assert(r.voices === 50, '50 voices, got ' + r.voices);
  console.log(`      (software-rendered fps with 50 robots: ${r.fps.toFixed(1)})`);
  assert(r.fps > 0.5, 'render loop stalled: ' + r.fps + ' fps');
  await E(() => document.getElementById('picker').classList.remove('show'));
  await shot(page, 'e2e-free50.png');
});
await T('free play song persists across reloads', async () => {
  const n = await E(() => RO.S.song.robots.length);
  await sleep(500);
  await page.goto(BASE + '?test&free', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.RO && window.RO.ready);
  const m = await E(() => RO.S.song.robots.length);
  assert(m === n, `reloaded ${m} robots, expected ${n}`);
});

console.log('\nLayout');
await T('phone layout has no horizontal page overflow', async () => {
  const p2 = await browser.newPage();
  await p2.setViewport({ width: 390, height: 844 });
  await p2.goto(BASE + '?test&fresh&level=10', { waitUntil: 'domcontentloaded' });
  await p2.waitForFunction(() => window.RO && window.RO.ready);
  const w = await p2.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  await p2.screenshot({ path: 'tests/screenshots/e2e-phone.png' });
  await p2.close();
  assert(w.sw <= w.cw, `page scrolls horizontally: ${w.sw} > ${w.cw}`);
});

await T('no console errors during the whole run', async () => {
  assert(errors.length === 0, errors.join('\n'));
});

const failed = summary();
await browser.close();
srv.close();
process.exit(failed ? 1 : 0);
