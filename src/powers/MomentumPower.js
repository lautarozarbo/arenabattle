import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class MomentumPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._stacks = 0;
    this._lastStacks = 0; // stacks at moment of hit (for onCollide sound)
    this.MAX_STACKS = 30;
  }

  // ── Bounce accumulation ────────────────────────────────────────────────────

  onWallBounce() {
    this._stacks = Math.min(this._stacks + 2, this.MAX_STACKS);
    sfx.momentumStack(this._stacks);
  }


  // ── Damage delivery ────────────────────────────────────────────────────────

  getHitDamage() {
    this._lastStacks = this._stacks;
    const dmg = Math.max(1, this._stacks) + (this.owner?.towerMods?.dmgAdd ?? 0);
    this._stacks = 0;
    return dmg;
  }

  onCollide() {
    if (this._lastStacks >= 4) sfx.momentumRelease();
    this._lastStacks = 0;
  }

  clearState() {
    this._stacks = 0;
    this._lastStacks = 0;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  renderAbove(ctx) {
    if (this._stacks === 0) return;

    const x = this.owner.x;
    const y = this.owner.y;
    const r = this.owner.radius;
    const intensity = Math.min(1, this._stacks / this.MAX_STACKS);

    if (this.owner.skinId === 'saiyan') {
      this._renderSaiyanAura(ctx, x, y, r, intensity);
    } else {
      // Default: outer glow ring
      const pulse  = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / (350 - intensity * 180)));
      const intLow = Math.min(1, this._stacks / 10);
      ctx.save();
      ctx.strokeStyle = `rgba(255,${Math.floor(200 - intLow * 160)},0,${(0.35 + 0.55 * intLow) * pulse})`;
      ctx.lineWidth = 1.5 + intLow * 3.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 5 + intLow * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Stack counter always visible regardless of skin
    const label = "×" + this._stacks;
    ctx.save();
    ctx.font = `bold ${Math.round(r * 0.62)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.strokeText(label, x, y - r - 13);
    ctx.fillStyle = intensity > 0.5 ? "#FF4400" : "#FFAA00";
    ctx.fillText(label, x, y - r - 13);
    ctx.restore();
  }

  _renderSaiyanAura(ctx, x, y, r, intensity) {
    const t = Date.now() * 0.001;

    // Color phase: gold → orange → white-blue
    let ar, ag, ab;
    if (intensity < 0.35) {
      const p = intensity / 0.35;
      ar = 255; ag = Math.floor(210 + p * 30); ab = 0;
    } else if (intensity < 0.7) {
      const p = (intensity - 0.35) / 0.35;
      ar = 255; ag = Math.floor(240 - p * 160); ab = Math.floor(p * 40);
    } else {
      const p = (intensity - 0.7) / 0.3;
      ar = Math.floor(255 - p * 80); ag = Math.floor(80 + p * 180); ab = Math.floor(40 + p * 215);
    }

    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * (3 + intensity * 5)));
    const auraSize = r + 6 + intensity * r * 1.1;

    ctx.save();

    // Outer diffuse glow
    const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, auraSize * 1.6);
    glow.addColorStop(0, `rgba(${ar},${ag},${ab},${0.45 * pulse * intensity})`);
    glow.addColorStop(0.5, `rgba(${ar},${ag},${ab},${0.15 * intensity})`);
    glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
    ctx.beginPath();
    ctx.arc(x, y, auraSize * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Flame spikes radiating outward
    const spikeCount = 8 + Math.floor(intensity * 8);
    for (let i = 0; i < spikeCount; i++) {
      const baseAngle = (i / spikeCount) * Math.PI * 2 + t * (1.8 + intensity * 2.5);
      const jitter = Math.sin(t * 4.3 + i * 2.8) * 0.35;
      const angle = baseAngle + jitter;
      const len = (r * 0.35 + intensity * r * 1.1) * (0.55 + 0.45 * Math.abs(Math.sin(t * 3.1 + i * 1.7)));
      ctx.strokeStyle = `rgba(${ar},${ag},${ab},${(0.25 + 0.65 * intensity) * pulse})`;
      ctx.lineWidth = 1 + intensity * 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * (r + 2), y + Math.sin(angle) * (r + 2));
      ctx.lineTo(x + Math.cos(angle) * (r + len), y + Math.sin(angle) * (r + len));
      ctx.stroke();
    }

    // Inner bright ring
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},${(0.5 + 0.5 * pulse) * (0.4 + 0.6 * intensity)})`;
    ctx.lineWidth = 1.5 + intensity * 4;
    ctx.shadowColor = `rgba(${ar},${ag},${ab},0.8)`;
    ctx.shadowBlur = 6 + intensity * 10;
    ctx.beginPath();
    ctx.arc(x, y, r + 3 + intensity * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  static meta = {
    id: "momentum",
    name: "Impulso",
    description:
      "Cada rebote en la pared acumula daño. Al golpear al rival descarga todo y resetea.",
    color: "#E67E22",
    icon: "◎",
    dmgRating: 2,
  };
}
