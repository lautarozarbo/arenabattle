import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

// Minimum distance from point P to segment AB
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax,
    dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export class SpiderPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.threads = []; // { wx, wy, id }  — wall anchor is fixed, other end follows owner
    this.MAX = 7;
    this._nextId = 0;
    this._active = new Set(); // IDs of threads enemy is currently inside (for edge-trigger)
    this._compActive = new Set(); // same for DUO companion
  }

  onWallBounce(wallNormal) {
    const { x, y, radius } = this.owner;
    // Anchor on the wall surface rather than circle center
    this.threads.push({
      wx: x - wallNormal.x * radius,
      wy: y - wallNormal.y * radius,
      id: this._nextId++,
    });
    if (this.threads.length > this.MAX) this.threads.shift();
    sfx.spiderWeb();
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive || this.threads.length === 0) return;

    // Skip while circles are in direct contact (collision system handles that)
    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    if (dx * dx + dy * dy < (this.owner.radius + enemy.radius) ** 2) {
      this._active.clear();
      return;
    }

    const nowActive = new Set();
    const { x, y } = this.owner;

    for (const t of this.threads) {
      const dist = distToSegment(enemy.x, enemy.y, t.wx, t.wy, x, y);
      if (dist < enemy.radius) {
        nowActive.add(t.id);
        if (!this._active.has(t.id)) {
          this._dealDmg(enemy, 1); // one-shot per crossing
          sfx.spiderHit();
        }
      }
    }

    this._active = nowActive;

    // DUO companion check
    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      const compNow = new Set();
      for (const t of this.threads) {
        if (distToSegment(comp.x, comp.y, t.wx, t.wy, x, y) < comp.radius) {
          compNow.add(t.id);
          if (!this._compActive.has(t.id)) {
            this._dealDmg(comp, 1);
            sfx.spiderHit();
          }
        }
      }
      this._compActive = compNow;
    } else {
      this._compActive = new Set();
    }
  }

  getHitDamage() {
    return 2;
  }

  renderBelow(ctx) {
    if (this.threads.length === 0) return;
    const { x, y } = this.owner;
    const n = this.threads.length;

    ctx.save();
    this.threads.forEach((t, i) => {
      const age = (i + 1) / n; // 0 = oldest, 1 = newest
      ctx.strokeStyle = `rgba(210,210,230,${0.25 + 0.55 * age})`;
      ctx.lineWidth = 0.8 + age * 0.7;
      ctx.beginPath();
      ctx.moveTo(t.wx, t.wy);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Anchor dot on the wall
      ctx.fillStyle = `rgba(210,210,230,${0.4 + 0.4 * age})`;
      ctx.beginPath();
      ctx.arc(t.wx, t.wy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  clearState() {
    this.threads = [];
    this._active = new Set();
    this._compActive = new Set();
  }

  static meta = {
    id: "spider",
    name: "Araña",
    description: "Teje hilos al rebotar en paredes. Cruzar un hilo quita vida.",
    color: "#9B59B6",
    icon: "✾",
    dmgRating: 2,
  };
}
