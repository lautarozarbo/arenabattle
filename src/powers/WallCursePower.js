import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

// wall IDs: 0=left, 1=right, 2=top, 3=bottom
const WALL_NAMES = ["left", "right", "top", "bottom"];

export class WallCursePower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._cursedWalls = []; // active wall IDs, max 2
    this._curseTimer = 2.0; // first curse fires soon
    this._enemyContact = new Set(); // cursed wallIDs enemy is currently touching
    this._healNums = []; // { x, y, t, val }
    this._healCd = {}; // wallId -> remaining cooldown (s)

    this.CURSE_INTERVAL = 5.0;
    this.MAX_CURSED = 2;
    this.HIT_DAMAGE = 2;
    this.HEAL_AMOUNT = 2;
    this.WALL_ZONE = 2; // px inside wall counted as "touching"
    this.HEAL_COOLDOWN = 0.6; // s between heals on the same wall
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _wallFromNormal(n) {
    if (n.x > 0.5) return 0;
    if (n.x < -0.5) return 1;
    if (n.y > 0.5) return 2;
    if (n.y < -0.5) return 3;
    return -1;
  }

  _touchingWall(circle, wallId) {
    const W = this.WALL_ZONE;
    const a = this.arena;
    switch (wallId) {
      case 0:
        return circle.x - circle.radius <= a.left + W;
      case 1:
        return circle.x + circle.radius >= a.right - W;
      case 2:
        return circle.y - circle.radius <= a.top + W;
      case 3:
        return circle.y + circle.radius >= a.bottom - W;
    }
    return false;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    for (const n of this._healNums) n.t -= dt * 1.1;
    this._healNums = this._healNums.filter((n) => n.t > 0);
    for (const k in this._healCd) {
      this._healCd[k] -= dt;
      if (this._healCd[k] <= 0) delete this._healCd[k];
    }

    this._curseTimer += dt;
    if (this._curseTimer >= this.CURSE_INTERVAL) {
      this._curseTimer = 0;
      const uncursed = [0, 1, 2, 3].filter(
        (w) => !this._cursedWalls.includes(w),
      );
      const pool = uncursed.length > 0 ? uncursed : [0, 1, 2, 3];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this._cursedWalls.push(pick);
      if (this._cursedWalls.length > this.MAX_CURSED) this._cursedWalls.shift();
      sfx.wallCurse();
    }
  }

  onWallBounce(wallNormal) {
    const wallId = this._wallFromNormal(wallNormal);
    if (this._cursedWalls.includes(wallId) && !this._healCd[wallId]) {
      const heal = this.HEAL_AMOUNT;
      this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + heal);
      this._healCd[wallId] = this.HEAL_COOLDOWN;
      this._healNums.push({
        x: this.owner.x + (Math.random() * 16 - 8),
        y: this.owner.y - this.owner.radius - 4,
        val: heal,
        t: 1.0,
      });
      sfx.wallCurseHeal();
    }
  }

  onEnemyFrame(enemy) {
    if (!this.arena || !enemy.isAlive) return;
    const nowContact = new Set();
    for (const wallId of this._cursedWalls) {
      if (this._touchingWall(enemy, wallId)) {
        nowContact.add(wallId);
        if (!this._enemyContact.has(wallId)) {
          this._dealDmg(enemy, this.HIT_DAMAGE);
          sfx.wallCurseDamage();
        }
      }
    }
    this._enemyContact = nowContact;
  }

  clearState() {
    this._cursedWalls = [];
    this._enemyContact = new Set();
    this._curseTimer = 0;
    this._healNums = [];
    this._healCd = {};
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    if (!this.arena) return;

    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 480));

    for (const wallId of this._cursedWalls) {
      this._drawCursedWall(ctx, wallId, pulse);
    }

    // Charge arc on owner
    const frac = Math.min(1, this._curseTimer / this.CURSE_INTERVAL);
    if (frac > 0.05) {
      ctx.save();
      ctx.strokeStyle = `rgba(155,89,182,${0.3 + 0.55 * frac})`;
      ctx.lineWidth = 2;
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
  }

  _drawCursedWall(ctx, wallId, pulse) {
    const a = this.arena;
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(155,89,182,${0.5 + 0.4 * pulse})`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(155,89,182,0.7)";
    ctx.beginPath();
    switch (wallId) {
      case 0:
        ctx.moveTo(a.left, a.top);
        ctx.lineTo(a.left, a.bottom);
        break;
      case 1:
        ctx.moveTo(a.right, a.top);
        ctx.lineTo(a.right, a.bottom);
        break;
      case 2:
        ctx.moveTo(a.left, a.top);
        ctx.lineTo(a.right, a.top);
        break;
      case 3:
        ctx.moveTo(a.left, a.bottom);
        ctx.lineTo(a.right, a.bottom);
        break;
    }
    ctx.stroke();

    // Icon on the wall center
    const mid = this._wallMidpoint(wallId, a);
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.85 * pulse;
    ctx.fillStyle = "#ce93d8";
    ctx.fillText("✦", mid.x, mid.y);
    ctx.restore();
  }

  _wallMidpoint(wallId, a) {
    const cx = (a.left + a.right) / 2;
    const cy = (a.top + a.bottom) / 2;
    switch (wallId) {
      case 0:
        return { x: a.left + 10, y: cy };
      case 1:
        return { x: a.right - 10, y: cy };
      case 2:
        return { x: cx, y: a.top + 10 };
      case 3:
        return { x: cx, y: a.bottom - 10 };
    }
  }

  renderAbove(ctx) {
    for (const n of this._healNums) {
      const rise = (1 - n.t) * 36;
      const alpha = n.t < 0.5 ? n.t * 2 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.strokeText("+" + n.val, n.x, n.y - rise);
      ctx.fillStyle = "#a8f0a0";
      ctx.fillText("+" + n.val, n.x, n.y - rise);
      ctx.restore();
    }
  }

  static meta = {
    id: "cursedwall",
    name: "Muro",
    description: "Maldice paredes: al tocarlas se cura y el rival recibe daño.",
    color: "#9B59B6",
    icon: "✦",
    dmgRating: 2,
  };
}
