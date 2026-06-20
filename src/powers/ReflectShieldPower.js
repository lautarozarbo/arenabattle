import { BasePower } from "./BasePower.js";

const MAX_CHARGES = 5;
const RECHARGE = 8.5; // s to fully recharge after depletion
const BURST_DMG = 20; // explosion damage when shield breaks
const BURST_R = 150; // explosion radius
const BURST_DUR = 0.45; // s for visual burst
const GAP = 0.16; // radian gap between shield segments

export class ReflectShieldPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._charges = MAX_CHARGES;
    this._rechargeCd = 0;
    this._hpLastFrame = null;
    this._burstTimer = 0;
    this._burstFire = false; // triggers explosion damage in onEnemyFrame
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    // Recharge when depleted
    if (this._charges === 0) {
      this._rechargeCd -= dt;
      if (this._rechargeCd <= 0) {
        this._charges = MAX_CHARGES;
        this._rechargeCd = 0;
      }
    }

    if (this._burstTimer > 0) this._burstTimer -= dt;

    // ── Shield absorption (one-frame-delayed HP monitor) ──────────────────
    if (this._hpLastFrame !== null && this._charges > 0) {
      const delta = this._hpLastFrame - this.owner.hp;
      if (delta > 0) {
        // Restore the lost HP — shield absorbed the hit
        this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + delta);
        // Remove last damage number so it doesn't float up
        if (this.owner._dmgNums.length > 0) this.owner._dmgNums.pop();
        this._charges--;

        if (this._charges === 0) {
          // Shield exhausted → explosion
          this._burstTimer = BURST_DUR;
          this._burstFire = true;
          this._rechargeCd = this._cd(RECHARGE);
        }
      }
    }
    this._hpLastFrame = this.owner.hp;
  }

  // ── Explosion on depletion ──────────────────────────────────────────────────

  onEnemyFrame(enemy) {
    if (!enemy.isAlive || !this._burstFire) return;
    this._burstFire = false;
    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    if (dx * dx + dy * dy < (BURST_R + enemy.radius) ** 2) {
      this._dealDmg(enemy, BURST_DMG);
    }
  }

  clearState() {
    this._charges = MAX_CHARGES;
    this._rechargeCd = 0;
    this._hpLastFrame = null;
    this._burstTimer = 0;
    this._burstFire = false;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  renderAbove(ctx) {
    const { x, y, radius: r } = this.owner;

    // Explosion burst ring
    if (this._burstTimer > 0) {
      const frac = this._burstTimer / BURST_DUR; // 1→0
      const ringR = r + 10 + (1 - frac) * (BURST_R - r - 10);
      ctx.save();
      ctx.strokeStyle = `rgba(140, 200, 255, ${frac * 0.95})`;
      ctx.lineWidth = 5 * frac;
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = frac * 0.18;
      ctx.fillStyle = "#90c8ff";
      ctx.beginPath();
      ctx.arc(x, y, ringR * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Depleted + recharging: arc fills clockwise
    if (this._charges === 0) {
      const frac = Math.max(0, 1 - this._rechargeCd / RECHARGE);
      ctx.save();
      ctx.strokeStyle = `rgba(100, 180, 255, ${0.12 + 0.32 * frac})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Active shield: one arc segment per remaining charge
    const plateAngle = (Math.PI * 2) / MAX_CHARGES;
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 420));
    const intensity = this._charges / MAX_CHARGES;
    const alpha = (0.5 + 0.5 * intensity) * pulse;

    ctx.save();
    ctx.strokeStyle = `rgba(100, 190, 255, ${alpha})`;
    ctx.lineWidth = 2.5 + intensity * 2;
    ctx.lineCap = "butt";
    ctx.shadowBlur = 6 * intensity * pulse;
    ctx.shadowColor = "rgba(100, 190, 255, 0.6)";

    for (let i = 0; i < this._charges; i++) {
      const start = -Math.PI / 2 + i * plateAngle + GAP / 2;
      const end = -Math.PI / 2 + (i + 1) * plateAngle - GAP / 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 9, start, end);
      ctx.stroke();
    }
    ctx.restore();
  }

  static meta = {
    id: "reflectshield",
    name: "Escudo",
    description:
      "Escudo con cargas que absorbe cualquier daño. Al agotarse explota causando daño.",
    color: "#5BC8F5",
    icon: "◇",
    dmgRating: 2,
  };
}
