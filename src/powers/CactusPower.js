import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const SPIKES = 10;
const SPIKE_LEN = 10;

export class CactusPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._cacti = []; // { x, y, life, hitCooldown, compHitCooldown }
    this._spawnTimer = 2.5; // first spawn faster

    this.SPAWN_INTERVAL = 4.5;
    this.CACTUS_COUNT = 3;
    this.CACTUS_RADIUS = 18;
    this.CACTUS_LIFE = 3.5;
    this.HIT_DAMAGE = 4;
    this.HIT_CD = 0.4;
  }

  update(dt) {
    if (!this.arena) return;
    this._spawnTimer += dt;
    if (this._spawnTimer >= this._cd(this.SPAWN_INTERVAL)) {
      this._spawnTimer = 0;
      this._spawnCacti();
    }
    for (const c of this._cacti) {
      c.life -= dt;
      if (c.hitCooldown > 0) c.hitCooldown -= dt;
      if (c.compHitCooldown > 0) c.compHitCooldown -= dt;
    }
    this._cacti = this._cacti.filter((c) => c.life > 0);
  }

  _spawnCacti() {
    const { left, right, top, bottom } = this.arena;
    const r = this.CACTUS_RADIUS;
    const margin = r + SPIKE_LEN + 8;
    const w = right - left - margin * 2;
    const h = bottom - top - margin * 2;
    if (w <= 0 || h <= 0) return;

    for (let i = 0; i < this.CACTUS_COUNT + this._extraProj(); i++) {
      let x,
        y,
        tries = 0;
      do {
        x = left + margin + Math.random() * w;
        y = top + margin + Math.random() * h;
        tries++;
      } while (
        tries < 12 &&
        Math.hypot(x - this.owner.x, y - this.owner.y) <
          r + this.owner.radius + 25
      );
      this._cacti.push({
        x,
        y,
        life: this.CACTUS_LIFE * this._zoneDurMult(),
        hitCooldown: 0,
        compHitCooldown: 0,
      });
    }
    sfx.spikePlace();
  }

  _resolveCircle(circle, c, cooldownKey) {
    const dx = circle.x - c.x;
    const dy = circle.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const minDist = this.CACTUS_RADIUS + circle.radius;
    if (dist >= minDist) return;

    const nx = dx / dist,
      ny = dy / dist;
    // Push out
    circle.x = c.x + nx * (minDist + 1);
    circle.y = c.y + ny * (minDist + 1);
    // Reflect velocity
    const vIn = circle.vx * nx + circle.vy * ny;
    if (vIn < 0) {
      circle.vx -= 2 * vIn * nx;
      circle.vy -= 2 * vIn * ny;
      if (c[cooldownKey] <= 0) {
        this._dealDmg(circle, this.HIT_DAMAGE);
        sfx.spikeHit();
        c[cooldownKey] = this.HIT_CD;
      }
    }
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;
    for (const c of this._cacti) {
      this._resolveCircle(enemy, c, "hitCooldown");
    }
    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      for (const c of this._cacti) {
        this._resolveCircle(comp, c, "compHitCooldown");
      }
    }
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    for (const c of this._cacti) {
      const fade = c.life / this.CACTUS_LIFE;
      ctx.save();

      // Body
      ctx.beginPath();
      ctx.arc(c.x, c.y, this.CACTUS_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,120,34,${0.9 * fade})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(10,60,10,${0.95 * fade})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spikes
      ctx.lineCap = "round";
      for (let i = 0; i < SPIKES; i++) {
        const angle = (i / SPIKES) * Math.PI * 2;
        const cos = Math.cos(angle),
          sin = Math.sin(angle);
        const x1 = c.x + cos * this.CACTUS_RADIUS;
        const y1 = c.y + sin * this.CACTUS_RADIUS;
        const x2 = c.x + cos * (this.CACTUS_RADIUS + SPIKE_LEN);
        const y2 = c.y + sin * (this.CACTUS_RADIUS + SPIKE_LEN);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(20,90,20,${0.95 * fade})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Highlight dot
      ctx.beginPath();
      ctx.arc(
        c.x - this.CACTUS_RADIUS * 0.3,
        c.y - this.CACTUS_RADIUS * 0.3,
        4,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(100,200,100,${0.35 * fade})`;
      ctx.fill();

      ctx.restore();
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;
    const frac = Math.min(1, this._spawnTimer / this.SPAWN_INTERVAL);
    if (frac < 0.03) return;
    ctx.save();
    ctx.strokeStyle = `rgba(50,200,60,${0.4 + 0.55 * frac})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    if (frac > 0.88) {
      const pulse = Math.abs(Math.sin(Date.now() / 90));
      ctx.beginPath();
      ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,255,100,${0.3 * pulse})`;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.restore();
  }

  clearState() {
    this._cacti = [];
    this._spawnTimer = 0;
  }

  static meta = {
    id: "cactus",
    name: "Cactus",
    description:
      "Invoca 3 cactus en la arena. Los enemigos rebotan en ellos y reciben daño.",
    color: "#1E8449",
    icon: "✦",
    dmgRating: 3,
  };
}
