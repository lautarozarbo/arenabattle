import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const TURRET_R = 10;
const BARREL_LEN = 14;
const BULLET_SPEED = 480;
const BULLET_LIFE = 1.6;
const BULLET_DMG = 3;
const BURST_SHOTS = 4;
const BURST_INTERVAL = 0.1; // s between shots in burst
const BURST_COOLDOWN = 2.4; // s between bursts
const SPAWN_INTERVAL = 5.0; // s between new turret spawns
const MAX_TURRETS = 2;
const ROT_SPEED = 5; // rad/s tracking rotation

export class TurretPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._turrets = []; // { x, y, ci, angle, burstCd, burstLeft, burstAccum }
    this._bullets = []; // { x, y, vx, vy, life }
    this._spawnTimer = 2.5; // first turret after 2.5 s
    this._lastEnemyX = 0;
    this._lastEnemyY = 0;
    this._hasEnemy = false;
  }

  // ── Corners ───────────────────────────────────────────────────────────────

  _corners() {
    const a = this.arena,
      m = TURRET_R + 10;
    return [
      { x: a.left + m, y: a.top + m },
      { x: a.right - m, y: a.top + m },
      { x: a.right - m, y: a.bottom - m },
      { x: a.left + m, y: a.bottom - m },
    ];
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    // Spawn timer
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnTimer = SPAWN_INTERVAL;
      this._spawnTurret();
    }

    // Turret logic
    for (const t of this._turrets) this._updateTurret(t, dt);

    // Move bullets, cull out-of-bounds
    const a = this.arena;
    this._bullets = this._bullets.filter((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      return (
        b.life > 0 &&
        b.x > a.left &&
        b.x < a.right &&
        b.y > a.top &&
        b.y < a.bottom
      );
    });
  }

  _spawnTurret() {
    const corners = this._corners();
    const occupied = new Set(this._turrets.map((t) => t.ci));
    const avail = [0, 1, 2, 3].filter((i) => !occupied.has(i));
    if (avail.length === 0) return;
    const ci = avail[Math.floor(Math.random() * avail.length)];

    if (this._turrets.length >= MAX_TURRETS) this._turrets.shift();

    const { x, y } = corners[ci];
    this._turrets.push({
      x,
      y,
      ci,
      angle: 0,
      burstCd: 1.0, // short initial delay
      burstLeft: 0,
      burstAccum: 0,
    });
    sfx.turretSpawn();
  }

  _updateTurret(t, dt) {
    if (!this._hasEnemy) return;

    // Smooth rotation toward enemy
    const dx = this._lastEnemyX - t.x;
    const dy = this._lastEnemyY - t.y;
    const target = Math.atan2(dy, dx);
    let diff = target - t.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    t.angle += diff * Math.min(1, dt * ROT_SPEED);

    if (t.burstLeft > 0) {
      // Mid-burst: fire at current tracked angle (natural spread from movement)
      t.burstAccum += dt;
      if (t.burstAccum >= BURST_INTERVAL) {
        t.burstAccum -= BURST_INTERVAL;
        this._fireBullet(t.x, t.y, t.angle);
        t.burstLeft--;
        if (t.burstLeft === 0) t.burstCd = BURST_COOLDOWN;
      }
    } else {
      t.burstCd -= dt;
      if (t.burstCd <= 0) {
        t.burstLeft = BURST_SHOTS;
        t.burstAccum = 0;
        sfx.turretBurstStart();
      }
    }
  }

  _fireBullet(tx, ty, angle) {
    this._bullets.push({
      x: tx + Math.cos(angle) * (BARREL_LEN + 2),
      y: ty + Math.sin(angle) * (BARREL_LEN + 2),
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      life: BULLET_LIFE,
    });
    sfx.turretShot();
  }

  // ── Enemy interaction ─────────────────────────────────────────────────────

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;
    this._hasEnemy = true;
    this._lastEnemyX = enemy.x;
    this._lastEnemyY = enemy.y;

    this._checkBulletHits(enemy, false);

    const comp = enemy.power?._comp;
    if (comp?.isAlive) this._checkBulletHits(comp, true);
  }

  _checkBulletHits(target, isComp) {
    const r2 = (target.radius + 4) ** 2;
    this._bullets = this._bullets.filter((b) => {
      const dx = target.x - b.x,
        dy = target.y - b.y;
      if (dx * dx + dy * dy < r2) {
        this._dealDmg(target, BULLET_DMG);
        sfx.turretHit();
        return false;
      }
      return true;
    });
  }

  clearState() {
    this._turrets = [];
    this._bullets = [];
    this._spawnTimer = SPAWN_INTERVAL;
    this._hasEnemy = false;
  }

  getNetState() {
    return {
      turrets: this._turrets.map(t => ({ ...t })),
      bullets: this._bullets.map(b => ({ ...b })),
      spawnTimer: this._spawnTimer,
    };
  }

  applyNetState(s) {
    this._turrets   = s.turrets;
    this._bullets   = s.bullets;
    this._spawnTimer = s.spawnTimer;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    // Bullets
    for (const b of this._bullets) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, b.life * 3);
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD700";
      ctx.shadowBlur = 4;
      ctx.shadowColor = "#FFD700";
      ctx.fill();
      ctx.restore();
    }

    // Turrets
    for (const t of this._turrets) this._drawTurret(ctx, t);

    // Spawn-arc on owner (always visible so player knows when next turret arrives)
    const frac = Math.max(0, 1 - this._spawnTimer / SPAWN_INTERVAL);
    if (frac > 0.04) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,210,0,${0.3 + 0.5 * frac})`;
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

  _drawTurret(ctx, t) {
    const R = TURRET_R;
    const firing = t.burstLeft > 0;
    const pulse = firing ? 0.8 + 0.2 * Math.abs(Math.sin(Date.now() / 60)) : 1;

    ctx.save();
    ctx.translate(t.x, t.y);

    // Base
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-R, -R, R * 2, R * 2);

    // Border
    ctx.strokeStyle = firing
      ? `rgba(255,220,0,${0.9 * pulse})`
      : this.owner.color;
    ctx.lineWidth = firing ? 2.5 : 1.5;
    ctx.strokeRect(-R, -R, R * 2, R * 2);

    // Barrel (rotates with tracking)
    ctx.save();
    ctx.rotate(t.angle);
    ctx.strokeStyle = firing ? `rgba(255,220,0,${pulse})` : this.owner.color;
    ctx.lineWidth = firing ? 3.5 : 2.5;
    ctx.lineCap = "round";
    if (firing) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#FFD700";
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(BARREL_LEN, 0);
    ctx.stroke();
    ctx.restore();

    // Pivot dot
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = firing ? "#FFD700" : this.owner.color;
    ctx.fill();

    // Burst-cooldown arc around turret base
    if (!firing) {
      const frac = Math.max(0, 1 - t.burstCd / BURST_COOLDOWN);
      if (frac > 0.05) {
        ctx.strokeStyle = `rgba(255,200,0,${0.2 + 0.4 * frac})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, R + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  static meta = {
    id: "turret",
    name: "Torretas",
    description:
      "Coloca torretas en las esquinas. Apuntan al enemigo y disparan ráfagas.",
    color: "#F1C40F",
    icon: "⊕",
    dmgRating: 3,
  };
}
