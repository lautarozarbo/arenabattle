import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class SpikePower extends BasePower {
  constructor(owner) {
    super(owner);
    this.spikes = []; // { wx, wy, nx, ny, id }
    this.MAX = 12;
    this._nextId = 0;
    this._hit = new Set(); // IDs currently in contact (edge-trigger)
    this._compHit = new Set(); // same for DUO companion

    this.TIP_LEN = 14; // px the spike protrudes inward from wall
    this.HIT_RADIUS = 8; // extra hitbox radius around tip
    this.HIT_DAMAGE = 2;
    this.SLOW_DURATION = 2.5;
    this.POISON_DURATION = 2.5;
    this.SLOW_FACTOR = 0.45;
    this.POISON_DPS = 2;
  }

  onWallBounce(wallNormal) {
    const { x, y, radius } = this.owner;
    // Normalise (handles rare corner case where both x and y are set)
    const len = Math.sqrt(wallNormal.x ** 2 + wallNormal.y ** 2) || 1;
    const nx = wallNormal.x / len;
    const ny = wallNormal.y / len;
    // Anchor on wall surface
    const wx = x - nx * radius;
    const wy = y - ny * radius;
    this.spikes.push({ wx, wy, nx, ny, id: this._nextId++ });
    if (this.spikes.length > this.MAX) this.spikes.shift();
    sfx.spikePlace();
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive || this.spikes.length === 0) return;

    const nowHit = new Set();
    for (const s of this.spikes) {
      // Tip = wall surface + inward direction * TIP_LEN
      const tx = s.wx + s.nx * this.TIP_LEN;
      const ty = s.wy + s.ny * this.TIP_LEN;
      const dx = enemy.x - tx;
      const dy = enemy.y - ty;
      if (dx * dx + dy * dy < (enemy.radius + this.HIT_RADIUS) ** 2) {
        nowHit.add(s.id);
        if (!this._hit.has(s.id)) {
          this._dealDmg(enemy, this.HIT_DAMAGE);
          sfx.spikeHit();
          enemy.applyVenom(
            this.SLOW_DURATION,
            this.POISON_DURATION,
            this.POISON_DPS,
            this.SLOW_FACTOR,
          );
        }
      }
    }
    this._hit = nowHit;

    // DUO companion check (damage only — companion can't receive venom/slow)
    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      const compNow = new Set();
      for (const s of this.spikes) {
        const tx = s.wx + s.nx * this.TIP_LEN,
          ty = s.wy + s.ny * this.TIP_LEN;
        const dx = comp.x - tx,
          dy = comp.y - ty;
        if (dx * dx + dy * dy < (comp.radius + this.HIT_RADIUS) ** 2) {
          compNow.add(s.id);
          if (!this._compHit.has(s.id)) {
            this._dealDmg(comp, this.HIT_DAMAGE);
            sfx.spikeHit();
          }
        }
      }
      this._compHit = compNow;
    } else {
      this._compHit = new Set();
    }
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    for (const s of this.spikes) this._drawSpike(ctx, s);
  }

  _drawSpike(ctx, s) {
    const { wx, wy, nx, ny } = s;
    const tipX = wx + nx * this.TIP_LEN;
    const tipY = wy + ny * this.TIP_LEN;
    const halfBase = 8;
    // Perpendicular to spike direction
    const px = -ny;
    const py = nx;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(wx + px * halfBase, wy + py * halfBase);
    ctx.lineTo(wx - px * halfBase, wy - py * halfBase);
    ctx.closePath();
    ctx.fillStyle = "rgba(46,204,113,0.88)";
    ctx.strokeStyle = "rgba(39,174,96,1)";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  clearState() {
    this.spikes = [];
    this._hit = new Set();
    this._compHit = new Set();
  }

  static meta = {
    id: "spike",
    name: "Púas",
    description:
      "Deja pinchos al rebotar. Golpear uno causa daño, ralentiza y envenena.",
    color: "#2ECC71",
    icon: "▲",
    dmgRating: 3,
  };
}
