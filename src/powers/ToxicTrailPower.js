import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class ToxicTrailPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._trail = []; // { x, y, life }
    this._lastDropX = null;
    this._lastDropY = null;
    this._enemyAccum = 0;
    this._compAccum = 0;

    this.DROP_DIST = 12; // px between trail deposits
    this.TRAIL_LIFE = 2; // seconds each segment lasts
    this.TICK_INTERVAL = 0.3;
    this.TICK_DAMAGE = 2; // 2 DPS (1 dmg every 0.5s)
  }

  _trailR() {
    return this.owner.radius * 1.35;
  }

  update(dt) {
    const { x, y } = this.owner;

    if (this._lastDropX === null) {
      this._lastDropX = x;
      this._lastDropY = y;
    }

    const dx = x - this._lastDropX;
    const dy = y - this._lastDropY;
    if (dx * dx + dy * dy >= this.DROP_DIST * this.DROP_DIST) {
      this._trail.push({ x, y, life: this.TRAIL_LIFE * this._zoneDurMult() });
      this._lastDropX = x;
      this._lastDropY = y;
    }

    for (const s of this._trail) s.life -= dt;
    this._trail = this._trail.filter((s) => s.life > 0);
  }

  _overlapsTrail(cx, cy, cr) {
    const threshold = (this._trailR() + cr) ** 2;
    for (const s of this._trail) {
      const dx = cx - s.x,
        dy = cy - s.y;
      if (dx * dx + dy * dy < threshold) return true;
    }
    return false;
  }

  onEnemyFrame(enemy, dt) {
    if (!enemy.isAlive) return;

    if (this._overlapsTrail(enemy.x, enemy.y, enemy.radius)) {
      this._enemyAccum += dt;
      if (this._enemyAccum >= this.TICK_INTERVAL) {
        this._dealDmg(enemy, this.TICK_DAMAGE);
        sfx.venomTick();
        this._enemyAccum -= this.TICK_INTERVAL;
      }
    } else {
      this._enemyAccum = 0;
    }

    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      if (this._overlapsTrail(comp.x, comp.y, comp.radius)) {
        this._compAccum += dt;
        if (this._compAccum >= this.TICK_INTERVAL) {
          this._dealDmg(comp, this.TICK_DAMAGE);
          sfx.venomTick();
          this._compAccum -= this.TICK_INTERVAL;
        }
      } else {
        this._compAccum = 0;
      }
    }
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    if (this._trail.length === 0) return;
    const r = this._trailR();
    for (const s of this._trail) {
      const fade = s.life / this.TRAIL_LIFE;
      ctx.save();
      // Glow halo
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40,200,80,${0.08 * fade})`;
      ctx.fill();
      // Main puddle
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(50,190,70,${0.22 * fade})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(80,255,100,${0.5 * fade})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 210));
    ctx.save();
    ctx.strokeStyle = `rgba(80,255,100,${0.6 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  clearState() {
    this._trail = [];
    this._lastDropX = null;
    this._lastDropY = null;
  }

  static meta = {
    id: "toxictrail",
    name: "Tóxico",
    description:
      "Deja una estela venenosa mientras se mueve. Los enemigos reciben daño dentro de ella.",
    color: "#27AE60",
    icon: "☣",
    dmgRating: 2,
  };
}
