import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const LAUNCH_CD = 5.5; // s between bomb launches
const BOMB_SPEED = 230; // px/s
const BOMB_FUSE = 2.4; // s until bomb explodes
const BOMB_R = 9; // bomb visual radius
const EXPLOSION_R = 62; // blast radius
const EXPLOSION_DMG = 20;
const SPIKE_COUNT = 10;
const SPIKE_SPEED = 310;
const SPIKE_TRAVEL = 0.3; // s each spike travels before sticking
const SPIKE_LIFE = 5.0; // s spikes stay on field
const SPIKE_DMG = 3;
const SPIKE_HIT_R = 9; // contact radius of stuck spike
const FLASH_DUR = 0.4; // s explosion flash lasts

export class ClusterBombPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._bomb = null; // { x, y, vx, vy, fuse }
    this._spikes = []; // { x, y, vx, vy, travelLeft, life, angle }
    this._flash = null; // { x, y, t, dmgDealt }
    this._launchCd = 2.0; // first bomb comes early
    this._lastEnemyX = 0;
    this._lastEnemyY = 0;
    this._hasEnemy = false;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;
    const a = this.arena;

    // Launch countdown
    if (!this._bomb) {
      this._launchCd -= dt;
      if (this._launchCd <= 0 && this._hasEnemy) {
        this._launch();
        this._launchCd = LAUNCH_CD;
      }
    }

    // Move bomb + wall bounces
    if (this._bomb) {
      const b = this._bomb;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.fuse -= dt;

      if (b.x - BOMB_R < a.left) {
        b.x = a.left + BOMB_R;
        b.vx = Math.abs(b.vx);
      }
      if (b.x + BOMB_R > a.right) {
        b.x = a.right - BOMB_R;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y - BOMB_R < a.top) {
        b.y = a.top + BOMB_R;
        b.vy = Math.abs(b.vy);
      }
      if (b.y + BOMB_R > a.bottom) {
        b.y = a.bottom - BOMB_R;
        b.vy = -Math.abs(b.vy);
      }

      if (b.fuse <= 0) {
        this._explode(b.x, b.y);
        this._bomb = null;
      }
    }

    // Update spikes: travel then stick
    this._spikes = this._spikes.filter((s) => {
      s.life -= dt;
      if (s.life <= 0) return false;

      if (s.travelLeft > 0) {
        const moveDt = Math.min(dt, s.travelLeft);
        s.x += s.vx * moveDt;
        s.y += s.vy * moveDt;
        s.travelLeft -= dt;

        // Clamp to arena walls — spike sticks wherever it lands
        let hit = false;
        if (s.x < a.left) {
          s.x = a.left + 1;
          hit = true;
        }
        if (s.x > a.right) {
          s.x = a.right - 1;
          hit = true;
        }
        if (s.y < a.top) {
          s.y = a.top + 1;
          hit = true;
        }
        if (s.y > a.bottom) {
          s.y = a.bottom - 1;
          hit = true;
        }

        if (hit || s.travelLeft <= 0) {
          s.travelLeft = 0;
          s.vx = 0;
          s.vy = 0;
          sfx.clusterSpikeStick();
        }
      }
      return true;
    });

    // Flash timer
    if (this._flash) {
      this._flash.t -= dt;
      if (this._flash.t <= 0) this._flash = null;
    }
  }

  _launch() {
    const dx = this._lastEnemyX - this.owner.x;
    const dy = this._lastEnemyY - this.owner.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this._bomb = {
      x: this.owner.x + (dx / len) * (this.owner.radius + BOMB_R + 5),
      y: this.owner.y + (dy / len) * (this.owner.radius + BOMB_R + 5),
      vx: (dx / len) * BOMB_SPEED,
      vy: (dy / len) * BOMB_SPEED,
      fuse: BOMB_FUSE,
    };
    sfx.clusterLaunch();
  }

  _explode(ex, ey) {
    this._flash = { x: ex, y: ey, t: FLASH_DUR, dmgDealt: false };
    sfx.clusterExplode();

    // Scatter spikes evenly with small random offset per angle
    for (let i = 0; i < SPIKE_COUNT; i++) {
      const baseAngle = (i / SPIKE_COUNT) * Math.PI * 2;
      const angle = baseAngle + (Math.random() - 0.5) * 0.45;
      const speed = SPIKE_SPEED * (0.8 + Math.random() * 0.4);
      this._spikes.push({
        x: ex,
        y: ey,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        travelLeft: SPIKE_TRAVEL * (0.8 + Math.random() * 0.5),
        life: SPIKE_LIFE,
        angle: angle,
      });
    }
  }

  // ── Enemy interactions ──────────────────────────────────────────────────────

  onEnemyFrame(enemy, dt) {
    if (!enemy.isAlive) return;
    this._hasEnemy = true;
    this._lastEnemyX = enemy.x;
    this._lastEnemyY = enemy.y;

    // Explosion blast damage (edge-trigger on first frame of flash)
    if (this._flash && !this._flash.dmgDealt) {
      const dx = enemy.x - this._flash.x;
      const dy = enemy.y - this._flash.y;
      if (dx * dx + dy * dy < (EXPLOSION_R + enemy.radius) ** 2) {
        this._dealDmg(enemy, EXPLOSION_DMG);
        sfx.clusterBlastHit();
      }
      this._flash.dmgDealt = true;
    }

    // Stuck spike contact
    const r2 = (enemy.radius + SPIKE_HIT_R) ** 2;
    this._spikes = this._spikes.filter((s) => {
      if (s.travelLeft > 0) return true; // still flying
      const dx = enemy.x - s.x;
      const dy = enemy.y - s.y;
      if (dx * dx + dy * dy < r2) {
        this._dealDmg(enemy, SPIKE_DMG);
        sfx.clusterSpikeHit();
        return false; // spike consumed on hit
      }
      return true;
    });
  }

  clearState() {
    this._bomb = null;
    this._spikes = [];
    this._flash = null;
    this._launchCd = LAUNCH_CD;
    this._hasEnemy = false;
  }

  getNetState() {
    return {
      bomb:     this._bomb ? { ...this._bomb } : null,
      spikes:   this._spikes.map(s => ({ ...s })),
      flash:    this._flash ? { ...this._flash } : null,
      launchCd: this._launchCd,
    };
  }
  applyNetState(s) {
    this._bomb    = s.bomb;
    this._spikes  = s.spikes;
    this._flash   = s.flash;
    this._launchCd = s.launchCd;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    if (!this.arena) return;

    // Stuck spikes (draw on floor before circles)
    for (const s of this._spikes) {
      if (s.travelLeft > 0) continue;
      const alpha = Math.min(1, s.life * 0.4);
      this._drawSpike(ctx, s.x, s.y, s.angle, alpha);
    }
  }

  renderAbove(ctx) {
    // Flying spikes
    for (const s of this._spikes) {
      if (s.travelLeft <= 0) continue;
      this._drawSpike(ctx, s.x, s.y, s.angle, 0.85);
    }

    // Explosion flash
    if (this._flash) {
      const frac = this._flash.t / FLASH_DUR; // 1→0
      ctx.save();
      // Outer fireball
      ctx.globalAlpha = frac * 0.65;
      ctx.beginPath();
      ctx.arc(
        this._flash.x,
        this._flash.y,
        EXPLOSION_R * (0.5 + 0.5 * frac),
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#FF7700";
      ctx.fill();
      // Inner core
      ctx.globalAlpha = frac * 0.55;
      ctx.beginPath();
      ctx.arc(
        this._flash.x,
        this._flash.y,
        EXPLOSION_R * 0.55 * frac,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.restore();
    }

    // Bomb in flight
    if (this._bomb) {
      const b = this._bomb;
      const dangerFrac = 1 - b.fuse / BOMB_FUSE; // 0→1
      const pulseHz = 1.5 + dangerFrac * 7;
      const pulse =
        0.6 + 0.4 * Math.abs(Math.sin((Date.now() / 1000) * pulseHz));
      const cr = Math.round(80 + dangerFrac * 175);
      const cg = Math.round(Math.max(0, 200 - dangerFrac * 200));

      ctx.save();
      // Bomb body
      ctx.beginPath();
      ctx.arc(b.x, b.y, BOMB_R, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a1a";
      ctx.fill();
      ctx.strokeStyle = `rgba(${cr},${cg},0,${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Fuse spark
      ctx.beginPath();
      ctx.arc(b.x, b.y - BOMB_R, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD700";
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#FFAA00";
      ctx.fill();
      ctx.restore();
    }

    // Cooldown arc on owner (when no bomb is flying)
    if (!this._bomb) {
      const frac = Math.max(0, 1 - this._launchCd / LAUNCH_CD);
      if (frac > 0.04) {
        ctx.save();
        ctx.strokeStyle = `rgba(200,100,0,${0.3 + 0.5 * frac})`;
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
  }

  _drawSpike(ctx, x, y, angle, alpha) {
    const len = 11;
    const w = 4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(len, 0); // tip
    ctx.lineTo(-w * 0.6, -w); // back-left
    ctx.lineTo(-w * 0.3, 0); // center dip
    ctx.lineTo(-w * 0.6, w); // back-right
    ctx.closePath();
    ctx.fillStyle = "#999";
    ctx.fill();
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  static meta = {
    id: "clusterbomb",
    name: "Racimo",
    description: "Lanza bombas que explotan esparciendo púas.",
    color: "#808080",
    icon: "✳",
    dmgRating: 3,
  };
}
