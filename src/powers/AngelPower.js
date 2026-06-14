import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class AngelPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._rays = [];
    this._spawnTimer = 1.8;

    this.SPAWN_INTERVAL = 2.5;
    this.RAY_COUNT = 3;
    this.WARN_DUR = 0.55;
    this.STRIKE_DUR = 0.3;
    this.RAY_RADIUS = 52;
    this.RAY_DAMAGE = 8;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    for (const r of this._rays) r.life -= dt;
    this._rays = this._rays.filter((r) => r.life > 0);

    if (!this.arena) return;

    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = this.SPAWN_INTERVAL;
      this._spawnRays();
    }
  }

  _spawnRays() {
    const { left, right, top, bottom } = this.arena;
    const m = 25,
      w = right - left - m * 2,
      h = bottom - top - m * 2;
    if (w <= 0 || h <= 0) return;
    for (let i = 0; i < this.RAY_COUNT; i++) {
      this._rays.push({
        x: left + m + Math.random() * w,
        y: top + m + Math.random() * h,
        life: this.WARN_DUR + this.STRIKE_DUR,
        struck: false,
      });
    }
  }

  // ── Enemy interactions ───────────────────────────────────────────────────────

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;

    const strike = this.STRIKE_DUR;
    for (const r of this._rays) {
      if (r.life > strike || r.struck) continue;
      const dx = enemy.x - r.x,
        dy = enemy.y - r.y;
      if (dx * dx + dy * dy < (this.RAY_RADIUS + enemy.radius) ** 2) {
        this._dealDmg(enemy, this.RAY_DAMAGE);
        sfx.angelStrike();
        r.struck = true;
      }
    }
  }

  clearState() {
    this._rays = [];
    this._spawnTimer = 0;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    const strikeDur = this.STRIKE_DUR;
    for (const r of this._rays) {
      const isStrike = r.life <= strikeDur;
      if (!isStrike) {
        const prog = 1 - (r.life - strikeDur) / this.WARN_DUR;
        const alpha = 0.15 + 0.5 * prog;
        ctx.save();
        ctx.strokeStyle = `rgba(255,240,160,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(r.x, r.y, this.RAY_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(255,240,160,${alpha * 0.25})`;
        ctx.fillRect(r.x - 3, r.y - 250, 6, 250);
        ctx.restore();
      } else {
        const prog = r.life / strikeDur;
        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, this.RAY_RADIUS + 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,200,${0.18 * prog})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(r.x, r.y, this.RAY_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,180,${0.75 * prog})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,240,100,${prog})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,220,${0.6 * prog})`;
        ctx.fillRect(r.x - 5, r.y - 220, 10, 220);
        ctx.restore();
      }
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;
    const frac = 1 - this._spawnTimer / this.SPAWN_INTERVAL;
    if (frac > 0.03) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,230,100,${0.4 + 0.5 * frac})`;
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
      if (frac > 0.88) {
        const pulse = Math.abs(Math.sin(Date.now() / 90));
        ctx.beginPath();
        ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,230,100,${0.35 * pulse})`;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  static meta = {
    id: "angel",
    name: "Ángel",
    description:
      "Invoca 3 rayos de luz simultáneos que dañan al enemigo si está en la zona.",
    color: "#F9E4B7",
    icon: "✦",
    dmgRating: 3,
  };
}
