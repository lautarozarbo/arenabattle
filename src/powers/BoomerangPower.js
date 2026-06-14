import { BasePower } from "./BasePower.js";

const THROW_CD = 1.1; // s between throws
const SPEED_OUT = 500; // px/s going out
const SPEED_IN = 600; // px/s coming back
const MAX_DIST = 300; // px before reversing
const BOOM_R = 35; // collision radius
const OUT_DMG = 4; // damage going out
const RETURN_DMG = 10; // damage on return

export class BoomerangPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._throwCd = THROW_CD * 0.4;
    this._bm = null; // { x, y, vx, vy, returning, outHit, retHit, spin }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    this._throwCd -= dt;
    if (!this._bm) return;

    const b = this._bm;
    b.spin += 9 * dt;

    if (!b.returning) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const dx = b.x - this.owner.x;
      const dy = b.y - this.owner.y;
      if (dx * dx + dy * dy >= MAX_DIST * MAX_DIST) {
        b.returning = true;
      }
    } else {
      const dx = this.owner.x - b.x;
      const dy = this.owner.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.owner.radius + 6) {
        this._bm = null;
        this._throwCd = THROW_CD; // reset CD after catching
        return;
      }
      b.x += (dx / dist) * SPEED_IN * dt;
      b.y += (dy / dist) * SPEED_IN * dt;
    }
  }

  // ── Enemy interactions ───────────────────────────────────────────────────────

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;

    if (this._throwCd <= 0 && !this._bm) {
      this._throwCd = THROW_CD;
      this._throw(enemy);
    }

    if (!this._bm) return;
    const b = this._bm;

    const dx = enemy.x - b.x;
    const dy = enemy.y - b.y;
    const d2 = dx * dx + dy * dy;
    const r2 = (BOOM_R + enemy.radius) ** 2;

    if (!b.returning && !b.outHit && d2 < r2) {
      enemy.takeDamage(OUT_DMG);
      b.outHit = true;
    } else if (b.returning && !b.retHit && d2 < r2) {
      enemy.takeDamage(RETURN_DMG);
      b.retHit = true;
    }
  }

  _throw(enemy) {
    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this._bm = {
      x: this.owner.x,
      y: this.owner.y,
      vx: (dx / len) * SPEED_OUT,
      vy: (dy / len) * SPEED_OUT,
      returning: false,
      outHit: false,
      retHit: false,
      spin: Math.atan2(dy, dx),
    };
  }

  clearState() {
    this._throwCd = THROW_CD * 0.4;
    this._bm = null;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  renderAbove(ctx) {
    if (!this._bm) {
      const frac = Math.min(1, 1 - this._throwCd / THROW_CD);
      if (frac > 0.04) {
        ctx.save();
        ctx.strokeStyle = `rgba(204,136,34,${0.3 + 0.6 * frac})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(
          this.owner.x,
          this.owner.y,
          this.owner.radius + 7,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * frac,
        );
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    const b = this._bm;
    this._drawBoomerang(ctx, b.x, b.y, b.spin, b.returning);
  }

  _drawBoomerang(ctx, x, y, spin, returning) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);

    if (returning) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = "rgba(255,210,50,0.9)";
    }

    ctx.strokeStyle = returning ? "#FFD700" : "#CC8822";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";

    // Wing 1
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(-9, -9, -23, -4);
    ctx.stroke();

    // Wing 2
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(9, -9, 23, -4);
    ctx.stroke();

    ctx.restore();
  }

  static meta = {
    id: "boomerang",
    name: "Boomerang",
    description:
      "Lanza un boomerang que va y vuelve al lanzador. Hace más daño a la vuelta.",
    color: "#CC8822",
    icon: "↩",
    dmgRating: 2,
  };
}
