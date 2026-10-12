// The 3D concert: stage + risers, LED wall, light beams, the audience, and the robot band.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRobot } from './robots3d.js';
import { ROBOTS, FAMILIES } from './catalog.js';

const SECTION_ORDER = ['piano', 'keys', 'pluck', 'synth', 'brass', 'pad', 'bass', 'perc', 'drum'];
const ROW_CAP = [5, 8, 10, 12, 14, 16];
const ROW_R0 = 3.0, ROW_DR = 1.35, RISER_H = 0.32;

export class Stage {
  constructor(container, { quality = 'high' } = {}) {
    this.container = container;
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color('#090b16');
    scene.fog = new THREE.Fog('#090b16', 22, 48);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = this.envMap;
    scene.environmentIntensity = 0.55;

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    this.camera.position.set(0, 4, 12);
    this.controls = new OrbitControls(this.camera, this.canvas);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minPolarAngle: 0.6, maxPolarAngle: 1.45, minDistance: 4, maxDistance: 30, minAzimuthAngle: -1.1, maxAzimuthAngle: 1.1 });
    this.controls.addEventListener('start', () => (this.userOrbit = true));

    this._lights();
    this._stage();
    this._audience();
    this._confetti();

    this.robots = new Map(); // uid → { bot, target: Vector3, uid }
    this.selected = null;
    this.hype = 0;
    this.beatPulse = 0;
    this.playing = false;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.manual = false;
    this.frame = { pos: new THREE.Vector3(0, 4.5, 13), look: new THREE.Vector3(0, 1.1, -2.5) };

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.4, 1.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.setQuality(quality);

    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  setQuality(q) {
    this.quality = q;
    this.bloom.enabled = q !== 'low';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1));
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._frameCamera(true);
  }

  _lights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#9fb4ff', '#1a1020', 0.35));
    const key = new THREE.DirectionalLight('#ffffff', 1.1);
    key.position.set(3, 9, 8);
    s.add(key);
    const rimA = new THREE.PointLight('#ff3fa4', 14, 30, 1.6); rimA.position.set(-7, 6, -9); s.add(rimA);
    const rimB = new THREE.PointLight('#28d7ff', 14, 30, 1.6); rimB.position.set(7, 6, -9); s.add(rimB);
    const front = new THREE.SpotLight('#fff3e0', 22, 30, 0.6, 0.6, 1.2); front.position.set(0, 9, 9); front.target.position.set(0, 0, -3);
    s.add(front, front.target);
    this.rims = [rimA, rimB];
  }

  _stage() {
    const s = this.scene;
    // floor with a faint grid
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#0c0f1c'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(120,140,255,0.10)'; g.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(24, 24); tex.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.3 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.4;
    s.add(floor);
    // main stage disc
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 0.4, 96, 1, false, -Math.PI / 2 - 1.2, 2.4 + Math.PI), new THREE.MeshPhysicalMaterial({ color: '#141828', metalness: 0.5, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.4 }));
    deck.position.set(0, -0.2, -3.2);
    s.add(deck);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(13, 0.035, 8, 160, 2.4 + Math.PI), new THREE.MeshBasicMaterial({ color: '#4d7cff' }));
    edge.rotation.set(Math.PI / 2, 0, Math.PI / 2 - (2.4 + Math.PI) / 2 + Math.PI);
    edge.position.set(0, 0.0, -3.2);
    s.add(edge);
    this.edge = edge;
    this.risers = new THREE.Group(); s.add(this.risers);
    // LED wall behind the band
    this.led = document.createElement('canvas'); this.led.width = 512; this.led.height = 128;
    this.ledTex = new THREE.CanvasTexture(this.led); this.ledTex.colorSpace = THREE.SRGBColorSpace;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), new THREE.MeshBasicMaterial({ map: this.ledTex, toneMapped: false }));
    wall.position.set(0, 4.6, -13.5);
    s.add(wall);
    this.wall = wall;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(26.6, 7.1, 0.3), new THREE.MeshStandardMaterial({ color: '#0d0f18', metalness: 0.8, roughness: 0.3 }));
    frame.position.set(0, 4.6, -13.7); s.add(frame);
    this.eq = new Float32Array(48);
    // sweeping light beams
    this.beams = [];
    const beamMat = (col) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cols = ['#ff3fa4', '#3d8bff', '#19d3c5', '#ffb020', '#8b5cff', '#ff5a36'];
    for (let i = 0; i < 6; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(-10 + i * 4, 9.5, -8);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 12, 24, 1, true), beamMat(cols[i]));
      cone.position.y = -6;
      pivot.add(cone);
      s.add(pivot);
      this.beams.push(pivot);
    }
    // selection ring
    this.selRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.visible = false;
    s.add(this.selRing);
  }

  _buildRisers(rows) {
    for (const c of this.risers.children) c.geometry.dispose();
    this.risers.clear();
    const mat = new THREE.MeshStandardMaterial({ color: '#1a1f33', metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide });
    const glow = new THREE.MeshBasicMaterial({ color: '#2a3c88' });
    for (let i = 1; i < rows.length; i++) {
      const { r, span } = rows[i];
      const a0 = Math.PI / 2 - span / 2 - 0.12, a1 = Math.PI / 2 + span / 2 + 0.12;
      const shape = new THREE.Shape();
      const ro = r + 0.68, ri = r - 0.68;
      shape.absarc(0, 0, ro, a0, a1, false);
      shape.absarc(0, 0, ri, a1, a0, true);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: i * RISER_H, bevelEnabled: false, curveSegments: 48 });
      const m = new THREE.Mesh(geo, mat);
      // shape lives in XY; flip Y then lay it flat so the arc sits behind the arc centre and
      // the extrusion runs from the floor up to this row's height
      m.scale.y = -1; m.rotation.x = Math.PI / 2; m.position.y = i * RISER_H;
      this.risers.add(m);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(ri, 0.02, 6, 64, a1 - a0), glow);
      lip.rotation.z = a0;
      m.add(lip);
    }
    this.risers.position.z = this.stageZ;
  }

  _audience() {
    const N = 64;
    this.crowd = [];
    const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 10), new THREE.MeshStandardMaterial({ color: '#1c2033', roughness: 0.7, metalness: 0.2 }), N);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshStandardMaterial({ color: '#232842', roughness: 0.6 }), N);
    const stick = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.03, 0.32, 3, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), N);
    const palette = ['#ff3fa4', '#3d8bff', '#19d3c5', '#ffb020', '#8fd400', '#ff5a36', '#8b5cff'].map((c) => new THREE.Color(c).multiplyScalar(1.6));
    let i = 0;
    for (let row = 0; row < 4; row++) {
      const count = 13 + row * 2;
      for (let j = 0; j < count && i < N; j++, i++) {
        const x = (j - (count - 1) / 2) * 1.0 + (row % 2) * 0.4 + (Math.random() - 0.5) * 0.25;
        const z = 9.6 + row * 1.0;
        this.crowd.push({ x, z, y: -0.4 + row * 0.25, phase: Math.random() * 10, side: Math.random() < 0.5 ? -1 : 1, lag: Math.random() * 0.15 });
        stick.setColorAt(i, palette[i % palette.length]);
      }
    }
    body.count = head.count = stick.count = this.crowd.length;
    this.crowdMeshes = { body, head, stick };
    this.scene.add(body, head, stick);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
  }

  _confetti() {
    const N = 400;
    const geo = new THREE.PlaneGeometry(0.09, 0.05);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), N);
    const cols = ['#ff3fa4', '#3d8bff', '#19d3c5', '#ffb020', '#8fd400', '#ffffff'].map((c) => new THREE.Color(c));
    this.conf = Array.from({ length: N }, (_, i) => { mesh.setColorAt(i, cols[i % cols.length]); return { p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), life: 0 }; });
    mesh.count = N; mesh.visible = false;
    this.confMesh = mesh;
    this.scene.add(mesh);
  }

  clearConfetti() { for (const c of this.conf) c.life = 0; }

  celebrate() {
    this.confMesh.visible = true;
    for (const c of this.conf) {
      c.p.set((Math.random() - 0.5) * 18, 7 + Math.random() * 4, -4 + (Math.random() - 0.5) * 12);
      c.v.set((Math.random() - 0.5) * 2, -1 - Math.random() * 1.5, (Math.random() - 0.5) * 2);
      c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      c.life = 6 + Math.random() * 2;
    }
    for (const b of this.robots.values()) b.bot.hit(1, 0.8, 0.3);
  }

  /** Lay out the band on curved risers grouped by section (heavy drums at the back). */
  layout(robots) {
    const sorted = [...robots].sort((a, b) => SECTION_ORDER.indexOf(a.def.family) - SECTION_ORDER.indexOf(b.def.family) || a.def.index - b.def.index);
    const rows = [];
    let left = sorted.length, i = 0;
    while (left > 0) { const cap = ROW_CAP[Math.min(i, ROW_CAP.length - 1)]; const n = Math.min(cap, left); rows.push({ n, r: ROW_R0 + i * ROW_DR }); left -= n; i++; }
    // balance: if the last row is tiny, borrow from earlier rows
    const pos = new Map();
    let k = 0;
    this.stageZ = -3.2 + ROW_R0;
    rows.forEach((row, ri) => {
      const spacing = row.n > 1 ? Math.min(1.25, (Math.PI * 0.95 * row.r) / row.n) : 0;
      const span = row.n > 1 ? (spacing * (row.n - 1)) / row.r : 0;
      row.span = Math.max(span, 0.4);
      for (let j = 0; j < row.n; j++, k++) {
        const a = Math.PI / 2 + (row.n > 1 ? (j / (row.n - 1) - 0.5) * span : 0);
        // the arc's centre sits behind the front row; robots face the audience (+z)
        pos.set(sorted[k].uid, new THREE.Vector3(Math.cos(a) * row.r, ri * RISER_H, this.stageZ - Math.sin(a) * row.r));
      }
    });
    this.rows = rows;
    this._buildRisers(rows);
    return pos;
  }

  setRobots(robots) {
    if (this._lineup) { this._lineup = null; for (const bm of this.beams) bm.visible = true; for (const e of this.robots.values()) this.scene.remove(e.bot.root); this.robots.clear(); }
    const live = new Set(robots.map((r) => r.uid));
    for (const [uid, e] of this.robots) if (!live.has(uid)) { this.scene.remove(e.bot.root); this.robots.delete(uid); }
    const pos = this.layout(robots);
    for (const r of robots) {
      let e = this.robots.get(r.uid);
      if (!e) {
        const bot = buildRobot(r.def);
        e = { bot, uid: r.uid, target: new THREE.Vector3(), r };
        bot.root.position.copy(pos.get(r.uid)).add(new THREE.Vector3(0, 4, 0));
        bot.root.traverse((o) => (o.userData.uid = r.uid));
        this.scene.add(bot.root);
        this.robots.set(r.uid, e);
      }
      e.target.copy(pos.get(r.uid));
    }
    this._frameCamera();
  }

  _frameCamera(instant = false) {
    if (this._lineup) { this._lineup(); return; }
    const rows = this.rows || [{ r: ROW_R0, n: 1, span: 0.4 }];
    const back = rows[rows.length - 1];
    const halfW = Math.max(1.6, Math.max(...rows.map((r) => Math.sin(Math.min(Math.PI / 2, r.span / 2 + 0.1)) * r.r)) + 0.9);
    const depth = rows.length;
    const vfov = (this.camera.fov * Math.PI) / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const dist = Math.max(halfW / Math.tan(hfov / 2), (1.25 + depth * 0.55) / Math.tan(vfov / 2)) * 1.05;
    const lookZ = (this.stageZ ?? 0) - (rows[0].r + back.r) * 0.5 + 0.6;
    this.frame.look.set(0, 0.9 + depth * 0.18, lookZ);
    this.frame.pos.set(0, 2.6 + depth * 0.65 + dist * 0.18, lookZ + dist);
    if (instant || !this._framed) { this.camera.position.copy(this.frame.pos); this.controls.target.copy(this.frame.look); this._framed = true; }
    this.userOrbit = false;
  }

  hit(uid, intensity, h, stepDur) { const e = this.robots.get(uid); if (e) e.bot.hit(intensity, h, stepDur); }
  beat(strength = 1) { this.beatPulse = strength; }
  setSelected(uid) { this.selected = uid; }
  setHype(h) { this.hype = h; }

  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hits = ray.intersectObjects([...this.robots.values()].map((e) => e.bot.root), true);
    const h = hits.find((x) => x.object.userData.uid != null);
    return h ? h.object.userData.uid : null;
  }

  screenPos(uid) {
    const e = this.robots.get(uid);
    if (!e) return null;
    const v = e.bot.root.position.clone(); v.y += e.bot.rig.height + 0.25;
    v.project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * rect.width, y: ((1 - v.y) / 2) * rect.height, visible: v.z < 1 };
  }
  panFor(uid) { const e = this.robots.get(uid); return e ? e.target.x / 10 : 0; }

  _drawLed(t) {
    const g = this.led.getContext('2d'), W = 512, H = 128;
    const hue = (t * 12) % 360;
    const grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, `hsl(${hue},70%,10%)`); grd.addColorStop(1, `hsl(${(hue + 80) % 360},70%,8%)`);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const n = this.eq.length, bw = W / n;
    for (let i = 0; i < n; i++) {
      const target = (this.playing ? 0.15 + 0.85 * this.beatPulse * (0.5 + 0.5 * Math.sin(i * 0.7 + t * 3)) : 0.05 + 0.04 * Math.sin(i * 0.5 + t * 2)) * (0.6 + this.hype * 0.6);
      this.eq[i] += (target - this.eq[i]) * 0.25;
      const h = this.eq[i] * H * 0.9;
      g.fillStyle = `hsla(${(hue + i * 5) % 360},90%,${45 + this.hype * 20}%,0.85)`;
      for (let y = H - 4; y > H - h; y -= 6) g.fillRect(i * bw + 1, y, bw - 2, 4);
    }
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'bold 22px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(this.ledText || 'ROBOT ORCHESTRA', W / 2, 30);
    this.ledTex.needsUpdate = true;
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    this.beatPulse = Math.max(0, this.beatPulse - dt * 4);
    const beat = this.playing ? this.beatPulse : 0;
    for (const e of this.robots.values()) {
      e.bot.root.position.lerp(e.target, 1 - Math.pow(0.0015, dt));
      e.bot.update(dt, t, beat);
    }
    // selection ring
    const sel = this.robots.get(this.selected);
    this.selRing.visible = !!sel;
    if (sel) {
      this.selRing.position.set(sel.bot.root.position.x, sel.bot.root.position.y + 0.02, sel.bot.root.position.z);
      this.selRing.material.color.set(sel.r.def.accent).multiplyScalar(1.5);
      this.selRing.scale.setScalar(1 + 0.08 * Math.sin(t * 5));
    }
    // beams sweep, faster with hype
    this.beams.forEach((b, i) => { b.rotation.z = Math.sin(t * (0.4 + this.hype * 0.8) + i * 1.3) * 0.5; b.rotation.x = 0.3 + Math.sin(t * 0.3 + i) * 0.2; b.children[0].material.opacity = 0.04 + 0.08 * this.hype + 0.05 * beat; });
    this.rims.forEach((l, i) => (l.intensity = 10 + 12 * beat + 8 * this.hype + 2 * Math.sin(t + i)));
    this.edge.material.color.setHSL((t * 0.05) % 1, 0.8, 0.45 + 0.2 * beat);
    // audience: bounce harder as hype rises; glow sticks wave
    const { body, head, stick } = this.crowdMeshes, m = this._m, q = this._q, e = this._e, v = this._v, s = this._s;
    const energy = 0.15 + this.hype * 0.85;
    this.crowd.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(t * (2 + energy * 4) + c.phase)) * 0.25 * energy + (this.playing ? beat * 0.12 * energy : 0);
      const y = c.y + jump;
      q.identity(); m.compose(v.set(c.x, y + 0.45, c.z), q, s); body.setMatrixAt(i, m);
      m.compose(v.set(c.x, y + 0.95, c.z), q, s); head.setMatrixAt(i, m);
      e.set(0, 0, c.side * (0.3 + 0.6 * energy * Math.sin(t * 3 + c.phase))); q.setFromEuler(e);
      m.compose(v.set(c.x + c.side * 0.3, y + 1.05 + energy * 0.25, c.z - 0.1), q, s); stick.setMatrixAt(i, m);
    });
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = stick.instanceMatrix.needsUpdate = true;
    // confetti
    if (this.confMesh.visible) {
      let alive = 0;
      this.conf.forEach((c, i) => {
        if (c.life > 0) { c.life -= dt; alive++; c.p.addScaledVector(c.v, dt); c.v.x += Math.sin(t * 3 + i) * dt; c.r.x += dt * 4; c.r.y += dt * 3; }
        e.set(c.r.x, c.r.y, c.r.z); q.setFromEuler(e); m.compose(c.p, q, c.life > 0 ? s : v.set(0, 0, 0)); this.confMesh.setMatrixAt(i, m);
        s.set(1, 1, 1);
      });
      this.confMesh.instanceMatrix.needsUpdate = true;
      if (!alive) this.confMesh.visible = false;
    }
    // camera: ease toward the framing unless the user is orbiting
    if (!this.userOrbit) {
      this.camera.position.lerp(v.copy(this.frame.pos).add(new THREE.Vector3(Math.sin(t * 0.15) * 0.6, 0, 0)), 1 - Math.pow(0.05, dt));
      this.controls.target.lerp(this.frame.look, 1 - Math.pow(0.05, dt));
    }
    this.controls.update();
    this._ledT = (this._ledT || 0) + dt;
    if (this._ledT > 1 / 30) { this._ledT = 0; this._drawLed(t); }
  }

  render() {
    if (this.bloom.enabled) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  _loop() {
    requestAnimationFrame(this._loop);
    if (this.manual) return;
    const raw = this.clock.getDelta(), dt = Math.min(0.05, raw);
    this._autoQuality(raw);
    this.update(dt);
    this.render();
  }

  resetView() { this.userOrbit = false; }

  /** Step quality down (high → medium → low) if frames stay slow for a few seconds. */
  _autoQuality(raw) {
    if (this.noAutoQuality || document.hidden) return;
    const a = (this._aq ||= { t: 0, n: 0, sum: 0 });
    a.t += raw; a.n++; a.sum += raw;
    if (a.t < 3) return;
    const avg = a.sum / a.n;
    a.t = a.n = a.sum = 0;
    if (avg > 1 / 28 && this.quality !== 'low') {
      this.setQuality(this.quality === 'high' ? 'medium' : 'low');
      this.onAutoQuality && this.onAutoQuality(this.quality);
    }
  }

  /** Render a single robot portrait (used by the robot picker cards). */
  thumbnail(def, size = 160) {
    if (!this._thumb) {
      const scene = new THREE.Scene();
      scene.environment = this.envMap;
      scene.add(new THREE.HemisphereLight('#c8d4ff', '#202030', 1.2));
      const d = new THREE.DirectionalLight('#ffffff', 2); d.position.set(2, 4, 5); scene.add(d);
      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      this._thumb = { scene, cam, rt, cache: new Map() };
    }
    const T = this._thumb;
    if (T.cache.has(def.id)) return T.cache.get(def.id);
    const bot = buildRobot(def);
    bot.update(0.016, 1 + def.index, 0);
    bot.rig.shadow.visible = false;
    T.scene.add(bot.root);
    const h = bot.rig.height;
    T.cam.position.set(1.1 * h * 0.55, h * 0.65, h * 2.3);
    T.cam.lookAt(0, h * 0.5, 0);
    const prev = this.renderer.getRenderTarget();
    const tm = this.renderer.toneMapping;
    this.renderer.setRenderTarget(T.rt);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(T.scene, T.cam);
    const px = new Uint8Array(size * size * 4);
    this.renderer.readRenderTargetPixels(T.rt, 0, 0, size, size, px);
    this.renderer.setRenderTarget(prev);
    this.renderer.toneMapping = tm;
    T.scene.remove(bot.root);
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    g.putImageData(img, 0, 0);
    const url = c.toDataURL();
    T.cache.set(def.id, url);
    return url;
  }

  /** Debug/review view: every robot in a tidy lineup, grouped by family. */
  lineup(ids = ROBOTS.map((r) => r.id), cols = ids.length <= 12 ? ids.length : 10) {
    this._lineup = null;
    for (const e of this.robots.values()) this.scene.remove(e.bot.root);
    this.robots.clear();
    this.risers.clear();
    const defs = ids.map((id) => ROBOTS.find((r) => r.id === id)).sort((a, b) => Object.keys(FAMILIES).indexOf(a.family) - Object.keys(FAMILIES).indexOf(b.family) || a.index - b.index);
    const rowsN = Math.ceil(defs.length / cols);
    defs.forEach((def, i) => {
      const bot = buildRobot(def);
      const r = Math.floor(i / cols), c = i % cols;
      const x = (c - (Math.min(cols, defs.length) - 1) / 2) * 1.35;
      const z = -r * 1.8;
      const p = new THREE.Vector3(x, r * 0.55, z);
      bot.root.position.copy(p);
      this.scene.add(bot.root);
      this.robots.set('L' + i, { bot, uid: 'L' + i, target: p, r: { def } });
    });
    const w = Math.min(cols, defs.length) * 1.35;
    for (const bm of this.beams) bm.visible = false;
    this._lineup = () => {
      this.frame.look.set(0, 0.85 + rowsN * 0.3, -(rowsN - 1) * 0.9);
      const vfov = (this.camera.fov * Math.PI) / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
      const dist = Math.max((w / 2 + 0.3) / Math.tan(hfov / 2), (1.3 + rowsN * 0.9) / Math.tan(vfov / 2));
      this.frame.pos.set(0, 1.3 + rowsN * 0.55, this.frame.look.z + dist);
      this.camera.position.copy(this.frame.pos); this.controls.target.copy(this.frame.look);
    };
    this._lineup();
    this.userOrbit = false;
  }
}
