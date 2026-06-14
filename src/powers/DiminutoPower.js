import { BasePower } from "./BasePower.js";

const CHARGE_DUR = 8.0; // seconds per charge
const MAX_STEPS = 4; // number of shrink steps (then stays at minimum)
const MAX_R = 28;
const MIN_R = 10;
const MIN_DMG = 1;
const MAX_DMG = 12;

function _radiusAt(step) {
  return MAX_R - (MAX_R - MIN_R) * (step / MAX_STEPS);
}

function _damageAt(step) {
  return Math.round(MIN_DMG + (MAX_DMG - MIN_DMG) * (step / MAX_STEPS));
}

export class DiminutoPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._step = 0; // 0 = full size, MAX_STEPS = minimum
    this._chargeTimer = CHARGE_DUR;
    this._flashTimer = 0;
    this._applySize();
  }

  _applySize() {
    const r = _radiusAt(this._step);
    this.owner.radius = r;
    this.owner.mass = r * r;
  }

  update(dt) {
    if (this._flashTimer > 0) this._flashTimer -= dt;

    if (this._step < MAX_STEPS) {
      this._chargeTimer -= dt;
      if (this._chargeTimer <= 0) {
        this._chargeTimer = CHARGE_DUR;
        this._step++;
        this._flashTimer = 0.2;
        this._applySize();
      }
    }
  }

  getHitDamage() {
    return _damageAt(this._step);
  }

  clearState() {
    this._step = 0;
    this._chargeTimer = CHARGE_DUR;
    this._flashTimer = 0;
    this._applySize();
  }

  renderAbove(ctx) {
    const { x, y, radius: r } = this.owner;
    const frac = this._step / MAX_STEPS; // 0 = big, 1 = tiny

    // White flash on size change
    if (this._flashTimer > 0) {
      const a = this._flashTimer / 0.2;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.85})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(x, y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Charge arc filling up
    const chargeProgress = 1 - this._chargeTimer / CHARGE_DUR;
    const red = Math.round(100 + 155 * frac);
    const green = Math.round(200 - 160 * frac);
    ctx.save();
    ctx.strokeStyle = `rgba(${red},${green},80,${0.25 + 0.45 * frac})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      r + 8,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * chargeProgress,
    );
    ctx.stroke();
    ctx.restore();

    // Outer glow ring when shrunk at least one step
    if (this._step > 0) {
      const pulse =
        0.6 + 0.4 * Math.abs(Math.sin(Date.now() * (0.004 + 0.007 * frac)));
      ctx.save();
      ctx.strokeStyle = `rgba(${red},${green},80,${(0.3 + 0.5 * frac) * pulse})`;
      ctx.lineWidth = 1.5 + 2 * frac;
      ctx.shadowBlur = 4 + 10 * frac;
      ctx.shadowColor = `rgba(${red},${green},80,0.7)`;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Damage counter
      const dmg = _damageAt(this._step);
      const color =
        frac >= 0.8 ? "#ef4444" : frac >= 0.4 ? "#f97316" : "#facc15";
      ctx.save();
      ctx.font = `bold ${Math.round(MAX_R * 0.62)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.strokeText(`×${dmg}`, x, y - r - 13);
      ctx.fillStyle = color;
      ctx.fillText(`×${dmg}`, x, y - r - 13);
      ctx.restore();
    }
  }

  static meta = {
    id: "diminuto",
    name: "Diminuto",
    description: "Reduce su tamaño. Hace más daño mientras menos tamaño tenga.",
    color: "#f97316",
    icon: "◉",
    dmgRating: 3,
  };
}
