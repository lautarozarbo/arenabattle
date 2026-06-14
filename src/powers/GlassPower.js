import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class GlassPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._shards = []; // { x, y, id, delay }
    this._nextId = 0;

    this.MAX = 18;
    this.SHARD_RADIUS = 9;
    this.HIT_DAMAGE = 3;
    this.COLLIDE_DELAY = 0.25; // wall-bounce shards are instant; collision shards wait
  }

  update(dt) {
    for (const s of this._shards) {
      if (s.delay > 0) s.delay -= dt;
    }
  }

  onWallBounce(wallNormal) {
    const { x, y, radius } = this.owner;
    const len = Math.sqrt(wallNormal.x ** 2 + wallNormal.y ** 2) || 1;
    const nx = wallNormal.x / len,
      ny = wallNormal.y / len;
    // Project onto wall surface
    this._addShard(x - nx * radius, y - ny * radius, 0);
  }

  onCollide(enemy) {
    // Place at midpoint with a short delay so the circles separate first
    this._addShard(
      (this.owner.x + enemy.x) * 0.5,
      (this.owner.y + enemy.y) * 0.5,
      this.COLLIDE_DELAY,
    );
  }

  _addShard(x, y, delay) {
    this._shards.push({ x, y, id: this._nextId++, delay });
    if (this._shards.length > this.MAX) this._shards.shift();
    sfx.glassPlace();
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive || this._shards.length === 0) return;
    const hitR2 = (enemy.radius + this.SHARD_RADIUS) ** 2;
    const toRemove = new Set();

    for (const s of this._shards) {
      if (s.delay > 0) continue;
      const dx = enemy.x - s.x,
        dy = enemy.y - s.y;
      if (dx * dx + dy * dy < hitR2) {
        this._dealDmg(enemy, this.HIT_DAMAGE);
        sfx.glassBreak();
        toRemove.add(s.id);
      }
    }

    // Also check DUO companion if present
    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      for (const s of this._shards) {
        if (s.delay > 0 || toRemove.has(s.id)) continue;
        const dx = comp.x - s.x,
          dy = comp.y - s.y;
        if (dx * dx + dy * dy < hitR2) {
          enemy.power._compTakeDamage(this.HIT_DAMAGE);
          sfx.glassBreak();
          toRemove.add(s.id);
        }
      }
    }

    if (toRemove.size > 0) {
      this._shards = this._shards.filter((s) => !toRemove.has(s.id));
    }
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    for (const s of this._shards) this._drawShard(ctx, s);
  }

  _drawShard(ctx, { x, y, delay }) {
    const alpha = delay > 0 ? 0.3 : 1;
    const h = this.SHARD_RADIUS,
      hw = this.SHARD_RADIUS * 0.52;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + h * 0.65);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fillStyle = "rgba(185,230,255,0.72)";
    ctx.strokeStyle = "rgba(140,205,255,0.95)";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  clearState() {
    this._shards = [];
  }

  getNetState() { return { shards: this._shards.map(s => ({ ...s })) }; }
  applyNetState(s) { this._shards = s.shards; }

  static meta = {
    id: "glass",
    name: "Vidrio",
    description:
      "Deja fragmentos al rebotar en pared o enemigo. Tocarlos causa daño y los destruye.",
    color: "#B0E0FF",
    icon: "◇",
    dmgRating: 2,
  };
}
