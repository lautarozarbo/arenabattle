import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class PulsarPower extends BasePower {
  constructor(owner) {
    super(owner);

    this._phase = "cooldown";
    this._cdTimer = 1.5; // initial delay before first burst
    this._sweepAngle = 0; // current arm angle (keeps incrementing across bursts)
    this._swept = 0; // radians swept in the current burst
    this._trail = []; // recent arm angles for the fade trail
    this._hitCooldown = 0;
    this._compHitCooldown = 0;

    this.BURST_CD = 2.5; // seconds between bursts
    this.BURST_TOTAL = Math.PI * 3.5; // ~1.75 full rotations per burst
    this.SWEEP_SPEED = 5.5; // rad/s — fast sweep
    this.ARM_LENGTH = 170; // px from owner center
    this.ARM_WIDTH = 0.15; // angular half-width for damage (rad)
    this.RAY_DAMAGE = 8;
    this.HIT_CD = 0.35;
    this.TRAIL_STEPS = 12; // number of ghost segments
  }

  update(dt) {
    if (this._hitCooldown > 0) this._hitCooldown -= dt;
    if (this._compHitCooldown > 0) this._compHitCooldown -= dt;

    if (this._phase === "cooldown") {
      this._cdTimer -= dt;
      if (this._cdTimer <= 0) {
        this._phase = "sweeping";
        this._swept = 0;
        this._trail = [];
        sfx.pulsarStart();
      }
    } else {
      const delta = this.SWEEP_SPEED * dt;
      this._sweepAngle += delta;
      this._swept += delta;

      // Build trail: prepend current angle and cap length
      this._trail.unshift(this._sweepAngle);
      if (this._trail.length > this.TRAIL_STEPS)
        this._trail.length = this.TRAIL_STEPS;

      if (this._swept >= this.BURST_TOTAL) {
        this._phase = "cooldown";
        this._cdTimer = this._cd(this.BURST_CD);
        this._trail = [];
      }
    }
  }

  // Returns true if point (tx, ty) is within the active arm's angular slice
  _inArm(tx, ty) {
    const dx = tx - this.owner.x,
      dy = ty - this.owner.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.ARM_LENGTH + 28 || dist < this.owner.radius) return false;
    const angle = Math.atan2(dy, dx);
    // Signed angle difference normalised to [-PI, PI]
    const da =
      ((((angle - this._sweepAngle) % (Math.PI * 2)) + Math.PI * 3) %
        (Math.PI * 2)) -
      Math.PI;
    return Math.abs(da) < this.ARM_WIDTH;
  }

  onEnemyFrame(enemy) {
    if (this._phase !== "sweeping") return;

    if (
      enemy.isAlive &&
      this._hitCooldown <= 0 &&
      this._inArm(enemy.x, enemy.y)
    ) {
      this._dealDmg(enemy, this.RAY_DAMAGE);
      sfx.pulsarHit();
      this._hitCooldown = this.HIT_CD;
    }

    const comp = enemy.power?._comp;
    if (
      comp?.isAlive &&
      this._compHitCooldown <= 0 &&
      this._inArm(comp.x, comp.y)
    ) {
      this._dealDmg(comp, this.RAY_DAMAGE);
      sfx.pulsarHit();
      this._compHitCooldown = this.HIT_CD;
    }
  }

  getHitDamage() {
    return 1;
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;

    if (this._phase === "cooldown") {
      // Charge arc — fills clockwise
      const frac = Math.min(1, 1 - this._cdTimer / this.BURST_CD);
      if (frac > 0.02) {
        ctx.save();
        ctx.strokeStyle = `rgba(0,210,255,${0.3 + 0.6 * frac})`;
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
      return;
    }

    // ── Sweeping phase ────────────────────────────────────────────────────────

    // Trail: older positions drawn faint and short, fading toward current angle
    for (let i = this._trail.length - 1; i >= 1; i--) {
      const a = this._trail[i];
      const t = 1 - i / this._trail.length; // 0 (old) → 1 (recent)
      const alpha = t * 0.55;
      const len = radius + (this.ARM_LENGTH - radius) * (0.3 + 0.7 * t);
      ctx.save();
      ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
      ctx.lineWidth = 1 + 3 * t;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
      ctx.restore();
    }

    // Active arm: wide soft glow + narrow bright core
    const a = this._sweepAngle;
    const ex = x + Math.cos(a) * this.ARM_LENGTH;
    const ey = y + Math.sin(a) * this.ARM_LENGTH;
    const sx = x + Math.cos(a) * radius;
    const sy = y + Math.sin(a) * radius;

    ctx.save();
    // Glow
    ctx.strokeStyle = "rgba(0,220,255,0.30)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Core
    ctx.strokeStyle = "rgba(200,248,255,0.98)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Tip flash
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  clearState() {
    this._phase = "cooldown";
    this._cdTimer = this._cd(this.BURST_CD);
    this._swept = 0;
    this._trail = [];
  }

  static meta = {
    id: "pulsar",
    name: "Pulsar",
    description: "Invoca un rayo láser giratorio.",
    color: "#00C8FF",
    icon: "✸",
    dmgRating: 3,
  };
}
