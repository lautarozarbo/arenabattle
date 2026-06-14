import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class AssassinPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._angle = 0;
    this._hitCooldown = 0;

    this.ORBIT_RADIUS = owner.radius + 20;
    this.BLADE_LEN = 28;
    this.BLADE_WIDTH = 4.5;
    this.ROT_SPEED = 5.0; // rad/s
    this.HIT_RADIUS = 8;
    this.HIT_DAMAGE = 5;
    this.HIT_CD = 0.28;
    this.BLEED_DURATION = 3.0;
    this.BLEED_DPS = 3;
    this._compHitCooldown = 0;
    this._compBleedTimer = 0;
    this._compBleedDPS = 0;
    this._compBleedAccum = 0;
  }

  update(dt) {
    this._angle += this.ROT_SPEED * dt;
    if (this._hitCooldown > 0) this._hitCooldown -= dt;
    if (this._compHitCooldown > 0) this._compHitCooldown -= dt;
    if (this._compBleedTimer > 0) this._compBleedTimer -= dt;
  }

  _tipPos() {
    const dist = this.ORBIT_RADIUS + this.BLADE_LEN * 0.62;
    return {
      x: this.owner.x + Math.cos(this._angle) * dist,
      y: this.owner.y + Math.sin(this._angle) * dist,
    };
  }

  onEnemyFrame(enemy, dt) {
    const tip = this._tipPos();
    const hr = this.HIT_RADIUS;

    if (enemy.isAlive && this._hitCooldown <= 0) {
      const dx = enemy.x - tip.x,
        dy = enemy.y - tip.y;
      if (dx * dx + dy * dy < (enemy.radius + hr) ** 2) {
        this._dealDmg(enemy, this.HIT_DAMAGE);
        enemy.applyBleed(this.BLEED_DURATION, this.BLEED_DPS);
        sfx.assassinHit();
        this._hitCooldown = this.HIT_CD;
      }
    }

    // DUO companion
    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      if (this._compHitCooldown <= 0) {
        const dx = comp.x - tip.x,
          dy = comp.y - tip.y;
        if (dx * dx + dy * dy < (comp.radius + hr) ** 2) {
          this._dealDmg(comp, this.HIT_DAMAGE);
          this._compBleedTimer = this.BLEED_DURATION;
          this._compBleedDPS = this.BLEED_DPS;
          this._compBleedAccum = 0;
          sfx.assassinHit();
          this._compHitCooldown = this.HIT_CD;
        }
      }

      // Companion bleed damage tick
      if (this._compBleedTimer > 0) {
        this._compBleedAccum += dt;
        if (this._compBleedAccum >= 1) {
          this._dealDmg(comp, this._compBleedDPS);
          sfx.bleedTick();
          this._compBleedAccum -= 1;
        }
      }
    }
  }

  getHitDamage() {
    return 1;
  }

  renderAbove(ctx) {
    // Faint orbit ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.owner.x, this.owner.y, this.ORBIT_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180,160,220,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    this._drawDagger(ctx);
  }

  _drawDagger(ctx) {
    const a = this._angle;
    const or = this.ORBIT_RADIUS;
    const bl = this.BLADE_LEN;
    const bw = this.BLADE_WIDTH;
    const ox = this.owner.x,
      oy = this.owner.y;

    // Dagger aligned radially (tip points away from owner)
    const cosA = Math.cos(a),
      sinA = Math.sin(a);
    const tipX = ox + cosA * (or + bl * 0.62);
    const tipY = oy + sinA * (or + bl * 0.62);
    const baseX = ox + cosA * (or - bl * 0.38);
    const baseY = oy + sinA * (or - bl * 0.38);
    // Blade width perpendicular
    const px = -sinA * bw,
      py = cosA * bw;

    ctx.save();
    // Blade
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX + px, baseY + py);
    ctx.lineTo(baseX - px, baseY - py);
    ctx.closePath();
    ctx.fillStyle = "rgba(215,220,245,0.96)";
    ctx.strokeStyle = "rgba(100,90,180,0.9)";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    // Crossguard perpendicular to blade
    const gLen = 7;
    ctx.beginPath();
    ctx.moveTo(baseX + cosA * gLen, baseY + sinA * gLen);
    ctx.lineTo(baseX - cosA * gLen, baseY - sinA * gLen);
    ctx.strokeStyle = "rgba(200,160,50,0.88)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Handle (opposite direction of tip)
    const handleLen = 9;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(
      ox + cosA * (or - bl * 0.38 - handleLen),
      oy + sinA * (or - bl * 0.38 - handleLen),
    );
    ctx.strokeStyle = "rgba(130,80,35,0.9)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  static meta = {
    id: "assassin",
    name: "Asesino",
    description:
      "Una daga orbita alrededor y causa daño al tocar al enemigo además de provocar sangrado.",
    color: "#4A3E6A",
    icon: "†",
    dmgRating: 3,
  };
}
