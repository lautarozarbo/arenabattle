import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class ClockPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._frozen = false;
    this._freezeTimer = 0;
    this._cooldownTimer = 5.5;
    this._frozenEnemy = null;
    this._angle = 0;
    this._dmgAccum = 0;
    this._drainFlash = 0; // animation timer for charge-drain burst

    this.FREEZE_DURATION = 2;
    this.COOLDOWN = 4;
    this.FREEZE_DPS = 4;
    this.DRAIN_FLASH_DUR = 0.45;
  }

  update(dt) {
    this._angle += dt * 1.8;
    if (this._drainFlash > 0) this._drainFlash -= dt;

    if (this._frozen) {
      if (!this._frozenEnemy?.isAlive) {
        this._unfreeze();
        return;
      }
      this._freezeTimer -= dt;
      this._dmgAccum += dt;
      if (this._dmgAccum >= 0.5) {
        const blocked = this._frozenEnemy.power._inSmoke?.() ?? false;
        if (!blocked) this._dealDmg(this._frozenEnemy, this.FREEZE_DPS * 0.5);
        this._dmgAccum -= 0.5;
      }
      if (this._freezeTimer <= 0) this._unfreeze();
    } else {
      this._cooldownTimer -= dt;
    }
  }

  onEnemyFrame(enemy) {
    if (!this._frozen && this._cooldownTimer <= 0 && enemy.isAlive) {
      this._freeze(enemy);
    }
  }

  _freeze(enemy) {
    this._frozen = true;
    this._freezeTimer = this.FREEZE_DURATION;
    this._frozenEnemy = enemy;
    // Drain charge instead of wiping map state
    enemy.power.drainCharge();
    this._drainFlash = this.DRAIN_FLASH_DUR;
    enemy._silenced = true;
    enemy._speedOverride = 0;
    enemy.vx = 0;
    enemy.vy = 0;
    sfx.clockFreeze();
  }

  _unfreeze() {
    if (this._frozenEnemy) {
      this._frozenEnemy._silenced = false;
      this._frozenEnemy._speedOverride = null;
      this._frozenEnemy.power.onUnsilenced();
      this._frozenEnemy = null;
    }
    this._frozen = false;
    this._cooldownTimer = this.COOLDOWN;
  }

  clearState() {
    if (this._frozen) {
      if (this._frozenEnemy) {
        this._frozenEnemy._silenced = false;
        this._frozenEnemy._speedOverride = null;
        this._frozenEnemy = null;
      }
      this._frozen = false;
    }
    this._cooldownTimer = 0;
    this._drainFlash = 0;
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;

    if (this._frozen && this._frozenEnemy?.isAlive) {
      const ex = this._frozenEnemy.x;
      const ey = this._frozenEnemy.y;
      const er = this._frozenEnemy.radius;
      const frac = this._freezeTimer / this.FREEZE_DURATION;

      // Freeze ring shrinking around frozen enemy
      ctx.save();
      ctx.strokeStyle = `rgba(160,220,255,${0.75 * frac})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ex, ey, er + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();

      // Charge-drain burst: a full ring that quickly collapses outward and fades
      if (this._drainFlash > 0) {
        const df = this._drainFlash / this.DRAIN_FLASH_DUR; // 1→0
        const expandR = er + 9 + (1 - df) * 14;
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,200,${0.9 * df})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex, ey, expandR, 0, Math.PI * 2);
        ctx.stroke();
        // Inner counter-sweep showing charge wiped
        ctx.strokeStyle = `rgba(255,255,200,${0.55 * df})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          ex,
          ey,
          er + 14,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * df,
          true,
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    // Owner cooldown arc
    if (!this._frozen) {
      const frac =
        this._cooldownTimer <= 0 ? 1 : 1 - this._cooldownTimer / this.COOLDOWN;
      if (frac > 0.03) {
        ctx.save();
        ctx.strokeStyle = `rgba(160,210,255,${0.4 + 0.55 * frac})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          radius + 7,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * frac,
        );
        ctx.stroke();
        ctx.restore();
      }
      if (this._cooldownTimer <= 0) {
        const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 180));
        ctx.save();
        ctx.strokeStyle = `rgba(160,220,255,${0.85 * pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Clock-hand line
    ctx.save();
    ctx.strokeStyle = "rgba(200,230,255,0.7)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x + Math.cos(this._angle) * (radius * 0.65),
      y + Math.sin(this._angle) * (radius * 0.65),
    );
    ctx.stroke();
    ctx.restore();
  }

  static meta = {
    id: "clock",
    name: "Reloj",
    description:
      "Congela al enemigo: lo detiene, inflige daño y drena su barra de carga.",
    color: "#85C1E9",
    icon: "⏱",
    dmgRating: 1,
  };
}
