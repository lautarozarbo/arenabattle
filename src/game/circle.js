import { createPower } from '../powers/registry.js';
import { sfx } from '../audio/index.js';
import { drawSkinDecorationBelow, drawSkinDecorationAbove } from '../skins/index.js';

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
    if (this.hp <= 0) {
      if (!this.power._onBeforeDeath()) {
        this.hp = 0;
        this.isAlive = false;
      }
    }
    for (const n of this._dmgNums) n.t -= dt * 1.1;
    this._dmgNums = this._dmgNums.filter(n => n.t > 0);
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
      ctx.fillStyle = '#ff3333';
      ctx.fillText(n.val, n.x, n.y - rise);
      ctx.restore();
    }
  }
}
