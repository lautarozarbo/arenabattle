import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

// ── Geometry helpers ─────────────────────────────────────────────────────────

function shoelaceArea(pts) {
  let a = 0;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i++)
    a += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
  return Math.abs(a) * 0.5;
}

function pointInPoly(px, py, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y,
      xj = poly[j].x,
      yj = poly[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// Global clockwise position 0–4 starting from top-left corner
function boundaryPos(p, arena) {
  const { left, right, top, bottom } = arena;
  const w = right - left,
    h = bottom - top,
    eps = 4;
  if (Math.abs(p.y - top) < eps) return (p.x - left) / w;
  if (Math.abs(p.x - right) < eps) return 1 + (p.y - top) / h;
  if (Math.abs(p.y - bottom) < eps) return 2 + (right - p.x) / w;
  if (Math.abs(p.x - left) < eps) return 3 + (bottom - p.y) / h;
  return 0;
}

// Arena corners encountered going CW from fromPos to toPos
function cornersCW(fromPos, toPos, arena) {
  const to = toPos <= fromPos ? toPos + 4 : toPos;
  return [
    { pos: 1, x: arena.right, y: arena.top },
    { pos: 2, x: arena.right, y: arena.bottom },
    { pos: 3, x: arena.left, y: arena.bottom },
    { pos: 4, x: arena.left, y: arena.top },
  ]
    .map((c) => ({ ...c, ap: c.pos <= fromPos ? c.pos + 4 : c.pos }))
    .filter((c) => c.ap > fromPos && c.ap < to)
    .sort((a, b) => a.ap - b.ap)
    .map((c) => ({ x: c.x, y: c.y }));
}

// Returns the smaller polygon formed by the straight line A→B and the arena boundary
function buildZonePoly(A, B, arena) {
  const posA = boundaryPos(A, arena);
  const posB = boundaryPos(B, arena);

  // Two closure options: CW from B→A, or CCW from B→A (= CW from A→B reversed)
  const poly1 = [A, B, ...cornersCW(posB, posA, arena)];
  const poly2 = [A, B, ...cornersCW(posA, posB, arena).reverse()];

  return shoelaceArea(poly1) <= shoelaceArea(poly2) ? poly1 : poly2;
}

// ── Power ────────────────────────────────────────────────────────────────────

export class TerritoryPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null; // injected by game.js after circle creation
    this._state = "idle"; // 'idle' | 'drawing'
    this._startPt = null; // wall bounce point 1
    this._zones = []; // [{ poly, timer, maxTimer, dmgAccum, enemyInside }]
    this.MAX_ZONES = 3;
    this.DURATION = 4;
    this.DPS = 3;
    this.TICK = 0.5; // seconds between damage ticks — change only this value
  }

  update(dt) {
    for (const z of this._zones) z.timer -= dt;
    this._zones = this._zones.filter((z) => z.timer > 0);
  }

  onObstacleBounce() {} // obstacles don't count for territory — walls only

  onWallBounce(wallNormal) {
    if (!this.arena) return;

    // Project circle center onto the actual wall surface using the bounce normal
    const { left, right, top, bottom } = this.arena;
    let wx = this.owner.x,
      wy = this.owner.y;
    if (wallNormal.x === 1) wx = left;
    if (wallNormal.x === -1) wx = right;
    if (wallNormal.y === 1) wy = top;
    if (wallNormal.y === -1) wy = bottom;
    const wallPt = { x: wx, y: wy };

    if (this._state === "idle") {
      // Only start drawing if there's room for another zone
      if (this._zones.length < this.MAX_ZONES) {
        this._startPt = wallPt;
        this._state = "drawing";
      }
    } else {
      // Complete the zone
      const poly = buildZonePoly(this._startPt, wallPt, this.arena);
      this._zones.push({
        poly,
        timer: this.DURATION,
        maxTimer: this.DURATION,
        dmgAccum: 0,
        enemyInside: false,
      });
      this._startPt = null;
      this._state = "idle";
      sfx.territoryPlace();
    }
  }

  onEnemyFrame(enemy, dt) {
    if (this._zones.length === 0) return;

    const comp = enemy.power?._comp?.isAlive ? enemy.power._comp : null;

    for (const z of this._zones) {
      // Main enemy
      if (enemy.isAlive) {
        const inside = pointInPoly(enemy.x, enemy.y, z.poly);
        if (inside) {
          if (!z.enemyInside) z.dmgAccum = this.TICK;
          z.dmgAccum += dt;
          if (z.dmgAccum >= this.TICK) {
            this._dealDmg(enemy, this.DPS);
            z.dmgAccum -= this.TICK;
          }
        } else {
          z.dmgAccum = 0;
        }
        z.enemyInside = inside;
      }

      // DUO companion
      if (comp) {
        if (!z.compDmgAccum) z.compDmgAccum = 0;
        const inside = pointInPoly(comp.x, comp.y, z.poly);
        if (inside) {
          if (!z.compInside) z.compDmgAccum = this.TICK;
          z.compDmgAccum += dt;
          if (z.compDmgAccum >= this.TICK) {
            this._dealDmg(comp, this.DPS);
            z.compDmgAccum -= this.TICK;
          }
        } else {
          z.compDmgAccum = 0;
        }
        z.compInside = inside;
      }
    }
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    // While drawing: straight line from wall anchor to current circle center
    if (this._state === "drawing" && this._startPt) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this._startPt.x, this._startPt.y);
      ctx.lineTo(this.owner.x, this.owner.y);
      ctx.strokeStyle = "rgba(230,126,34,0.65)";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Anchor dot at the wall
      ctx.beginPath();
      ctx.arc(this._startPt.x, this._startPt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(230,126,34,0.9)";
      ctx.fill();
      ctx.restore();
    }

    // All active zones: filled polygon that fades as timer runs out
    for (const { poly, timer, maxTimer } of this._zones) {
      const a = timer / maxTimer; // 1 → 0
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fillStyle = `rgba(230,126,34,${0.22 * a})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(230,126,34,${0.72 * a})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  clearState() {
    this._zones = [];
    this._startPt = null;
    this._state = "idle";
  }

  static meta = {
    id: "territory",
    name: "Territorio",
    description: "Rebota dos paredes para marcar una zona de daño.",
    color: "#E67E22",
    icon: "◈",
    dmgRating: 2,
  };
}
