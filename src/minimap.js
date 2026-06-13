// Minimap: top-right HUD panel with a top-down campus map.
// Press M or tap the panel to expand. Press M again, tap backdrop, or
// click "Close" to collapse. Player dot updates live every frame.

const WORLD = { minX: -180, maxX: 180, minZ: -140, maxZ: 145 };
const WW = WORLD.maxX - WORLD.minX; // 360
const WH = WORLD.maxZ - WORLD.minZ; // 285
// North = -Z = top of map, South = +Z = bottom.

// Road rectangles [centerX, centerZ, sizeX, sizeZ].
const ROADS = [
  [0,      35,   10, 180], // Main campus drive
  [62.5,  -55,  205,  12], // Laitram Lane
  [-7.5,  125,  345,  12], // Plantation St
  [158,   37.5,  10, 185], // Storey St
  [-160,    9,    9, 232], // West street
  [-32,    -2,   48,  40], // Intralox shipping apron
  [94,    -14,   36,  44], // LM east truck court
];

// Buildings [centerX, centerZ, sizeX, sizeZ, fill].
const BUILDINGS = [
  { cx: -100, cz:  -27, sx: 75,  sz: 160, color: '#4a5f72' }, // Intralox Plant
  { cx:   40, cz:  -15, sx: 60,  sz:  50, color: '#4a5f72' }, // Laitram Machinery
  { cx:   35, cz: 14.5, sx: 40,  sz:   9, color: '#3d5465' }, // LM office annex
  { cx:  130, cz:  -20, sx: 36,  sz:  36, color: '#4a5f72' }, // Laitram Office
  { cx:  105, cz: -100, sx: 70,  sz:  45, color: '#4a5f72' }, // Lapeyre Stair
  { cx: -100, cz:   95, sx: 80,  sz:  44, color: '#4a5f72' }, // Distribution Warehouse
  { cx: -171, cz:   40, sx: 14,  sz:  18, color: '#3d5465' }, // Laitram Pharmacy
  { cx:    8, cz:  112, sx:  5,  sz:   5, color: '#3d5465' }, // Guard Shack
];

// Indoor floor plan (Phase 7): shown instead of the campus overhead while
// the player is inside Laitram Machinery. Region matches the campus map's
// aspect ratio so the canvas size logic is shared.
const INDOOR_REGION = { minX: 2, maxX: 78, minZ: -41, maxZ: 19.2 };
const ROOMS = [
  { x0: 10, x1: 70, z0: -40, z1: -20, label: 'PRODUCTION', dark: true },
  { x0: 10.6, x1: 52, z0: -19.7, z1: 10, label: 'OFFICE' },
  { x0: 52, x1: 69.4, z0: -19.7, z1: -8.1, label: 'MANAGER' },
  { x0: 52, x1: 69.4, z0: -8.1, z1: 10, label: 'BREAK\nROOM' },
  { x0: 15, x1: 55, z0: 10, z1: 19, label: 'LOBBY' }
];

// Zone text labels drawn only in the expanded view.
const ZONES = [
  { wx: -100, wz:  -27, text: 'INTRALOX' },
  { wx:   40, wz:  -15, text: 'LAITRAM\nMACHINERY' },
  { wx:  130, wz:  -20, text: 'LAITRAM\nOFFICE' },
  { wx:  105, wz: -100, text: 'LAPEYRE\nSTAIR' },
  { wx: -100, wz:   95, text: 'DISTRIBUTION\nWAREHOUSE' },
  { wx: -171, wz:   40, text: 'PHARMACY' },
  { wx:    8, wz:  112, text: 'GUARD\nSHACK' },
  { wx:   85, wz:   30, text: 'BREAK\nAREA' },
  { wx:    2, wz:   62, text: 'MAIN\nGATE' },
];

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

    // Roads / truck aprons
    ctx.fillStyle = '#2d3338';
    for (const [rcx, rcz, rsx, rsz] of ROADS) {
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

    // NPC dots (small orange markers for all shrimp workers)
    const nr = Math.max(1.8, cw / 68);
    ctx.fillStyle = '#c96a30';
    for (const n of this._npcs) {
      const { x, y } = p(n.wx, n.wz);
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
      const fs = Math.max(8, Math.round(cw / 40));
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
    ctx.fillStyle = '#c96a30';
    for (const n of this._npcs) {
      if (n.wx < R.minX || n.wx > R.maxX || n.wz < R.minZ || n.wz > R.maxZ) continue;
      const { x, y } = p(n.wx, n.wz);
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
