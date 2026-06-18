import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const SURGE_RADIUS = 160; // px beyond owner radius at peak surge
const SURGE_INTERVAL = 4.5; // seconds between surges
const SURGE_DUR = 3.2; // seconds the surge lasts
const CONTRACT_DUR = 0.7; // seconds to animate back to resting size
const SLOW_FACTOR = 0.42; // speed multiplier when caught in surge
const SLOW_DURATION = 1.8; // seconds of slow applied each tick
const DMG_TICK = 0.35; // seconds between damage ticks
const DMG_PER_TICK = 8;
const HIT_DAMAGE = 2;

export class DomainExpansionPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._state = "idle"; // idle | surging | contracting
    this._idleTimer = SURGE_INTERVAL * 0.4; // start first surge sooner
    this._surgeTimer = 0;
    this._contractTimer = 0;
    this._dmgAccum = 0;
  }

  // Current effective aura radius — expands from circle edge outward
  _auraR() {
    const min = this.owner.radius;
    const surge = this.owner.radius + SURGE_RADIUS;
    if (this._state === "idle") return min;
    if (this._state === "contracting") {
      const t = 1 - this._contractTimer / CONTRACT_DUR; // 0→1
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      return surge + (min - surge) * ease;
    }
    // surging: expand from circle edge to full surge radius
    const t = 1 - this._surgeTimer / SURGE_DUR; // 0→1
    const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    return min + (surge - min) * ease;
  }

  update(dt) {
    if (this._state === "idle") {
      this._idleTimer += dt;
      if (this._idleTimer >= SURGE_INTERVAL) {
        this._state = "surging";
        this._surgeTimer = SURGE_DUR;
        this._dmgAccum = 0;
        sfx.chessAnnounce?.();
      }
    } else if (this._state === "surging") {
      this._surgeTimer -= dt;
      if (this._surgeTimer <= 0) {
        this._state = "contracting";
        this._contractTimer = CONTRACT_DUR;
        this._dmgAccum = 0;
      }
    } else {
      // contracting
      this._contractTimer -= dt;
      if (this._contractTimer <= 0) {
        this._state = "idle";
        this._idleTimer = 0;
      }
    }
  }

  onEnemyFrame(enemy, dt) {
    if (this._state !== "surging") return;
    if (!enemy.isAlive) return;
    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this._auraR()) return;

    // Slow the enemy
    enemy.applyVenom(SLOW_DURATION, 0, 0, SLOW_FACTOR);

    // Damage tick
    this._dmgAccum += dt;
    if (this._dmgAccum >= DMG_TICK) {
      this._dealDmg(enemy, DMG_PER_TICK);
      this._dmgAccum -= DMG_TICK;
    }
  }

  onCollide(enemy) {
    // Impact frame on every real hit
    const ix = (this.owner.x + enemy.x) / 2;
    const iy = (this.owner.y + enemy.y) / 2;
    this._spawnImpact?.(ix, iy, 0.85);
  }

  getHitDamage() {
    return HIT_DAMAGE;
  }

  renderBelow(ctx) {
    if (this._state === "idle") return;

    const { x, y } = this.owner;
    const r = this._auraR();
    const now = Date.now();
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(now / 600));
    const contracting = this._state === "contracting";
    const fadeOut = contracting ? this._contractTimer / CONTRACT_DUR : 1;

    // Filled aura glow
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(80,0,120,${(0.18 + 0.12 * pulse) * fadeOut})`);
    grad.addColorStop(0.6, `rgba(40,0,80,${0.1 * pulse * fadeOut})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Outer ring
    ctx.save();
    ctx.strokeStyle = `rgba(160,60,255,${(0.85 + 0.15 * pulse) * fadeOut})`;
    ctx.lineWidth = 3.0;
    ctx.shadowBlur = 20 * fadeOut;
    ctx.shadowColor = "rgba(140,0,255,0.8)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Speed lines during surge and contraction (fade out while contracting)
    {
      const numMarks = 24;
      const surgeProgress =
        this._state === "contracting"
          ? this._contractTimer / CONTRACT_DUR // fades out 1→0
          : Math.min(1, (1 - this._surgeTimer / SURGE_DUR) * 4); // fades in fast
      ctx.save();
      ctx.globalAlpha = (0.4 + 0.4 * pulse) * surgeProgress;
      for (let i = 0; i < numMarks; i++) {
        const angle = (i / numMarks) * Math.PI * 2 + now * 0.0008;
        const thick = i % 3 === 0;
        const len = thick ? 18 : 10;
        const x0 = x + Math.cos(angle) * (r - len);
        const y0 = y + Math.sin(angle) * (r - len);
        const x1 = x + Math.cos(angle) * (r + 4);
        const y1 = y + Math.sin(angle) * (r + 4);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = thick
          ? "rgba(200,100,255,0.9)"
          : "rgba(160,60,255,0.6)";
        ctx.lineWidth = thick ? 2.5 : 1.2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  renderAbove(ctx) {
    if (this._state !== "idle") return;
    const frac = Math.min(1, this._idleTimer / SURGE_INTERVAL);
    if (frac <= 0.04) return;
    const { x, y, radius: r } = this.owner;
    ctx.save();
    ctx.strokeStyle = `rgba(160,60,255,${0.25 + 0.55 * frac})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6 * frac;
    ctx.shadowColor = "rgba(140,0,255,0.8)";
    ctx.beginPath();
    ctx.arc(x, y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    ctx.restore();
  }

  clearState() {
    this._state = "idle";
    this._idleTimer = 0;
    this._surgeTimer = 0;
    this._contractTimer = 0;
    this._dmgAccum = 0;
  }

  static meta = {
    id: "domainexpansion",
    name: "Dominio",
    description: "Expande su dominio frenando y dañando enemigos.",
    color: "#a020f0",
    icon: "⬡",
    dmgRating: 3,
  };
}
