import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class BloodShardPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._tickTimer = 0;
    this._tickCount = 0;
    this._shards = []; // { x, y, vx, vy, life, angle }

    this.TICK_INTERVAL = 0.65;
    this.SELF_DAMAGE = 1;
    this.SHARD_SPEED = 370;
    this.SHARD_LIFE = 1.3;
    this.SHARD_DAMAGE = 6;
    this.SHARD_R = 7; // collision radius
  }

  _fireShardsFrom(ox, oy) {
    // 8 shards at 45° intervals, randomly rotated per burst for variety
    const baseAngle = Math.random() * (Math.PI / 4);
    for (let i = 0; i < 8; i++) {
      const angle = baseAngle + (i / 8) * Math.PI * 2;
      this._shards.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * this.SHARD_SPEED,
        vy: Math.sin(angle) * this.SHARD_SPEED,
        life: this.SHARD_LIFE,
        angle,
      });
    }
    sfx.glassPlace();
  }

  update(dt) {
    this._tickTimer += dt;
    if (this._tickTimer >= this.TICK_INTERVAL) {
      this._tickTimer -= this.TICK_INTERVAL;
      this._tickCount++;

      if (this.owner.isAlive) {
        this.owner.takeDamage(this.SELF_DAMAGE);
        sfx.bleedTick();
      }

      if (this._tickCount % 2 === 0) {
        this._fireShardsFrom(this.owner.x, this.owner.y);
      }
    }

    for (const s of this._shards) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }

    if (this.arena) {
      const { left, right, top, bottom } = this.arena;
      this._shards = this._shards.filter(
        (s) =>
          s.life > 0 &&
          s.x > left - 10 &&
          s.x < right + 10 &&
          s.y > top - 10 &&
          s.y < bottom + 10,
      );
    } else {
      this._shards = this._shards.filter((s) => s.life > 0);
    }
  }

  _hitCheck(circle) {
    if (!circle.isAlive) return;
    const threshold = (this.SHARD_R + circle.radius) ** 2;
    for (const s of this._shards) {
      if (s.life <= 0) continue;
      const dx = circle.x - s.x,
        dy = circle.y - s.y;
      if (dx * dx + dy * dy < threshold) {
        this._dealDmg(circle, this.SHARD_DAMAGE);
        sfx.glassBreak();
        s.life = 0;
        break; // one shard hit per circle per frame
      }
    }
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;
    this._hitCheck(enemy);
    const comp = enemy.power?._comp;
    if (comp?.isAlive) this._hitCheck(comp);
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    for (const s of this._shards) {
      const fade = s.life / this.SHARD_LIFE;
      if (fade <= 0) continue;

      const cos = Math.cos(s.angle),
        sin = Math.sin(s.angle);
      const LEN = 13;

      ctx.save();
      ctx.lineCap = "round";

      // Trail
      ctx.beginPath();
      ctx.moveTo(s.x - cos * LEN * 2.2, s.y - sin * LEN * 2.2);
      ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = `rgba(160,0,40,${0.35 * fade})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Crystal diamond body
      ctx.beginPath();
      ctx.moveTo(s.x + cos * LEN, s.y + sin * LEN); // front tip
      ctx.lineTo(s.x - sin * 5, s.y + cos * 5); // left wing
      ctx.lineTo(s.x - cos * LEN * 0.45, s.y - sin * LEN * 0.45); // back
      ctx.lineTo(s.x + sin * 5, s.y - cos * 5); // right wing
      ctx.closePath();
      ctx.fillStyle = `rgba(210,20,55,${0.9 * fade})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,120,140,${0.65 * fade})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bright inner highlight
      ctx.beginPath();
      ctx.moveTo(s.x + cos * LEN * 0.7, s.y + sin * LEN * 0.7);
      ctx.lineTo(s.x - sin * 2, s.y + cos * 2);
      ctx.lineTo(s.x - cos * LEN * 0.2, s.y - sin * LEN * 0.2);
      ctx.lineTo(s.x + sin * 2, s.y - cos * 2);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,180,180,${0.45 * fade})`;
      ctx.fill();

      ctx.restore();
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;
    const progress = this._tickTimer / this.TICK_INTERVAL; // 0→1 within current tick
    const nextFires = this._tickCount % 2 !== 0; // next tick will fire shards
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 160));

    ctx.save();

    // Arc filling up to the next tick
    ctx.strokeStyle = `rgba(200,20,50,${0.45 + 0.5 * progress})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      radius + 7,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * progress,
    );
    ctx.stroke();

    // When about to fire shards: bright crimson glow
    if (nextFires && progress > 0.65) {
      const intensity = (progress - 0.65) / 0.35;
      ctx.beginPath();
      ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,60,80,${0.5 * intensity * pulse})`;
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // Blood drip dots orbiting the circle
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Date.now() / 600;
      const r2 = radius + 7 + Math.sin(Date.now() / 200 + i) * 2;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(ang) * r2,
        y + Math.sin(ang) * r2,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = `rgba(200,10,40,${0.7 * pulse})`;
      ctx.fill();
    }

    ctx.restore();
  }

  clearState() {
    this._shards = [];
  }

  static meta = {
    id: "bloodshard",
    name: "Sanguíneo",
    description:
      "Pierde vida. Dispara 8 cristales de sangre en todas direcciones.",
    color: "#C0392B",
    icon: "◈",
    dmgRating: 4,
  };
}
