// Song Maker-style grid on a canvas: the selected melodic robot's pitch rows on top (rainbow cells,
// other melodic robots shown as ghost dots), one lane per drum/percussion robot underneath.
import { SCALES, isRootRow, midiName } from './music.js';
import { FAMILIES } from './catalog.js';

const PITCH_COLORS = ['#e8364f', '#f2603b', '#f7943d', '#f7b733', '#f7d23d', '#9ccc3b', '#4cb84c', '#2bb5a0', '#36a9e1', '#4f7be0', '#7a5bd8', '#b14fcf'];
const LABEL_W = 46;
const LANE_H = 30;

export class Sequencer {
  constructor(canvas, wrap, { onEdit, onSelect, onPreview, onEditStart }) {
    this.canvas = canvas;
    this.wrap = wrap;
    this.ctx = canvas.getContext('2d');
    this.onEdit = onEdit; this.onSelect = onSelect; this.onPreview = onPreview; this.onEditStart = onEditStart;
    this.song = null;
    this.melodic = null; // robot whose pitch grid is shown
    this.selected = null;
    this.playStep = -1;
    this.dirty = true;
    this.drag = null;
    canvas.addEventListener('pointerdown', (e) => this._down(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    window.addEventListener('pointerup', () => this._up());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    new ResizeObserver(() => { this.dirty = true; }).observe(wrap);
    const tick = () => { if (this.dirty) this.draw(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  setSong(song) { this.song = song; this.melodic = null; this.select(song.robots.find((r) => song.isMelodic(r)) || song.robots[0]); }
  select(r) {
    this.selected = r || null;
    if (r && this.song.isMelodic(r)) this.melodic = r;
    if (!this.melodic || !this.song.robots.includes(this.melodic)) this.melodic = this.song.robots.find((x) => this.song.isMelodic(x)) || null;
    this.dirty = true;
  }
  setPlayStep(s) { if (s !== this.playStep) { this.playStep = s; this.dirty = true; } }
  refresh() { this.dirty = true; }

  get lanes() { return this.song ? this.song.robots.filter((r) => !this.song.isMelodic(r)) : []; }

  _layout() {
    const song = this.song, steps = song.steps;
    const W = this.wrap.clientWidth, H = this.wrap.clientHeight;
    const cellW = Math.max(16, (W - LABEL_W) / steps);
    const rows = this.melodic ? song.rows(this.melodic) : 0;
    const laneCount = this.lanes.length;
    const laneH = laneCount ? LANE_H : 0;
    const percH = laneCount * laneH + (laneCount ? 8 : 0);
    const rowH = rows ? Math.max(11, Math.min(34, (H - percH - 2) / rows)) : 0;
    const width = Math.ceil(LABEL_W + cellW * steps);
    const height = Math.ceil(rows * rowH + percH);
    return { steps, cellW, rows, rowH, laneH, percTop: rows * rowH + (laneCount ? 8 : 0), width, height: Math.max(height, 40) };
  }

  draw() {
    this.dirty = false;
    const song = this.song;
    if (!song) return;
    const L = (this.L = this._layout());
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = this.canvas, g = this.ctx;
    if (c.width !== L.width * dpr || c.height !== L.height * dpr) {
      c.width = L.width * dpr; c.height = L.height * dpr;
      c.style.width = L.width + 'px'; c.style.height = L.height + 'px';
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, L.width, L.height);
    const spb = song.settings.stepsPerBeat, bar = song.stepsPerBar;
    const x0 = LABEL_W;

    // ----- melodic pitch grid -----
    if (this.melodic) {
      const r = this.melodic, base = song.baseMidi(r);
      for (let row = 0; row < L.rows; row++) {
        const y = (L.rows - 1 - row) * L.rowH;
        if (isRootRow(row, song.settings.scale)) { g.fillStyle = 'rgba(70,110,255,0.07)'; g.fillRect(x0, y, L.width - x0, L.rowH); }
        g.fillStyle = isRootRow(row, song.settings.scale) ? '#3e5bd8' : '#8a90a6';
        g.font = `${isRootRow(row, song.settings.scale) ? 600 : 500} ${Math.min(11, L.rowH - 2)}px system-ui, sans-serif`;
        g.textAlign = 'right'; g.textBaseline = 'middle';
        if (L.rowH >= 11) g.fillText(midiName(song.midi(r, row)), x0 - 6, y + L.rowH / 2);
      }
      // ghost notes of other melodic robots (shown at their row in this grid)
      for (const o of song.robots) {
        if (o === r || !song.isMelodic(o) || o.muted) continue;
        g.fillStyle = o.def.accent + '88';
        for (const n of song.visibleNotes(o)) {
          if (n.row >= L.rows) continue;
          g.beginPath();
          g.arc(x0 + n.step * L.cellW + L.cellW / 2, (L.rows - 1 - n.row) * L.rowH + L.rowH / 2, Math.min(L.cellW, L.rowH) * 0.16, 0, Math.PI * 2);
          g.fill();
        }
      }
      // this robot's notes, coloured by pitch like Song Maker
      for (const n of song.visibleNotes(r)) {
        const midi = song.midi(r, n.row);
        const x = x0 + n.step * L.cellW, y = (L.rows - 1 - n.row) * L.rowH;
        const hot = n.step === this.playStep;
        g.fillStyle = PITCH_COLORS[(((midi - base) % 12) + 12) % 12];
        roundRect(g, x + 1, y + 1, L.cellW - 2, L.rowH - 2, Math.min(5, L.rowH / 3));
        g.fill();
        if (hot) { g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill(); }
      }
    }

    // ----- percussion lanes -----
    const lanes = this.lanes;
    if (lanes.length) {
      g.fillStyle = '#f2f4fa';
      g.fillRect(0, L.percTop - 8, L.width, 8);
      lanes.forEach((r, i) => {
        const y = L.percTop + i * L.laneH;
        const sel = r === this.selected;
        g.fillStyle = sel ? hexA(r.def.accent, 0.12) : i % 2 ? '#fafbfe' : '#ffffff';
        g.fillRect(0, y, L.width, L.laneH);
        g.font = '15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = r.muted ? '#bbb' : '#333';
        g.fillText(FAMILIES[r.def.family].icon, 14, y + L.laneH / 2);
        g.fillStyle = r.def.accent;
        g.fillRect(28, y + 6, 4, L.laneH - 12);
        for (const n of song.visibleNotes(r)) {
          const cx = x0 + n.step * L.cellW + L.cellW / 2, cy = y + L.laneH / 2, rad = Math.min(L.cellW, L.laneH) * 0.34;
          g.fillStyle = r.muted ? '#c8ccd8' : r.def.accent;
          g.beginPath();
          if (r.def.family === 'drum') g.arc(cx, cy, rad, 0, Math.PI * 2);
          else { g.moveTo(cx, cy - rad); g.lineTo(cx + rad, cy + rad * 0.8); g.lineTo(cx - rad, cy + rad * 0.8); g.closePath(); }
          g.fill();
          if (n.step === this.playStep) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill(); }
        }
      });
    }

    // ----- grid lines (bars bold, beats medium, steps faint) -----
    for (let s = 0; s <= L.steps; s++) {
      const x = Math.round(x0 + s * L.cellW) + 0.5;
      g.strokeStyle = s % bar === 0 ? '#9aa3c0' : s % spb === 0 ? '#cfd4e4' : '#ebedf4';
      g.lineWidth = s % bar === 0 ? 2 : 1;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L.height); g.stroke();
    }
    g.lineWidth = 1;
    g.strokeStyle = '#eceef5';
    for (let row = 0; row <= L.rows; row++) { const y = Math.round(row * L.rowH) + 0.5; g.beginPath(); g.moveTo(x0, y); g.lineTo(L.width, y); g.stroke(); }
    lanes.forEach((_, i) => { const y = Math.round(L.percTop + (i + 1) * L.laneH) + 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(L.width, y); g.stroke(); });

    // ----- playhead -----
    if (this.playStep >= 0) {
      g.fillStyle = 'rgba(61,139,255,0.13)';
      g.fillRect(x0 + this.playStep * L.cellW, 0, L.cellW, L.height);
      this._follow(x0 + this.playStep * L.cellW, L.cellW);
    }
    if (!this.melodic && !lanes.length) {
      g.fillStyle = '#99a'; g.font = '14px system-ui'; g.textAlign = 'center';
      g.fillText('Add robots to start making music', L.width / 2, 20);
    }
  }

  _follow(x, w) {
    const wr = this.wrap;
    if (x < wr.scrollLeft + LABEL_W || x + w > wr.scrollLeft + wr.clientWidth) wr.scrollLeft = Math.max(0, x - LABEL_W - 20);
  }

  /** Which cell is under the pointer: { r, step, row } or null. */
  _cell(e) {
    const L = this.L;
    if (!L) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (y >= L.percTop && this.lanes.length) {
      const i = Math.floor((y - L.percTop) / L.laneH);
      const r = this.lanes[i];
      if (!r) return null;
      if (x < LABEL_W) return { r, label: true };
      return { r, step: Math.floor((x - LABEL_W) / L.cellW), row: 0 };
    }
    if (!this.melodic || x < LABEL_W || y >= L.rows * L.rowH) return null;
    const row = L.rows - 1 - Math.floor(y / L.rowH);
    return { r: this.melodic, step: Math.floor((x - LABEL_W) / L.cellW), row };
  }

  _down(e) {
    const c = this._cell(e);
    if (!c) return;
    if (c.label) { this.onSelect(c.r); return; }
    if (c.step < 0 || c.step >= this.song.steps) return;
    e.preventDefault();
    this.canvas.setPointerCapture?.(e.pointerId);
    this.onEditStart && this.onEditStart();
    const on = !this.song.has(c.r, c.step, c.row);
    this.drag = { r: c.r, on, last: `${c.step},${c.row}` };
    if (c.r !== this.selected) this.onSelect(c.r);
    this._apply(c, on);
  }
  _move(e) {
    if (!this.drag) return;
    const c = this._cell(e);
    if (!c || c.label || c.r !== this.drag.r || c.step < 0 || c.step >= this.song.steps) return;
    const key = `${c.step},${c.row}`;
    if (key === this.drag.last) return;
    this.drag.last = key;
    this._apply(c, this.drag.on);
  }
  _up() { if (this.drag) { this.drag = null; this.onEdit && this.onEdit(true); } }
  _apply(c, on) {
    if (this.song.has(c.r, c.step, c.row) === on) return;
    this.song.set(c.r, c.step, c.row, on);
    if (on) this.onPreview(c.r, c.row);
    this.dirty = true;
    this.onEdit && this.onEdit(false);
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
export { SCALES };
