import { BasePower } from "./BasePower.js";

// Phase durations
const PHASE_CHARGE = 5.0; // seconds charging before absorb
const PHASE_ABSORB = 3.0; // seconds absorbing damage
const PHASE_RELEASE = 6.0; // seconds window to release stored damage
const MAX_STORE = 55;
const BASE_HIT = 1;

// _phase: 1 = charging, 2 = absorbing, 3 = release window
export class KarmaPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._phase = 1;
    this._timer = PHASE_CHARGE;
    this._stored = 0;
    this._hpLastFrame = null;
  }

  update(dt) {
    // In absorb phase: monitor HP drop and restore it
    if (this._phase === 2 && this._hpLastFrame !== null) {
      const dropped = this._hpLastFrame - this.owner.hp;
      if (dropped > 0.05) {
        const absorb = Math.min(dropped, MAX_STORE - this._stored);
        this._stored += absorb;
        this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + absorb);
        if (this.owner._dmgNums.length > 0) this.owner._dmgNums.pop();
      }
    }
    this._hpLastFrame = this.owner.hp;

    // Advance phase timer
    this._timer -= dt;
    if (this._timer <= 0) {
      if (this._phase === 1) {
        this._phase = 2;
        this._timer = this._cd(PHASE_ABSORB);
        this._stored = 0;
        this._hpLastFrame = this.owner.hp;
      } else if (this._phase === 2) {
        this._phase = 3;
        this._timer = this._cd(PHASE_RELEASE);
      } else {
        // Phase 3 expired without collision — back to charging
        this._phase = 1;
        this._timer = this._cd(PHASE_CHARGE);
        this._stored = 0;
      }
    }
  }

  onCollide(enemy) {
    if (this._phase !== 3 || this._stored <= 0) return;
    this._dealDmg(enemy, this._stored * 2);
    this._stored = 0;
    this._phase = 1;
    this._timer = this._cd(PHASE_CHARGE);
  }

  getHitDamage() {
    return BASE_HIT;
  }

  clearState() {
    this._phase = 1;
    this._timer = this._cd(PHASE_CHARGE);
    this._stored = 0;
    this._hpLastFrame = null;
  }

  renderAbove(ctx) {
    const { x, y, radius: r } = this.owner;
    const now = Date.now();

    if (this._phase === 1) {
      // Thin arc filling up as charge approaches
      const progress = 1 - this._timer / PHASE_CHARGE;
      if (progress > 0.05) {
        ctx.save();
        ctx.strokeStyle = "rgba(192, 132, 252, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          r + 9,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * progress,
        );
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    if (this._phase === 2) {
      // Purple glowing ring, brightens as damage accumulates
      const fill = this._stored / MAX_STORE;
      const pulse = 0.65 + 0.35 * Math.sin(now * 0.009);
      ctx.save();
      ctx.strokeStyle = `rgba(192, 132, 252, ${0.45 + 0.55 * pulse})`;
      ctx.lineWidth = 2.5 + 3 * fill;
      ctx.shadowBlur = 8 + 12 * fill;
      ctx.shadowColor = "rgba(192, 132, 252, 0.8)";
      ctx.beginPath();
      ctx.arc(x, y, r + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (this._stored >= 1)
        _drawLabel(ctx, x, y, r, Math.ceil(this._stored * 2), "#c084fc");
      return;
    }

    if (this._phase === 3) {
      // Orange pulsing ring — ready to release
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.007));
      ctx.save();
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 16;
      ctx.shadowColor = "rgba(249, 115, 22, 0.9)";
      ctx.beginPath();
      ctx.arc(x, y, r + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (this._stored >= 1)
        _drawLabel(ctx, x, y, r, Math.ceil(this._stored * 2), "#f97316");
    }
  }

  static meta = {
    id: "karma",
    name: "Karma",
    description:
      "Entra en fase de absorber el daño recibido y devuelve el doble en el proximo golpe.",
    color: "#c084fc",
    icon: "☯",
    dmgRating: 3,
  };
}

function _drawLabel(ctx, x, y, r, value, color) {
  const label = `+${value}`;
  ctx.save();
  ctx.font = `bold ${Math.round(r * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.strokeText(label, x, y - r - 13);
  ctx.fillStyle = color;
  ctx.fillText(label, x, y - r - 13);
  ctx.restore();
}
