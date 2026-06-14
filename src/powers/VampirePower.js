import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class VampirePower extends BasePower {
  constructor(owner) {
    super(owner);
    this._angle = 0;
    this._latched = false;
    this._latchTimer = 0;
    this._latchCooldown = 0;
    this._tickAccum = 0;
    this._enemyRef = null;
    this._healNums = []; // floating "+3" heal numbers

    this.LATCH_DURATION = 2.0;
    this.LATCH_COOLDOWN = 1.5;
    this.TICK_INTERVAL = 0.5;
    this.DRAIN_AMOUNT = 3;
    this.LATCH_SPEED = 55;
  }

  update(dt) {
    if (this._latchCooldown > 0) this._latchCooldown -= dt;

    // Tick heal numbers
    for (const n of this._healNums) n.t -= dt * 1.1;
    this._healNums = this._healNums.filter((n) => n.t > 0);

    if (!this._latched) return;
    this._latchTimer -= dt;
    if (this._latchTimer <= 0) {
      this._endLatch();
      return;
    }

    this._tickAccum += dt;
    if (this._tickAccum >= this.TICK_INTERVAL) {
      this._tickAccum -= this.TICK_INTERVAL;
      const e = this._enemyRef;
      if (e && e.isAlive) {
        // Only drain if still physically close (prevents "sucking from afar" if they drifted)
        const dx = e.x - this.owner.x,
          dy = e.y - this.owner.y;
        const maxD = (this.owner.radius + e.radius) * 2.5;
        if (dx * dx + dy * dy < maxD * maxD) {
          this._dealDmg(e, this.DRAIN_AMOUNT);
          const healed = Math.min(
            this.DRAIN_AMOUNT,
            this.owner.maxHp - this.owner.hp,
          );
          this.owner.hp = Math.min(
            this.owner.maxHp,
            this.owner.hp + this.DRAIN_AMOUNT,
          );
          if (healed > 0) {
            this._healNums.push({
              x: this.owner.x + (Math.random() * 16 - 8),
              y: this.owner.y - this.owner.radius - 4,
              val: healed,
              t: 1.0,
            });
          }
          sfx.vampireDrain();
        } else {
          // Drifted too far — break the latch
          this._endLatch();
        }
      }
    }
  }

  onCollide(enemy) {
    if (!this._latched && this._latchCooldown <= 0) this._startLatch(enemy);
  }

  _startLatch(enemy) {
    this._latched = true;
    this._latchTimer = this.LATCH_DURATION;
    this._tickAccum = 0;
    this._enemyRef = enemy;

    // Use _speedOverride so we never touch baseSpeed — no conflict with venom or other modifiers
    this.owner._speedOverride = this.LATCH_SPEED;
    enemy._speedOverride = this.LATCH_SPEED;

    sfx.vampireLatch();
  }

  _endLatch() {
    if (!this._latched) return;
    this._latched = false;

    this.owner._speedOverride = null;

    if (this._enemyRef) {
      this._enemyRef._speedOverride = null;

      // Push the two circles apart so they physically separate and can't immediately re-latch
      const dx = this._enemyRef.x - this.owner.x;
      const dy = this._enemyRef.y - this.owner.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist,
        ny = dy / dist;
      this.owner.vx = -nx * this.owner.baseSpeed;
      this.owner.vy = -ny * this.owner.baseSpeed;
      this._enemyRef.vx = nx * this._enemyRef.baseSpeed;
      this._enemyRef.vy = ny * this._enemyRef.baseSpeed;
    }

    this._enemyRef = null;
    this._latchCooldown = this.LATCH_COOLDOWN;
  }

  onEnemyFrame(enemy) {
    const dx = enemy.x - this.owner.x;
    const dy = enemy.y - this.owner.y;
    this._angle = Math.atan2(dy, dx);

    if (!this._latched) return;
    if (!enemy.isAlive) {
      this._endLatch();
      return;
    }

    // Sync velocities so both circles move as a unit at LATCH_SPEED.
    // clampToBaseSpeed (which runs after) normalizes to LATCH_SPEED automatically.
    let avgVx = (this.owner.vx + enemy.vx) * 0.5;
    let avgVy = (this.owner.vy + enemy.vy) * 0.5;
    const mag = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
    if (mag > 0.5) {
      // Respect arena walls: don't push the pair into a wall the enemy is already touching
      if (this.arena) {
        const r = enemy.radius;
        if (enemy.x - r <= this.arena.left  + 1 && avgVx < 0) avgVx = Math.abs(avgVx);
        if (enemy.x + r >= this.arena.right - 1 && avgVx > 0) avgVx = -Math.abs(avgVx);
        if (enemy.y - r <= this.arena.top   + 1 && avgVy < 0) avgVy = Math.abs(avgVy);
        if (enemy.y + r >= this.arena.bottom- 1 && avgVy > 0) avgVy = -Math.abs(avgVy);
      }
      this.owner.vx = avgVx;
      this.owner.vy = avgVy;
      enemy.vx = avgVx;
      enemy.vy = avgVy;
    } else {
      // Near-zero average (opposite velocities): give both a random shared direction
      const a = Math.random() * Math.PI * 2;
      const vx = Math.cos(a) * this.LATCH_SPEED;
      const vy = Math.sin(a) * this.LATCH_SPEED;
      this.owner.vx = vx;
      this.owner.vy = vy;
      enemy.vx = vx;
      enemy.vy = vy;
    }
  }

  getHitDamage() {
    return 1;
  }

  renderAbove(ctx) {
    this._drawFangs(ctx);
    if (this._latched && this._enemyRef) this._drawDrainLine(ctx);
    this._renderHealNums(ctx);
  }

  _drawFangs(ctx) {
    const { x, y, radius } = this.owner;
    const spread = 0.3;
    ctx.save();
    for (const offset of [-spread * 0.5, spread * 0.5]) {
      const a = this._angle + offset;
      const cosA = Math.cos(a),
        sinA = Math.sin(a);
      const tipX = x + cosA * (radius + 13);
      const tipY = y + sinA * (radius + 13);
      const baseX = x + cosA * radius;
      const baseY = y + sinA * radius;
      const px = -sinA * 4,
        py = cosA * 4;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(baseX + px, baseY + py);
      ctx.lineTo(baseX - px, baseY - py);
      ctx.closePath();
      ctx.fillStyle = "rgba(240,210,210,0.97)";
      ctx.strokeStyle = "rgba(180,50,50,0.9)";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawDrainLine(ctx) {
    const pulse = 0.45 + 0.45 * Math.abs(Math.sin(Date.now() / 190));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.owner.x, this.owner.y);
    ctx.lineTo(this._enemyRef.x, this._enemyRef.y);
    ctx.strokeStyle = `rgba(210,20,20,${0.38 * pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  _renderHealNums(ctx) {
    for (const n of this._healNums) {
      const rise = (1 - n.t) * 38;
      const alpha = n.t < 0.5 ? n.t * 2 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.strokeText(`+${n.val}`, n.x, n.y - rise);
      ctx.fillStyle = "#44ff88";
      ctx.fillText(`+${n.val}`, n.x, n.y - rise);
      ctx.restore();
    }
  }

  static meta = {
    id: "vampire",
    name: "Vampiro",
    description:
      "Los colmillos apuntan al enemigo. Al chocar se adhiere y drena vida para hacer daño y curarse.",
    color: "#8B0000",
    icon: "◆",
    dmgRating: 3,
  };
}
