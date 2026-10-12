// 3D robots. One shared design language (glossy pearl/graphite shells, black-glass visor with a
// neon eye strip, neon seam rings at the joints, a glowing core badge) so the band looks like one
// product line, and a distinct silhouette + instrument per family so every section reads at a glance.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const geoCache = new Map();
const G = (key, make) => { let g = geoCache.get(key); if (!g) geoCache.set(key, (g = make())); return g; };
const rbox = (w, h, d, r = 0.05) => G(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)));
const caps = (r, len) => G(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 5, 14));
const sph = (r, ws = 20, hs = 14) => G(`sp${r},${ws}`, () => new THREE.SphereGeometry(r, ws, hs));
const cyl = (rt, rb, h, s = 24, open = false) => G(`cy${rt},${rb},${h},${s},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
const tor = (r, t, arc = TAU) => G(`to${r},${t},${arc}`, () => new THREE.TorusGeometry(r, t, 8, 28, arc));
const lathe = (key, pts, seg = 28) => G('la' + key, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg));

// ---------- materials ----------
const matCache = new Map();
const M = (key, make) => { let m = matCache.get(key); if (!m) matCache.set(key, (m = make())); return m; };
const SHELLS = [
  { color: '#dfe3eb', name: 'pearl' },
  { color: '#2a2f3a', name: 'graphite' },
];
const shellMat = (c) => M('shell' + c, () => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.3, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.1 }));
const darkGlass = () => M('glass', () => new THREE.MeshPhysicalMaterial({ color: '#07090d', metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }));
const jointMat = () => M('joint', () => new THREE.MeshStandardMaterial({ color: '#3a404c', metalness: 0.85, roughness: 0.35 }));
const chromeMat = () => M('chrome', () => new THREE.MeshStandardMaterial({ color: '#c9ced8', metalness: 1, roughness: 0.18 }));
const brassMat = () => M('brass', () => new THREE.MeshStandardMaterial({ color: '#e2b04a', metalness: 1, roughness: 0.22, side: THREE.DoubleSide }));
const keyWhite = () => M('kw', () => new THREE.MeshStandardMaterial({ color: '#f7f8fb', metalness: 0.1, roughness: 0.35 }));
const keyBlack = () => M('kb', () => new THREE.MeshStandardMaterial({ color: '#111318', metalness: 0.3, roughness: 0.3 }));
const trimMat = (accent) => M('trim' + accent, () => new THREE.MeshStandardMaterial({ color: accent, metalness: 0.55, roughness: 0.3, emissive: accent, emissiveIntensity: 0.18 }));

function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

// ---------- shared parts (the "family resemblance") ----------
class Kit {
  constructor(def) {
    this.def = def;
    this.accent = new THREE.Color(def.accent);
    this.shell = shellMat(SHELLS[def.variant % 2].color);
    this.shellAlt = shellMat(SHELLS[(def.variant + 1) % 2].color);
    this.trim = trimMat(def.accent);
    this.glow = new THREE.MeshStandardMaterial({ color: '#0a0a0a', emissive: def.accent, emissiveIntensity: 1.4, roughness: 0.4 });
    this.flash = new THREE.MeshStandardMaterial({ color: '#0a0a0a', emissive: def.accent, emissiveIntensity: 0.25, roughness: 0.4 });
    const eye = this.accent.clone().lerp(new THREE.Color('#ffffff'), 0.45);
    this.eye = new THREE.MeshStandardMaterial({ color: '#000000', emissive: eye, emissiveIntensity: 2.2 });
  }
  seam(parent, r, y = 0, rotX = Math.PI / 2) { const s = mesh(tor(r, 0.012), this.glow, parent, 0, y, 0); s.rotation.x = rotX; return s; }
  /** Black glass visor with a neon eye strip — the shared face of the whole line. */
  visor(parent, w, h, z, y = 0, style = 'strip') {
    const v = mesh(rbox(w, h, 0.06, h * 0.45), darkGlass(), parent, 0, y, z);
    if (style === 'strip') mesh(rbox(w * 0.72, h * 0.22, 0.02, h * 0.1), this.eye, v, 0, 0, 0.035);
    else if (style === 'dual') for (const s of [-1, 1]) mesh(rbox(w * 0.22, h * 0.34, 0.02, h * 0.15), this.eye, v, s * w * 0.22, 0, 0.035);
    else if (style === 'cyclops') { const e = mesh(cyl(h * 0.3, h * 0.3, 0.02, 24), this.eye, v, 0, 0, 0.035); e.rotation.x = Math.PI / 2; }
    else if (style === 'arc') { const e = mesh(tor(w * 0.22, h * 0.07, Math.PI), this.eye, v, 0, -h * 0.12, 0.035); }
    return v;
  }
  /** Glowing core badge on the chest (every robot has one). */
  core(parent, y, z, r = 0.07) {
    const c = mesh(cyl(r, r, 0.03, 24), this.glow, parent, 0, y, z);
    c.rotation.x = Math.PI / 2;
    mesh(tor(r * 1.25, 0.01), chromeMat(), c, 0, 0, 0).rotation.x = Math.PI / 2;
    return c;
  }
  joint(parent, r, x = 0, y = 0, z = 0) { return mesh(sph(r, 14, 10), jointMat(), parent, x, y, z); }
  /** Shoulder pivot → upper arm → elbow pivot → forearm → hand group. Hangs along -y at rest. */
  arm(parent, side, { x, y, z = 0, upper = 0.32, fore = 0.3, r = 0.05, hand = 'ball', mat = this.shell, handR }) {
    const pivot = group(parent, side * x, y, z);
    this.joint(pivot, r * 1.35);
    mesh(caps(r, upper), mat, pivot, 0, -upper / 2 - r * 0.3, 0);
    const elbow = group(pivot, 0, -upper - r * 0.5, 0);
    this.joint(elbow, r * 1.1);
    mesh(caps(r * 0.9, fore), mat, elbow, 0, -fore / 2, 0);
    const handG = group(elbow, 0, -fore - r * 0.6, 0);
    const hr = handR || r * 1.4;
    if (hand === 'ball') mesh(sph(hr, 14, 10), jointMat(), handG);
    else if (hand === 'mitt') mesh(rbox(hr * 1.6, hr * 1.8, hr * 1.1, hr * 0.4), mat, handG);
    pivot.rotation.z = side * 0.12;
    return { pivot, elbow, hand: handG, side };
  }
  leg(parent, side, { x, y, len = 0.5, r = 0.07, foot = [0.16, 0.08, 0.26], mat = this.shell }) {
    const hip = group(parent, side * x, y, 0);
    this.joint(hip, r * 1.2);
    mesh(caps(r, len), mat, hip, 0, -len / 2 - r * 0.3, 0);
    this.seam(hip, r * 1.08, -len * 0.55);
    const ft = mesh(rbox(...foot, foot[1] * 0.45), jointMat(), hip, 0, -len - r - foot[1] / 2 + 0.02, foot[2] * 0.15);
    mesh(rbox(foot[0] * 0.9, 0.012, foot[2] * 0.9, 0.004), this.glow, ft, 0, -foot[1] / 2 + 0.006, 0);
    return hip;
  }
}

// ---------- family builders ----------
// Each returns the rig: body (bounce pivot), torso, head, arms[], legs[], height, extras for reactions.

function buildPiano(k, rig) {
  const v = k.def.variant;
  const body = rig.body;
  const legL = k.leg(body, -1, { x: 0.1, y: 0.82, len: 0.55, r: 0.055, foot: [0.13, 0.07, 0.24] });
  const legR = k.leg(body, 1, { x: 0.1, y: 0.82, len: 0.55, r: 0.055, foot: [0.13, 0.07, 0.24] });
  const torso = group(body, 0, 0.84, 0);
  // elegant tapered torso (narrow waist → broad chest)
  mesh(lathe('pianoTorso', [[0.0, 0], [0.13, 0], [0.12, 0.12], [0.17, 0.32], [0.22, 0.5], [0.2, 0.6], [0.0, 0.62]]), k.shell, torso).scale.z = 0.72;
  k.seam(torso, 0.125, 0.03);
  // keyboard chest plate: 7 white keys + 5 black keys, a few light up on hits
  const plate = group(torso, 0, 0.36, 0.13);
  plate.rotation.x = -0.1;
  mesh(rbox(0.34, 0.2, 0.03, 0.02), darkGlass(), plate);
  const keys = [];
  for (let i = 0; i < 7; i++) keys.push(mesh(rbox(0.042, 0.16, 0.02, 0.006), keyWhite(), plate, -0.135 + i * 0.045, -0.01, 0.02));
  for (const i of [0, 1, 3, 4, 5]) mesh(rbox(0.026, 0.1, 0.03, 0.005), keyBlack(), plate, -0.112 + i * 0.045, 0.02, 0.03);
  mesh(rbox(0.34, 0.012, 0.035, 0.004), k.glow, plate, 0, 0.1, 0.01);
  // tailcoat fins
  for (const s of [-1, 1]) { const f = mesh(rbox(0.1, 0.42, 0.02, 0.01), k.shellAlt, torso, s * 0.08, 0.05, -0.12); f.rotation.set(0.25, 0, s * 0.18); }
  // bow tie
  for (const s of [-1, 1]) { const b = mesh(G('bow', () => new THREE.ConeGeometry(0.035, 0.07, 4)), k.trim, torso, s * 0.035, 0.6, 0.1); b.rotation.z = s * Math.PI / 2; }
  const head = group(torso, 0, 0.72, 0);
  k.joint(head, 0.05, 0, -0.06, 0);
  const skull = mesh(sph(0.15, 28, 20), k.shell, head, 0, 0.08, 0); skull.scale.set(1, 1.08, 0.95);
  k.visor(head, 0.22, 0.08, 0.13, 0.09, 'arc');
  if (v % 3 === 1) for (const s of [-1, 1]) { const fin = mesh(rbox(0.02, 0.14, 0.08, 0.01), k.trim, head, s * 0.15, 0.1, -0.02); fin.rotation.z = -s * 0.2; }
  if (v % 3 === 2) { const ring = k.seam(head, 0.11, 0.26); ring.rotation.x = Math.PI / 2 + 0.25; }
  // long articulate arms with 4 long fingers each
  const arms = [-1, 1].map((s) => k.arm(torso, s, { x: 0.24, y: 0.52, upper: 0.3, fore: 0.3, r: 0.035, hand: 'none' }));
  const fingers = [];
  for (const a of arms) {
    mesh(rbox(0.07, 0.05, 0.05, 0.015), jointMat(), a.hand);
    for (let i = 0; i < 4; i++) {
      const fg = group(a.hand, -0.024 + i * 0.016, -0.02, 0);
      mesh(caps(0.007, 0.09), k.shell, fg, 0, -0.05, 0);
      mesh(sph(0.009, 8, 6), k.glow, fg, 0, -0.1, 0);
      fingers.push(fg);
    }
  }
  k.core(torso, 0.53, 0.12, 0.035);
  Object.assign(rig, { torso, head, arms, legs: [legL, legR], height: 1.75, extras: { keys, fingers } });
}

function buildKeys(k, rig) {
  const body = rig.body;
  const legs = [-1, 1].map((s) => k.leg(body, s, { x: 0.12, y: 0.62, len: 0.4, r: 0.07, foot: [0.16, 0.08, 0.26] }));
  const torso = group(body, 0, 0.64, 0);
  mesh(rbox(0.42, 0.5, 0.3, 0.12), k.shell, torso, 0, 0.27, 0);
  mesh(rbox(0.3, 0.12, 0.26, 0.05), jointMat(), torso, 0, 0.02, 0);
  k.seam(torso, 0.16, 0.08);
  k.core(torso, 0.36, 0.155, 0.06);
  for (const s of [-1, 1]) mesh(rbox(0.12, 0.012, 0.2, 0.004), k.glow, torso, s * 0.21, 0.42, 0).rotation.z = s * 0.2;
  // floating keytar slab in front
  const slab = group(torso, 0, 0.12, 0.34);
  slab.rotation.x = 0.35;
  mesh(rbox(0.62, 0.06, 0.18, 0.025), k.shellAlt, slab);
  const keys = [];
  for (let i = 0; i < 12; i++) keys.push(mesh(rbox(0.04, 0.02, 0.1, 0.004), keyWhite(), slab, -0.24 + i * 0.044, 0.035, 0.02));
  for (let i = 0; i < 11; i++) if (![2, 6, 9].includes(i)) mesh(rbox(0.022, 0.025, 0.06, 0.004), keyBlack(), slab, -0.218 + i * 0.044, 0.045, -0.01);
  mesh(rbox(0.6, 0.012, 0.012, 0.004), k.glow, slab, 0, 0.0, 0.092);
  for (const s of [-1, 1]) mesh(sph(0.03, 12, 8), k.glow, slab, s * 0.33, 0, 0);
  // head with headphones
  const head = group(torso, 0, 0.62, 0);
  mesh(rbox(0.3, 0.24, 0.26, 0.1), k.shell, head, 0, 0.1, 0);
  k.visor(head, 0.24, 0.1, 0.13, 0.1, 'dual');
  const band = mesh(tor(0.17, 0.018, Math.PI), jointMat(), head, 0, 0.12, 0);
  band.rotation.y = Math.PI / 2;
  for (const s of [-1, 1]) { const cup = mesh(cyl(0.07, 0.07, 0.05, 20), k.trim, head, s * 0.17, 0.1, 0); cup.rotation.z = Math.PI / 2; mesh(cyl(0.045, 0.045, 0.01, 20), k.glow, cup, 0, s * 0.028, 0); }
  const arms = [-1, 1].map((s) => k.arm(torso, s, { x: 0.25, y: 0.42, upper: 0.22, fore: 0.22, r: 0.05, hand: 'mitt', handR: 0.04 }));
  for (const a of arms) { a.pivot.rotation.x = -0.5; a.elbow.rotation.x = -0.9; a.rest = { px: -0.5, ex: -0.9 }; }
  Object.assign(rig, { torso, head, arms, legs, height: 1.5, extras: { keys } });
}

function buildSynth(k, rig) {
  const v = k.def.variant, body = rig.body;
  const legs = [-1, 1].map((s) => k.leg(body, s, { x: 0.09, y: 0.95, len: 0.68, r: 0.045, foot: [0.1, 0.06, 0.22] }));
  const torso = group(body, 0, 0.97, 0);
  mesh(lathe('synthTorso', [[0, 0], [0.09, 0], [0.08, 0.1], [0.17, 0.45], [0.19, 0.6], [0.1, 0.68], [0, 0.69]]), k.shell, torso).scale.z = 0.62;
  k.seam(torso, 0.085, 0.05);
  // chest panel: 3x3 grid that flashes patterns
  const panel = [];
  const pg = group(torso, 0, 0.42, 0.1);
  mesh(rbox(0.2, 0.2, 0.02, 0.02), darkGlass(), pg);
  for (let i = 0; i < 9; i++) panel.push(mesh(rbox(0.05, 0.05, 0.015, 0.008), new THREE.MeshStandardMaterial({ color: '#050505', emissive: k.def.accent, emissiveIntensity: 0.15 }), pg, ((i % 3) - 1) * 0.062, (Math.floor(i / 3) - 1) * 0.062, 0.012));
  // swept shoulder fins
  for (const s of [-1, 1]) { const fin = mesh(rbox(0.04, 0.24, 0.16, 0.015), k.trim, torso, s * 0.2, 0.62, -0.04); fin.rotation.set(-0.4, 0, -s * 0.5); }
  // tall elongated head with antennae
  const head = group(torso, 0, 0.78, 0);
  k.joint(head, 0.04, 0, -0.06, 0);
  mesh(caps(0.11, 0.18), k.shell, head, 0, 0.14, 0).scale.z = 0.9;
  k.visor(head, 0.17, 0.07, 0.095, 0.16, 'strip');
  const tips = [];
  const n = v % 2 === 0 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const a = group(head, (i - (n - 1) / 2) * 0.08, 0.32, 0);
    a.rotation.z = -(i - (n - 1) / 2) * 0.35;
    mesh(cyl(0.008, 0.012, 0.22, 8), chromeMat(), a, 0, 0.11, 0);
    tips.push(mesh(sph(0.03, 12, 8), k.glow, a, 0, 0.24, 0));
  }
  const arms = [-1, 1].map((s) => k.arm(torso, s, { x: 0.21, y: 0.57, upper: 0.32, fore: 0.3, r: 0.035, hand: 'ball' }));
  Object.assign(rig, { torso, head, arms, legs, height: 2.15, extras: { panel, tips } });
}

function buildPad(k, rig) {
  const body = rig.body;
  // hovering: no legs, a glowing thruster
  const thr = mesh(cyl(0.12, 0.05, 0.16, 20), jointMat(), body, 0, 0.42, 0);
  mesh(cyl(0.05, 0.02, 0.02, 16), k.glow, thr, 0, -0.09, 0);
  const plume = mesh(G('plume', () => new THREE.ConeGeometry(0.06, 0.3, 16, 1, true)), new THREE.MeshBasicMaterial({ color: k.def.accent, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), thr, 0, -0.24, 0);
  plume.rotation.x = Math.PI;
  const torso = group(body, 0, 0.82, 0);
  mesh(sph(0.33, 32, 24), k.shell, torso).scale.set(1, 0.92, 1);
  k.seam(torso, 0.335, 0);
  k.core(torso, 0.05, 0.31, 0.08);
  // orbit rings + orbs
  const rings = [];
  for (let i = 0; i < 2; i++) {
    const rg = group(torso);
    rg.rotation.set(Math.PI / 2 + (i ? 0.5 : -0.35), i ? 0.4 : -0.2, 0);
    mesh(tor(0.5 + i * 0.07, 0.016), k.glow, rg);
    rings.push(rg);
  }
  const orbs = [];
  for (let i = 0; i < 3; i++) { const o = group(torso); mesh(sph(0.045, 14, 10), k.trim, o, 0.58, 0, 0); o.rotation.z = 0.3; o.userData.phase = (i * TAU) / 3; orbs.push(o); }
  // dome head
  const head = group(torso, 0, 0.34, 0);
  mesh(G('dome', () => new THREE.SphereGeometry(0.19, 28, 16, 0, TAU, 0, Math.PI / 2)), k.shellAlt, head, 0, 0, 0);
  mesh(cyl(0.19, 0.19, 0.05, 28), jointMat(), head, 0, -0.02, 0);
  k.visor(head, 0.24, 0.07, 0.15, 0.07, 'arc');
  const arms = [-1, 1].map((s) => k.arm(torso, s, { x: 0.33, y: 0.02, upper: 0.14, fore: 0.14, r: 0.035, hand: 'ball' }));
  Object.assign(rig, { torso, head, arms, legs: [], height: 1.65, hover: true, extras: { rings, orbs, plume } });
}

function buildBrass(k, rig) {
  const body = rig.body;
  const legs = [-1, 1].map((s) => k.leg(body, s, { x: 0.13, y: 0.5, len: 0.3, r: 0.08, foot: [0.18, 0.09, 0.28] }));
  const torso = group(body, 0, 0.52, 0);
  // barrel chest with brass bands
  mesh(lathe('barrel', [[0, 0], [0.2, 0], [0.28, 0.12], [0.31, 0.3], [0.28, 0.5], [0.18, 0.6], [0, 0.61]]), k.shell, torso);
  for (const y of [0.12, 0.48]) mesh(tor(y === 0.12 ? 0.28 : 0.285, 0.014), brassMat(), torso, 0, y, 0).rotation.x = Math.PI / 2;
  // valves on chest
  for (let i = 0; i < 3; i++) { const vv = mesh(cyl(0.025, 0.025, 0.12, 12), brassMat(), torso, -0.06 + i * 0.06, 0.33, 0.28); mesh(cyl(0.032, 0.032, 0.015, 12), k.glow, vv, 0, 0.065, 0); }
  k.core(torso, 0.2, 0.295, 0.05);
  // sousaphone-style horn: tubing wraps over the right shoulder, big bell faces the audience
  const wrap = mesh(tor(0.3, 0.035, Math.PI * 1.2), brassMat(), torso, 0.02, 0.38, -0.02);
  wrap.rotation.set(0, Math.PI / 2, 0.3);
  const bellG = group(torso, 0.34, 0.72, -0.02);
  bellG.rotation.z = -0.35;
  bellG.scale.setScalar(0.85);
  mesh(cyl(0.05, 0.05, 0.22, 14), brassMat(), bellG, 0, -0.08, 0);
  const bell = group(bellG, 0, 0.06, 0.04);
  bell.rotation.x = Math.PI / 2 - 0.25;
  mesh(lathe('bell2', [[0.05, -0.05], [0.055, 0.06], [0.09, 0.14], [0.17, 0.2], [0.26, 0.23], [0.255, 0.235]]), brassMat(), bell);
  mesh(cyl(0.2, 0.06, 0.18, 24, true), M('throat', () => new THREE.MeshStandardMaterial({ color: '#2a1a08', metalness: 0.8, roughness: 0.4, side: THREE.BackSide })), bell, 0, 0.13, 0);
  const bellGlow = mesh(tor(0.255, 0.014), k.glow, bell, 0, 0.233, 0); bellGlow.rotation.x = Math.PI / 2;
  // squat head
  const head = group(torso, 0, 0.66, 0);
  mesh(rbox(0.3, 0.2, 0.26, 0.08), k.shellAlt, head, 0, 0.08, 0);
  k.visor(head, 0.24, 0.08, 0.13, 0.09, 'strip');
  mesh(rbox(0.12, 0.03, 0.03, 0.01), k.trim, head, 0, 0.0, 0.135); // mustache grille
  const arms = [-1, 1].map((s) => k.arm(torso, s, { x: 0.33, y: 0.45, upper: 0.2, fore: 0.2, r: 0.06, hand: 'mitt', handR: 0.045 }));
  Object.assign(rig, { torso, head, arms, legs, height: 1.45, extras: { bell } });
}

function buildPluck(k, rig) {
  const p = k.def.preset, body = rig.body;
  const legs = [-1, 1].map((s) => k.leg(body, s, { x: 0.08, y: 0.86, len: 0.62, r: 0.04, foot: [0.1, 0.06, 0.22] }));
  const torso = group(body, 0, 0.88, 0);
  mesh(rbox(0.26, 0.48, 0.18, 0.08), k.shell, torso, 0, 0.25, 0);
  k.seam(torso, 0.1, 0.0);
  k.core(torso, 0.4, 0.095, 0.04);
  // the instrument, held across the body
  const inst = group(torso, 0, 0.2, 0.17);
  inst.rotation.z = 0.6;
  const strings = [];
  const wood = M('wood' + k.def.accent, () => new THREE.MeshPhysicalMaterial({ color: k.accent.clone().lerp(new THREE.Color('#3a2210'), 0.55), roughness: 0.35, clearcoat: 1, metalness: 0.1 }));
  if (p === 'harp') {
    inst.rotation.z = 0.15; inst.position.set(0.05, 0.2, 0.18);
    mesh(tor(0.24, 0.02, Math.PI * 1.1), wood, inst, 0, 0, 0).rotation.z = -0.2;
    for (let i = 0; i < 7; i++) { const s = mesh(cyl(0.003, 0.003, 0.16 + i * 0.04, 4), k.flash, inst, -0.15 + i * 0.05, -0.05 + i * 0.01, 0); strings.push(s); }
  } else if (p === 'koto') {
    inst.rotation.z = 0.1; inst.position.set(0, 0.06, 0.2);
    mesh(rbox(0.8, 0.05, 0.16, 0.02), wood, inst);
    for (let i = 0; i < 6; i++) { const s = mesh(cyl(0.003, 0.003, 0.76, 4), k.flash, inst, 0, 0.03, -0.06 + i * 0.024); s.rotation.z = Math.PI / 2; strings.push(s); }
  } else {
    const small = p === 'uke' ? 0.7 : 1;
    if (p === 'banjo') { const d = mesh(cyl(0.16, 0.16, 0.06, 28), chromeMat(), inst); d.rotation.x = Math.PI / 2; mesh(cyl(0.145, 0.145, 0.065, 28), keyWhite(), inst).rotation.x = Math.PI / 2; }
    else { const b1 = mesh(sph(0.15 * small, 24, 16), wood, inst, 0, -0.04, 0); b1.scale.z = 0.3; const b2 = mesh(sph(0.11 * small, 24, 16), wood, inst, 0, 0.12 * small, 0); b2.scale.z = 0.3; mesh(cyl(0.04 * small, 0.04 * small, 0.01, 20), darkGlass(), inst, 0, 0.04 * small, 0.045).rotation.x = Math.PI / 2; }
    mesh(rbox(0.05, 0.5 * small, 0.03, 0.01), jointMat(), inst, 0, 0.35 * small, 0.02);
    mesh(rbox(0.07, 0.1, 0.03, 0.01), k.trim, inst, 0, 0.62 * small, 0.02);
    for (let i = 0; i < 4; i++) strings.push(mesh(cyl(0.003, 0.003, 0.62 * small, 4), k.flash, inst, -0.015 + i * 0.01, 0.25 * small, 0.05));
  }
  // round head with a single cyclops eye
  const head = group(torso, 0, 0.62, 0);
  k.joint(head, 0.04, 0, -0.06, 0);
  mesh(sph(0.13, 24, 18), k.shell, head, 0, 0.07, 0);
  k.visor(head, 0.18, 0.1, 0.11, 0.08, 'cyclops');
  mesh(rbox(0.02, 0.1, 0.02, 0.008), k.trim, head, 0, 0.22, 0);
  const arms = [-1, 1].map((s) => k.arm(torso, s, { x: 0.17, y: 0.45, upper: 0.3, fore: 0.28, r: 0.03, hand: 'ball' }));
  arms[1].pivot.rotation.x = -0.6; arms[1].elbow.rotation.x = -0.7; arms[1].rest = { px: -0.6, ex: -0.7 };
  arms[0].pivot.rotation.x = -0.3; arms[0].elbow.rotation.x = -1.1; arms[0].rest = { px: -0.3, ex: -1.1 };
  Object.assign(rig, { torso, head, arms, legs, height: 1.75, extras: { strings, inst } });
}

function buildBass(k, rig) {
  const body = rig.body;
  // tank treads
  for (const s of [-1, 1]) {
    const tr = mesh(rbox(0.16, 0.18, 0.62, 0.08), jointMat(), body, s * 0.36, 0.1, 0);
    for (let i = 0; i < 3; i++) { const w = mesh(cyl(0.06, 0.06, 0.17, 16), chromeMat(), tr, 0, -0.01, -0.2 + i * 0.2); w.rotation.z = Math.PI / 2; }
    mesh(rbox(0.165, 0.015, 0.5, 0.005), k.glow, tr, 0, 0.09, 0);
  }
  const under = mesh(cyl(0.38, 0.38, 0.01, 32), new THREE.MeshBasicMaterial({ color: k.def.accent, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), body, 0, 0.01, 0);
  const torso = group(body, 0, 0.22, 0);
  mesh(rbox(0.82, 0.5, 0.5, 0.14), k.shell, torso, 0, 0.25, 0);
  k.seam(torso, 0.2, 0.0);
  // subwoofer cone
  const spk = group(torso, 0, 0.26, 0.25);
  mesh(cyl(0.2, 0.2, 0.03, 32), jointMat(), spk).rotation.x = Math.PI / 2;
  const cone = group(spk, 0, 0, 0.01);
  mesh(lathe('cone', [[0.04, 0.05], [0.08, 0.035], [0.17, 0.0], [0.175, -0.005]]), darkGlass(), cone).rotation.x = -Math.PI / 2;
  mesh(sph(0.045, 16, 10), k.trim, cone, 0, 0, 0.04);
  const ring = mesh(tor(0.185, 0.016), k.glow, spk, 0, 0, 0.02);
  // wide low head bar
  const head = group(torso, 0, 0.52, 0.02);
  mesh(rbox(0.56, 0.13, 0.3, 0.06), k.shellAlt, head, 0, 0.06, 0);
  k.visor(head, 0.48, 0.07, 0.15, 0.06, 'strip');
  for (const s of [-1, 1]) mesh(cyl(0.02, 0.02, 0.06, 8), k.glow, head, s * 0.22, 0.15, -0.06);
  const arms = [-1, 1].map((s) => k.arm(torso, s, { x: 0.47, y: 0.38, upper: 0.16, fore: 0.16, r: 0.06, hand: 'mitt', handR: 0.05 }));
  Object.assign(rig, { torso, head, arms, legs: [], height: 1.05, extras: { cone, ring, under } });
}

function buildDrum(k, rig) {
  const p = k.def.preset, body = rig.body;
  const legs = [-1, 1].map((s) => k.leg(body, s, { x: 0.2, y: 0.46, len: 0.22, r: 0.1, foot: [0.26, 0.12, 0.36] }));
  const torso = group(body, 0, 0.48, 0);
  mesh(rbox(0.86, 0.66, 0.5, 0.16), k.shell, torso, 0, 0.36, 0);
  for (const s of [-1, 1]) mesh(rbox(0.3, 0.14, 0.4, 0.06), k.shellAlt, torso, s * 0.45, 0.66, 0).rotation.z = s * -0.25; // shoulder pads
  k.seam(torso, 0.2, 0.0);
  // the drum: kick = big drum on the belly; snare/rim = flat drum at waist; tom = medium angled
  const drumG = group(torso, 0, p.startsWith('kick') ? 0.3 : 0.08, 0.32);
  const big = p.startsWith('kick');
  const dr = big ? 0.27 : p.startsWith('tom') ? 0.19 : 0.17;
  const shell = mesh(cyl(dr, dr, big ? 0.2 : 0.12, 32), k.trim, drumG);
  const head = mesh(cyl(dr * 0.96, dr * 0.96, 0.005, 32), keyWhite(), drumG, 0, 0, 0);
  if (big) { drumG.rotation.x = Math.PI / 2; head.position.y = 0.102; mesh(tor(dr, 0.012), chromeMat(), drumG, 0, 0.1, 0).rotation.x = Math.PI / 2; }
  else { drumG.rotation.x = p.startsWith('tom') ? 0.5 : 0.15; drumG.position.z = 0.42; head.position.y = 0.062; mesh(tor(dr, 0.01), chromeMat(), drumG, 0, 0.062, 0).rotation.x = Math.PI / 2; }
  const drumFlash = mesh(cyl(dr * 0.5, dr * 0.5, 0.004, 24), k.flash, drumG, 0, head.position.y + 0.004, 0);
  void shell;
  // small helmet head
  const hd = group(torso, 0, 0.8, 0);
  mesh(cyl(0.08, 0.1, 0.1, 16), jointMat(), hd, 0, -0.02, 0);
  mesh(sph(0.18, 24, 16), k.shellAlt, hd, 0, 0.12, 0).scale.set(1.15, 0.9, 1);
  k.visor(hd, 0.3, 0.08, 0.165, 0.11, 'strip');
  mesh(rbox(0.05, 0.12, 0.26, 0.02), k.trim, hd, 0, 0.27, 0); // helmet crest
  const arms = [-1, 1].map((s) => k.arm(torso, s, { x: 0.47, y: 0.58, upper: 0.24, fore: 0.24, r: 0.08, hand: 'ball', handR: 0.07 }));
  const sticks = arms.map((a) => {
    const st = group(a.hand, 0, -0.02, 0.02);
    st.rotation.x = Math.PI / 2 + 0.3;
    mesh(cyl(0.012, 0.016, 0.42, 8), M('stick', () => new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.5 })), st, 0, 0.18, 0);
    mesh(sph(0.022, 10, 8), k.glow, st, 0, 0.39, 0);
    return st;
  });
  for (const a of arms) { a.pivot.rotation.x = -0.35; a.elbow.rotation.x = -0.9; a.rest = { px: -0.35, ex: -0.9 }; }
  Object.assign(rig, { torso, head: hd, arms, legs, height: 1.5, heavy: true, extras: { drumFlash, sticks } });
}

function buildPerc(k, rig) {
  const body = rig.body;
  // gyro ball base
  const ball = mesh(sph(0.16, 24, 18), k.shellAlt, body, 0, 0.16, 0);
  const gyro = group(body, 0, 0.16, 0);
  mesh(tor(0.2, 0.015), k.glow, gyro).rotation.x = Math.PI / 2;
  void ball;
  const torso = group(body, 0, 0.36, 0);
  mesh(cyl(0.05, 0.05, 0.14, 12), jointMat(), torso, 0, 0.0, 0);
  mesh(lathe('percTorso', [[0, 0], [0.1, 0.02], [0.18, 0.2], [0.17, 0.38], [0.08, 0.46], [0, 0.47]]), k.shell, torso, 0, 0.05, 0);
  const waist = group(torso, 0, 0.12, 0);
  mesh(tor(0.2, 0.02), k.trim, waist).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; mesh(sph(0.022, 8, 6), k.glow, waist, Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2); }
  k.core(torso, 0.3, 0.165, 0.04);
  // spinning halo head
  const head = group(torso, 0, 0.58, 0);
  k.joint(head, 0.04, 0, -0.06, 0);
  mesh(sph(0.13, 24, 18), k.shell, head, 0, 0.06, 0);
  k.visor(head, 0.2, 0.07, 0.11, 0.07, 'dual');
  const halo = group(head, 0, 0.22, 0);
  mesh(tor(0.14, 0.012), k.glow, halo).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; mesh(sph(0.02, 8, 6), k.trim, halo, Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14); }
  // four arms holding shakers
  const arms = [];
  const shakers = [];
  for (const [s, y] of [[-1, 0.4], [1, 0.4], [-1, 0.22], [1, 0.22]]) {
    const a = k.arm(torso, s, { x: 0.17, y, upper: 0.18, fore: 0.18, r: 0.028, hand: 'ball', handR: 0.03 });
    a.pivot.rotation.z = s * (y > 0.3 ? 0.9 : 0.5);
    a.elbow.rotation.z = -s * 0.6;
    a.rest = { pz: a.pivot.rotation.z, ez: a.elbow.rotation.z };
    const sh = mesh(caps(0.03, 0.06), M('shk' + k.def.accent, () => new THREE.MeshStandardMaterial({ color: k.def.accent, metalness: 0.4, roughness: 0.25, emissive: k.def.accent, emissiveIntensity: 0.35 })), a.hand, 0, -0.06, 0);
    shakers.push(sh);
    arms.push(a);
  }
  Object.assign(rig, { torso, head, arms, legs: [], height: 1.25, extras: { halo, waist, gyro, shakers } });
}

const BUILDERS = { piano: buildPiano, keys: buildKeys, synth: buildSynth, pad: buildPad, brass: buildBrass, pluck: buildPluck, bass: buildBass, drum: buildDrum, perc: buildPerc };

// ---------- dance moves ----------
// Each move: (rig, p 0..1, e = sin envelope, dir ±1 alternating per hit, h = note height 0..1)
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const A = (rig, i) => rig.arms[i % rig.arms.length];
const BIG = new Set(['spin', 'backflip', 'jump', 'armSpin']);
const MOVES = {
  nodTap(r, p, e) { r.head.rotation.x += 0.35 * e; for (const a of r.arms) a.elbow.rotation.x -= 0.35 * e; },
  keySweep(r, p, e, d) { r.torso.rotation.y += 0.3 * d * e; for (const a of r.arms) { a.pivot.rotation.x -= 0.7 * e; a.pivot.rotation.z += d * 0.4 * e; } },
  stomp(r, p, e, d) { const lift = Math.sin(Math.PI * Math.min(1, p * 1.7)); if (r.legs.length) r.legs[d > 0 ? 1 : 0].rotation.x -= 0.9 * lift; r.body.position.y -= p > 0.55 ? 0.05 * (1 - p) / 0.45 : 0; r.torso.rotation.z += 0.08 * d * e; },
  clap(r, p, e) { const c = Math.sin(Math.PI * Math.min(1, p * 2)); for (const a of r.arms.slice(0, 2)) { a.pivot.rotation.x -= 1.2 * c; a.pivot.rotation.z -= a.side * 0.5 * c; } r.head.rotation.x += 0.15 * e; },
  headShake(r, p) { r.head.rotation.y += 0.45 * Math.sin(p * 4 * Math.PI) * (1 - p); },
  pulseSquat(r, p, e) { r.body.position.y -= 0.07 * e; r.torso.scale.set(1 + 0.06 * e, 1 - 0.08 * e, 1 + 0.06 * e); },
  pump(r, p, e, d) { const a = A(r, d > 0 ? 1 : 0); a.pivot.rotation.x -= 2.6 * e; a.elbow.rotation.x -= 0.6 * e; r.body.position.y += 0.05 * e; },
  sway(r, p, e, d) { r.flip.rotation.z += 0.16 * d * e; r.head.rotation.z -= 0.12 * d * e; },
  float(r, p, e) { r.body.position.y += 0.16 * e; for (const a of r.arms) a.pivot.rotation.z += a.side * 0.8 * e; },
  fanfare(r, p, e) { r.torso.rotation.x -= 0.22 * e; for (const a of r.arms) a.pivot.rotation.x -= 1.3 * e; r.head.rotation.x -= 0.2 * e; },
  strumLean(r, p, e, d) { r.torso.rotation.z += 0.14 * d * e; A(r, 1).pivot.rotation.x += 0.5 * Math.sin(p * Math.PI * 2); r.head.rotation.x += 0.15 * e; },
  armSpin(r, p, e, d) { const a = A(r, d > 0 ? 1 : 0), b = A(r, d > 0 ? 0 : 1); a.pivot.rotation.x -= TAU * ease(p); b.pivot.rotation.x += 0.6 * e; if (r.arms.length > 2) { A(r, 2).pivot.rotation.x += TAU * ease(p); } },
  robotPop(r, p, e, d) { const q = Math.min(1, Math.floor(p * 4 + 1) / 4), s = Math.sin(q * Math.PI); A(r, 0).pivot.rotation.z -= d * 1.4 * s; A(r, 0).elbow.rotation.z += d * 1.5 * s; A(r, 1).pivot.rotation.z += -d * 0.6 * s; r.head.rotation.y += 0.4 * d * (q < 0.5 ? 1 : -1) * s; },
  bounce(r, p) { const y = Math.abs(Math.sin(Math.PI * p)); r.body.position.y += 0.1 * y; r.torso.scale.y *= 1 - 0.06 * (1 - y) * (p < 0.2 ? 1 : 0); },
  twist(r, p, e, d) { r.torso.rotation.y += 0.6 * d * e; r.head.rotation.y -= 0.25 * d * e; for (const a of r.arms) a.pivot.rotation.x += a.side * d * 0.5 * e; },
  spin(r, p) { r.flip.rotation.y += TAU * ease(p); },
  drumRoll(r, p, e) { const w = Math.sin(p * 6 * Math.PI) * e; A(r, 0).pivot.rotation.x -= 0.45 * w; A(r, 1).pivot.rotation.x += 0.45 * w; r.head.rotation.x += 0.12 * e; },
  jump(r, p) { const y = 4 * p * (1 - p); r.flip.position.y += 0.32 * y; for (const l of r.legs) l.rotation.x -= 0.6 * y; for (const a of r.arms) a.pivot.rotation.z += a.side * 1.0 * y; },
  shimmy(r, p, e) { r.torso.rotation.z += 0.12 * Math.sin(p * 6 * Math.PI) * e; r.torso.rotation.y += 0.1 * Math.cos(p * 6 * Math.PI) * e; },
  wave(r, p, e, d) { const a = A(r, d > 0 ? 1 : 0); a.pivot.rotation.z += a.side * 2.5 * e; a.elbow.rotation.z += a.side * 0.6 * Math.sin(p * 4 * Math.PI) * e; },
  backflip(r, p) { const y = 4 * p * (1 - p); r.flip.position.y += 0.55 * y; r.flip.rotation.x -= TAU * ease(p); },
  slidePush(r, p, e, d) { for (const a of r.arms) { a.pivot.rotation.x -= 1.4 * e; a.elbow.rotation.x += 0.3 * e; } r.torso.position.z += 0.05 * d * e; },
  nod(r, p, e) { r.head.rotation.x += 0.28 * e; r.body.position.y -= 0.03 * e; },
  point(r, p, e, d) { const a = A(r, d > 0 ? 1 : 0); a.pivot.rotation.z += a.side * 2.3 * e; a.pivot.rotation.x -= 0.4 * e; r.torso.rotation.y += 0.2 * d * e; r.flip.rotation.z -= 0.08 * d * e; },
  stompWalk(r, p, e, d) { r.flip.position.x += 0.04 * d * e; r.body.position.y -= 0.04 * Math.abs(Math.sin(p * 2 * Math.PI)); r.torso.rotation.z += 0.1 * d * e; },
};

// family "instrument reactions" (glows, keys, rings, bells...) on top of the dance move
function react(rig, p, e, t) {
  const x = rig.extras, f = rig.def.family;
  if (f === 'piano') {
    for (let i = 0; i < x.fingers.length; i++) x.fingers[i].rotation.x = -0.5 * Math.max(0, Math.sin(p * Math.PI * 2 + i * 0.7)) * e;
  } else if (f === 'pad') {
    for (const rg of x.rings) rg.scale.setScalar(1 + 0.25 * e);
  } else if (f === 'brass') {
    x.bell.scale.setScalar(1 + 0.35 * e);
  } else if (f === 'bass') {
    x.cone.position.z = 0.01 + 0.05 * e;
    x.under.material.opacity = 0.3 + 0.5 * e;
  } else if (f === 'drum') {
    x.sticks.forEach((s, i) => (s.rotation.x = Math.PI / 2 + 0.3 - 0.7 * Math.max(0, Math.sin(Math.PI * Math.min(1, p * 2 + i * 0.3)))));
  } else if (f === 'perc') {
    for (const s of x.shakers) s.rotation.z = 0.6 * Math.sin(p * 8 * Math.PI) * e;
    x.halo.rotation.y += 0.25 * e;
  } else if (f === 'pluck') {
    x.inst.rotation.y = 0.12 * Math.sin(p * 5 * Math.PI) * e;
  }
  void t;
}

/** Build a robot: returns { root, rig, update(dt, t, beat), hit(intensity, h, stepDur) }. */
export function buildRobot(def) {
  const k = new Kit(def);
  const root = new THREE.Group();
  root.name = def.id;
  const flip = group(root); // jumps/flips/spins pivot
  const body = group(flip);
  const rig = { def, kit: k, root, flip, body, arms: [], legs: [], extras: {} };
  BUILDERS[def.family](k, rig);
  mergeStatic(rig);
  // every robot: soft contact shadow + subtle family-colour floor glow
  const shadow = new THREE.Mesh(G('shadow', () => new THREE.CircleGeometry(0.45, 32)), shadowMat());
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005; shadow.renderOrder = -1;
  root.add(shadow);
  rig.shadow = shadow;
  // flip pivot sits at mid-height so backflips rotate around the waist
  const mid = rig.height * 0.5;
  flip.position.y = mid; body.position.y = -mid;
  // remember rest poses
  const rest = new Map();
  const remember = (o) => rest.set(o, { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() });
  [flip, body, rig.torso, rig.head, ...rig.legs].forEach(remember);
  for (const a of rig.arms) { remember(a.pivot); remember(a.elbow); }
  for (const pm of [...(rig.extras.fingers || []), ...(rig.extras.rings || []), ...(rig.extras.sticks || []), ...(rig.extras.shakers || [])]) remember(pm);
  for (const n of ['bell', 'cone', 'inst', 'halo']) if (rig.extras[n]) remember(rig.extras[n]);
  const phase = def.index * 1.37;
  root.traverse((o) => { if (o.isMesh) o.userData.robot = def.id; });

  const state = { hitT: -1, dur: 0.4, dir: 1, h: 0.5, glow: 0, big: BIG.has(def.move) };

  function hit(intensity = 1, h = 0.5, stepDur = 0.25) {
    const running = state.hitT >= 0 && state.hitT < state.dur;
    if (state.big && running && state.hitT / state.dur < 0.75) { state.glow = 1; return; }
    state.dir = -state.dir;
    state.hitT = 0;
    state.h = h;
    state.dur = state.big ? 0.72 : Math.min(0.55, Math.max(0.24, stepDur * 2.2));
    state.glow = Math.min(1, 0.6 + 0.4 * intensity);
    if (rig.extras.panel) for (const m of rig.extras.panel) m.material.emissiveIntensity = Math.random() < 0.5 ? 3 : 0.15;
    if (rig.extras.keys) { for (const kk of rig.extras.keys) kk.material = keyWhite(); const i = Math.floor(Math.random() * rig.extras.keys.length); rig.extras.keys[i].material = k.glow; rig.extras.keys[(i + 2) % rig.extras.keys.length].material = k.glow; }
  }

  function update(dt, t, beat) {
    for (const [o, s] of rest) { o.position.copy(s.p); o.rotation.copy(s.r); o.scale.copy(s.s); }
    // idle: breathing + gentle look-around (+ groove bob on the beat while the band plays)
    const breath = Math.sin(t * 2.1 + phase);
    rig.torso.scale.y *= 1 + 0.012 * breath;
    rig.head.rotation.y += 0.1 * Math.sin(t * 0.45 + phase);
    rig.head.rotation.x += 0.03 * Math.sin(t * 0.8 + phase * 2);
    for (const a of rig.arms) a.pivot.rotation.x += 0.04 * Math.sin(t * 1.3 + phase + a.side);
    if (rig.hover) body.position.y += 0.05 * Math.sin(t * 1.6 + phase);
    body.position.y -= (rig.heavy ? 0.035 : 0.022) * beat;
    if (rig.extras.rings) rig.extras.rings.forEach((rg, i) => (rg.rotation.z = t * (0.4 + i * 0.25) * (i ? -1 : 1)));
    if (rig.extras.orbs) for (const o of rig.extras.orbs) o.rotation.y = t * 1.1 + o.userData.phase;
    if (rig.extras.halo) rig.extras.halo.rotation.y += t * 1.5;
    if (rig.extras.waist) rig.extras.waist.rotation.y = -t * 2;
    if (rig.extras.gyro) rig.extras.gyro.rotation.z = Math.sin(t * 3 + phase) * 0.3;
    if (rig.extras.plume) rig.extras.plume.scale.y = 0.85 + 0.15 * Math.sin(t * 20 + phase);
    if (rig.extras.tips) rig.extras.tips.forEach((tp, i) => tp.scale.setScalar(1 + 0.15 * Math.sin(t * 4 + i)));
    // active move
    let e = 0;
    if (state.hitT >= 0) {
      state.hitT += dt;
      const p = Math.min(1, state.hitT / state.dur);
      e = Math.sin(Math.PI * p);
      MOVES[def.move](rig, p, e, state.dir, state.h);
      react(rig, p, e, t);
      if (rig.def.family !== 'pad' && rig.def.family !== 'bass' && rig.legs.length === 0) { /* no legs: nothing extra */ }
      // melodic robots tilt their heads with the pitch
      rig.head.rotation.x -= (state.h - 0.5) * 0.35 * e;
      if (p >= 1) state.hitT = -1;
    }
    state.glow = Math.max(0, state.glow - dt * 3.2);
    k.glow.emissiveIntensity = 1.3 + 2.6 * state.glow;
    k.flash.emissiveIntensity = 0.25 + 3.5 * state.glow;
    k.eye.emissiveIntensity = 2 + 1.5 * state.glow;
    if (rig.extras.panel && state.glow < 0.05) for (const m of rig.extras.panel) m.material.emissiveIntensity = 0.15 + 0.1 * Math.sin(t * 3 + m.position.x * 20);
    if (rig.extras.keys && state.glow < 0.05) for (const kk of rig.extras.keys) kk.material = keyWhite();
    shadow.scale.setScalar(1 - Math.min(0.4, Math.max(0, flip.position.y - mid)));
  }

  return { root, rig, hit, update, def };
}

/** Merge each group's static child meshes that share a material (far fewer draw calls with 50 robots). */
const mergedCache = new Map();
function mergeStatic(rig) {
  const keep = new Set();
  for (const v of Object.values(rig.extras)) for (const o of [v].flat()) if (o && o.isMesh) keep.add(o);
  const groups = [];
  rig.root.traverse((o) => { if (!o.isMesh) groups.push(o); });
  for (const g of groups) {
    const byMat = new Map();
    for (const c of g.children) if (c.isMesh && !c.children.length && !keep.has(c)) (byMat.get(c.material) || byMat.set(c.material, []).get(c.material)).push(c);
    for (const [mat, list] of byMat) {
      if (list.length < 2) continue;
      const geos = list.map((m) => { m.updateMatrix(); const gg = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()); gg.applyMatrix4(m.matrix); return gg; });
      for (const gg of geos) for (const k of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(k)) gg.deleteAttribute(k);
      const merged = mergeGeometries(geos);
      geos.forEach((gg) => gg.dispose());
      if (!merged) continue;
      for (const m of list) g.remove(m);
      g.add(new THREE.Mesh(merged, mat));
    }
  }
  void mergedCache;
}

let _shadowMat;
function shadowMat() {
  if (_shadowMat) return _shadowMat;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return (_shadowMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
}
