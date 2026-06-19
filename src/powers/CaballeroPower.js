import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const SLASH_BURST_CD = 3.0;
const SLASH_DUR      = 1.2;
const SLASH_HIT_CD   = 0.2;
const SLASH_REACH    = 72;
const SLASH_ARC      = Math.PI * 0.72;
const SLASH_DMG      = 7;
const SHIELD_CD      = 8.0;
const SHIELD_DUR     = 1.8;
const RETURN_DUR     = 0.35; // s to smoothly return sword to idle after burst

export class CaballeroPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._angle = 0;
    this._slashCd = SLASH_BURST_CD * 0.4;
    this._slashing = false;
    this._slashTimer = 0;
    this._slashStart = 0;
    this._enemyHitCds  = new Map();
    this._returning    = false;
    this._returnTimer  = 0;
    this._returnFrom   = 0;
    this._shieldCd     = SHIELD_CD * 0.7;
    this._shielding    = false;
    this._shieldTimer  = 0;
    this._hpLastFrame  = null;
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
        // sin(4π) = 0, so sword ends back at _slashStart (near idle, minimal return)
        this._returnFrom  = this._slashStart;
        this._returning   = true;
        this._returnTimer = RETURN_DUR;
        this._slashing    = false;
        this._slashTimer  = 0;
        this._enemyHitCds.clear();
        this._slashCd = SLASH_BURST_CD;
      }
    } else if (this._returning) {
      this._returnTimer -= dt;
      if (this._returnTimer <= 0) { this._returning = false; this._returnTimer = 0; }
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

  _swordAngle() {
    if (this._shielding) return this._angle;
    if (this._slashing) {
      // Sine oscillation: starts at 0 (no jump), 2 full swings, ends at 0
      const elapsed = 1 - this._slashTimer / SLASH_DUR;
      const osc = Math.sin(elapsed * Math.PI * 4);
      return this._slashStart + osc * (SLASH_ARC / 2);
    }
    if (this._returning) {
      // Ease-out return from last slash position back to idle angle
      const p  = 1 - this._returnTimer / RETURN_DUR;
      const ep = 1 - (1 - p) * (1 - p); // ease-out quad
      return this._returnFrom + this._angleDiff(this._angle, this._returnFrom) * ep;
    }
    return this._angle;
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

    const hilt  = r;
    const guard = hilt + 9;
    const tip   = hilt + SLASH_REACH;

    // Blade (clean, no border, no shadow)
    ctx.beginPath();
    ctx.moveTo(guard, -3.5);
    ctx.lineTo(guard,  3.5);
    ctx.lineTo(tip, 0);
    ctx.closePath();
    ctx.fillStyle = '#dde8f5';
    ctx.fill();

    // Crossguard
    ctx.beginPath();
    ctx.moveTo(guard, -10);
    ctx.lineTo(guard,  10);
    ctx.strokeStyle = '#8899aa';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Handle
    ctx.beginPath();
    ctx.rect(hilt, -2.5, guard - hilt, 5);
    ctx.fillStyle = '#6b4f2a';
    ctx.fill();

    // Pommel
    ctx.beginPath();
    ctx.arc(hilt, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#7a8a9a';
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
    const elapsed  = 1 - this._slashTimer / SLASH_DUR;
    const vel      = Math.cos(elapsed * Math.PI * 4);
    const speed    = Math.abs(vel);
    if (speed < 0.06) return;

    // Fade out in the last 18% of the burst so lines don't snap off
    const endFade  = Math.min(1, this._slashTimer / (SLASH_DUR * 0.18));
    if (endFade <= 0) return;

    const currA = this._slashStart + Math.sin(elapsed * Math.PI * 4) * (SLASH_ARC / 2);
    const side  = vel > 0 ? 1 : -1;

    const guard = r + 9;
    const tip   = r + SLASH_REACH;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(currA);

    const numLines = 4;
    for (let i = 0; i < numLines; i++) {
      const p   = (i + 0.4) / numLines;
      const ex  = guard + (tip - guard) * p;
      const ey  = side * 3.5 * (1 - p);
      const len = (12 + (1 - p) * 10) * speed;
      const a   = (0.38 + 0.2 * speed) * (1 - p * 0.4) * endFade;

      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex, ey + side * len);
      ctx.strokeStyle = `rgba(215,232,255,${a})`;
      ctx.lineWidth   = 1.1 - p * 0.3;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    ctx.restore();
  }

  clearState() {
    this._slashing = false;
    this._slashTimer = 0;
    this._slashCd = SLASH_BURST_CD * 0.4;
    this._enemyHitCds = new Map();
    this._returning   = false;
    this._returnTimer = 0;
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
