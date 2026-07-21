// Minimap: top-right HUD panel with a top-down campus map.
// Press M or tap the panel to expand. Press M again, tap backdrop, or
// click "Close" to collapse. Player dot updates live every frame.

import {
  WORLD_BOUNDS as WORLD,
  ROADS,
  BUILDINGS,
  ZONES,
  STREET_LABELS,
  LAITRAM_MACHINERY_OFFSET,
} from './map/layoutData.js';

const WW = WORLD.maxX - WORLD.minX; // 360
const WH = WORLD.maxZ - WORLD.minZ; // 285
// North = -Z = top of map, South = +Z = bottom.

// Indoor floor plan (Phase 7): shown instead of the campus overhead while
// the player is inside Laitram Machinery. Region matches the campus map's
// aspect ratio so the canvas size logic is shared.
const INDOOR_REGION = {
  minX: 2 + LAITRAM_MACHINERY_OFFSET.x,
  maxX: 78 + LAITRAM_MACHINERY_OFFSET.x,
  minZ: -41 + LAITRAM_MACHINERY_OFFSET.z,
  maxZ: 19.2 + LAITRAM_MACHINERY_OFFSET.z,
};
const ROOMS = [
  { x0: 10, x1: 70, z0: -40, z1: -20, label: 'PRODUCTION', dark: true },
  { x0: 10.6, x1: 63, z0: -19.7, z1: 10, label: 'OFFICE' },
  { x0: 10.6, x1: 22, z0: -19.7, z1: -12, label: 'KITCHEN' },
  { x0: 30, x1: 38, z0: -15, z1: -3, label: 'STORAGE', dark: true },
  { x0: 48, x1: 60, z0: -16, z1: -2, label: 'CONF\n1019' },
  { x0: 63, x1: 69.4, z0: -19.7, z1: 10, label: 'OFFICES' },
  { x0: 15, x1: 55, z0: 10, z1: 19, label: 'LOBBY' }
].map((room) => ({
  ...room,
  x0: room.x0 + LAITRAM_MACHINERY_OFFSET.x,
  x1: room.x1 + LAITRAM_MACHINERY_OFFSET.x,
  z0: room.z0 + LAITRAM_MACHINERY_OFFSET.z,
  z1: room.z1 + LAITRAM_MACHINERY_OFFSET.z,
}));

export class Minimap {
  constructor() {
    this._expanded = false;
    this._markers = [];
    this._npcs = [];
    this._indoor = false;
    this._vehicle = null;

    // ── Mini panel (top-right corner of the HUD) ───────────────────────
    this._panel = document.createElement('div');
    this._panel.id = 'minimap';
    this._panel.className = 'panel';

    const lbl = document.createElement('div');
    lbl.className = 'mm-label';
    lbl.textContent = 'CAMPUS MAP';
    this._panel.appendChild(lbl);
    this._label = lbl;

    this._miniCanvas = document.createElement('canvas');
    this._miniCanvas.className = 'mm-canvas';
    this._panel.appendChild(this._miniCanvas);

    const hint = document.createElement('div');
    hint.className = 'mm-hint';
    hint.textContent = '[M] expand';
    this._panel.appendChild(hint);

    this._panel.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    document.getElementById('hud').appendChild(this._panel);

    // ── Expanded overlay (full-screen backdrop + large canvas) ─────────
    this._overlay = document.createElement('div');
    this._overlay.id = 'mm-overlay';
    this._overlay.style.display = 'none';

    const expTitle = document.createElement('div');
    expTitle.className = 'mm-exp-title';
    expTitle.textContent = 'LAITRAM TOWN  —  CAMPUS MAP';
    this._overlay.appendChild(expTitle);

    this._bigCanvas = document.createElement('canvas');
    this._bigCanvas.id = 'mm-big';
    this._overlay.appendChild(this._bigCanvas);

    const closeBtn = document.createElement('button');
    closeBtn.id = 'mm-close';
    closeBtn.textContent = 'Close  [M]';
    closeBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.close();
    });
    this._overlay.appendChild(closeBtn);

    // Clicking the dark backdrop (not the canvas or button) also closes.
    this._overlay.addEventListener('pointerdown', (e) => {
      if (e.target === this._overlay) this.close();
    });

    document.body.appendChild(this._overlay);

    // M key toggles the map (works even while pointer-locked).
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') this.toggle();
    });
  }

  // Convert world (wx, wz) → canvas pixel (x, y) in [0..cw] × [0..ch].
  // North (-Z) maps to top (y=0); South (+Z) maps to bottom (y=ch).
  _w2c(wx, wz, cw, ch, region = WORLD) {
    return {
      x: ((wx - region.minX) / (region.maxX - region.minX)) * cw,
      y: ((wz - region.minZ) / (region.maxZ - region.minZ)) * ch,
    };
  }

  // Draw the static base layers: ground, roads, buildings, NPCs, markers,
  // and (when expanded) zone labels.
  _drawBase(ctx, cw, ch, expanded) {
    const p = (wx, wz) => this._w2c(wx, wz, cw, ch);

    // Ground
    ctx.fillStyle = '#1a2c1a';
    ctx.fillRect(0, 0, cw, ch);

    // Mississippi River levee: the berm sits just past the mapped west
    // boundary (world x < -180), so draw it as a band along the left edge.
    const leveeW = Math.max(3, cw * 0.025);
    ctx.fillStyle = '#2f4a26';
    ctx.fillRect(0, 0, leveeW, ch);

    // Roads / truck aprons
    ctx.fillStyle = '#2d3338';
    for (const { cx: rcx, cz: rcz, sx: rsx, sz: rsz, minimap } of ROADS) {
      if (minimap === false) continue;
      const a = p(rcx - rsx / 2, rcz - rsz / 2);
      const b = p(rcx + rsx / 2, rcz + rsz / 2);
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }

    // Buildings
    for (const b of BUILDINGS) {
      const a = p(b.cx - b.sx / 2, b.cz - b.sz / 2);
      const bpt = p(b.cx + b.sx / 2, b.cz + b.sz / 2);
      ctx.fillStyle = b.color;
      ctx.fillRect(a.x, a.y, bpt.x - a.x, bpt.y - a.y);
      ctx.strokeStyle = 'rgba(190,215,235,0.28)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(a.x, a.y, bpt.x - a.x, bpt.y - a.y);
    }

    // Golf cart marker (small light square).
    if (this._vehicle) {
      const v = p(this._vehicle.wx, this._vehicle.wz);
      const vr = Math.max(2.2, cw / 60);
      ctx.fillStyle = '#e8e6df';
      ctx.fillRect(v.x - vr / 2, v.y - vr / 2, vr, vr);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(v.x - vr / 2, v.y - vr / 2, vr, vr);
    }

    // NPC dots — each NPC can carry an optional color override (e.g. Gerald).
    const nr = Math.max(1.8, cw / 68);
    for (const n of this._npcs) {
      const { x, y } = p(n.wx, n.wz);
      ctx.fillStyle = n.color || '#c96a30';
      ctx.beginPath();
      ctx.arc(x, y, nr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mission markers (colored dots with white border)
    const mr = Math.max(4, cw / 42);
    for (const m of this._markers) {
      if (!m.visible) continue;
      const { x, y } = p(m.wx, m.wz);
      ctx.beginPath();
      ctx.arc(x, y, mr, 0, Math.PI * 2);
      ctx.fillStyle = m.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.88)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (expanded && m.label) {
        const fs = Math.max(9, Math.round(cw / 36));
        ctx.font = `bold ${fs}px 'Segoe UI',Arial,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(m.label, x + 1, y + mr + 4);
        ctx.fillStyle = m.color;
        ctx.fillText(m.label, x, y + mr + 3);
      }
    }

    // Zone labels (expanded only)
    if (expanded) {
      // The real sheet has a dense Storey Street cluster. Keep the expanded
      // map type compact enough that adjacent numbered shells remain readable.
      const fs = Math.max(8, Math.round(cw / 46));
      const lh = fs * 1.3;
      ctx.font = `${fs}px 'Segoe UI',Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const z of ZONES) {
        const { x, y } = p(z.wx, z.wz);
        const lines = z.text.split('\n');
        const totalH = (lines.length - 1) * lh;
        for (let i = 0; i < lines.length; i++) {
          const ly = y - totalH / 2 + i * lh;
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillText(lines[i], x + 1, ly + 1);
          ctx.fillStyle = '#b8d8f0';
          ctx.fillText(lines[i], x, ly);
        }
      }

      // Street-name labels along the roads
      const sfs = Math.max(7, Math.round(cw / 52));
      ctx.font = `${sfs}px 'Segoe UI',Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const s of STREET_LABELS) {
        const { x, y } = p(s.wx, s.wz);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(s.rot);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(s.text, 1, 1);
        ctx.fillStyle = '#8fa8b8';
        ctx.fillText(s.text, 0, 0);
        ctx.restore();
      }

      // Levee label along the west band (rotated to read bottom-up)
      ctx.font = `${sfs}px 'Segoe UI',Arial,sans-serif`;
      ctx.fillStyle = '#7a9a6a';
      ctx.save();
      ctx.translate(leveeW + sfs * 0.9, ch / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('MISSISSIPPI RIVER LEVEE', 0, 0);
      ctx.restore();

      // North indicator badge (top-left corner)
      const ni = Math.max(16, Math.round(cw / 32));
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(6, 6, ni, ni);
      ctx.strokeStyle = 'rgba(255,158,94,0.6)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(6, 6, ni, ni);
      ctx.font = `bold ${Math.round(ni * 0.6)}px 'Segoe UI',Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff9e5e';
      ctx.fillText('N', 6 + ni / 2, 6 + ni / 2);
    }
  }

  // Indoor floor plan: room rectangles, mission markers and NPCs inside
  // the building region, drawn instead of the campus overhead.
  _drawIndoor(ctx, cw, ch, expanded) {
    const R = INDOOR_REGION;
    const p = (wx, wz) => this._w2c(wx, wz, cw, ch, R);

    ctx.fillStyle = '#10171c';
    ctx.fillRect(0, 0, cw, ch);

    const fs = Math.max(8, Math.round(cw / 30));
    for (const r of ROOMS) {
      const a = p(r.x0, r.z0);
      const b = p(r.x1, r.z1);
      ctx.fillStyle = r.dark ? '#232c33' : '#3d5465';
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeStyle = 'rgba(190,215,235,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.font = `${fs}px 'Segoe UI',Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = r.dark ? '#5d6a73' : '#b8d8f0';
      const lines = r.label.split('\n');
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2 - ((lines.length - 1) * fs * 1.2) / 2;
      lines.forEach((line, i) => ctx.fillText(line, cx, cy + i * fs * 1.2));
    }

    // NPCs inside the region.
    const nr = Math.max(2, cw / 60);
    for (const n of this._npcs) {
      if (n.wx < R.minX || n.wx > R.maxX || n.wz < R.minZ || n.wz > R.maxZ) continue;
      const { x, y } = p(n.wx, n.wz);
      ctx.fillStyle = n.color || '#c96a30';
      ctx.beginPath();
      ctx.arc(x, y, nr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mission markers inside the region.
    const mr = Math.max(4, cw / 42);
    for (const m of this._markers) {
      if (!m.visible) continue;
      if (m.wx < R.minX || m.wx > R.maxX || m.wz < R.minZ || m.wz > R.maxZ) continue;
      const { x, y } = p(m.wx, m.wz);
      ctx.beginPath();
      ctx.arc(x, y, mr, 0, Math.PI * 2);
      ctx.fillStyle = m.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.88)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Draw the player dot and direction arrow.
  // World forward direction: (sin(yaw), 0, cos(yaw)).
  // On canvas: +x = east, +y = south — so forward maps directly as
  //   fdx = sin(yaw), fdy = cos(yaw).
  _drawPlayer(ctx, cw, ch, pos, yaw, expanded) {
    const region = this._indoor ? INDOOR_REGION : WORLD;
    const { x, y } = this._w2c(pos.x, pos.z, cw, ch, region);
    const r = Math.max(4, cw / 30);
    const fdx = Math.sin(yaw);
    const fdy = Math.cos(yaw);
    const ang = Math.atan2(fdy, fdx);
    const half = Math.PI / 5.5;
    const tip = r * 2.1;

    // Direction cone
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang - half) * r, y + Math.sin(ang - half) * r);
    ctx.lineTo(x + Math.cos(ang) * (r + tip), y + Math.sin(ang) * (r + tip));
    ctx.lineTo(x + Math.cos(ang + half) * r, y + Math.sin(ang + half) * r);
    ctx.closePath();
    ctx.fillStyle = '#ff9e5e';
    ctx.fill();

    // Player dot
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ff9e5e';
    ctx.lineWidth = Math.max(1.5, r * 0.28);
    ctx.stroke();

    // "You" label (expanded only)
    if (expanded) {
      const fs = Math.max(11, Math.round(cw / 28));
      ctx.font = `bold ${fs}px 'Segoe UI',Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText('You', x + 1, y - r);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('You', x, y - r - 1);
    }
  }

  // Called every frame from main.js with the current player state.
  update(playerPos, playerYaw) {
    const MW = 190;
    const MH = Math.round(MW * WH / WW); // ≈150 px
    const dpr = window.devicePixelRatio || 1;

    if (this._miniCanvas.width !== MW * dpr) {
      this._miniCanvas.width = MW * dpr;
      this._miniCanvas.height = MH * dpr;
      this._miniCanvas.style.width = MW + 'px';
      this._miniCanvas.style.height = MH + 'px';
    }

    const mCtx = this._miniCanvas.getContext('2d');
    mCtx.save();
    mCtx.scale(dpr, dpr);
    if (this._indoor) this._drawIndoor(mCtx, MW, MH, false);
    else this._drawBase(mCtx, MW, MH, false);
    this._drawPlayer(mCtx, MW, MH, playerPos, playerYaw, false);
    mCtx.restore();

    if (this._expanded) this._redrawBig(playerPos, playerYaw);
  }

  _redrawBig(playerPos, playerYaw) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.min(vw * 0.88, 700);
    const maxH = vh * 0.78;
    let bw, bh;
    if (maxW / WW < maxH / WH) {
      bw = Math.round(maxW);
      bh = Math.round(bw * WH / WW);
    } else {
      bh = Math.round(maxH);
      bw = Math.round(bh * WW / WH);
    }

    const dpr = window.devicePixelRatio || 1;
    if (this._bigCanvas.width !== bw * dpr) {
      this._bigCanvas.width = bw * dpr;
      this._bigCanvas.height = bh * dpr;
      this._bigCanvas.style.width = bw + 'px';
      this._bigCanvas.style.height = bh + 'px';
    }

    const ctx = this._bigCanvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    if (this._indoor) this._drawIndoor(ctx, bw, bh, true);
    else this._drawBase(ctx, bw, bh, true);
    this._drawPlayer(ctx, bw, bh, playerPos, playerYaw, true);
    ctx.restore();
  }

  // markers: [{ wx, wz, color, label, visible }]
  setMarkers(markers) { this._markers = markers; }

  // positions: [{ wx, wz }]
  setNPCPositions(positions) { this._npcs = positions; }

  // Golf cart position: { wx, wz } (campus map only).
  setVehicle(v) { this._vehicle = v; }

  // Switch between the campus overhead and the LM floor plan.
  setIndoor(indoor) {
    if (indoor === this._indoor) return;
    this._indoor = indoor;
    this._label.textContent = indoor ? 'LM FLOOR PLAN' : 'CAMPUS MAP';
  }

  isIndoorMode() { return this._indoor; }

  toggle() { this._expanded ? this.close() : this.open(); }

  open() {
    this._expanded = true;
    this._overlay.style.display = 'flex';
  }

  close() {
    this._expanded = false;
    this._overlay.style.display = 'none';
  }

  isExpanded() { return this._expanded; }
}
