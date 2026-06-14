import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax,
    dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export class LaserPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null; // injected by game.js
    this.lasers = []; // { ax, ay, bx, by, id }
    this.MAX = 3;
    this._nextId = 0;
    this._state = "idle"; // 'idle' | 'drawing'
    this._startPt = null;
    this._active = new Set(); // laser IDs enemy is currently touching (edge-trigger)
    this._compActive = new Set(); // same for DUO companion
    this.HIT_DAMAGE = 2;
  }

  onWallBounce(wallNormal) {
    // Project circle center onto the actual wall surface
    let wx = this.owner.x;
    let wy = this.owner.y;
    if (this.arena) {
      const { left, right, top, bottom } = this.arena;
      if (wallNormal.x === 1) wx = left;
      if (wallNormal.x === -1) wx = right;
      if (wallNormal.y === 1) wy = top;
      if (wallNormal.y === -1) wy = bottom;
    } else {
      wx -= wallNormal.x * this.owner.radius;
      wy -= wallNormal.y * this.owner.radius;
    }

    if (this._state === "idle") {
      this._startPt = { x: wx, y: wy };
      this._state = "drawing";
    } else {
      // Second bounce — place the laser
      this.lasers.push({
        ax: this._startPt.x,
        ay: this._startPt.y,
        bx: wx,
        by: wy,
        id: this._nextId++,
      });
      if (this.lasers.length > this.MAX) this.lasers.shift();
      this._startPt = null;
      this._state = "idle";
      sfx.laserPlace();
    }
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive || this.lasers.length === 0) return;

    // Skip while circles overlap (collision system handles that frame)
    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    if (dx * dx + dy * dy < (this.owner.radius + enemy.radius) ** 2) {
      this._active.clear();
      return;
    }

    const nowActive = new Set();
    for (const l of this.lasers) {
      const dist = distToSegment(enemy.x, enemy.y, l.ax, l.ay, l.bx, l.by);
      if (dist < enemy.radius) {
        nowActive.add(l.id);
        if (!this._active.has(l.id)) {
          this._dealDmg(enemy, this.HIT_DAMAGE);
          sfx.laserHit();
        }
      }
    }
    this._active = nowActive;

    // DUO companion check
    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      const compNow = new Set();
      for (const l of this.lasers) {
        if (
          distToSegment(comp.x, comp.y, l.ax, l.ay, l.bx, l.by) < comp.radius
        ) {
          compNow.add(l.id);
          if (!this._compActive.has(l.id)) {
            this._dealDmg(comp, this.HIT_DAMAGE);
            sfx.laserHit();
          }
        }
      }
      this._compActive = compNow;
    } else {
      this._compActive = new Set();
    }
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    // Drawing phase: dashed preview line from wall anchor to circle
    if (this._state === "drawing" && this._startPt) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this._startPt.x, this._startPt.y);
      ctx.lineTo(this.owner.x, this.owner.y);
      ctx.strokeStyle = "rgba(231,76,60,0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Anchor dot
      ctx.beginPath();
      ctx.arc(this._startPt.x, this._startPt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(231,76,60,0.9)";
      ctx.fill();
      ctx.restore();
    }

    // Active lasers
    for (const l of this.lasers) this._drawLaser(ctx, l);
  }

  _drawLaser(ctx, l) {
    ctx.save();
    ctx.lineCap = "round";

    // Soft outer glow
    ctx.beginPath();
    ctx.moveTo(l.ax, l.ay);
    ctx.lineTo(l.bx, l.by);
    ctx.strokeStyle = "rgba(231,76,60,0.22)";
    ctx.lineWidth = 10;
    ctx.stroke();

    // Medium halo
    ctx.beginPath();
    ctx.moveTo(l.ax, l.ay);
    ctx.lineTo(l.bx, l.by);
    ctx.strokeStyle = "rgba(231,76,60,0.45)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Bright core
    ctx.beginPath();
    ctx.moveTo(l.ax, l.ay);
    ctx.lineTo(l.bx, l.by);
    ctx.strokeStyle = "rgba(255,130,110,0.97)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wall anchor dots
    for (const [ex, ey] of [
      [l.ax, l.ay],
      [l.bx, l.by],
    ]) {
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,130,110,0.95)";
      ctx.fill();
    }

    ctx.restore();
  }

  clearState() {
    this.lasers = [];
    this._startPt = null;
    this._state = "idle";
    this._active = new Set();
    this._compActive = new Set();
  }

  static meta = {
    id: "laser",
    name: "Láser",
    description: "Rebota dos paredes para fijar un láser. Cruzarlo quita vida.",
    color: "#E74C3C",
    icon: "╌",
    dmgRating: 3,
  };
}
