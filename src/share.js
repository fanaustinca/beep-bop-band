// Share codes: a whole song (settings + every robot's notes) packed into a short copy-pasteable
// string. Binary layout → deflate (when the browser supports CompressionStream) → base64url.
//   BEEP1z<data>  deflated        BEEP1r<data>  raw (fallback)
import { SCALES } from './music.js';
import { ROBOTS, ROBOT_BY_ID } from './catalog.js';

const PREFIX = 'BEEP1';
const SCALE_KEYS = Object.keys(SCALES);

function writer() {
  const a = [];
  return {
    u8: (v) => a.push(v & 255),
    i8: (v) => a.push((v + 128) & 255),
    vint(v) { while (v >= 128) { a.push((v & 127) | 128); v >>>= 7; } a.push(v); },
    bytes: () => Uint8Array.from(a),
  };
}
function reader(b) {
  let i = 0;
  const need = () => { if (i >= b.length) throw new Error('code is cut off'); };
  return {
    u8: () => (need(), b[i++]),
    i8: () => (need(), b[i++] - 128),
    vint() { let v = 0, s = 0, x; do { need(); x = b[i++]; v |= (x & 127) << s; s += 7; } while (x & 128); return v >>> 0; },
  };
}

/** Song.serialize() data → bytes */
export function pack(data) {
  const w = writer(), s = data.settings;
  w.u8(Math.max(0, Math.min(255, Math.round(s.bpm))));
  w.u8(Math.max(0, SCALE_KEYS.indexOf(s.scale)));
  w.u8(s.root);
  w.u8((s.octaves & 3) | (s.loop ? 4 : 0));
  w.u8(s.beatsPerBar); w.u8(s.stepsPerBeat); w.u8(s.bars);
  const robots = data.robots.filter((r) => ROBOT_BY_ID[r.id]);
  w.u8(robots.length);
  for (const r of robots) {
    w.u8(ROBOT_BY_ID[r.id].index);
    w.i8(r.octave || 0); w.i8(r.transpose || 0); w.i8(Math.round(r.volume || 0));
    w.u8(r.muted ? 1 : 0);
    const cells = (r.notes || []).map(([st, row]) => st * 64 + row).sort((x, y) => x - y);
    w.vint(cells.length);
    let prev = 0;
    for (const c of cells) { w.vint(c - prev); prev = c; }
  }
  return w.bytes();
}

/** bytes → Song.serialize()-shaped data */
export function unpack(bytes) {
  const r = reader(bytes);
  const settings = { bpm: r.u8(), scale: SCALE_KEYS[r.u8()] || 'major', root: r.u8() };
  const o = r.u8();
  Object.assign(settings, { octaves: Math.max(1, o & 3), loop: !!(o & 4), beatsPerBar: r.u8(), stepsPerBeat: r.u8(), bars: r.u8() });
  if (settings.bpm < 40 || settings.bpm > 240 || settings.beatsPerBar < 1 || settings.beatsPerBar > 12 || settings.stepsPerBeat < 1 || settings.stepsPerBeat > 4 || settings.bars < 1 || settings.bars > 8) throw new Error('not a valid song code');
  const n = r.u8(), robots = [];
  for (let k = 0; k < n; k++) {
    const def = ROBOTS[r.u8()];
    const rb = { id: def && def.id, octave: r.i8(), transpose: r.i8(), volume: r.i8(), muted: !!r.u8(), notes: [] };
    const count = r.vint();
    let c = 0;
    for (let j = 0; j < count; j++) { c += r.vint(); rb.notes.push([Math.floor(c / 64), c % 64]); }
    if (def) robots.push(rb);
  }
  return { settings, robots };
}

const b64u = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (str) => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
const canZip = typeof CompressionStream !== 'undefined';

/** Song data → share code string */
export async function encode(data) {
  const raw = pack(data);
  if (canZip) {
    try {
      const z = await pipe(raw, new CompressionStream('deflate-raw'));
      if (z.length < raw.length) return PREFIX + 'z' + b64u(z);
    } catch { /* fall through */ }
  }
  return PREFIX + 'r' + b64u(raw);
}

/** Share code (or a link containing ?song=CODE) → song data. Throws a friendly Error. */
export async function decode(text) {
  let s = String(text || '').trim();
  const m = s.match(/[?&#]song=([A-Za-z0-9_-]+)/);
  if (m) s = m[1];
  s = s.replace(/\s+/g, '');
  if (!s.startsWith(PREFIX)) throw new Error('That doesn’t look like a song code (they start with BEEP1)');
  const kind = s[PREFIX.length], body = s.slice(PREFIX.length + 1);
  let bytes;
  try { bytes = unb64u(body); } catch { throw new Error('The code has invalid characters'); }
  if (kind === 'z') {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser can’t unzip song codes');
    try { bytes = await pipe(bytes, new DecompressionStream('deflate-raw')); } catch { throw new Error('The code is damaged or incomplete'); }
  } else if (kind !== 'r') throw new Error('Unknown code version');
  return unpack(bytes);
}

export function shareUrl(code) {
  return location.origin + location.pathname + '?song=' + code;
}
