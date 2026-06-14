import { BasePower } from "./BasePower.js";

const THROW_CD = 2.8;
const BALL_SPD = 215;
const BALL_DMG = 5;
const BALL_LIFE = 1.9;
const BALL_R = 9;
const REVIVE_HP = 100;
const DRAIN_TICK = 0.45; // s between drain ticks
const DRAIN_DMG = 4; // HP per tick while burning

export class FenixPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._throwCd = THROW_CD * 0.4;
    this._balls = []; // { x, y, vx, vy, timer, hit }
    this._bursts = []; // { x, y, timer } — visual explosion on hit/expire
    this._revived = false;
    this._burning = false;
    this._drainAccum = 0;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    this._throwCd -= dt;

    // Move fireballs
    for (const b of this._balls) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.timer -= dt;
      if ((b.timer <= 0 || b.hit) && !b.burst) {
        b.burst = true;
        this._bursts.push({ x: b.x, y: b.y, timer: 0.35 });
      }
    }
    this._balls = this._balls.filter((b) => b.timer > 0 && !b.hit);

    // Tick bursts
    for (const e of this._bursts) e.timer -= dt;
    this._bursts = this._bursts.filter((e) => e.timer > 0);

    // Burn drain after revival
    if (this._burning) {
      this._drainAccum += dt;
      if (this._drainAccum >= DRAIN_TICK) {
        this.owner.takeDamage(DRAIN_DMG);
        this._drainAccum -= DRAIN_TICK;
      }
    }
  }

  // ── Revival ──────────────────────────────────────────────────────────────────

  _onBeforeDeath() {
    if (this._revived) return false;
    this._revived = true;
    this._burning = true;
    this._drainAccum = 0;
    this.owner.hp = REVIVE_HP;
    return true;
  }

  // ── Enemy interactions ───────────────────────────────────────────────────────

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;

    if (this._throwCd <= 0) {
      this._throwCd = THROW_CD;
      this._throw(enemy);
    }

    for (const b of this._balls) {
      if (b.hit) continue;
      const dx = enemy.x - b.x,
        dy = enemy.y - b.y;
      if (dx * dx + dy * dy < (BALL_R + enemy.radius) ** 2) {
        this._dealDmg(enemy, BALL_DMG);
        b.hit = true;
      }
    }
  }

  _throw(enemy) {
    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    const base = Math.atan2(dy, dx);

    for (const spread of [-0.22, 0, 0.22]) {
      const a = base + spread;
      this._balls.push({
        x: this.owner.x,
        y: this.owner.y,
        vx: Math.cos(a) * BALL_SPD,
        vy: Math.sin(a) * BALL_SPD,
        timer: BALL_LIFE,
        hit: false,
        burst: false,
      });
    }
  }

  clearState() {
    this._throwCd = THROW_CD * 0.4;
    this._balls = [];
    this._bursts = [];
    this._revived = false;
    this._burning = false;
    this._drainAccum = 0;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    // Explosion bursts
    for (const e of this._bursts) {
      const frac = e.timer / 0.35; // 1→0
      ctx.save();
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6 + (1 - frac) * 18, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,140,20,${0.45 * frac})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3 + (1 - frac) * 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,80,${0.6 * frac})`;
      ctx.fill();
      ctx.restore();
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;

    // Cooldown ring
    {
      const frac = Math.min(1, 1 - this._throwCd / THROW_CD);
      if (frac > 0.04) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,140,20,${0.3 + 0.6 * frac})`;
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
    }

    // Fire ring while burning (after revival)
    if (this._burning) {
      const t = Date.now() / 1000;
      const flames = 10;
      ctx.save();
      for (let i = 0; i < flames; i++) {
        const baseAng = (i / flames) * Math.PI * 2;
        const wave = Math.sin(t * 6 + i * 1.3) * 0.4;
        const ang = baseAng + wave;
        const dist = radius + 6 + Math.abs(Math.sin(t * 4 + i * 0.9)) * 8;
        const fh = 6 + Math.abs(Math.sin(t * 5 + i * 1.1)) * 7;
        const fx = x + Math.cos(ang) * dist;
        const fy = y + Math.sin(ang) * dist;
        const pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 3 + i));

        ctx.beginPath();
        ctx.arc(fx, fy, fh * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${80 + Math.floor(pulse * 80)},0,${0.72 * pulse})`;
        ctx.fill();
      }
      // Inner glow
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(t * 3.5));
      ctx.strokeStyle = `rgba(255,160,0,${0.65 * pulse})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 14;
      ctx.shadowColor = "rgba(255,100,0,0.7)";
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Fireballs
    for (const b of this._balls) {
      const alpha = Math.min(1, b.timer / 0.15);
      this._drawBall(ctx, b.x, b.y, BALL_R, alpha);
    }
  }

  _drawBall(ctx, x, y, r, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // Outer glow
    ctx.beginPath();
    ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,100,0,0.18)";
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,170,30,0.95)";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(255,80,0,0.8)";
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bright center
    ctx.beginPath();
    ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,240,180,0.95)";
    ctx.fill();

    ctx.restore();
  }

  static meta = {
    id: "fenix",
    name: "Fénix",
    description:
      "Lanza bolas de fuego. Si muere, resucita con vida que se consume poco a poco.",
    color: "#FF6B00",
    icon: "◈",
    dmgRating: 3,
  };
}
