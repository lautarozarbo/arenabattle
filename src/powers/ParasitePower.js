import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class ParasitePower extends BasePower {
  constructor(owner) {
    super(owner);
    this._charge = 0;
    this.HITS_TO_KILL = 12;
  }

  onCollide(enemy) {
    if (!enemy.isAlive) return;
    this._charge = Math.min(1, this._charge + 1 / this.HITS_TO_KILL);
    if (this._charge >= 1) {
      this._charge = 1;
      // Instant kill — bypass invulnerability and deal lethal damage
      enemy._invulnerable = false;
      enemy.takeDamage(enemy.hp + 1);
      sfx.parasiteKill();
    }
  }

  clearState() {
    this._charge = 0;
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;
    if (this._charge <= 0.01) return;

    const r = radius + 9;
    const ready = this._charge >= 1;

    // Background track
    ctx.save();
    ctx.strokeStyle = 'rgba(90,20,120,0.35)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Filled arc
    const pulse = ready ? 0.7 + 0.3 * Math.abs(Math.sin(Date.now() / 70)) : 1;
    ctx.save();
    ctx.strokeStyle = ready
      ? `rgba(255,30,255,${pulse})`
      : `rgba(180,50,255,0.85)`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this._charge);
    ctx.stroke();
    ctx.restore();

    // Pulsing glow when almost full or full
    if (this._charge > 0.75) {
      const glow = (this._charge - 0.75) / 0.25;
      const p = Math.abs(Math.sin(Date.now() / 100));
      ctx.save();
      ctx.strokeStyle = `rgba(220,80,255,${0.25 * glow * p})`;
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  static meta = {
    id: 'parasite',
    name: 'Parásito',
    description: 'Cada golpe al enemigo llena una barra. Al completarse, lo mata instantáneamente.',
    color: '#7D3C98',
    icon: '⬡',
    dmgRating: 3,
  };
}
