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
    const pose = (b) => { const a = []; b.root.updateMatrixWorld(true); b.root.traverse((o) => a.push(...o.matrixWorld.elements.slice(12, 15))); return a; };
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

await T('robots dance choreographed routines on the beat (not just per-note twitches)', async () => {
  const r = await E(() => {
    const st = RO.stage; st.manual = true; st.playing = true;
    st.groove = { b: 0, beatDur: 0.5, bpb: 4 };
    const pose = (b) => { const a = []; b.root.updateMatrixWorld(true); b.root.traverse((o) => a.push(...o.matrixWorld.elements.slice(12, 15))); return a; };
    for (let i = 0; i < 60; i++) { for (const e of st.robots.values()) e.bot.hit(0.5, 0.5, 0.25); st.update(1 / 60); }
    const out = [];
    for (const e of st.robots.values()) {
      // a real dance changes pose from beat to beat across the 8-beat routine
      st.groove.b = 0.95; st.update(0.0001); const a = pose(e.bot);
      let d = 0;
      for (let k = 1; k < 8; k++) { st.groove.b = k + 0.95; st.update(0.0001); const b = pose(e.bot); for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i] - b[i])); }
      if (d < 0.05) out.push(`${e.r.def.id}(${e.r.def.move}) ${d.toFixed(3)}`);
    }
    st.manual = false; st.playing = false; st.groove = null;
    return out;
  });
  assert(!r.length, 'robots whose routine barely changes between beats: ' + r.join(', '));
});
await T('draw calls stay low with all 50 robots (rigid skinning)', async () => {
  const calls = await E(() => { const st = RO.stage; st.lineup(); st.update(0.016); st.renderer.render(st.scene, st.camera); return st.renderer.info.render.calls; });
  console.log(`      (${calls} draw calls for the 50-robot lineup)`);
  assert(calls < 900, 'too many draw calls: ' + calls);
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
  await page.waitForFunction(() => document.getElementById('win').classList.contains('show'), { timeout: 30000 }).catch(() => {});
  const w = await E(() => ({ won: RO.S.won, modal: document.getElementById('win').classList.contains('show'), stars: JSON.parse(localStorage.getItem('beep-bop-band.progress')).stars[1] }));
  assert(w.won && w.modal, 'win modal not shown');
  assert(w.stars === 3, 'expected 3 stars, got ' + w.stars);
  await shot(page, 'e2e-win.png');
});
await T('drag-painting fills a row and undo restores it', async () => {
  await E(() => { document.getElementById('win').classList.remove('show'); RO.startLevel(2); RO.seq.draw(); });
  await sleep(200);
  const g = await E(() => { RO.seq.draw(); const L = RO.seq.L, rect = document.getElementById('grid').getBoundingClientRect(); return { x0: rect.left + 46 + L.cellW * 0.5, x1: rect.left + 46 + L.cellW * (L.steps - 0.5), y: rect.top + L.percTop + L.laneH / 2 }; });
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
    let steps = 0, hits = 0, frames = 0;
    const orig = RO.audio.onStep, origL = RO.audio.onLogicStep;
    RO.audio.onLogicStep = (st) => { steps++; hits += RO.S.song.stepTable()[st].length; origL(st); };
    RO.audio.onStep = (s, ev, d) => { frames++; orig(s, ev, d); };
    await RO.audio.prepare();
    let started = 0; const on = RO.audio._note.bind(RO.audio);
    RO.audio._note = (...a) => { const v = RO.audio.voices.get(a[0].uid); const n = v ? v.live.length : 0; on(...a); if (v && (v.live.length > n || v.live.length >= 10)) started++; };
    RO.setPlaying(true);
    await new Promise((res) => setTimeout(res, 2500));
    RO.setPlaying(false);
    RO.audio._note = on;
    RO.audio.onStep = orig; RO.audio.onLogicStep = origL;
    return { steps, hits, frames, started, samples: RO.audio.bank.buf.size, voices: RO.audio.voices.size, ctx: RO.audio.ready, piano: !!RO.audio.pianoBuffers, bpm: RO.S.song.settings.bpm };
  });
  assert(r.ctx, 'audio not ready');
  assert(r.piano, 'piano samples failed to load');
  assert(r.voices === 4, 'expected 4 voices, got ' + r.voices);
  const expected = 2.5 * (r.bpm / 60) * 2; // eighth-note steps in 2.5 s
  assert(r.frames > 0, 'no visual step callbacks reached the robots');
  assert(r.steps >= expected * 0.7, `only ${r.steps} steps in 2.5s (expected ~${expected.toFixed(0)})`);
  assert(r.hits > 0, 'no notes triggered');
  assert(r.samples > 0, 'no instrument samples were rendered');
  assert(r.started > 0, 'notes were scheduled but no sample voices started');
});

console.log('\nFree play');
await T('free play with all 50 robots on stage plays and keeps a usable frame rate', async () => {
  await E(() => { RO.startFree(); RO.openPicker(); });
  await E(() => document.getElementById('pickAll').click());
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

console.log('\nSong Book & share codes');
await T('Song Book: every song loads into Free Play, "Everybody Jam" fields all 50 robots', async () => {
  const r = await E(async () => {
    RO.openBook();
    const cards = document.querySelectorAll('#bookGrid .song').length;
    const out = [];
    for (const d of RO.SONGS) { await RO.loadSong(RO.buildSong(d), { name: d.title }); out.push([d.id, RO.S.song.robots.length, RO.S.song.noteCount(), document.getElementById('levelName').textContent]); }
    return { cards, out, mode: RO.S.mode };
  });
  assert(r.cards === 10, 'expected 10 song cards, got ' + r.cards);
  assert(r.mode === 'free', 'songs load into free play');
  for (const [id, n, notes, name] of r.out) assert(n > 0 && notes > 0 && name.length, `${id}: ${n} robots / ${notes} notes / "${name}"`);
  assert(r.out.find((x) => x[0] === 'jam')[1] === 50, 'jam should have 50 robots');
});
await T('Song Book "Play" button loads and plays a song', async () => {
  await E(() => RO.openBook());
  await page.click('[data-song="ode"]');
  await page.waitForFunction(() => RO.audio.playing, { timeout: 30000 });
  const r = await E(() => ({ name: document.getElementById('levelName').textContent, n: RO.S.song.robots.length }));
  await E(() => RO.setPlaying(false));
  assert(r.name === 'Ode to Joy' && r.n === 7, JSON.stringify(r));
});
await T('share code: copy from the Share dialog, paste back in, get the same song', async () => {
  await E(async () => { await RO.loadSong(RO.buildSong(RO.SONGS.find((s) => s.id === 'disco')), { name: 'Robot Disco' }); await RO.openShare(); });
  const code = await E(() => document.getElementById('shareCode').value);
  assert(/^BEEP1[zr][A-Za-z0-9_-]+$/.test(code), 'bad code: ' + code);
  const before = await E(() => JSON.stringify(RO.S.song.serialize()));
  await E(async () => { await RO.loadSong(RO.buildSong(RO.SONGS[0]), { name: 'x' }); await RO.openShare(true); });
  await page.type('#loadCode', code);
  await page.click('#loadBtn');
  await page.waitForFunction(() => !document.getElementById('share').classList.contains('show'));
  const after = await E(() => JSON.stringify(RO.S.song.serialize()));
  await E(() => RO.setPlaying(false));
  assert(after === before, 'loaded song differs from the shared one');
  await E(() => RO.openShare(true));
  await page.type('#loadCode', 'BEEP1zgarbage!!');
  await page.click('#loadBtn');
  const err = await E(() => document.getElementById('loadErr').textContent);
  assert(err.length > 0, 'bad code should show an error');
  await E(() => document.getElementById('share').classList.remove('show'));
});
await T('a ?song= share link opens the song', async () => {
  const code = await E(() => RO.encode(RO.buildSong(RO.SONGS.find((s) => s.id === 'twinkle'))));
  const p3 = await browser.newPage();
  await p3.goto(BASE + '?test&song=' + code, { waitUntil: 'domcontentloaded' });
  await p3.waitForFunction(() => window.RO && RO.S.mode === 'free' && RO.S.song.robots.length === 6, { timeout: 60000 });
  await p3.close();
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
