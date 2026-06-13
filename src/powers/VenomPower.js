import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class VenomPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._cooldown = 0;
    this._angle = 0;

    this.COOLDOWN = 1;
    this.SLOW_DUR = 3;
    this.POISON_DUR = 4;
    this.POISON_DPS = 2;
    this.SLOW_FACTOR = 0.45;
  }

  update(dt) {
    if (this._cooldown > 0) this._cooldown -= dt;
    this._angle += dt * 2.2;
  }

  onCollide(enemy) {
    if (!enemy.isAlive || this._cooldown > 0) return;
    enemy.applyVenom(
      this.SLOW_DUR,
      this.POISON_DUR,
      this.POISON_DPS,
      this.SLOW_FACTOR,
    );
    this._cooldown = this.COOLDOWN;
    sfx.venomApply();
  }

  getHitDamage() {
    return 1;
  }

  renderAbove(ctx) {
    const { x: ox, y: oy, radius: r } = this.owner;
    const ready = this._cooldown <= 0;
    const frac = ready ? 1 : 1 - this._cooldown / this.COOLDOWN;

    if (!ready) {
      // Recharge arc
      ctx.save();
      ctx.strokeStyle = `rgba(46,204,113,${0.25 + 0.55 * frac})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox, oy, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Fully charged: pulsing ring + orbiting drops
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 230));
    ctx.save();
    ctx.strokeStyle = `rgba(46,204,113,${0.75 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ox, oy, r + 6, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + this._angle;
      ctx.beginPath();
      ctx.arc(
        ox + Math.cos(ang) * (r + 6),
        oy + Math.sin(ang) * (r + 6),
        2.5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(46,204,113,${0.9 * pulse})`;
      ctx.fill();
    }
    ctx.restore();
  }

  static meta = {
    id: "venom",
    name: "Veneno",
    description:
      "Al chocar con el enemigo lo envenena: lo enlentece y le quita vida por segundo.",
    color: "#27AE60",
    icon: "☠",
    dmgRating: 2,
  };
}
