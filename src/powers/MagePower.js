import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class MagePower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;

    // Timers
    this._chargeTimer = 0;
    this._warnTimer = 0;
    this._flashTimer = 0;
    this._coolTimer = 0;

    // State: 'charging' | 'warning' | 'flashing' | 'cooling'
    this._state = "charging";

    // Explosion geometry (computed when warning starts)
    this._cx = 0;
    this._cy = 0;
    this._radius = 0;
    this._damageDone = false;

    this.CHARGE_TIME = 12.0;
    this.WARN_TIME = 2.0;
    this.FLASH_TIME = 0.55; // explosion visual linger
    this.COOL_TIME = 1.5;
    this.DAMAGE = 30;
  }

  // Compute explosion geometry from current arena
  _computeZone() {
    const { left, top, width } = this.arena;
    this._cx = left + width / 2;
    this._cy = top + width / 2;
    // 88 % of the half-diagonal → corners are the only safe zone
    this._radius = ((width * Math.SQRT2) / 2) * 0.88;
  }

  update(dt) {
    if (!this.arena) return;

    if (this._state === "charging") {
      this._chargeTimer += dt;
      if (this._chargeTimer >= this.CHARGE_TIME) {
        this._state = "warning";
        this._warnTimer = this.WARN_TIME;
        this._chargeTimer = 0;
        this._computeZone();
        this._damageDone = false;
        sfx.mageWarn();
      }
    } else if (this._state === "warning") {
      this._warnTimer -= dt;
      if (this._warnTimer <= 0) {
        this._state = "flashing";
        this._flashTimer = this.FLASH_TIME;
        sfx.mageExplode();
      }
    } else if (this._state === "flashing") {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) {
        this._state = "cooling";
        this._coolTimer = this.COOL_TIME;
      }
    } else if (this._state === "cooling") {
      this._coolTimer -= dt;
      if (this._coolTimer <= 0) {
        this._state = "charging";
        this._chargeTimer = 0;
      }
    }
  }

  onEnemyFrame(enemy) {
    if (this._state !== "flashing" || this._damageDone) return;
    this._damageDone = true;

    if (enemy.isAlive) {
      const dx = enemy.x - this._cx,
        dy = enemy.y - this._cy;
      if (dx * dx + dy * dy < this._radius * this._radius) {
        enemy.takeDamage(this.DAMAGE);
      }
    }

    // DUO companion
    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      const dx = comp.x - this._cx,
        dy = comp.y - this._cy;
      if (dx * dx + dy * dy < this._radius * this._radius) {
        comp.takeDamage(this.DAMAGE);
      }
    }
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    if (this._state === "warning") {
      const progress = 1 - this._warnTimer / this.WARN_TIME; // 0 → 1
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 130));

      // Expanding fill: starts small, reaches full radius as warning ends
      const drawR = this._radius * (0.4 + 0.6 * progress);

      ctx.save();
      ctx.beginPath();
      ctx.arc(this._cx, this._cy, drawR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 0, ${0.14 * pulse})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 110, 20, ${0.85 * pulse})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Dashed safe-zone ring showing full explosion radius
      ctx.beginPath();
      ctx.arc(this._cx, this._cy, this._radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,200,50,${0.45 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (this._state === "flashing") {
      const fade = this._flashTimer / this.FLASH_TIME; // 1 → 0

      // Brilliant explosion fill
      ctx.save();
      ctx.beginPath();
      ctx.arc(this._cx, this._cy, this._radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 230, 100, ${0.75 * fade})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 200, ${fade})`;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();

      // Hot inner ring
      const innerR = this._radius * (1 - fade * 0.35);
      ctx.save();
      ctx.beginPath();
      ctx.arc(this._cx, this._cy, innerR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,80,0,${0.6 * fade})`;
      ctx.lineWidth = 8 * fade;
      ctx.stroke();
      ctx.restore();
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;

    if (this._state === "charging") {
      const frac = Math.min(1, this._chargeTimer / this.CHARGE_TIME);
      if (frac > 0.02) {
        ctx.save();
        ctx.strokeStyle = `rgba(180,80,255,${0.35 + 0.65 * frac})`;
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

        // Small pulsing star when nearly full
        if (frac > 0.85) {
          const glow = (frac - 0.85) / 0.15;
          ctx.beginPath();
          ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(220,140,255,${0.3 * glow * Math.abs(Math.sin(Date.now() / 80))})`;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    if (this._state === "warning") {
      // Mage circle pulses bright red/orange
      const pulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 100));
      ctx.save();
      ctx.strokeStyle = `rgba(255,60,0,${pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this._state === "flashing") {
      const fade = this._flashTimer / this.FLASH_TIME;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,200,${fade})`;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
    }

    // Cooldown refill arc
    if (this._state === "cooling") {
      const frac = 1 - this._coolTimer / this.COOL_TIME;
      ctx.save();
      ctx.strokeStyle = `rgba(180,80,255,${0.25 + 0.25 * frac})`;
      ctx.lineWidth = 2;
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
  }

  clearState() {
    this._state = "charging";
    this._chargeTimer = 0;
    this._warnTimer = 0;
    this._flashTimer = 0;
    this._coolTimer = 0;
    this._damageDone = false;
  }

  static meta = {
    id: "mage",
    name: "Mago Explosivo",
    description: "Carga y desata una explosión que cubre casi toda la arena.",
    color: "#7B2FBE",
    icon: "✦",
    dmgRating: 4,
  };
}
