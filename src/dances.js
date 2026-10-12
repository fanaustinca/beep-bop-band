// Choreographed dance routines. Each routine is 8 keyframe poses, one per beat (2 bars of 4/4),
// locked to the song's beat clock so the whole band dances together. A robot dances while it is
// playing (its "energy" rises with its notes and fades after a bar of silence); individual notes only
// add a small accent on top, so robots groove instead of twitching on every step.
//
// Pose vector layout (radians / metres, all relative to the rest pose):
//   L[0..3], R[4..7]   arm: forward raise, outward raise, elbow bend forward, elbow bend up
//   H[8..10]           head: nod, turn, tilt
//   T[11..13]          torso: lean forward, twist, side bend
//   B[14..16]          bob (body y), slide (x), lift (y)
//   G[17..19]          legs: left lift, right lift, spread
//   S[20] F[21]        spin turns (y), backflip turns (x)  — only when energy is high
//   J[22]              hop height during this beat (parabola, lands on the next beat)
const TAU = Math.PI * 2;
const N = 23;

function P(o = {}) {
  const v = new Float32Array(N);
  const put = (k, i, n) => { if (o[k]) for (let j = 0; j < n; j++) v[i + j] = o[k][j] || 0; };
  put('L', 0, 4); put('R', 4, 4); put('H', 8, 3); put('T', 11, 3); put('B', 14, 3); put('G', 17, 3);
  v[20] = o.S || 0; v[21] = o.F || 0; v[22] = o.J || 0;
  return v;
}
/** Mirror a pose left ↔ right. */
function M(o) {
  const out = { ...o, L: o.R, R: o.L };
  if (o.H) out.H = [o.H[0], -(o.H[1] || 0), -(o.H[2] || 0)];
  if (o.T) out.T = [o.T[0], -(o.T[1] || 0), -(o.T[2] || 0)];
  if (o.B) out.B = [o.B[0], -(o.B[1] || 0), o.B[2]];
  if (o.G) out.G = [o.G[1], o.G[0], o.G[2]];
  return out;
}
const rep4 = (a, b, c, d) => [a, b, c, d, M(a), M(b), M(c), M(d)];
const up = (o = {}) => ({ L: [0.2, 2.8, 0, 0], R: [0.2, 2.8, 0, 0], H: [-0.25, 0, 0], B: [0.05], ...o });

// snap = fraction of the beat used to travel to the next pose (small = staccato "robot" hits)
const DANCES = {
  pianoGroove: { label: 'piano groove', snap: 0.5, poses: rep4(
    { L: [0.6, 0.15, 0.7], R: [0.4, 0.1, 0.9], H: [0.22, 0.15], T: [0.05, 0.12, 0.04], B: [-0.03] },
    { L: [0.5, 0.3, 0.5], R: [0.5, 0.3, 0.5], H: [-0.08, 0, 0.1], T: [0, 0, -0.04], B: [0.02] },
    { L: [0.7, 0.1, 0.9], R: [0.3, 0.1, 0.6], H: [0.25, -0.15], T: [0.05, -0.12, 0.04], B: [-0.03] },
    { L: [0.3, 1.3, 0.2, 0.9], R: [0.3, 1.3, 0.2, 0.9], H: [-0.2], T: [-0.08], B: [0.05] }) },
  glissando: { label: 'glissando sweep', snap: 0.8, poses: rep4(
    { L: [1.2, 0.6, 0.3], R: [1.2, -0.3, 0.3], T: [0.1, 0.45], H: [0.1, 0.3], B: [-0.02] },
    { L: [1.4, 0, 0.3], R: [1.4, 0, 0.3], T: [0.12], H: [0.15], B: [-0.04] },
    { L: [1.2, -0.3, 0.3], R: [1.2, 0.6, 0.3], T: [0.1, -0.45], H: [0.1, -0.3], B: [-0.02] },
    up({ T: [-0.15] })) },
  stompClap: { label: 'stomp & clap', snap: 0.35, poses: rep4(
    { G: [0.9, 0], B: [0.03], T: [0, 0, 0.1], L: [0.3, 0.5, 0.8], R: [0.3, 0.5, 0.8] },
    { B: [-0.07], T: [0.1, 0, -0.05], L: [0.2, 0.6, 0.6], R: [0.2, 0.6, 0.6], H: [0.2] },
    { G: [0, 0.9], B: [0.03], T: [0, 0, -0.1], L: [0.3, 0.5, 0.8], R: [0.3, 0.5, 0.8] },
    { L: [2.7, -0.15, 0.2], R: [2.7, -0.15, 0.2], H: [-0.25], B: [0.04] }) },
  clapAlong: { label: 'clap-along', snap: 0.4, poses: rep4(
    { T: [0, 0, 0.12], H: [0, 0.2, 0.12], L: [0.3, 0.4, 0.2], R: [0.3, 0.4, 0.2], B: [-0.03, 0.06] },
    { L: [1.3, -0.35, 0.5], R: [1.3, -0.35, 0.5], H: [0.2], B: [0.02] },
    { T: [0, 0, -0.12], H: [0, -0.2, -0.12], L: [0.3, 0.4, 0.2], R: [0.3, 0.4, 0.2], B: [-0.03, -0.06] },
    { L: [2.5, -0.2, 0.3], R: [2.5, -0.2, 0.3], H: [-0.2], B: [0.04] }) },
  headbang: { label: 'headbang', snap: 0.3, poses: (() => {
    const a = { H: [0.55], T: [0.3], L: [0.4, 0.3, 0.6], R: [0.4, 0.3, 0.6], B: [-0.05] };
    const b = { H: [-0.3], T: [-0.05], L: [0.3, 0.3, 0.5], R: [0.3, 0.3, 0.5], B: [0.02] };
    const d = { L: [2.7, 0.3], R: [0.6, 0.3, 0.9], H: [0.4, 0.3, 0.1], T: [0.2], B: [-0.03] };
    return [a, b, a, d, a, b, a, M(d)];
  })() },
  bassDrop: { label: 'bass-drop squat', snap: 0.45, poses: (() => {
    const sq = { B: [-0.13], T: [0.18], L: [0.6, 0.6, 0.8], R: [0.6, 0.6, 0.8], H: [0.2], G: [0.35, 0.35] };
    const rise = { B: [0.05], L: [0.2, 1.5], R: [0.2, 1.5], H: [-0.15] };
    return [sq, rise, sq, sq, rise, sq, up({ J: 0.12 }), sq];
  })() },
  fistPump: { label: 'fist pump', snap: 0.3, poses: (() => {
    const a = { R: [2.8, 0.2, 0.2], L: [0.3, 0.3, 1.2], H: [-0.2], J: 0.1 };
    const b = { R: [1.2, 0.3, 1.6], L: [0.3, 0.3, 1.2], H: [0.15], B: [-0.04] };
    return [a, b, a, b, M(a), M(b), M(a), { L: [2.8, 0.3], R: [2.8, 0.3], H: [-0.3], J: 0.18 }];
  })() },
  smooth: { label: 'smooth groove', snap: 1, poses: (() => {
    const a = { T: [0, 0.15, 0.14], B: [-0.02, 0.08], L: [0.3, 0.5, 0.9], R: [0.6, 0.2, 0.6], H: [0, -0.15, -0.1] };
    const b = { B: [0.01], L: [0.5, 0.3, 0.7], R: [0.5, 0.3, 0.7], H: [0.1] };
    return [a, b, M(a), b, a, b, M(a), { L: [2.0, 0.8, 0.6], R: [2.0, 0.8, 0.6], H: [-0.2], B: [0.03] }];
  })() },
  swim: { label: 'zero-g swim', snap: 1, poses: (() => {
    const a = { L: [2.6, 0.2], R: [0.2, 0.2], T: [0.1, 0.2], H: [0, 0.3], B: [0.05] };
    const b = { L: [1.2, 0.6], R: [1.2, 0.6], T: [0.15], B: [-0.03] };
    return [a, b, M(a), b, a, b, M(a), { L: [1.6, 1.4], R: [1.6, 1.4], B: [0.12], H: [-0.2] }];
  })() },
  raiseRoof: { label: 'raise the roof', snap: 0.3, poses: (() => {
    const a = { L: [0, 1.4, 0, 1.6], R: [0, 1.4, 0, 1.6], H: [0.2], B: [-0.04] };
    const b = { L: [0, 2.4, 0, 0.6], R: [0, 2.4, 0, 0.6], H: [-0.2], B: [0.04], T: [-0.08] };
    return [a, b, a, b, a, b, { ...a, T: [0, 0.35] }, { ...b, J: 0.15 }];
  })() },
  rockStar: { label: 'rock-star windmill', snap: 0.4, poses: (() => {
    const lean = { T: [-0.2, 0, 0.1], H: [-0.3, 0, 0.2], L: [0.9, 0.2, 1.2], R: [0.6, 0.4, 0.3], B: [-0.03] };
    const bang = { T: [0.25], H: [0.5], L: [0.9, 0.2, 1.2], R: [0.6, 0.4, 0.6] };
    const kick = { G: [1.1, 0], T: [-0.1, 0, -0.1], R: [2.7, 0.6], L: [0.9, 0.2, 1.2] };
    return [lean, bang, lean, bang, lean, bang, kick, { T: [0.1, 0, 0.1], L: [0.9, 0.2, 1.2], R: [0.6, 0.4], H: [0.3] }];
  })(), fx(v, f, k) { if (k === 6) v[4] += TAU * ease(f); } },
  sprinkler: { label: 'the sprinkler', snap: 0.25, poses: Array.from({ length: 8 }, (_, k) => ({
    L: [2.4, 0.9, 0, 2.0], R: [1.5, 0.3], T: [0, k < 7 ? -0.6 + k * 0.18 : -0.6], H: [0.05, k < 7 ? -0.3 + k * 0.1 : -0.3], B: [k % 2 ? -0.03 : 0.01],
  })) },
  robot: { label: 'the robot', snap: 0.15, poses: (() => {
    const a = { L: [0, 1.55, 0, 1.55], R: [0, 1.55, 0, -1.4], H: [0, 0.4] };
    const b = { L: [1.55, 0, 1.55], R: [1.55, 0, 1.55], H: [0, -0.4], B: [-0.03] };
    const c = { L: [0, 1.55, 0, -1.4], R: [0, 1.55, 0, 1.55], T: [0, 0.4] };
    const d = { L: [1.55], R: [1.55], H: [0.3], B: [-0.04] };
    const e = { L: [0, 0.2, 1.55], R: [0, 0.2, 1.55], T: [0, -0.5], H: [0, 0.5] };
    return [a, b, c, d, e, M(a), M(c), up({ L: [0, 2.9], R: [0, 2.9] })];
  })() },
  bounce: { label: 'bounce & swing', snap: 0.6, poses: (() => {
    const a = { L: [0.9, 0.1, 0.5], R: [-0.5, 0.1, 0.3], G: [0.3, 0], J: 0.09 };
    return [a, M(a), a, M(a), a, M(a), a, up({ J: 0.2 })];
  })() },
  twist: { label: 'the twist', snap: 0.9, poses: (() => {
    const a = { T: [0.05, 0.6], H: [0, -0.4], L: [0.4, 0.7, 1.0], R: [0.4, 0.7, 1.0], B: [-0.06], G: [0.2, 0] };
    const low = { ...a, B: [-0.13], T: [0.15, 0.6] };
    return [a, M(a), a, M(a), low, M(low), a, M(a)];
  })() },
  spin: { label: 'spin move', snap: 0.5, poses: (() => {
    const g1 = { H: [0.2, 0.2], T: [0, 0, 0.08], L: [0.4, 0.4, 0.8], R: [0.4, 0.4, 0.8], B: [-0.03] };
    return [g1, M(g1), g1, M(g1), g1, M(g1), { B: [-0.08], L: [0.8, 0, 1.2], R: [0.8, 0, 1.2], J: 0.06 }, { S: 1, L: [0, 1.4], R: [0, 1.4], H: [-0.2, 0, 0.2] }];
  })() },
  drumSolo: { label: 'drum solo', snap: 0.4, poses: [...Array(7).fill({ L: [0.9, 0.3, 0.6], R: [0.9, 0.3, 0.6], H: [0.15], B: [-0.03] }), up({ L: [0.4, 2.6], R: [0.4, 2.6], J: 0.12 })],
    fx(v, f, k, b) { if (k < 7) { const w = Math.sin(b * 2 * TAU); v[0] += 0.5 * w; v[4] -= 0.5 * w; v[8] += 0.1 * Math.abs(w); } } },
  jacks: { label: 'jumping jacks', snap: 0.6, poses: (() => {
    const a = { L: [0, 2.9], R: [0, 2.9], G: [0, 0, 0.3], J: 0.1 };
    const b = { L: [0, 0.2], R: [0, 0.2], J: 0.1 };
    return [a, b, a, b, a, b, a, { ...b, J: 0 }];
  })() },
  shimmy: { label: 'shoulder shimmy', snap: 0.7, poses: (() => {
    const a = { T: [-0.15], L: [0.2, 0.6, 1.2], R: [0.2, 0.6, 1.2], H: [-0.1], B: [-0.05] };
    const b = { T: [0.2], H: [0.2], L: [0.5, 0.5, 1.0], R: [0.5, 0.5, 1.0], B: [-0.09] };
    return [a, a, b, b, a, a, b, up()];
  })(), fx(v, f, k, b) { if (k !== 7) { v[13] += 0.13 * Math.sin(b * 2 * TAU); v[12] += 0.1 * Math.cos(b * 2 * TAU); } } },
  armWave: { label: 'arm wave', snap: 1, poses: [...Array(7).fill({ L: [0, 1.5], R: [0, 1.5], B: [-0.02] }), up()],
    fx(v, f, k, b) { if (k < 7) { const ph = b * Math.PI; v[1] += 0.35 * Math.sin(ph); v[3] += 0.8 * Math.sin(ph + 1.2); v[5] += 0.35 * Math.sin(ph + 2.4); v[7] += 0.8 * Math.sin(ph + 3.6); v[10] += 0.15 * Math.sin(ph + 1.8); v[13] += 0.08 * Math.sin(ph + 1.8); } } },
  backflip: { label: 'backflip', snap: 0.5, poses: (() => {
    const g = { L: [0.6, 0.5, 0.8], R: [0.6, 0.5, 0.8], H: [0.15], T: [0.05, 0.15], B: [-0.03] };
    return [g, M(g), g, M(g), g, M(g), { B: [-0.1], L: [-0.6, 0.3], R: [-0.6, 0.3], T: [0.2], J: 0.6 }, { F: 1, L: [0.2, 2.6], R: [0.2, 2.6] }];
  })() },
  moonwalk: { label: 'moonwalk slide', snap: 0.9, poses: Array.from({ length: 8 }, (_, k) => {
    const x = k < 4 ? -0.09 * k : -0.09 * (7 - k);
    return { B: [-0.02, x], G: k % 2 ? [0.35, 0] : [0, 0.35], T: [0.08, 0, k % 2 ? 0.05 : -0.05], L: [0.4, 0.2, 0.7], R: [-0.3, 0.2, 0.3], H: [0, k < 4 ? -0.4 : 0.4] };
  }) },
  snap: { label: 'finger-snap nod', snap: 0.35, poses: (() => {
    const a = { L: [0.6, 0.4, 1.4], R: [0.4, 0.4, 0.9], H: [0.25, 0.1], B: [-0.03] };
    const b = { L: [0.4, 0.4, 0.9], R: [0.6, 0.4, 1.4], H: [-0.05, -0.1], B: [0.01] };
    return [a, b, a, b, a, b, a, { T: [-0.1, 0.3], H: [0, 0.4, 0.1], L: [0.3, 0.3, 1.2], R: [0.3, 0.3, 1.2] }];
  })() },
  disco: { label: 'disco point', snap: 0.35, poses: (() => {
    const a = { R: [0.3, 2.6], L: [0.4, 0.2, 1.0], T: [0, 0, -0.12], H: [-0.2, -0.3], B: [0, 0.05] };
    const b = { R: [0.4, -0.6], L: [0.4, 0.2, 1.0], T: [0, 0.2, 0.08], H: [0.2, 0.3], B: [-0.04, -0.03] };
    return [a, b, a, b, M(a), M(b), { T: [0, 0.4, 0.1], L: [0.3, 1.2, 0.8], R: [0.3, 1.2, 0.8], B: [-0.05] }, up()];
  })() },
  march: { label: 'march', snap: 0.5, poses: (() => {
    const a = { G: [0.75, 0], L: [-0.5, 0.1], R: [1.0, 0.1, 0.4], B: [0.02], H: [0, 0, 0.05] };
    return [a, M(a), a, M(a), a, M(a), { R: [2.3, 0.6, 0, 1.5], H: [-0.1, 0.3], T: [-0.05] }, { L: [-0.2, 0.1], R: [-0.2, 0.1], B: [-0.04] }];
  })() },
  floss: { label: 'the floss', snap: 1, poses: [...Array(7).fill({ B: [-0.03] }), up()],
    fx(v, f, k, b) { if (k < 7) { const s = Math.sin(b * TAU), c = Math.sin(b * TAU * 2); v[0] += 0.5 * s; v[1] += -0.4 * c + 0.15; v[4] += -0.5 * s; v[5] += 0.4 * c + 0.15; v[15] += -0.08 * c; v[13] += 0.12 * c; } } },
  cabbage: { label: 'cabbage patch', snap: 1, poses: [...Array(7).fill({ L: [1.3, 0, 1.2], R: [1.3, 0, 1.2], B: [-0.05], T: [0.1] }), up({ J: 0.1 })],
    fx(v, f, k, b) { if (k < 7) { const ph = b * Math.PI; v[0] += 0.45 * Math.sin(ph); v[1] += 0.45 * Math.cos(ph); v[4] += 0.45 * Math.sin(ph); v[5] -= 0.45 * Math.cos(ph); v[13] += 0.12 * Math.cos(ph); v[9] += 0.25 * Math.cos(ph); } } },
  runningMan: { label: 'running man', snap: 1, poses: [...Array(7).fill({ L: [0.5, 0.2, 1.4], R: [0.5, 0.2, 1.4], T: [0.08] }), up({ J: 0.15 })],
    fx(v, f, k, b) { if (k < 7) { const s = Math.sin(b * Math.PI); v[17] += 0.9 * Math.max(0, s); v[18] += 0.9 * Math.max(0, -s); v[0] += 0.4 * s; v[4] -= 0.4 * s; v[14] += -0.05 * Math.abs(Math.cos(b * Math.PI)); } } },
  dab: { label: 'dab', snap: 0.25, poses: (() => {
    const g = { H: [0.2], L: [0.4, 0.3, 0.8], R: [0.4, 0.3, 0.8], B: [-0.03] };
    const g2 = { H: [-0.05], L: [0.3, 0.3, 0.6], R: [0.3, 0.3, 0.6], B: [0.01] };
    const dab = { R: [0.6, 2.3], L: [1.6, -0.2, 1.8], H: [0.5, 0.4], T: [0.15, -0.2], B: [-0.03] };
    return [g, g2, g, dab, g, g2, g, M(dab)];
  })() },
  conductor: { label: 'conductor', snap: 0.9, poses: (() => {
    const p = (r, h) => ({ R: r, L: [0.9, 0.5, 0.8], H: h, B: [0.0] });
    const a = p([1.0, 0.2, 0.6], [0.2]), b = p([1.4, -0.4, 0.4], [-0.05, 0.2]), c = p([1.4, 1.0, 0.3], [-0.05, -0.2]), d = p([2.4, 0.4, 0.2], [-0.25]);
    return [a, b, c, d, a, b, c, { ...up(), T: [-0.12] }];
  })() },
};

function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
for (const d of Object.values(DANCES)) d.vec = d.poses.map(P);

export const DANCE_LABELS = Object.fromEntries(Object.entries(DANCES).map(([k, d]) => [k, d.label]));
export const DANCE_KEYS = Object.keys(DANCES);

const tmp = new Float32Array(N);
/**
 * Pose a rig for beat position `b` (absolute beats, float). `amt` 0..1 scales the whole dance;
 * `big` enables spins/flips. Writes on top of the rest pose (caller resets first).
 */
export function dance(rig, key, b, beatsPerBar, amt, big) {
  const d = DANCES[key] || DANCES.pianoGroove;
  // stretch the 8-pose routine over 2 bars of the current meter
  const u = ((b * 8) / (2 * beatsPerBar)) % 8;
  const k = Math.floor(u), f = u - k;
  const from = d.vec[k], to = d.vec[(k + 1) % 8];
  const travel = d.snap, s = ease(Math.max(0, Math.min(1, (f - (1 - travel)) / travel)));
  for (let i = 0; i < N; i++) {
    let a = from[i], c = to[i];
    if (i === 20 || i === 21) { if (c < a) c += Math.ceil(a - c); a %= 1; c -= Math.floor(from[i]); }
    tmp[i] = a + (c - a) * s;
  }
  if (d.fx) d.fx(tmp, f, k, b);
  const v = tmp;
  for (let i = 0; i < rig.arms.length; i++) {
    const a = rig.arms[i], o = i % 2 === 0 ? (i >= 2 ? 4 : 0) : (i >= 2 ? 0 : 4);
    a.pivot.rotation.x -= v[o] * amt;
    a.pivot.rotation.z += a.side * v[o + 1] * amt;
    a.elbow.rotation.x -= v[o + 2] * amt;
    a.elbow.rotation.z += a.side * v[o + 3] * amt;
  }
  rig.head.rotation.x += v[8] * amt; rig.head.rotation.y += v[9] * amt; rig.head.rotation.z += v[10] * amt;
  rig.torso.rotation.x += v[11] * amt; rig.torso.rotation.y += v[12] * amt; rig.torso.rotation.z += v[13] * amt;
  rig.body.position.y += v[14] * amt;
  rig.flip.position.x += v[15] * amt;
  rig.flip.position.y += (v[16] + from[22] * 4 * f * (1 - f)) * amt;
  if (rig.legs.length >= 2) {
    rig.legs[0].rotation.x -= v[17] * amt; rig.legs[1].rotation.x -= v[18] * amt;
    rig.legs[0].rotation.z -= v[19] * amt; rig.legs[1].rotation.z += v[19] * amt;
  }
  if (big) { rig.flip.rotation.y += TAU * (v[20] % 1); rig.flip.rotation.x -= TAU * (v[21] % 1); }
  // groove bob on every beat
  const beatF = b % 1;
  rig.body.position.y -= 0.025 * amt * Math.exp(-beatF * 6);
  return k;
}
