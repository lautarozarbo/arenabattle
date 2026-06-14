import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class AuraPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._dmgAccum = 0;
    this._compDmgAccum = 0;

    this.INNER_EXTRA = 60; // px beyond owner radius for inner ring
    this.OUTER_EXTRA = 115; // px beyond owner radius for outer ring
    this.INNER_DMG = 4; // damage per tick inside inner ring
    this.OUTER_DMG = 2; // damage per tick inside outer ring
    this.TICK = 0.3; // seconds between ticks
  }

  _getDmg(cx, cy) {
    const dx = cx - this.owner.x;
    const dy = cy - this.owner.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const innerR = this.owner.radius + this.INNER_EXTRA;
    const outerR = this.owner.radius + this.OUTER_EXTRA;
    if (dist < innerR) return this.INNER_DMG;
    if (dist < outerR) return this.OUTER_DMG;
    return 0;
  }

  onEnemyFrame(enemy, dt) {
    if (!enemy.isAlive) return;

    const dmg = this._getDmg(enemy.x, enemy.y);
    if (dmg > 0) {
      this._dmgAccum += dt;
      if (this._dmgAccum >= this.TICK) {
        this._dealDmg(enemy, dmg);
        sfx.venomTick();
        this._dmgAccum -= this.TICK;
      }
    } else {
      this._dmgAccum = 0;
    }

    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      const cdmg = this._getDmg(comp.x, comp.y);
      if (cdmg > 0) {
        this._compDmgAccum += dt;
        if (this._compDmgAccum >= this.TICK) {
          this._dealDmg(comp, cdmg);
          sfx.venomTick();
          this._compDmgAccum -= this.TICK;
        }
      } else {
        this._compDmgAccum = 0;
      }
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;
    const innerR = radius + this.INNER_EXTRA;
    const outerR = radius + this.OUTER_EXTRA;
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 900));

    // Outer ring fill
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,200,80,${0.04 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,200,80,${0.28 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Inner ring fill
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, innerR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,160,30,${0.07 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,170,40,${0.6 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  static meta = {
    id: "aura",
    name: "Aura",
    description: "Dos anillos de daño alrededor. El interior hace más daño.",
    color: "#F39C12",
    icon: "◎",
    dmgRating: 2,
  };
}
