import { createPower } from '../powers/registry.js';
import { sfx } from '../audio/index.js';
import { drawSkinDecorationBelow, drawSkinDecorationAbove } from '../skins/index.js';

let _showHp = localStorage.getItem('showHp') !== 'false';
export function setHpVisible(v) { _showHp = v; localStorage.setItem('showHp', v); }
export function getHpVisible()  { return _showHp; }

export class Circle {
  constructor(cfg) {
    this.x      = cfg.x;
    this.y      = cfg.y;
    this.vx     = cfg.vx;
    this.vy     = cfg.vy;
    this.radius = cfg.radius ?? 28;
    this.maxHp  = cfg.hp ?? 100;
    this.hp     = this.maxHp;
    this.color  = cfg.color;
    this.label  = cfg.label ?? '';
    this.mass   = (cfg.radius ?? 28) ** 2;
    this.isAlive = true;
    if (cfg._duoCompHp != null) this._duoCompHp = cfg._duoCompHp;
    this.power  = createPower(cfg.powerId ?? 'none', this);
    this.charId = cfg.powerId ?? null;
    this.skinId = cfg.skinId  ?? 'default';
    this._facingAngle = -Math.PI / 2;
    this.baseSpeed    = Math.sqrt(cfg.vx * cfg.vx + cfg.vy * cfg.vy);
    this._flashTimer  = 0;
    this._dmgNums     = [];
    this._slowTimer       = 0;
    this._poisonTimer     = 0;
    this._poisonDPS       = 1;
    this._poisonAccum     = 0;
    this._origBaseSpeed   = null;
    this._invulnerable    = false;
    this._speedOverride   = null; // temporary speed cap set by powers (e.g. vampire latch)
    this._bleedTimer      = 0;
    this._bleedDPS        = 0;
    this._bleedAccum      = 0;
    this._silenced        = false;
    this._hitCooldown     = 0; // prevents rapid collision damage when circles graze
    this.teamId           = cfg.teamId ?? null;
    this.activeEffect     = cfg.activeEffect ?? null;
    this._speedBuffTimer  = 0;
    this._speedBuffBase   = null; // saved baseSpeed before buff
    this._dmgBuffTimer    = 0;
    this._dmgBuffMult     = 1;
    this._healFlash       = 0;
    this._healHot         = 0;   // seconds remaining for heal-over-time
    this._healHotAccum    = 0;   // accumulator for per-second ticks
    this._healHotRate     = 5;   // HP per second
  }

  clampToBaseSpeed() {
    const target = this._speedOverride !== null ? this._speedOverride : this.baseSpeed;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed < 0.001) {
      // If velocity is zero but we need to be moving, give a random kick to unstick
      if (target > 0.001) {
        const a = Math.random() * Math.PI * 2;
        this.vx = Math.cos(a) * target;
        this.vy = Math.sin(a) * target;
      }
      return;
    }
    const scale = target / speed;
    this.vx *= scale;
    this.vy *= scale;
  }

  update(dt) {
    if (!this.isAlive) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this._hitCooldown > 0) this._hitCooldown -= dt;
    if (!this._silenced) this.power.update(dt);
    if (this._flashTimer > 0) this._flashTimer -= dt;
    if (this._slowTimer > 0) {
      this._slowTimer -= dt;
      if (this._slowTimer <= 0) {
        this._slowTimer = 0;
        if (this._origBaseSpeed !== null) {
          this.baseSpeed = this._origBaseSpeed;
          this._origBaseSpeed = null;
        }
      }
    }
    if (this._poisonTimer > 0) {
      this._poisonTimer -= dt;
      this._poisonAccum += dt;
      if (this._poisonAccum >= 1) {
        this.takeDamage(this._poisonDPS);
        sfx.venomTick();
        this._poisonAccum -= 1;
      }
      if (this._poisonTimer <= 0) this._poisonTimer = 0;
    }
    if (this._bleedTimer > 0) {
      this._bleedTimer -= dt;
      this._bleedAccum += dt;
      if (this._bleedAccum >= 1) {
        this.takeDamage(this._bleedDPS);
        sfx.bleedTick();
        this._bleedAccum -= 1;
      }
      if (this._bleedTimer <= 0) this._bleedTimer = 0;
    }
    if (this._speedBuffTimer > 0) {
      this._speedBuffTimer -= dt;
      if (this._speedBuffTimer <= 0) {
        this._speedBuffTimer = 0;
        if (this._speedBuffBase !== null) {
          this.baseSpeed = this._speedBuffBase;
          this._speedBuffBase = null;
        }
      }
    }
    if (this._dmgBuffTimer > 0) {
      this._dmgBuffTimer -= dt;
      if (this._dmgBuffTimer <= 0) {
        this._dmgBuffTimer = 0;
        this._dmgBuffMult = 1;
      }
    }
    if (this._healHot > 0) {
      this._healHot -= dt;
      this._healHotAccum += dt;
      while (this._healHotAccum >= 1.0) {
        this._healHotAccum -= 1.0;
        const healed = Math.min(this._healHotRate, Math.max(0, this.maxHp - this.hp));
        if (healed > 0) {
          this.hp += healed;
          this._healFlash = 0.3;
          this._dmgNums.push({
            x: this.x + (Math.random() * 14 - 7),
            y: this.y - this.radius - 4,
            val: `+${healed}`,
            t: 1.0,
            color: '#4ade80',
          });
        }
      }
      if (this._healHot <= 0) this._healHot = 0;
    }
    if (this._healFlash > 0) this._healFlash -= dt;
    if (this.hp <= 0) {
      if (!this.power._onBeforeDeath()) {
        this.hp = 0;
        this.isAlive = false;
      }
    }
    for (const n of this._dmgNums) n.t -= dt * 1.1;
    this._dmgNums = this._dmgNums.filter(n => n.t > 0);
  }

  applySpeedBuff(duration, mult = 1.7) {
    if (this._speedBuffBase === null) this._speedBuffBase = this.baseSpeed;
    this.baseSpeed = this._speedBuffBase * mult;
    this._speedBuffTimer = duration;
  }

  applyDamageBuff(duration, mult = 2.5) {
    this._dmgBuffTimer = duration;
    this._dmgBuffMult  = mult;
  }

  applyHeal(hpPerSec = 5, duration = 3) {
    this._healHotRate  = hpPerSec;
    this._healHot      = duration;
    this._healHotAccum = 0;
    this._healFlash    = 0.3;
  }

  applyBleed(duration, dps) {
    this._bleedTimer = Math.max(this._bleedTimer, duration);
    this._bleedDPS   = dps;
    this._bleedAccum = 0;
  }

  // Called by SpikePower (and any future poison power)
  applyVenom(slowDuration, poisonDuration, poisonDPS, slowFactor) {
    // Don't stack slow multiplier — only save original once
    if (this._slowTimer <= 0) {
      this._origBaseSpeed = this.baseSpeed;
      this.baseSpeed = this.baseSpeed * slowFactor;
    }
    this._slowTimer    = slowDuration;
    this._poisonTimer  = poisonDuration;
    this._poisonDPS    = poisonDPS;
    this._poisonAccum  = 0;
  }

  takeDamage(amount) {
    if (this._invulnerable) return;
    if (amount > 0.5) {
      this._flashTimer = 0.08;
      this._dmgNums.push({
        x:   this.x + (Math.random() * 16 - 8),
        y:   this.y - this.radius - 4,
        val: Math.ceil(amount),
        t:   1.0,
      });
    }
    this.hp = Math.max(0, this.hp - amount);
  }

  // Phase 1: draw zone/area effects behind ALL circles (called before any body is drawn).
  renderBelowEffects(ctx) {
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > 0.5) this._facingAngle = Math.atan2(this.vy, this.vx);
    this.power.renderBelow(ctx);
    drawSkinDecorationBelow(ctx, this.x, this.y, this.radius, this.charId, this.skinId, this._facingAngle);
  }

  // Phase 2: circle body + above-circle effects (called after all renderBelowEffects).
  render(ctx) {
    const flash = this._flashTimer > 0;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = flash ? '#ffffff' : this.color;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Speed buff: blue outer glow ring
    if (this._speedBuffTimer > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(80,180,255,0.75)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#50b4ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Damage buff: orange outer glow ring
    if (this._dmgBuffTimer > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,110,0,0.8)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff6e00';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Heal flash: green tint
    if (this._healFlash > 0) {
      const alpha = (this._healFlash / 0.4) * 0.45;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(46,204,113,${alpha})`;
      ctx.fill();
    }

    // Poison tint: green overlay
    if (this._poisonTimer > 0) {
      const alpha = 0.38 * Math.min(1, this._poisonTimer);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(46,204,113,${alpha})`;
      ctx.fill();
    }

    // Bleed tint: red overlay
    if (this._bleedTimer > 0) {
      const alpha = 0.42 * Math.min(1, this._bleedTimer);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,30,30,${alpha})`;
      ctx.fill();
    }

    this.power.renderAbove(ctx);
    drawSkinDecorationAbove(ctx, this.x, this.y, this.radius, this.charId, this.skinId, this._facingAngle);
    if (this.activeEffect === 'golden_sparkles') _drawGoldenSparkles(ctx, this.x, this.y, this.radius);

    this._drawHpInside(ctx);
    this._renderDmgNums(ctx);

    if (this._silenced) {
      ctx.save();
      ctx.font = `${this.radius * 0.95}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.9;
      ctx.fillText('❄', this.x, this.y - this.radius - 13);
      ctx.restore();
    }
  }

  _drawHpInside(ctx) {
    if (!_showHp) return;
    const text = String(Math.ceil(this.hp));
    ctx.save();
    ctx.font = `bold ${this.radius * 0.75}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText(text, this.x, this.y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, this.x, this.y);
    ctx.restore();
  }

  _renderDmgNums(ctx) {
    for (const n of this._dmgNums) {
      const rise  = (1 - n.t) * 38;
      const alpha = n.t < 0.5 ? n.t * 2 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(n.val, n.x, n.y - rise);
      ctx.fillStyle = n.color ?? '#ff3333';
      ctx.fillText(n.val, n.x, n.y - rise);
      ctx.restore();
    }
  }
}

function _drawGoldenSparkles(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  ctx.save();

  // Inner ring: 8 particles orbiting clockwise
  for (let i = 0; i < 8; i++) {
    const phase = (i / 8) * Math.PI * 2;
    const angle = phase + t * 1.6;
    const dist  = r + 10 + 4 * Math.sin(t * 2.5 + phase * 2);
    const alpha = 0.55 + 0.45 * Math.sin(t * 4 + phase);
    const size  = Math.max(0.5, 2 + Math.sin(t * 3 + i * 0.9));
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outer ring: 5 particles counter-clockwise, lighter
  for (let i = 0; i < 5; i++) {
    const phase = (i / 5) * Math.PI * 2;
    const angle = phase - t * 0.9;
    const dist  = r + 19 + 5 * Math.sin(t * 1.7 + phase);
    const alpha = 0.25 + 0.3 * Math.sin(t * 2.2 + phase * 1.5);
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#FFF59D';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
