import { Stage } from './stage.js';
import { AudioEngine, buildVoice, Tone } from './audio.js';
import { Sequencer } from './sequencer.js';
import { Song } from './song.js';
import { LEVELS, FANS, levelSong } from './levels.js';
import { evaluateAll, hint, solve } from './audience.js';
import { ROBOTS, ROBOT_BY_ID, FAMILIES, FAMILY_ORDER, MOVE_LABELS, MAX_ROBOTS } from './catalog.js';
import { PRESET_LABELS } from './presets.js';
import { SCALES, LEVEL_SCALES, midiName } from './music.js';
import { SONGS, buildSong } from './songbook.js';
import { encode, decode, shareUrl } from './share.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
const params = new URLSearchParams(location.search);
const KEY = 'beep-bop-band.';
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
try {
  // carry progress over from when the game was called "Robot Orchestra"
  for (const k of Object.keys(localStorage)) if (k.startsWith('robot-orchestra.')) { const n = KEY + k.slice(16); if (localStorage.getItem(n) == null) localStorage.setItem(n, localStorage.getItem(k)); localStorage.removeItem(k); }
  if (params.has('fresh')) Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k));
} catch { /* storage unavailable */ }

const prefs = store.get('prefs', { quality: 'high', volume: 0 });
const progress = store.get('progress', { stars: {} });

const stage = new Stage($('stage3d'), { quality: params.has('test') ? 'medium' : prefs.quality });
if (params.has('test')) stage.noAutoQuality = true;
stage.onAutoQuality = (q) => toast(`Graphics set to ${q} for smoother playback`);
const audio = new AudioEngine();
audio.setMasterVolume(prefs.volume);

const S = {
  mode: 'title', level: null, song: null, sel: null,
  results: [], allOk: false, perf: 0, won: false, assists: 0,
  undo: [], hintOpen: new Set(),
};

const seq = new Sequencer($('grid'), $('gridwrap'), {
  onSelect: (r) => select(r),
  onPreview: (r, row) => { audio.preview(r, S.song.midi(r, row)); stage.hit(r.uid, 0.8, rowHeight(r, row), S.song.stepSeconds); },
  onEditStart: () => pushUndo(),
  onEdit: (final) => afterEdit(final),
});

// ---------------------------------------------------------------- audio clock → visuals
audio.onStep = (step, events, dur, abs = step) => {
  if (!S.song) return;
  seq.setPlayStep(step);
  const spb = S.song.settings.stepsPerBeat;
  stage.syncBeat(abs / spb, dur * spb, S.song.settings.beatsPerBar);
  if (step % spb === 0) stage.beat(step % S.song.stepsPerBar === 0 ? 1 : 0.7);
  const per = new Map();
  for (const e of events) {
    if (e.r.muted) continue;
    const p = per.get(e.r.uid) || { n: 0, h: 0, r: e.r };
    p.n++; p.h = Math.max(p.h, rowHeight(e.r, e.row));
    per.set(e.r.uid, p);
  }
  for (const [uid, p] of per) { stage.hit(uid, Math.min(1, 0.7 + p.n * 0.15), p.h, dur); flashRoster(uid); }
};
// the audience counts the performance on the audio clock, so slow frames can't cost you a win
audio.onLogicStep = () => {
  if (!S.song || S.mode !== 'level' || S.won) return;
  if (S.allOk) {
    S.perf++;
    if (S.perf >= S.song.steps) win();
  } else S.perf = 0;
  renderMeter();
};
audio.onEnded = () => { setPlaying(false); };
const rowHeight = (r, row) => (S.song.isMelodic(r) ? row / Math.max(1, S.song.rows(r) - 1) : 0.5);

// ---------------------------------------------------------------- song setup
function setSong(song) {
  stage.clearConfetti();
  S.song = song;
  S.undo = [];
  audio.setSong(song);
  stage.setRobots(song.robots);
  audio.syncRobots((r) => stage.panFor(r.uid));
  seq.setSong(song);
  setPlaying(false);
  select(seq.selected);
  syncControls();
  renderRoster();
  evaluate();
}

function select(r) {
  S.sel = r || null;
  seq.select(r);
  stage.setSelected(r ? r.uid : null);
  renderRoster();
  renderInspector();
}

function afterEdit(final) {
  S.song.touch();
  evaluate();
  renderRosterCounts();
  if (final) { saveFree(); renderInspector(); }
}

function pushUndo() {
  S.undo.push(JSON.stringify(S.song.serialize()));
  if (S.undo.length > 60) S.undo.shift();
}
function undo() {
  const snap = S.undo.pop();
  if (!snap) return toast('Nothing to undo');
  const data = JSON.parse(snap);
  const song = S.song;
  Object.assign(song.settings, data.settings);
  if (data.robots.length === song.robots.length && data.robots.every((d, i) => d.id === song.robots[i].def.id)) {
    data.robots.forEach((d, i) => {
      const r = song.robots[i];
      Object.assign(r, { octave: d.octave, transpose: d.transpose, volume: d.volume, muted: d.muted });
      r.notes.clear();
      for (const [st, row] of d.notes) { if (!r.notes.has(st)) r.notes.set(st, new Set()); r.notes.get(st).add(row); }
    });
    song.touch();
    audio.settingsChanged();
    syncControls(); seq.refresh(); renderRoster(); renderInspector(); evaluate(); saveFree();
  } else {
    const keep = S.undo;
    setSong(Song.deserialize(data));
    S.undo = keep;
    saveFree();
  }
}

// ---------------------------------------------------------------- modes
function showOverlay(id, on = true) { $(id).classList.toggle('show', on); }
function setMode(mode) {
  S.mode = mode;
  app.className = 'mode-' + mode;
  showOverlay('title', mode === 'title');
  stage.resize();
}

function startLevel(n) {
  const L = LEVELS[n - 1];
  if (!L) return;
  setMode('level');
  S.level = L; S.won = false; S.perf = 0; S.assists = 0; S.hintOpen.clear();
  $('levelNum').textContent = `Show ${L.n}/50`;
  $('levelName').textContent = L.title;
  stage.ledText = `SHOW ${L.n} · ${L.title.toUpperCase()}`;
  setSong(levelSong(L, Song));
  $('requests').classList.toggle('collapsed', window.innerWidth <= 760);
  ['levels', 'win', 'picker'].forEach((id) => showOverlay(id, false));
  toast(L.tagline ? '🎤 ' + L.title : L.title);
}

const DEFAULT_FREE = ['pip', 'thump', 'snap', 'tik', 'rumble', 'nimbus', 'zap', 'strum'];
function enterFree(name = 'Jam session') {
  setMode('free');
  S.level = null; S.won = false;
  $('levelNum').textContent = 'Free play';
  $('levelName').textContent = name;
  stage.ledText = 'FREE PLAY · ' + name.toUpperCase();
}
function startFree() {
  enterFree(store.get('freeName', 'Jam session'));
  const saved = store.get('free', null);
  let song;
  if (saved && saved.robots && saved.robots.length) song = Song.deserialize(saved);
  else {
    song = new Song({ bpm: 112, bars: 2, stepsPerBeat: 2 });
    DEFAULT_FREE.forEach((id, i) => song.riff(song.addRobot(id), 777 + i));
  }
  setSong(song);
  ['levels', 'win'].forEach((id) => showOverlay(id, false));
}
/** Load song data (from the Song Book or a share code) into Free Play; ↶ brings back the old song. */
async function loadSong(data, { name = 'Shared song', play = false } = {}) {
  setPlaying(false);
  let keep = [];
  if (S.mode === 'free' && S.song) { pushUndo(); keep = S.undo; }
  enterFree(name);
  ['levels', 'win', 'songbook', 'share', 'picker'].forEach((id) => showOverlay(id, false));
  setSong(Song.deserialize(data));
  S.undo = keep;
  store.set('free', S.song.serialize()); store.set('freeName', name);
  toast(`🎵 Loaded “${name}”${keep.length ? ' — ↶ to undo' : ''}`);
  if (play) { await ensureAudio(); if (!audio.playing) await togglePlay(); }
}

let saveT;
function saveFree() { if (S.mode !== 'free') return; clearTimeout(saveT); saveT = setTimeout(() => store.set('free', S.song.serialize()), 300); }

// ---------------------------------------------------------------- audience evaluation
function evaluate() {
  audio.notesChanged();
  if (S.mode !== 'level') { renderMeter(); return; }
  const prev = S.results;
  S.results = evaluateAll(S.song, S.level.requests);
  const before = S.allOk;
  S.allOk = S.results.every((r) => r.ok);
  if (!S.allOk) S.perf = 0;
  const newly = S.results.filter((r, i) => r.ok && prev[i] && !prev[i].ok).length;
  if (newly && prev.length) audio.ding(true);
  if (S.allOk && !before && !S.won) toast(audio.playing ? '🎶 The crowd loves it — keep playing!' : '✅ All requests met — press ▶ to perform!');
  renderRequests();
  renderMeter();
}

function renderRequests() {
  const L = S.level;
  if (!L) return;
  const el = $('requests');
  el.innerHTML = `<div class="tag">${esc(L.tagline || '')}</div>` + L.requests.map((q, i) => {
    const r = S.results[i] || { ok: false, label: '' }, fan = FANS[q.who];
    return `<div class="req ${r.ok ? 'ok' : ''} ${S.hintOpen.has(i) ? 'showhint' : ''}" data-i="${i}">
      <div class="av">${fan.avatar}</div><div class="who">${esc(fan.name)}</div>
      <div class="txt">${esc(q.text)}</div>
      <div class="st"><span class="chip">${r.ok ? '✓ ' : ''}${esc(r.label)}</span><button class="hb" data-hint="${i}" title="Hint">💡</button></div>
      <div class="hint">${esc(hint(q))}<button data-solve="${i}" title="Do it for me (costs a star)">Show me</button></div>
    </div>`;
  }).join('') + `<div class="status ${S.allOk && !S.won ? 'go' : ''}">${S.won ? '🌟 Show complete!' : S.allOk ? (audio.playing ? '🎶 Performing… play the full loop!' : '▶ Press Play to perform!') : `${S.results.filter((r) => r.ok).length}/${L.requests.length} requests met`}<span class="tog">${$('requests').classList.contains('collapsed') ? ' ▾' : ' ▴'}</span></div>`;
}
$('requests').addEventListener('click', (e) => {
  if (e.target.closest('.status')) { $('requests').classList.toggle('collapsed'); renderRequests(); return; }
  const h = e.target.closest('[data-hint]'), s = e.target.closest('[data-solve]');
  if (h) { const i = +h.dataset.hint; S.hintOpen.has(i) ? S.hintOpen.delete(i) : S.hintOpen.add(i); renderRequests(); }
  if (s) {
    pushUndo();
    solve(S.song, S.level.requests[+s.dataset.solve]);
    S.assists++;
    audio.settingsChanged();
    syncControls(); seq.refresh(); renderRoster(); renderInspector(); evaluate();
  }
});

function renderMeter() {
  let frac = 0, perfFrac = 0;
  if (S.mode === 'level' && S.results.length) {
    frac = S.results.filter((r) => r.ok).length / S.results.length;
    perfFrac = S.won ? 1 : S.perf / S.song.steps;
  } else if (S.mode === 'free') {
    frac = Math.min(1, S.song.robots.filter((r) => S.song.visibleNotes(r).length).length / 8);
    perfFrac = audio.playing ? 1 : 0;
  }
  const meter = S.won ? 1 : frac * 0.6 + perfFrac * 0.4;
  $('meterFill').style.width = `${meter * 100}%`;
  $('meterPerf').style.width = S.mode === 'level' && S.allOk ? `${meter * 100}%` : '0';
  $('meterFace').textContent = meter >= 1 ? '🤩' : meter > 0.75 ? '😄' : meter > 0.45 ? '🙂' : meter > 0.2 ? '😐' : '😴';
  $('meterText').textContent = S.mode === 'level' ? (S.won ? 'Standing ovation!' : S.allOk ? `Performing ${Math.round(perfFrac * 100)}%` : `${Math.round(frac * 100)}% happy`) : `${S.song ? S.song.noteCount() : 0} notes`;
  stage.setHype(meter);
}

function win() {
  S.won = true;
  const stars = Math.max(1, 3 - S.assists);
  const n = S.level.n;
  progress.stars[n] = Math.max(progress.stars[n] || 0, stars);
  store.set('progress', progress);
  audio.applause();
  stage.celebrate();
  renderRequests(); renderMeter();
  $('winTitle').textContent = `Show ${n}: ${S.level.title}`;
  $('winStars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= stars ? '' : 'off'}">⭐</span>`).join('');
  $('winText').textContent = n === 50 ? 'You conducted all 50 robots. Free Play is yours — every robot, every control.' : stars < 3 ? 'Tip: finish without "Show me" for 3 stars.' : 'Flawless performance!';
  $('winNext').textContent = n === 50 ? 'Free Play ▶' : 'Next show ▶';
  setTimeout(() => showOverlay('win'), 900);
}
$('winNext').onclick = () => { showOverlay('win', false); S.level.n === 50 ? startFree() : startLevel(S.level.n + 1); };
$('winStay').onclick = () => showOverlay('win', false);
$('winLevels').onclick = () => { showOverlay('win', false); openLevels(); };

// ---------------------------------------------------------------- roster & inspector
function renderRoster() {
  const song = S.song;
  if (!song) return;
  const byFam = FAMILY_ORDER.map((f) => [f, song.robots.filter((r) => r.def.family === f)]).filter(([, rs]) => rs.length);
  $('roster').innerHTML = byFam.map(([f, rs]) => `<div class="rsec">${FAMILIES[f].icon} ${FAMILIES[f].label}</div>` + rs.map((r) =>
    `<button class="rb ${S.sel === r ? 'sel' : ''}" data-uid="${r.uid}" style="--c:${r.def.accent}">
      <span class="dot"></span><span class="nm">${esc(r.def.name)}</span><span class="ct" data-ct="${r.uid}">${song.visibleNotes(r).length || ''}</span>
      <span class="mute ${r.muted ? 'on' : ''}" data-mute="${r.uid}" title="Mute">${r.muted ? '🔇' : '🔈'}</span></button>`).join('')).join('');
}
function renderRosterCounts() {
  for (const r of S.song.robots) { const el = document.querySelector(`[data-ct="${r.uid}"]`); if (el) el.textContent = S.song.visibleNotes(r).length || ''; }
}
function flashRoster(uid) {
  const el = document.querySelector(`.rb[data-uid="${uid}"]`);
  if (!el) return;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 90);
}
$('roster').addEventListener('click', (e) => {
  const m = e.target.closest('[data-mute]');
  if (m) { const r = S.song.robot(+m.dataset.mute); pushUndo(); r.muted = !r.muted; S.song.touch(); audio.syncRobots(); renderRoster(); renderInspector(); seq.refresh(); e.stopPropagation(); return; }
  const b = e.target.closest('[data-uid]');
  if (b) select(S.song.robot(+b.dataset.uid));
});

function renderInspector() {
  const r = S.sel, el = $('inspector');
  if (!r || !S.song.robots.includes(r)) { el.innerHTML = ''; return; }
  const song = S.song, mel = song.isMelodic(r), fam = FAMILIES[r.def.family];
  const pitchLabel = mel ? midiName(song.baseMidi(r)) : (r.transpose > 0 ? '+' : '') + r.transpose;
  el.style.setProperty('--c', r.def.accent);
  el.innerHTML = `
    <div class="insp-head" style="--c:${r.def.accent}"><img alt="" src="${stage.thumbnail(r.def)}"/>
      <div><div class="nm">${esc(r.def.name)}</div><div class="sub">${fam.icon} ${fam.label} · ${PRESET_LABELS[r.def.preset]}<br>Dance: ${MOVE_LABELS[r.def.move]}</div></div></div>
    <div class="insp-grid">
      ${mel ? `<span>Octave</span><div class="stepper"><button data-a="oct-">−</button><output>${r.octave > 0 ? '+' : ''}${r.octave}</output><button data-a="oct+">+</button></div>` : ''}
      <span>${mel ? 'Start note' : 'Pitch'}</span><div class="stepper"><button data-a="tr-">−</button><output>${pitchLabel}</output><button data-a="tr+">+</button></div>
      <span>Volume</span><input type="range" min="-24" max="6" value="${r.volume}" data-a="vol"/>
    </div>
    <div class="insp-btns">
      <button class="pill" data-a="riff" title="Write a pattern for this robot">🎲 Riff</button>
      <button class="pill" data-a="clear">🧹 Clear</button>
      <button class="pill" data-a="mute">${r.muted ? '🔇 Unmute' : '🔈 Mute'}</button>
      ${S.mode === 'free' ? '<button class="pill danger" data-a="remove">✕ Remove</button>' : ''}
    </div>`;
}
$('inspector').addEventListener('click', (e) => {
  const a = e.target.closest('[data-a]')?.dataset.a, r = S.sel;
  if (!a || !r || a === 'vol') return;
  pushUndo();
  if (a === 'oct-') r.octave = Math.max(-2, r.octave - 1);
  if (a === 'oct+') r.octave = Math.min(2, r.octave + 1);
  if (a === 'tr-') r.transpose = Math.max(-12, r.transpose - 1);
  if (a === 'tr+') r.transpose = Math.min(12, r.transpose + 1);
  if (a === 'riff') { S.song.riff(r); stage.hit(r.uid, 1, 0.7, 0.3); }
  if (a === 'clear') S.song.clearRobot(r);
  if (a === 'mute') r.muted = !r.muted;
  if (a === 'remove') { removeRobot(r); return; }
  if (a.startsWith('oct') || a.startsWith('tr')) { const mid = S.song.isMelodic(r) ? S.song.baseMidi(r) + 7 : 60 + r.transpose; audio.preview(r, mid); }
  S.song.touch();
  audio.syncRobots();
  seq.refresh(); renderInspector(); renderRoster(); evaluate(); saveFree();
});
$('inspector').addEventListener('input', (e) => {
  if (e.target.dataset.a === 'vol' && S.sel) { S.sel.volume = +e.target.value; audio.syncRobots(); saveFree(); }
});

// ---------------------------------------------------------------- transport & controls
function setPlaying(on) {
  if (on) { audio.play(); stage.playing = true; }
  else { audio.stop(); stage.playing = false; stage.stopGroove(); seq.setPlayStep(-1); if (S.mode === 'level' && !S.won) S.perf = 0; }
  $('btnPlay').classList.toggle('on', on);
  if (S.mode === 'level') renderRequests();
  renderMeter();
}
async function togglePlay() {
  await ensureAudio();
  if (audio.playing) return setPlaying(false);
  // first play of a big band: wait (briefly) until every robot has a rendered sample
  if (audio.bank.busy) {
    toast('🔧 Tuning the robots…');
    await Promise.race([audio.prepareFirst(), new Promise((r) => setTimeout(r, 4000))]);
  }
  setPlaying(true);
}
$('btnPlay').onclick = togglePlay;

let audioP = null;
function ensureAudio() {
  if (!audioP) audioP = audio.init().then(() => { audio.syncRobots((r) => stage.panFor(r.uid)); });
  return audioP;
}
window.addEventListener('pointerdown', () => ensureAudio(), { once: true });
window.addEventListener('keydown', () => ensureAudio(), { once: true });

function fillSelect(el, opts) { el.innerHTML = opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join(''); }
function syncControls() {
  const s = S.song.settings, free = S.mode === 'free';
  const scales = free ? Object.keys(SCALES) : LEVEL_SCALES;
  fillSelect($('scale'), scales.map((k) => [k, SCALES[k].name]));
  $('scale').value = s.scale;
  fillSelect($('root'), Array.from({ length: 25 }, (_, i) => [48 + i, midiName(48 + i)]));
  $('root').value = s.root;
  fillSelect($('bpb'), [2, 3, 4, 5, 6, 7].map((n) => [n, n]));
  $('bpb').value = s.beatsPerBar;
  fillSelect($('spb'), [[1, '1 · quarters'], [2, '2 · eighths'], [3, '3 · triplets'], [4, '4 · sixteenths']]);
  $('spb').value = s.stepsPerBeat;
  fillSelect($('bars'), [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, n]));
  $('bars').value = s.bars;
  fillSelect($('octaves'), [[1, '1 octave'], [2, '2 octaves'], [3, '3 octaves']]);
  $('octaves').value = s.octaves;
  $('tempo').value = s.bpm; $('tempoVal').textContent = s.bpm;
  $('loop').checked = s.loop;
  const timeOpen = free || (S.level && S.level.unlock.includes('time'));
  document.querySelectorAll('.ctl.time').forEach((el) => {
    el.classList.toggle('locked', !timeOpen);
    el.title = timeOpen ? '' : 'Locked for this show';
  });
}
function settingChanged(mut) {
  pushUndo();
  mut(S.song.settings);
  S.song.touch();
  audio.settingsChanged();
  seq.refresh(); renderInspector(); evaluate(); saveFree();
}
$('tempo').addEventListener('pointerdown', () => pushUndo());
$('tempo').addEventListener('input', (e) => { S.song.settings.bpm = +e.target.value; $('tempoVal').textContent = e.target.value; audio.setBpm(+e.target.value); S.song.touch(); evaluate(); });
$('tempo').addEventListener('change', () => saveFree());
$('scale').onchange = (e) => settingChanged((s) => (s.scale = e.target.value));
$('root').onchange = (e) => settingChanged((s) => (s.root = +e.target.value));
$('bpb').onchange = (e) => settingChanged((s) => (s.beatsPerBar = +e.target.value));
$('spb').onchange = (e) => settingChanged((s) => (s.stepsPerBeat = +e.target.value));
$('bars').onchange = (e) => settingChanged((s) => (s.bars = +e.target.value));
$('octaves').onchange = (e) => settingChanged((s) => (s.octaves = +e.target.value));
$('loop').onchange = (e) => { S.song.settings.loop = e.target.checked; saveFree(); };
$('btnClear').onclick = () => { pushUndo(); S.song.clearAll(); seq.refresh(); renderRoster(); renderInspector(); evaluate(); saveFree(); toast('Cleared — ↶ to undo'); };
$('btnUndo').onclick = undo;
$('btnMenu').onclick = () => { setPlaying(false); setMode('title'); showTitleBand(); };

window.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (S.mode === 'title') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (tag === 'input' && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (tag === 'select') return;
    e.preventDefault();
    const rs = S.song.robots, i = rs.indexOf(S.sel);
    select(rs[(i + (e.key === 'ArrowDown' ? 1 : -1) + rs.length) % rs.length]);
  }
});

// click a robot on stage to select it
let downAt = null;
stage.canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
stage.canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5 || S.mode === 'title') return;
  const uid = stage.pick(e.clientX, e.clientY);
  if (uid != null && S.song.robot(uid)) { const r = S.song.robot(uid); select(r); audio.preview(r, S.song.isMelodic(r) ? S.song.baseMidi(r) + 12 : 60 + r.transpose); stage.hit(uid, 1, 0.6, 0.3); }
});
stage.canvas.addEventListener('dblclick', () => stage.resetView());

// ---------------------------------------------------------------- level select
function openLevels() {
  const unlocked = Math.max(1, ...Object.keys(progress.stars).map((n) => +n + 1));
  const sections = [['Warm-up', 1, 5], ['The band grows', 6, 20], ['Big stage', 21, 40], ['Master orchestrations', 41, 50]];
  $('levelGrid').innerHTML = sections.map(([name, a, b]) => `<div class="lsec">${name} · ${a}–${b}</div><div class="lgrid">` +
    LEVELS.slice(a - 1, b).map((L) => {
      const st = progress.stars[L.n] || 0, locked = L.n > unlocked && !progress.all;
      return `<button class="lv ${st ? 'done' : ''}" data-lv="${L.n}" ${locked ? 'disabled' : ''}>
        <span class="n">${locked ? '🔒 ' : ''}Show ${L.n}</span><span class="t">${esc(L.title)}</span>
        <span class="m">🤖 ${L.robots.length} robot${L.robots.length > 1 ? 's' : ''} · ${L.requests.length} requests</span>
        <span class="s">${st ? '⭐'.repeat(st) : '&nbsp;'}</span></button>`;
    }).join('') + '</div>').join('');
  showOverlay('levels');
}
$('levelGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-lv]'); if (b && !b.disabled) { ensureAudio(); startLevel(+b.dataset.lv); } });

// ---------------------------------------------------------------- free-play robot picker
function openPicker() {
  renderPicker();
  showOverlay('picker');
}
function renderPicker() {
  const on = new Set(S.song.robots.map((r) => r.def.id));
  $('pickCount').textContent = `${S.song.robots.length}/${MAX_ROBOTS}`;
  $('pickGrid').innerHTML = FAMILY_ORDER.map((f) => `<div class="lsec">${FAMILIES[f].icon} ${FAMILIES[f].label} — ${esc(FAMILIES[f].blurb)}</div><div class="pgrid">` +
    ROBOTS.filter((r) => r.family === f).map((r) => `<button class="pc ${on.has(r.id) ? 'on' : ''}" data-pick="${r.id}" style="--c:${r.accent}">
      <img alt="" src="${stage.thumbnail(r)}"/><span class="nm">${esc(r.name)}</span><span class="ps">${PRESET_LABELS[r.preset]}</span></button>`).join('') + '</div>').join('');
}
function addRobot(id) {
  if (S.song.robots.length >= MAX_ROBOTS) return toast(`Max ${MAX_ROBOTS} robots`);
  const r = S.song.addRobot(id);
  S.song.riff(r);
  return r;
}
function removeRobot(r) {
  pushUndo();
  S.song.removeRobot(r.uid);
  if (S.sel === r) S.sel = null;
  robotsChanged();
}
function robotsChanged() {
  stage.setRobots(S.song.robots);
  audio.syncRobots((x) => stage.panFor(x.uid));
  seq.select(S.sel && S.song.robots.includes(S.sel) ? S.sel : S.song.robots[0]);
  select(seq.selected);
  evaluate(); saveFree();
  if ($('picker').classList.contains('show')) renderPicker();
}
$('pickGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pick]');
  if (!b) return;
  const id = b.dataset.pick, existing = S.song.robots.find((r) => r.def.id === id);
  pushUndo();
  if (existing) { S.song.removeRobot(existing.uid); if (S.sel === existing) S.sel = null; }
  else { const r = addRobot(id); if (r) S.sel = r; }
  robotsChanged();
});
$('pickAll').onclick = () => { pushUndo(); for (const r of ROBOTS) if (!S.song.robots.some((x) => x.def.id === r.id)) addRobot(r.id); robotsChanged(); };
$('pickNone').onclick = () => { pushUndo(); for (const r of [...S.song.robots]) S.song.removeRobot(r.uid); S.sel = null; robotsChanged(); };
$('pickRiff').onclick = () => { pushUndo(); let n = 0; for (const r of S.song.robots) if (!S.song.visibleNotes(r).length) { S.song.riff(r); n++; } seq.refresh(); renderRoster(); evaluate(); saveFree(); toast(n ? `🎲 Riffed ${n} robots` : 'Everyone is already playing'); };
$('btnRobots').onclick = openPicker;

// ---------------------------------------------------------------- song book & share codes
function openBook() {
  $('bookGrid').innerHTML = SONGS.map((d) => {
    const data = buildSong(d), notes = data.robots.reduce((a, r) => a + r.notes.length, 0);
    return `<div class="song"><div class="em">${d.emoji}</div><div class="t">${esc(d.title)}</div><div class="by">${esc(d.by)}</div>
      <div class="bl">${esc(d.blurb)}</div><div class="meta">🤖 ${data.robots.length} robots · ${data.settings.bpm} bpm · ${data.settings.beatsPerBar}/4 · ${notes} notes</div>
      <div class="row"><button class="go" data-song="${d.id}">▶ Play</button><button class="pill" data-songcode="${d.id}" title="Copy this song's share code">📋 Code</button></div></div>`;
  }).join('');
  showOverlay('songbook');
}
$('bookGrid').addEventListener('click', async (e) => {
  const p = e.target.closest('[data-song]'), c = e.target.closest('[data-songcode]');
  if (p) { const d = SONGS.find((x) => x.id === p.dataset.song); loadSong(buildSong(d), { name: d.title, play: true }); }
  if (c) { const d = SONGS.find((x) => x.id === c.dataset.songcode); copy(await encode(buildSong(d)), `Code for “${d.title}” copied`); }
});
async function openShare(focusLoad = false) {
  $('loadErr').textContent = ''; $('loadErr').classList.remove('bad');
  const has = S.song && S.mode !== 'title' && S.song.noteCount() > 0;
  $('shareCode').value = has ? await encode(S.song.serialize()) : '';
  $('shareCode').placeholder = 'Make some music first, then share it here';
  $('shareInfo').textContent = has ? `${$('shareCode').value.length} characters` : '';
  showOverlay('share');
  if (focusLoad || !has) $('loadCode').focus(); else $('shareCode').select();
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast('📋 ' + msg); }
  catch { toast('Select the code and press Ctrl+C to copy'); }
}
$('copyCode').onclick = () => $('shareCode').value && copy($('shareCode').value, 'Code copied');
$('copyLink').onclick = () => $('shareCode').value && copy(shareUrl($('shareCode').value), 'Link copied');
$('loadBtn').onclick = async () => {
  try { const data = await decode($('loadCode').value); $('loadCode').value = ''; await loadSong(data, { name: 'Shared song', play: true }); }
  catch (err) { $('loadErr').textContent = err.message; $('loadErr').classList.add('bad'); }
};
$('btnSongs').onclick = openBook;
$('btnShare').onclick = () => openShare();
$('btnBook').onclick = () => { ensureAudio(); openBook(); };
$('bookCode').onclick = () => openShare(true);
$('btnLoadCode').onclick = () => { ensureAudio(); openShare(true); };

// ---------------------------------------------------------------- title, settings, misc
$('btnCampaign').onclick = () => { ensureAudio(); openLevels(); };
$('btnFree').onclick = () => { ensureAudio(); startFree(); };
$('btnHow').onclick = () => showOverlay('how');
$('btnSettings').onclick = () => { $('quality').value = prefs.quality; $('volume').value = prefs.volume; showOverlay('settings'); };
$('quality').onchange = (e) => { prefs.quality = e.target.value; store.set('prefs', prefs); stage.setQuality(prefs.quality); };
$('volume').oninput = (e) => { prefs.volume = +e.target.value; store.set('prefs', prefs); audio.setMasterVolume(prefs.volume); };
$('unlockAll').onclick = () => { progress.all = true; store.set('progress', progress); toast('All 50 shows unlocked'); };
$('resetProgress').onclick = () => { if (confirm('Reset all stars and progress?')) { progress.stars = {}; progress.all = false; store.set('progress', progress); toast('Progress reset'); } };
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => b.closest('.overlay').classList.remove('show')));
document.querySelectorAll('.modal-ov').forEach((o) => o.addEventListener('pointerdown', (e) => { if (e.target === o && o.id !== 'win') o.classList.remove('show'); }));

let toastT;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2400);
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

// title screen: a demo band dancing to a silent pulse
function showTitleBand() {
  const song = new Song({ bpm: 112 });
  ['pip', 'zap', 'nimbus', 'blare', 'strum', 'rumble', 'thump', 'shaka', 'rhoda', 'laser', 'halo', 'tuba', 'boom', 'clapper', 'harpo', 'acid'].forEach((id) => song.addRobot(id));
  S.song = song;
  stage.ledText = 'BEEP BOP BAND';
  stage.setRobots(song.robots);
  stage.setSelected(null);
}
let demoT = 0, demoBeat = 0;
function titleTick(dt) {
  if (S.mode !== 'title' || !S.song) return;
  demoT += dt;
  if (demoT > 60 / 112 / 2) {
    demoT = 0; demoBeat++;
    stage.playing = true;
    if (demoBeat % 2 === 0) stage.beat(demoBeat % 8 === 0 ? 1 : 0.6);
    for (const r of S.song.robots) if (Math.random() < 0.18) stage.hit(r.uid, 0.8, Math.random(), 0.27);
  }
}

// name tag above the selected robot
let last = performance.now();
function uiLoop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  titleTick(dt);
  const tag = $('nametag');
  if (S.mode !== 'title' && S.sel) {
    const p = stage.screenPos(S.sel.uid);
    if (p && p.visible) { tag.style.display = 'block'; tag.style.left = p.x + 'px'; tag.style.top = p.y + 'px'; tag.style.setProperty('--c', S.sel.def.accent); tag.textContent = `${FAMILIES[S.sel.def.family].icon} ${S.sel.def.name}`; }
    else tag.style.display = 'none';
  } else tag.style.display = 'none';
  requestAnimationFrame(uiLoop);
}
requestAnimationFrame(uiLoop);

// ---------------------------------------------------------------- boot
setMode('title');
showTitleBand();
if (params.has('lineup')) { setMode('title'); showOverlay('title', false); stage.lineup(params.get('lineup') ? params.get('lineup').split(',') : undefined); }
else if (params.has('level')) startLevel(+params.get('level'));
else if (params.has('song')) {
  decode(params.get('song')).then((data) => { loadSong(data, { name: 'Shared song' }); toast('🎵 A friend shared a song — press ▶ to play'); history.replaceState(null, '', location.pathname); })
    .catch((err) => toast('Couldn’t load that song link: ' + err.message));
}
else if (params.has('free')) startFree();

// test / debug hook
window.RO = {
  dev: params.has('test') ? { Tone, buildVoice } : null,
  ready: true, stage, audio, seq, S, LEVELS, ROBOT_BY_ID, SONGS, buildSong, encode, decode, loadSong, openBook, openShare,
  startLevel, startFree, select, evaluate, undo, openLevels, openPicker, ensureAudio, setPlaying,
  solveAll() { for (let k = 0; k < 6; k++) for (const q of S.level.requests) solve(S.song, q); S.song.touch(); audio.settingsChanged(); syncControls(); seq.refresh(); renderRoster(); evaluate(); },
  /** Simulate the clock advancing n steps without audio (for headless tests). */
  simulateSteps(n) { for (let i = 0; i < n; i++) { const st = i % S.song.steps; audio.onLogicStep(st); audio.onStep(st, S.song.stepTable()[st], S.song.stepSeconds); } },
};
