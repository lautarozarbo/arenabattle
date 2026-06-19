import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const SLASH_BURST_CD = 3.0;
const SLASH_DUR = 1.2; // total burst: 2 full oscillations
const SLASH_HIT_CD = 0.2; // min time between hits per enemy during burst
const SLASH_REACH = 72;
const SLASH_ARC = Math.PI * 0.72;
const SLASH_DMG = 7;
const SHIELD_CD = 8.0;
const SHIELD_DUR = 1.8;

export class CaballeroPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._angle = 0;
    this._slashCd = SLASH_BURST_CD * 0.4;
    this._slashing = false;
    this._slashTimer = 0;
    this._slashStart = 0;
    this._enemyHitCds = new Map();
    this._shieldCd = SHIELD_CD * 0.25;
    this._shielding = false;
    this._shieldTimer = 0;
    this._hpLastFrame = null;
  }

  update(dt) {
    // Shield: absorb all incoming damage while active
    if (this._shielding && this._hpLastFrame !== null) {
      const delta = this._hpLastFrame - this.owner.hp;
      if (delta > 0) {
        this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + delta);
        if (this.owner._dmgNums.length > 0) this.owner._dmgNums.pop();
      }
    }
    this._hpLastFrame = this.owner.hp;

    if (this._shielding) {
      this._shieldTimer -= dt;
      if (this._shieldTimer <= 0) {
        this._shielding = false;
        this._shieldCd = SHIELD_CD;
      }
    } else {
      this._shieldCd -= dt;
      if (this._shieldCd <= 0) {
        this._shielding = true;
        this._shieldTimer = SHIELD_DUR;
      }
    }

    // Slash burst
    if (this._slashing) {
      this._slashTimer -= dt;
      // Tick per-enemy cooldowns
      for (const [e, cd] of this._enemyHitCds) {
        const next = cd - dt;
        if (next <= 0) this._enemyHitCds.delete(e);
        else this._enemyHitCds.set(e, next);
      }
      if (this._slashTimer <= 0) {
        this._slashing = false;
        this._slashTimer = 0;
        this._enemyHitCds.clear();
        this._slashCd = SLASH_BURST_CD;
      }
    } else {
      this._slashCd -= dt;
      if (this._slashCd <= 0 && !this._shielding) {
        this._slashing = true;
        this._slashTimer = SLASH_DUR;
        this._slashStart = this._angle;
        this._enemyHitCds.clear();
      }
    }
  }

  // Cosine oscillation: 2 full cycles → right, left, right, left, right
  _swordAngle() {
    if (!this._slashing && !this._shielding) return this._angle;
    if (this._shielding) return this._angle; // shield faces enemy too
    const elapsed = 1 - this._slashTimer / SLASH_DUR;
    const osc = Math.cos(elapsed * Math.PI * 4); // 2 full oscillations
    return this._slashStart + osc * (SLASH_ARC / 2);
  }

  _angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;
    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    this._angle = Math.atan2(dy, dx);

    // No sword damage while shielding
    if (
      this._slashing &&
      !this._shielding &&
      !(this._enemyHitCds.get(enemy) > 0)
    ) {
      if (dist <= this.owner.radius + SLASH_REACH + enemy.radius) {
        const rel = this._angleDiff(Math.atan2(dy, dx), this._slashStart);
        if (Math.abs(rel) <= SLASH_ARC / 2 + 0.08) {
          this._dealDmg(enemy, SLASH_DMG);
          this._enemyHitCds.set(enemy, SLASH_HIT_CD);
          sfx.collide();
        }
      }
    }
  }

  getHitDamage() {
    return this._shielding ? 0 : 2;
  }

  renderAbove(ctx) {
    const { x, y, radius: r } = this.owner;

    if (this._shielding) {
      const frac = this._shieldTimer / SHIELD_DUR;
      const pulse = 0.7 + 0.3 * Math.abs(Math.sin(Date.now() / 280));
      ctx.save();
      ctx.strokeStyle = `rgba(255,215,0,${(0.65 + 0.35 * pulse) * frac})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 14;
      ctx.shadowColor = "rgba(255,200,0,0.9)";
      ctx.beginPath();
      ctx.arc(x, y, r + 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      this._drawShield(ctx, x, y, r, this._angle, frac);
    } else {
      // Slash arc trail
      if (this._slashing) this._drawSlashArc(ctx, x, y, r);
      // Sword
      this._drawSword(ctx, x, y, r, this._swordAngle());
      // Charge arc for next shield
      const frac = Math.max(0, 1 - this._shieldCd / SHIELD_CD);
      if (frac > 0.04) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,215,0,${0.15 + 0.3 * frac})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x, y, r + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  _drawSword(ctx, x, y, r, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const hilt = r;
    const guard = hilt + 9;
    const tip = hilt + SLASH_REACH;

    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(200,220,255,0.6)";

    // Blade (tapered)
    ctx.beginPath();
    ctx.moveTo(guard, -3.5);
    ctx.lineTo(guard, 3.5);
    ctx.lineTo(tip, 0);
    ctx.closePath();
    ctx.fillStyle = "#dde8f5";
    ctx.fill();

    // Fuller
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(guard + 4, 0);
    ctx.lineTo(tip - 6, 0);
    ctx.strokeStyle = "rgba(150,180,210,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Crossguard
    ctx.beginPath();
    ctx.moveTo(guard, -10);
    ctx.lineTo(guard, 10);
    ctx.strokeStyle = "#8899aa";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();

    // Handle
    ctx.beginPath();
    ctx.rect(hilt, -2.5, guard - hilt, 5);
    ctx.fillStyle = "#6b4f2a";
    ctx.fill();
    ctx.strokeStyle = "#4a3520";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Pommel
    ctx.beginPath();
    ctx.arc(hilt, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#7a8a9a";
    ctx.fill();

    ctx.restore();
  }

  _drawShield(ctx, x, y, r, angle, frac) {
    // Shield floats in front of the circle, facing the enemy
    const dist = r + 22;
    const sx = x + Math.cos(angle) * dist;
    const sy = y + Math.sin(angle) * dist;

    const now = Date.now();
    const pulse = 0.78 + 0.22 * Math.abs(Math.sin(now / 260));
    const alpha = frac * pulse;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle + Math.PI / 2);
    ctx.globalAlpha = alpha;

    const w = 22,
      h = 28;

    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(w / 2, h / 6);
    ctx.quadraticCurveTo(w / 2, h / 2, 0, h / 2 + 5);
    ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 6);
    ctx.closePath();
    ctx.fillStyle = "#1e3a6e";
    ctx.shadowBlur = 14;
    ctx.shadowColor = "rgba(255,215,0,0.8)";
    ctx.fill();

    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -h / 4);
    ctx.lineTo(0, h / 4 - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 4, 0);
    ctx.lineTo(w / 4, 0);
    ctx.stroke();

    ctx.restore();
  }

  _drawSlashArc(ctx, x, y, r) {
    const elapsed = 1 - this._slashTimer / SLASH_DUR;
    const osc = Math.cos(elapsed * Math.PI * 4);
    const currA = this._slashStart + osc * (SLASH_ARC / 2);
    const reach = r + SLASH_REACH;

    // Short trailing arc around current sword position
    const arcHalf = SLASH_ARC * 0.22;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, reach, currA - arcHalf, currA + arcHalf);
    ctx.strokeStyle = "rgba(210,230,255,0.55)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(180,210,255,0.6)";
    ctx.stroke();
    ctx.restore();
  }

  clearState() {
    this._slashing = false;
    this._slashTimer = 0;
    this._slashCd = SLASH_BURST_CD * 0.4;
    this._enemyHitCds = new Map();
    this._shielding = false;
    this._shieldTimer = 0;
    this._shieldCd = SHIELD_CD * 0.25;
    this._hpLastFrame = null;
  }

  static meta = {
    id: "caballero",
    name: "Caballero",
    description: "Ataca con su espada y activa un escudo que bloquea daño.",
    color: "#c0c0c0",
    icon: "⚔",
    dmgRating: 3,
  };
}
