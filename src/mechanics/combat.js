import { reactToHit } from '../characters/npcBehaviors.js';

// Slapstick melee punch (Phase 6): F swings the right claw, NPCs in a
// short forward cone do a brief flinch (the 'react' behavior state).
// No health or damage — pure workplace comedy.

const PUNCH_DURATION = 0.3; // arm swing out and back (s)
const HIT_TIME = 0.1; // moment within the swing when the hit lands
const COOLDOWN = 0.8; // time between punches (frame-independent)
const RANGE = 1.9; // forward reach (units)
const CONE = Math.PI / 3; // +/- 60 degrees of facing

export class PunchSystem {
  constructor(player, npcManager) {
    this.player = player;
    this.npcs = npcManager;
    this.cooldown = 0;
    this.t = -1; // active swing time, -1 = idle
    this.hitDone = false;
    this.onSwing = null; // fired when a swing actually starts (audio hook)
  }

  tryPunch() {
    if (this.cooldown > 0) return;
    this.cooldown = COOLDOWN;
    this.t = 0;
    this.hitDone = false;
    if (this.onSwing) this.onSwing();
  }

  // Runs after player.update so the swing overrides the walk arm-swing.
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.t < 0) return;
    this.t += dt;
    const k = Math.min(this.t / PUNCH_DURATION, 1);
    // Swing the right claw forward and back around the shoulder pivot.
    this.player.parts.armR.rotation.x = -Math.sin(k * Math.PI) * 1.6;
    if (!this.hitDone && this.t >= HIT_TIME) {
      this.hitDone = true;
      this.hitCheck();
    }
    if (k >= 1) {
      this.t = -1;
      this.player.parts.armR.rotation.x = 0;
    }
  }

  hitCheck() {
    const pp = this.player.position;
    const facing = this.player.mesh.rotation.y;
    for (const npc of this.npcs.npcs) {
      if (npc.special) continue; // Shrimply Gigantic is too big to flinch; keep him on his patrol
      const np = npc.group.position;
      const dx = np.x - pp.x;
      const dz = np.z - pp.z;
      const dist = Math.hypot(dx, dz);
      if (dist > RANGE || dist < 1e-3) continue;
      let d = (Math.atan2(dx, dz) - facing) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) > CONE) continue;
      reactToHit(npc, dx / dist, dz / dist); // stumble away from the player
    }
  }
}
