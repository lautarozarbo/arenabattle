import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class RocketPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._state = "tracking"; // 'tracking' | 'charging' | 'dashing' | 'exploding'
    this._lockTimer = 0;
    this._chargeTimer = 0;
    this._explodeTimer = 0;
    this._target = null; // locked {x,y}
    this._explodePos = null; // {x,y} explosion center
    this._lastEnemyPos = null; // for facing arrow
    this._damageDone = false;
    this._lingerAccum = 0;
    this._lingerInside = false;

    this.LOCK_INTERVAL = 1.2;

    this.CHARGE_DURATION = 0.65;
    this.DASH_SPEED = 950;
    this.ARRIVAL_RADIUS = 28;
    this.EXPLODE_RADIUS = 80;
    this.EXPLODE_DAMAGE = 5; // one-shot impact
    this.LINGER_DURATION = 4; // seconds the area stays
    this.LINGER_DPS = 5; // damage per tick while inside
    this.LINGER_TICK = 0.5; // seconds between ticks
    this._compDamageDone = false;
    this._compLingerAccum = 0;
    this._compLingerInside = false;
  }

  update(dt) {
    if (this._state === "tracking") {
      this._lockTimer += dt;
      // Lock triggered in onEnemyFrame (needs enemy reference)
    } else if (this._state === "charging") {
      this._chargeTimer -= dt;
      this.owner.vx = 0;
      this.owner.vy = 0;
      if (this._chargeTimer <= 0) this._startDash();
    } else if (this._state === "dashing") {
      const dx = this._target.x - this.owner.x;
      const dy = this._target.y - this.owner.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.ARRIVAL_RADIUS) {
        this._triggerExplosion();
      } else {
        this.owner.vx = (dx / dist) * this.DASH_SPEED;
        this.owner.vy = (dy / dist) * this.DASH_SPEED;
        this.owner._speedOverride = this.DASH_SPEED;
      }
    } else if (this._state === "exploding") {
      this._explodeTimer -= dt;
      if (this._explodeTimer <= 0) this._endExplosion();
    }
  }

  onEnemyFrame(enemy, dt) {
    if (!enemy.isAlive) return;
    this._lastEnemyPos = { x: enemy.x, y: enemy.y };

    if (this._state === "tracking" && this._lockTimer >= this._cd(this.LOCK_INTERVAL)) {
      this._startCharge(enemy.x, enemy.y);
    }

    // If enemy blocks the dash path, explode on contact instead of pushing forever
    if (this._state === "dashing") {
      const dx = enemy.x - this.owner.x;
      const dy = enemy.y - this.owner.y;
      if (dx * dx + dy * dy < (this.owner.radius + enemy.radius) ** 2) {
        this._triggerExplosion();
      }
    }

    if (this._state === "exploding" && this._explodePos) {
      const r2 = this.EXPLODE_RADIUS ** 2;

      // Main enemy
      const dx = enemy.x - this._explodePos.x,
        dy = enemy.y - this._explodePos.y;
      const inside = dx * dx + dy * dy < r2;
      if (!this._damageDone) {
        if (inside) this._dealDmg(enemy, this.EXPLODE_DAMAGE);
        this._damageDone = true;
      }
      if (inside) {
        if (!this._lingerInside) this._lingerAccum = this.LINGER_TICK;
        this._lingerAccum += dt;
        if (this._lingerAccum >= this.LINGER_TICK) {
          this._dealDmg(enemy, this.LINGER_DPS);
          this._lingerAccum -= this.LINGER_TICK;
        }
      } else {
        this._lingerAccum = 0;
      }
      this._lingerInside = inside;

      // DUO companion
      const comp = enemy.power?._comp;
      if (comp?.isAlive) {
        const cdx = comp.x - this._explodePos.x,
          cdy = comp.y - this._explodePos.y;
        const cInside = cdx * cdx + cdy * cdy < r2;
        if (!this._compDamageDone) {
          if (cInside) this._dealDmg(comp, this.EXPLODE_DAMAGE);
          this._compDamageDone = true;
        }
        if (cInside) {
          if (!this._compLingerInside) this._compLingerAccum = this.LINGER_TICK;
          this._compLingerAccum += dt;
          if (this._compLingerAccum >= this.LINGER_TICK) {
            this._dealDmg(comp, this.LINGER_DPS);
            this._compLingerAccum -= this.LINGER_TICK;
          }
        } else {
          this._compLingerAccum = 0;
        }
        this._compLingerInside = cInside;
      }
    }
  }

  _startCharge(ex, ey) {
    this.owner._speedOverride = 0; // freeze during charge
    this._target = { x: ex, y: ey };
    this._chargeTimer = this.CHARGE_DURATION;
    this._state = "charging";
    sfx.rocketCharge();
  }

  _startDash() {
    this.owner._speedOverride = this.DASH_SPEED; // fast during dash
    this._state = "dashing";
    sfx.rocketDash();
  }

  _triggerExplosion() {
    if (this._state === "exploding") return; // prevent double-trigger
    this._explodePos = { x: this.owner.x, y: this.owner.y };
    this._explodeTimer = this.LINGER_DURATION;
    sfx.rocketExplode();
    this._damageDone = false;
    this._lingerAccum = 0;
    this._lingerInside = false;
    this._compDamageDone = false;
    this._compLingerAccum = 0;
    this._compLingerInside = false;
    this.owner._speedOverride = null; // return to normal speed
    this._state = "exploding";
  }

  onCollide(_enemy) {
    // Trigger explosion immediately if a circle hits the rocket while dashing
    if (this._state === "dashing") this._triggerExplosion();
  }

  _endExplosion() {
    this._explodePos = null;
    this._lockTimer = 0;
    this._state = "tracking";
  }

  getHitDamage() {
    // Only deal contact damage during normal tracking; explosion is the attack otherwise
    return this._state === "tracking" ? 1 : 0;
  }

  renderBelow(ctx) {
    // Lingering explosion area
    if (this._state === "exploding" && this._explodePos) {
      const { x, y } = this._explodePos;
      const elapsed = this.LINGER_DURATION - this._explodeTimer;
      const fadeAlpha = this._explodeTimer / this.LINGER_DURATION; // 1→0

      // Expanding ring: completes in first 0.4s
      const RING_DUR = 0.4;
      const ringProg = Math.min(1, elapsed / RING_DUR);
      const ringAlpha = (1 - ringProg) * 0.95;
      if (ringAlpha > 0.02) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, ringProg * this.EXPLODE_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,140,30,${ringAlpha})`;
        ctx.lineWidth = 4 + 5 * (1 - ringProg);
        ctx.stroke();
        ctx.restore();
      }

      // Persistent filled area that fades over full duration
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, this.EXPLODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,190,50,${0.18 * fadeAlpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,140,30,${0.65 * fadeAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Target reticle during charge and dash
    if (
      (this._state === "charging" || this._state === "dashing") &&
      this._target
    ) {
      const pulse =
        this._state === "dashing" ? 1 : Math.abs(Math.sin(Date.now() / 80));
      const R = 12;
      ctx.save();
      ctx.strokeStyle = `rgba(255,100,30,${0.55 + 0.45 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this._target.x, this._target.y, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this._target.x - R - 6, this._target.y);
      ctx.lineTo(this._target.x + R + 6, this._target.y);
      ctx.moveTo(this._target.x, this._target.y - R - 6);
      ctx.lineTo(this._target.x, this._target.y + R + 6);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderAbove(ctx) {
    // Arrow pointing toward enemy while tracking
    if (this._state === "tracking" && this._lastEnemyPos) {
      const dx = this._lastEnemyPos.x - this.owner.x;
      const dy = this._lastEnemyPos.y - this.owner.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= 1) {
        const nx = dx / dist,
          ny = dy / dist;
        const bx = this.owner.x + nx * (this.owner.radius + 6);
        const by = this.owner.y + ny * (this.owner.radius + 6);
        const px = -ny * 5,
          py = nx * 5;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(bx + nx * 10, by + ny * 10); // tip
        ctx.lineTo(bx + px, by + py);
        ctx.lineTo(bx - px, by - py);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,120,40,0.92)";
        ctx.fill();
        ctx.restore();
      }
    }

    // Charge-up arc that fills clockwise as lockTimer approaches LOCK_INTERVAL
    if (this._state === "tracking") {
      const frac = Math.min(1, this._lockTimer / this.LOCK_INTERVAL);
      if (frac > 0.1) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,120,40,${0.35 + 0.6 * frac})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(
          this.owner.x,
          this.owner.y,
          this.owner.radius + 8,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * frac,
        );
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  clearState() {
    this.owner._speedOverride = null;
    this._state = "tracking";
    this._lockTimer = 0;
    this._chargeTimer = 0;
    this._explodeTimer = 0;
    this._target = null;
    this._explodePos = null;
    this._damageDone = false;
    this._lingerAccum = 0;
    this._lingerInside = false;
    this._compDamageDone = false;
    this._compLingerAccum = 0;
    this._compLingerInside = false;
  }

  static meta = {
    id: "rocket",
    name: "Cohete",
    description:
      "Fija la posición enemiga, se lanza hacia ella y explota dejando un área de daño.",
    color: "#F39C12",
    icon: "⇑",
    dmgRating: 3,
  };
}
