// Audience requests: each level asks for a few things, each checked against the current song.
// evaluate() → { ok, have, need, label } for the HUD; solve() is a minimal "make it true" used by
// the solvability test and the in-game "Show me" button.
import { FAMILIES } from './catalog.js';
import { SCALES } from './music.js';

const famList = (f) => (f == null ? null : Array.isArray(f) ? f : [f]);
export function matches(r, c) {
  if (c.id) return r.def.id === c.id;
  const f = famList(c.fam);
  return !f || f.includes(r.def.family);
}
const melodicOnly = (song, c) => song.robots.filter((r) => matches(r, c) && song.isMelodic(r));
const matching = (song, c) => song.robots.filter((r) => matches(r, c));

function notesOf(song, robots) {
  const out = [];
  for (const r of robots) for (const n of song.visibleNotes(r)) out.push({ ...n, r, midi: song.midi(r, n.row) });
  return out;
}
/** Top note per step across the given robots (the "melody line"), in time order. */
function melodyLine(song, robots) {
  const top = new Map();
  for (const n of notesOf(song, robots)) { const t = top.get(n.step); if (!t || n.midi > t.midi) top.set(n.step, n); }
  return [...top.values()].sort((a, b) => a.step - b.step);
}
function beatSteps(song, on) {
  const { beatsPerBar: bpb, stepsPerBeat: spb } = song.settings, out = [];
  for (let s = 0; s < song.steps; s += spb) {
    const beat = (s / spb) % bpb;
    if (on === 'every' || (on === 'downbeats' && beat === 0) || (on === 'backbeat' && (bpb >= 4 ? beat % 2 === 1 : beat > 0))) out.push(s);
  }
  return out;
}
const hitSteps = (song, robots) => new Set(notesOf(song, robots).map((n) => n.step));

function chordStats(song, robots, minRobots) {
  // steps where enough robots play and at least 3 different pitch classes sound together
  const per = new Map();
  for (const n of notesOf(song, robots)) {
    let e = per.get(n.step);
    if (!e) per.set(n.step, (e = { robots: new Set(), pcs: new Set() }));
    e.robots.add(n.r.uid); e.pcs.add(((n.midi % 12) + 12) % 12);
  }
  const chords = [...per.values()].filter((e) => e.pcs.size >= 3 && e.robots.size >= minRobots);
  return { count: chords.length, distinct: new Set(chords.map((e) => [...e.pcs].sort((a, b) => a - b).join(','))).size };
}

const EVAL = {
  notes(song, c) { return { have: notesOf(song, matching(song, c)).length, need: c.min }; },
  active(song, c) { return { have: matching(song, c).filter((r) => song.visibleNotes(r).length).length, need: c.min }; },
  allPlay(song) { return { have: song.robots.filter((r) => song.visibleNotes(r).length).length, need: song.robots.length }; },
  density(song, c) { return { have: song.noteCount(), need: c.min }; },
  maxNotes(song, c) { const n = song.noteCount(); return { ok: n > 0 && n <= c.max, label: `${n}/${c.max} max` }; },
  tempo(song, c) {
    const b = song.settings.bpm;
    return { ok: (c.min == null || b >= c.min) && (c.max == null || b <= c.max), label: `${b} BPM` };
  },
  scale(song, c) { return { ok: c.any.includes(song.settings.scale), label: SCALES[song.settings.scale].name }; },
  timeSig(song, c) { return { ok: song.settings.beatsPerBar === c.bpb, label: `${song.settings.beatsPerBar} beats/bar` }; },
  chord(song, c) {
    const st = chordStats(song, melodicOnly(song, c), c.robots || 1);
    const okD = !c.distinct || st.distinct >= c.distinct;
    return { ok: st.count >= c.min && okD, label: c.distinct ? `${Math.min(st.count, c.min)}/${c.min} · ${Math.min(st.distinct, c.distinct)}/${c.distinct} kinds` : `${Math.min(st.count, c.min)}/${c.min}` };
  },
  beat(song, c) {
    const need = beatSteps(song, c.on), hits = hitSteps(song, matching(song, c));
    return { have: need.filter((s) => hits.has(s)).length, need: need.length };
  },
  fill(song, c) { return { have: hitSteps(song, matching(song, c)).size, need: Math.ceil(song.steps * c.min) }; },
  offbeat(song, c) {
    const spb = song.settings.stepsPerBeat;
    return { have: notesOf(song, matching(song, c)).filter((n) => n.step % spb !== 0).length, need: c.min };
  },
  low(song, c) {
    const ns = notesOf(song, melodicOnly(song, c)), high = ns.filter((n) => n.row > c.maxRow).length;
    return { ok: ns.length >= c.min && high === 0, label: high ? `${high} too high` : `${Math.min(ns.length, c.min)}/${c.min}` };
  },
  high(song, c) { return { have: notesOf(song, melodicOnly(song, c)).filter((n) => n.row >= c.minRow).length, need: c.min }; },
  run(song, c) {
    const line = melodyLine(song, melodicOnly(song, c));
    let best = line.length ? 1 : 0, cur = 1;
    for (let i = 1; i < line.length; i++) {
      const up = line[i].midi > line[i - 1].midi, down = line[i].midi < line[i - 1].midi;
      cur = (c.dir === 'down' ? down : up) ? cur + 1 : 1;
      best = Math.max(best, cur);
    }
    return { have: best, need: c.len };
  },
  distinct(song, c) { return { have: new Set(notesOf(song, melodicOnly(song, c)).map((n) => n.midi)).size, need: c.min }; },
  range(song, c) {
    const ns = notesOf(song, melodicOnly(song, c));
    const span = ns.length ? Math.max(...ns.map((n) => n.row)) - Math.min(...ns.map((n) => n.row)) : 0;
    return { have: span, need: c.span };
  },
  rests(song, c) {
    const used = new Set(); for (const r of song.robots) for (const n of song.visibleNotes(r)) used.add(n.step);
    return { ok: used.size > 0 && song.steps - used.size >= c.min, label: `${Math.min(song.steps - used.size, c.min)}/${c.min}` };
  },
  unison(song, c) {
    const per = new Map();
    for (const n of notesOf(song, matching(song, c))) { if (!per.has(n.step)) per.set(n.step, new Set()); per.get(n.step).add(n.r.uid); }
    return { have: [...per.values()].filter((s) => s.size >= c.robots).length, need: c.min };
  },
  callResponse(song, c) {
    const half = song.steps / 2;
    const a = notesOf(song, matching(song, { fam: c.a })), b = notesOf(song, matching(song, { fam: c.b }));
    const aOk = a.length >= 2 && a.every((n) => n.step < half), bOk = b.length >= 2 && b.every((n) => n.step >= half);
    return { ok: aOk && bOk, label: `${aOk ? '✓' : '✗'} call · ${bOk ? '✓' : '✗'} answer` };
  },
  endOnRoot(song, c) {
    const line = melodyLine(song, melodicOnly(song, c)), last = line[line.length - 1];
    return { ok: !!last && last.row % song.scaleLen === 0, label: last ? (last.row % song.scaleLen === 0 ? 'home!' : 'not home yet') : 'no melody' };
  },
};

export function evaluate(song, c) {
  const r = EVAL[c.type](song, c);
  if (r.ok == null) r.ok = r.have >= r.need;
  if (r.label == null) r.label = `${Math.min(r.have, r.need)}/${r.need}`;
  return r;
}
export const evaluateAll = (song, reqs) => reqs.map((c) => evaluate(song, c));

const famName = (c) => (c.id ? 'That robot' : c.fam ? famList(c.fam).map((f) => FAMILIES[f].label).join('/') : 'Any robot');
export function hint(c) {
  const f = famName(c);
  switch (c.type) {
    case 'notes': return `Select a ${f} robot and click cells in its grid until there are ${c.min} notes.`;
    case 'active': return `Give at least ${c.min} ${c.fam ? f + ' ' : ''}robots something to play. Select robots in the list (or click them on stage).`;
    case 'allPlay': return 'Every robot on stage needs at least one note. 🎲 Riff fills a quiet robot instantly.';
    case 'density': return `Fill the grid: ${c.min} notes in total across the band.`;
    case 'maxNotes': return `Less is more: keep the whole band at ${c.max} notes or fewer.`;
    case 'tempo': return c.min != null && c.max != null ? `Set the Tempo between ${c.min} and ${c.max} BPM.` : c.min != null ? `Speed up: Tempo ${c.min} BPM or faster.` : `Slow down: Tempo ${c.max} BPM or slower.`;
    case 'scale': return `Switch the Scale to ${c.any.map((s) => SCALES[s].name).join(' or ')}.`;
    case 'timeSig': return `Set Beats per bar to ${c.bpb} (in the controls bar).`;
    case 'chord': return c.robots > 1
      ? `Make ${c.robots} ${f} robots play on the same column, on different rows (try rows 1, 3, 5)${c.distinct ? `, then move to new rows in another column for a different chord` : ''}.`
      : `Stack 3 different notes in one column of a ${f} robot${c.distinct ? `, and make ${c.distinct} different chords` : ''}.`;
    case 'beat': return c.on === 'every' ? `${f}: put a hit on every beat (the columns with bold lines).` : c.on === 'downbeats' ? `${f}: hit the first beat of every bar.` : `${f}: hit the backbeat (beats 2 and 4 of each bar).`;
    case 'fill': return `${f}: play on at least ${Math.round(c.min * 100)}% of the columns.`;
    case 'offbeat': return `${f}: put ${c.min} notes between the beats (the columns without bold lines) for syncopation.`;
    case 'low': return `${f}: play ${c.min}+ notes, all in the bottom ${c.maxRow + 1} rows.`;
    case 'high': return `${f}: play ${c.min} notes up high, on row ${c.minRow + 1} or above (row 1 is the bottom).`;
    case 'run': return `${f}: ${c.len} notes in consecutive played columns that keep going ${c.dir === 'down' ? 'down' : 'up'}, like stairs.`;
    case 'distinct': return `${f}: use at least ${c.min} different pitches.`;
    case 'range': return `${f}: stretch the melody so the lowest and highest notes are ${c.span}+ rows apart.`;
    case 'rests': return `Leave ${c.min} columns completely empty across ALL robots: a dramatic pause!`;
    case 'unison': return `Make ${c.robots}+ ${c.fam ? f + ' ' : ''}robots hit on the same column, ${c.min} times.`;
    case 'callResponse': return `${FAMILIES[c.a].label} robots play only in the first half (2+ notes); ${FAMILIES[c.b].label} robots answer only in the second half (2+ notes).`;
    case 'endOnRoot': return `${f}: the last melody note should land on a home row (the shaded rows).`;
    default: return '';
  }
}

// ---------- minimal solvers ----------
function firstFree(r, steps) { return steps.find((s) => !(r.notes.get(s) || new Set()).size); }
function addSpread(song, robots, count, rowFn = (i) => i % 5) {
  if (!robots.length) return;
  const spb = song.settings.stepsPerBeat;
  const order = [...Array(song.steps).keys()].sort((a, b) => (a % spb ? 1 : 0) - (b % spb ? 1 : 0) || a - b);
  let i = 0, misses = 0;
  while (count > 0 && misses < robots.length) {
    const r = robots[i % robots.length];
    const s = firstFree(r, order);
    i++;
    if (s == null) { misses++; continue; }
    song.set(r, s, Math.min(rowFn(i - 1), song.rows(r) - 1), true);
    count--; misses = 0;
  }
}
const clearStep = (song, robots, s) => { for (const r of robots) for (const row of [...(r.notes.get(s) || [])]) song.set(r, s, row, false); };

export function solve(song, c) {
  const st = evaluate(song, c);
  if (st.ok) return;
  const rs = matching(song, c), mel = melodicOnly(song, c), spb = song.settings.stepsPerBeat, L = song.scaleLen;
  switch (c.type) {
    case 'notes': addSpread(song, rs, st.need - st.have); break;
    case 'density': addSpread(song, song.robots, st.need - st.have); break;
    case 'active': addSpread(song, rs.filter((r) => !song.visibleNotes(r).length).slice(0, st.need - st.have), st.need - st.have, () => 0); break;
    case 'allPlay': for (const r of song.robots) if (!song.visibleNotes(r).length) song.set(r, 0, 0, true); break;
    case 'maxNotes': {
      let extra = song.noteCount() - c.max;
      for (const r of [...song.robots].sort((a, b) => song.visibleNotes(b).length - song.visibleNotes(a).length))
        for (const n of song.visibleNotes(r).reverse()) if (extra > 0 && song.visibleNotes(r).length > 1) { song.set(r, n.step, n.row, false); extra--; }
      break;
    }
    case 'tempo': song.settings.bpm = c.min != null && c.max != null ? Math.round((c.min + c.max) / 2) : c.min != null ? c.min + 5 : c.max - 5; song.touch(); break;
    case 'scale': song.settings.scale = c.any[0]; song.touch(); break;
    case 'timeSig': song.settings.beatsPerBar = c.bpb; song.touch(); break;
    case 'chord': {
      const n = Math.max(c.robots || 1, 1), use = mel.slice(0, n);
      if (!use.length) break;
      const roots = [0, 3, 4, 1], k2 = Math.max(c.min, c.distinct || 0), gap = Math.max(1, Math.floor(song.steps / k2));
      for (let k = 0; k < k2; k++) {
        const notes = Math.max(3, n);
        for (let j = 0; j < notes; j++) song.set(use[j % use.length], k * gap, roots[k % 4] + [0, 2, 4][j % 3] + L * Math.floor(j / 3), true);
      }
      break;
    }
    case 'beat': for (const s of beatSteps(song, c.on)) if (rs[0]) song.set(rs[0], s, 0, true); break;
    case 'fill': for (let s = 0; s < song.steps && rs[0]; s++) song.set(rs[0], s, 0, true); break;
    case 'offbeat': { let k = st.need - st.have; for (let s = 0; s < song.steps && k > 0 && rs[0]; s++) if (s % spb && !song.has(rs[0], s, 0)) { song.set(rs[0], s, 0, true); k--; } break; }
    case 'low': {
      for (const r of mel) for (const n of song.visibleNotes(r)) if (n.row > c.maxRow) { song.set(r, n.step, n.row, false); song.set(r, n.step, n.row % (c.maxRow + 1), true); }
      addSpread(song, mel, c.min - notesOf(song, mel).length, (i) => i % (c.maxRow + 1));
      break;
    }
    case 'high': addSpread(song, mel, st.need - st.have, (i) => c.minRow + (i % 3)); break;
    case 'run': {
      const r = mel[0]; if (!r) break;
      for (let i = 0; i < c.len; i++) { clearStep(song, mel, i); song.set(r, i, c.dir === 'down' ? c.len - 1 - i : i, true); }
      break;
    }
    case 'distinct': addSpread(song, mel.slice(0, 1), c.min, (i) => i); break;
    case 'range': if (mel[0]) { song.set(mel[0], 0, 0, true); song.set(mel[0], song.steps - 1, c.span, true); } break;
    case 'rests': {
      let need = c.min - (song.steps - song.stepTable().filter((e) => e.length).length);
      for (const pass of [1, 0]) for (let s = song.steps - 1; s >= 0 && need > 0; s--) {
        if (pass && s % spb === 0) continue;
        if (song.robots.some((r) => (r.notes.get(s) || new Set()).size)) { clearStep(song, song.robots, s); need--; }
      }
      break;
    }
    case 'unison': {
      const use = (rs.length ? rs : song.robots).slice(0, c.robots);
      for (let k = 0; k < c.min; k++) for (const r of use) song.set(r, k * spb, 0, true);
      break;
    }
    case 'callResponse': {
      const half = song.steps / 2;
      const A = matching(song, { fam: c.a }), B = matching(song, { fam: c.b });
      for (const r of A) for (const n of song.visibleNotes(r)) if (n.step >= half) song.set(r, n.step, n.row, false);
      for (const r of B) for (const n of song.visibleNotes(r)) if (n.step < half) song.set(r, n.step, n.row, false);
      if (A[0]) { song.set(A[0], 0, 2, true); song.set(A[0], spb, 4, true); }
      if (B[0]) { song.set(B[0], half, 4, true); song.set(B[0], half + spb, 2, true); }
      break;
    }
    case 'endOnRoot': {
      const line = melodyLine(song, mel), last = line[line.length - 1];
      if (!last) { if (mel[0]) song.set(mel[0], 0, L, true); break; }
      clearStep(song, mel, last.step);
      song.set(last.r, last.step, Math.min(L, song.rows(last.r) - 1), true);
      break;
    }
  }
}
