// Pure-logic checks (no browser): catalog integrity and that every level is solvable.
import { ROBOTS, FAMILIES } from '../src/catalog.js';
import { LEVELS, levelSong } from '../src/levels.js';
import { Song } from '../src/song.js';
import { evaluateAll, evaluate, solve } from '../src/audience.js';

let fails = 0;
const check = (cond, msg) => { if (!cond) { fails++; console.log('  ✗ ' + msg); } };

check(ROBOTS.length === 50, `50 robots (got ${ROBOTS.length})`);
check(new Set(ROBOTS.map((r) => r.id)).size === 50, 'robot ids unique');
for (const r of ROBOTS) check(FAMILIES[r.family], `${r.id} has a known family`);
check(LEVELS.length === 50, `50 levels (got ${LEVELS.length})`);

for (const L of LEVELS) {
  const song = levelSong(L, Song);
  const ids = new Set(L.robots);
  check(ids.size === L.robots.length, `L${L.n}: duplicate robots`);
  for (const q of L.requests) {
    if (q.id) check(ids.has(q.id), `L${L.n}: request references ${q.id} which is not on stage`);
    for (const f of [q.fam, q.a, q.b].flat().filter(Boolean)) check(song.robots.some((r) => r.def.family === f), `L${L.n}: no ${f} robot on stage`);
  }
  const start = evaluateAll(song, L.requests);
  check(!start.every((e) => e.ok), `L${L.n}: already solved at start`);
  for (let round = 0; round < 6; round++) for (const q of L.requests) solve(song, q);
  const res = L.requests.map((q) => [q, evaluate(song, q)]).filter(([, e]) => !e.ok);
  check(!res.length, `L${L.n} "${L.title}" unsolved: ` + res.map(([q, e]) => `${q.type}(${e.label})`).join(', '));
  if (L.n >= 21 && L.n <= 40) check(L.robots.length >= 15 && L.robots.length <= 30, `L${L.n}: 15–30 robots (has ${L.robots.length})`);
}
const counts = LEVELS.map((l) => l.robots.length);
console.log('robots per level:', counts.join(' '));
console.log(fails ? `\n${fails} logic failures` : '\nlogic OK');
process.exit(fails ? 1 : 0);
