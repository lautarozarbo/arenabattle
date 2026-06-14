import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const RING_CONFIGS = [
  { delay: 0, maxR: 100, dmg: 10 },
  { delay: 0.35, maxR: 185, dmg: 5 },
  { delay: 0.7, maxR: 270, dmg: 3 },
];

export class TerremotoPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._rings = []; // active expanding rings { r, maxR, dmg, hit, compHit }
    this._pending = []; // waiting for delay { delay, maxR, dmg }
    this._timer = 4.5; // first quake after 4.5s
    this.INTERVAL = 7.0;
    this.RING_SPEED = 195; // px/s
  }

  update(dt) {
    this._timer -= dt;
    if (this._timer <= 0) {
      this._timer = this.INTERVAL;
      this._spawnQuake();
    }

    // Release delayed rings when their delay expires
    for (const p of this._pending) p.delay -= dt;
    for (const p of this._pending.filter((p) => p.delay <= 0)) {
      this._rings.push({
        r: 0,
        maxR: p.maxR,
        dmg: p.dmg,
        hit: false,
        compHit: false,
      });
    }
    this._pending = this._pending.filter((p) => p.delay > 0);

    // Expand rings and cull finished ones
    for (const ring of this._rings) ring.r += this.RING_SPEED * dt;
    this._rings = this._rings.filter((ring) => ring.r < ring.maxR + 10);
  }

  _spawnQuake() {
    sfx.quake();
    for (const cfg of RING_CONFIGS) {
      this._pending.push({ ...cfg });
    }
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;
    const ox = this.owner.x,
      oy = this.owner.y;

    for (const ring of this._rings) {
      if (!ring.hit) {
        const dx = enemy.x - ox,
          dy = enemy.y - oy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (ring.r >= dist - enemy.radius) {
          this._dealDmg(enemy, ring.dmg);
          sfx.volcanoHit();
          ring.hit = true;
        }
      }

      const comp = enemy.power?._comp;
      if (comp?.isAlive && !ring.compHit) {
        const cdx = comp.x - ox,
          cdy = comp.y - oy;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (ring.r >= cdist - comp.radius) {
          this._dealDmg(comp, ring.dmg);
          ring.compHit = true;
        }
      }
    }
  }

  clearState() {
    this._rings = [];
    this._pending = [];
    this._timer = 0;
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;

    for (const ring of this._rings) {
      const frac = Math.max(0, 1 - ring.r / ring.maxR);
      if (frac <= 0) continue;

      // Color shifts from orange (inner/high dmg) to dusty yellow (outer/low dmg)
      const dmgFrac = ring.dmg / 20; // 20 is max dmg
      const r = Math.round(210 + 45 * (1 - dmgFrac));
      const g = Math.round(100 + 60 * (1 - dmgFrac));
      const b = 20;

      ctx.save();
      // Outer glow
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.18 * frac})`;
      ctx.lineWidth = 20 * frac + 4;
      ctx.beginPath();
      ctx.arc(x, y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      // Sharp edge
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.65 * frac})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Cooldown arc on owner
    const frac = this._timer <= 0 ? 1 : 1 - this._timer / this.INTERVAL;
    if (frac > 0.03) {
      ctx.save();
      ctx.strokeStyle = `rgba(210,120,30,${0.4 + 0.5 * frac})`;
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
      if (this._timer <= 0) {
        const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 180));
        ctx.strokeStyle = `rgba(255,160,50,${0.8 * pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  static meta = {
    id: "earthquake",
    name: "Terremoto",
    description:
      "Cada ciertos segundos lanza tres ondas sísmicas que se expanden. Cada anillo hace menos daño que el anterior.",
    color: "#CA6F1E",
    icon: "〰",
    dmgRating: 2,
  };
}
