import { BasePower } from "./BasePower.js";

export class SawPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.angle = 0;
    this.rotSpeed = 3.5; // rad/s
  }

  update(dt) {
    this.angle += this.rotSpeed * dt;
  }

  getHitDamage() {
    return 8;
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;
    const teeth  = 14;
    const toothH = 7;
    const innerR = radius;
    const pintado = this.owner.skinId === 'metalica';

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);

    // Build tooth path (shared by both modes)
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a1   = (i / teeth) * Math.PI * 2;
      const amid = ((i + 0.5) / teeth) * Math.PI * 2;
      const a2   = ((i + 1) / teeth) * Math.PI * 2;
      const p1x = Math.cos(a1) * innerR,   p1y = Math.sin(a1) * innerR;
      const pmx = Math.cos(amid) * (innerR + toothH), pmy = Math.sin(amid) * (innerR + toothH);
      const p2x = Math.cos(a2) * innerR,   p2y = Math.sin(a2) * innerR;
      if (i === 0) ctx.moveTo(p1x, p1y); else ctx.lineTo(p1x, p1y);
      ctx.lineTo(pmx, pmy);
      ctx.lineTo(p2x, p2y);
    }
    ctx.closePath();

    if (pintado) {
      // Full metallic painted blade
      ctx.fillStyle = "rgba(200,200,200,0.72)";
      ctx.fill();
      ctx.strokeStyle = "rgba(80,80,80,0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.strokeStyle = "rgba(80,80,80,0.45)";
      ctx.lineWidth = 1.5;
      const spokes = 6;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius * 0.2, Math.sin(a) * radius * 0.2);
        ctx.lineTo(Math.cos(a) * radius * 0.82, Math.sin(a) * radius * 0.82);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(60,60,60,0.7)";
      ctx.fill();
    } else {
      // Default: only the exterior teeth outline — circle body shows through
      ctx.strokeStyle = "rgba(210,210,210,0.88)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  static meta = {
    id: "saw",
    name: "Sierra",
    description: "Cuerpo cubierto de sierra giratoria.",
    color: "#E74C3C",
    icon: "⚙",
    dmgRating: 3,
  };
}
