import { BasePower } from "./BasePower.js";

const THROW_CD = 2;
const SHURIKEN_SPD = 275;
const SHURIKEN_DMG = 6;
const SHURIKEN_LIFE = 1.7;
const SHURIKEN_R = 9; // hit detection radius
const SMOKE_LIFE = 3.0;
const SMOKE_R = 60; // invulnerability radius

export class NinjaPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._throwCd = THROW_CD * 0.45;
    this._shurikens = []; // { x, y, vx, vy, rotation, rotSpeed, timer, hit }
    this._smokeClouds = []; // { x, y, timer }
    this._hpLastFrame = null;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    this._throwCd -= dt;

    // Move shurikens
    for (const s of this._shurikens) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rotation += s.rotSpeed * dt;
      s.timer -= dt;
    }
    this._shurikens = this._shurikens.filter((s) => s.timer > 0 && !s.hit);

    // Tick smoke
    for (const c of this._smokeClouds) c.timer -= dt;
    this._smokeClouds = this._smokeClouds.filter((c) => c.timer > 0);

    // Smoke invulnerability — restore HP if owner took damage while inside smoke
    if (this._hpLastFrame !== null) {
      const delta = this._hpLastFrame - this.owner.hp;
      if (delta > 0 && this._inSmoke()) {
        this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + delta);
        if (this.owner._dmgNums.length > 0) this.owner._dmgNums.pop();
      }
    }
    this._hpLastFrame = this.owner.hp;
  }

  _inSmoke() {
    return this._smokeClouds.some((c) => {
      const dx = this.owner.x - c.x,
        dy = this.owner.y - c.y;
      return dx * dx + dy * dy < SMOKE_R * SMOKE_R;
    });
  }

  // ── Enemy interactions ───────────────────────────────────────────────────────

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;

    // Throw when cooldown expires
    if (this._throwCd <= 0) {
      this._throwCd = THROW_CD;
      this._throw(enemy);
    }

    // Shuriken hit detection
    for (const s of this._shurikens) {
      if (s.hit) continue;
      const dx = enemy.x - s.x,
        dy = enemy.y - s.y;
      if (dx * dx + dy * dy < (SHURIKEN_R + enemy.radius) ** 2) {
        this._dealDmg(enemy, SHURIKEN_DMG);
        s.hit = true;
      }
    }
  }

  _throw(enemy) {
    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    const base = Math.atan2(dy, dx);

    // 2 shurikens with slight spread
    for (const spread of [-0.18, 0.18]) {
      const a = base + spread;
      this._shurikens.push({
        x: this.owner.x,
        y: this.owner.y,
        vx: Math.cos(a) * SHURIKEN_SPD,
        vy: Math.sin(a) * SHURIKEN_SPD,
        rotation: 0,
        rotSpeed: 9 + Math.random() * 6,
        timer: SHURIKEN_LIFE,
        hit: false,
      });
    }

    // Smoke cloud at owner's current position (throw from cover)
    this._smokeClouds.push({
      x: this.owner.x,
      y: this.owner.y,
      timer: SMOKE_LIFE,
    });
  }

  clearState() {
    this._throwCd = THROW_CD * 0.45;
    this._shurikens = [];
    this._smokeClouds = [];
    this._hpLastFrame = null;
  }

  getNetState() {
    return {
      throwCd:     this._throwCd,
      shurikens:   this._shurikens.map(s => ({ ...s })),
      smokeClouds: this._smokeClouds.map(s => ({ ...s })),
    };
  }
  applyNetState(s) {
    this._throwCd     = s.throwCd;
    this._shurikens   = s.shurikens;
    this._smokeClouds = s.smokeClouds;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    for (const c of this._smokeClouds) {
      const fadeIn = Math.min(1, (SMOKE_LIFE - c.timer) / 0.3);
      const fadeOut = Math.min(1, c.timer / 0.45);
      const alpha = Math.min(fadeIn, fadeOut) * 0.52;

      ctx.save();
      // Organic blob clusters
      const blobs = [
        [0, 0, 1.0],
        [-SMOKE_R * 0.42, -SMOKE_R * 0.26, 0.74],
        [SMOKE_R * 0.38, SMOKE_R * 0.3, 0.7],
        [-SMOKE_R * 0.18, SMOKE_R * 0.4, 0.66],
        [SMOKE_R * 0.24, -SMOKE_R * 0.38, 0.68],
        [-SMOKE_R * 0.52, SMOKE_R * 0.1, 0.58],
        [SMOKE_R * 0.5, -SMOKE_R * 0.12, 0.6],
      ];
      for (const [ox, oy, scale] of blobs) {
        ctx.beginPath();
        ctx.arc(c.x + ox, c.y + oy, SMOKE_R * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(175,178,188,${alpha})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  renderAbove(ctx) {
    // Cooldown ring
    const frac = Math.min(1, 1 - this._throwCd / THROW_CD);
    if (frac > 0.04) {
      ctx.save();
      ctx.strokeStyle = `rgba(160,162,185,${0.3 + 0.6 * frac})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        this.owner.x,
        this.owner.y,
        this.owner.radius + 7,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * frac,
      );
      ctx.stroke();
      ctx.restore();
    }

    // Invulnerability glow when inside smoke
    if (this._inSmoke()) {
      const pulse = 0.45 + 0.55 * Math.abs(Math.sin(Date.now() / 170));
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        this.owner.x,
        this.owner.y,
        this.owner.radius + 5,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = `rgba(200,205,220,${0.75 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(200,205,225,0.55)";
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Shurikens
    for (const s of this._shurikens) {
      const a = Math.min(1, s.timer / 0.18);
      this._drawShuriken(ctx, s.x, s.y, 8, s.rotation, a);
    }
  }

  _drawShuriken(ctx, x, y, r, rotation, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // 4-pointed star
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4 - Math.PI / 2;
      const dist = i % 2 === 0 ? r : r * 0.34;
      i === 0
        ? ctx.moveTo(Math.cos(ang) * dist, Math.sin(ang) * dist)
        : ctx.lineTo(Math.cos(ang) * dist, Math.sin(ang) * dist);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(108,112,138,0.93)";
    ctx.fill();
    ctx.strokeStyle = "rgba(210,215,232,0.72)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Center
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.19, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(68,72,92,0.9)";
    ctx.fill();

    ctx.restore();
  }

  static meta = {
    id: "ninja",
    name: "Ninja",
    description:
      "Lanza shurikens al enemigo. Al tirar, genera una zona de humo donde es invulnerable.",
    color: "#4A4A6A",
    icon: "✦",
    dmgRating: 2,
  };
}
