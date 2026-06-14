import { BasePower } from "./BasePower.js";

const ZONE_COOLDOWN = 8;
const ZONE_LIFE = 5.0;
const ZONE_RADIUS = 55;
const DOT_DMG = 1;
const DOT_INTERVAL = 0.5;
const COW_SPAWN_DELAY = 1.2;
const COW_LIFE = 4.0;
const COW_SPEED = 115;
const COW_RADIUS = 14;
const COW_DMG = 5;
const COW_DMG_CD = 0.55;
const COW_TURN = 3.2; // rad/s max turn rate

export class AlienPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._spawnCd = ZONE_COOLDOWN * 0.35;
    this._zones = []; // { x, y, life, dotCd, cowSpawnCd, cow }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    this._spawnCd -= dt;
    if (this._spawnCd <= 0) {
      this._spawnCd = ZONE_COOLDOWN;
      this._spawnZone();
    }

    for (const z of this._zones) {
      z.life -= dt;
      if (z.dotCd > 0) z.dotCd -= dt;

      // Cow spawn countdown
      if (!z.cow && z.cowSpawnCd > 0) {
        z.cowSpawnCd -= dt;
        if (z.cowSpawnCd <= 0) {
          const ang = Math.random() * Math.PI * 2;
          z.cow = {
            x: z.x,
            y: z.y,
            vx: Math.cos(ang) * COW_SPEED,
            vy: Math.sin(ang) * COW_SPEED,
            life: COW_LIFE,
            dmgCd: 0,
          };
        }
      }

      // Move cow
      if (z.cow) {
        const c = z.cow;
        c.life -= dt;
        if (c.dmgCd > 0) c.dmgCd -= dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;

        const { left, right, top, bottom } = this.arena;
        if (c.x - COW_RADIUS < left) {
          c.x = left + COW_RADIUS;
          c.vx *= -1;
        }
        if (c.x + COW_RADIUS > right) {
          c.x = right - COW_RADIUS;
          c.vx *= -1;
        }
        if (c.y - COW_RADIUS < top) {
          c.y = top + COW_RADIUS;
          c.vy *= -1;
        }
        if (c.y + COW_RADIUS > bottom) {
          c.y = bottom - COW_RADIUS;
          c.vy *= -1;
        }

        if (c.life <= 0) z.cow = null;
      }
    }

    this._zones = this._zones.filter((z) => z.life > 0);
  }

  _spawnZone() {
    const { left, right, top, bottom } = this.arena;
    const m = ZONE_RADIUS + 10;
    const W = right - left - m * 2;
    const H = bottom - top - m * 2;
    if (W <= 0 || H <= 0) return;

    let x,
      y,
      tries = 0;
    do {
      x = left + m + Math.random() * W;
      y = top + m + Math.random() * H;
      tries++;
    } while (
      tries < 12 &&
      Math.hypot(x - this.owner.x, y - this.owner.y) <
        ZONE_RADIUS + this.owner.radius + 25
    );

    this._zones.push({
      x,
      y,
      life: ZONE_LIFE,
      dotCd: 0,
      cowSpawnCd: COW_SPAWN_DELAY,
      cow: null,
    });
  }

  // ── Enemy interactions ───────────────────────────────────────────────────────

  onEnemyFrame(enemy, dt) {
    if (!enemy.isAlive) return;

    for (const z of this._zones) {
      // Zone DoT
      const dx = enemy.x - z.x,
        dy = enemy.y - z.y;
      if (
        dx * dx + dy * dy < (ZONE_RADIUS + enemy.radius) ** 2 &&
        z.dotCd <= 0
      ) {
        this._dealDmg(enemy, DOT_DMG);
        z.dotCd = DOT_INTERVAL;
      }

      // Cow collision + homing steering
      if (!z.cow) continue;
      const c = z.cow;

      const ex = enemy.x - c.x,
        ey = enemy.y - c.y;
      if (
        c.dmgCd <= 0 &&
        ex * ex + ey * ey < (COW_RADIUS + enemy.radius) ** 2
      ) {
        this._dealDmg(enemy, COW_DMG);
        c.dmgCd = COW_DMG_CD;
      }

      // Steer cow toward enemy
      const targetAngle = Math.atan2(ey, ex);
      const curAngle = Math.atan2(c.vy, c.vx);
      let da = targetAngle - curAngle;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      const maxTurn = COW_TURN * dt;
      const newAngle = curAngle + Math.max(-maxTurn, Math.min(maxTurn, da));
      c.vx = Math.cos(newAngle) * COW_SPEED;
      c.vy = Math.sin(newAngle) * COW_SPEED;
    }
  }

  clearState() {
    this._spawnCd = ZONE_COOLDOWN * 0.35;
    this._zones = [];
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    for (const z of this._zones) {
      const elapsed = ZONE_LIFE - z.life;
      const fadeIn = Math.min(1, elapsed / 0.4);
      const fadeOut = Math.min(1, z.life / 0.35);
      const alpha = Math.min(fadeIn, fadeOut);
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 420));

      ctx.save();

      // Beam of light going upward
      const beamW = ZONE_RADIUS * 0.48;
      const beamH = ZONE_RADIUS * 2.8;
      ctx.beginPath();
      ctx.moveTo(z.x - beamW, z.y);
      ctx.lineTo(z.x + beamW, z.y);
      ctx.lineTo(z.x + beamW * 0.08, z.y - beamH);
      ctx.lineTo(z.x - beamW * 0.08, z.y - beamH);
      ctx.closePath();
      ctx.fillStyle = `rgba(80,255,140,${0.11 * pulse * alpha})`;
      ctx.fill();

      // Zone fill glow
      ctx.beginPath();
      ctx.arc(z.x, z.y, ZONE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(30,200,80,${0.09 * alpha})`;
      ctx.fill();

      // Crop circle rings
      for (let i = 3; i >= 0; i--) {
        const rr = ZONE_RADIUS * (0.26 + i * 0.245);
        ctx.beginPath();
        ctx.arc(z.x, z.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(50,220,100,${(0.18 + 0.08 * i) * alpha})`;
        ctx.lineWidth = i === 3 ? 2.0 : 1.2;
        ctx.stroke();
      }

      // Cross lines (crop circle pattern)
      ctx.strokeStyle = `rgba(50,220,100,${0.13 * alpha})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(
          z.x + Math.cos(a) * ZONE_RADIUS,
          z.y + Math.sin(a) * ZONE_RADIUS,
        );
        ctx.lineTo(
          z.x - Math.cos(a) * ZONE_RADIUS,
          z.y - Math.sin(a) * ZONE_RADIUS,
        );
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  renderAbove(ctx) {
    // Cooldown ring
    const frac = Math.min(1, 1 - this._spawnCd / ZONE_COOLDOWN);
    if (frac > 0.04) {
      ctx.save();
      ctx.strokeStyle = `rgba(50,220,100,${0.3 + 0.6 * frac})`;
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

    // Cows
    for (const z of this._zones) {
      if (!z.cow) continue;
      const c = z.cow;
      const alpha = Math.min(1, c.life / 0.5);
      this._drawCow(ctx, c.x, c.y, COW_RADIUS, Math.atan2(c.vy, c.vx), alpha);
    }
  }

  _drawCow(ctx, x, y, r, facing, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(facing);

    const bw = r * 1.35,
      bh = r * 0.85;

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(245,240,222,0.93)";
    ctx.fill();
    ctx.strokeStyle = "rgba(50,35,15,0.60)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Spots
    ctx.fillStyle = "rgba(22,14,4,0.68)";
    ctx.beginPath();
    ctx.ellipse(
      -bw * 0.18,
      -bh * 0.32,
      bw * 0.28,
      bh * 0.22,
      0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      bw * 0.28,
      bh * 0.28,
      bw * 0.2,
      bh * 0.18,
      -0.2,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(bw * 0.92, 0, r * 0.6, r * 0.52, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(245,240,222,0.93)";
    ctx.fill();
    ctx.strokeStyle = "rgba(50,35,15,0.60)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Snout
    ctx.beginPath();
    ctx.ellipse(bw * 0.92 + r * 0.52, 0, r * 0.21, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(210,168,152,0.85)";
    ctx.fill();

    // Eye
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(bw * 0.88, -r * 0.23, r * 0.11, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  static meta = {
    id: "alien",
    name: "Alien",
    description:
      "Invoca zonas de abducción que dañan con el tiempo y hace aparecer una vaca perseguidora.",
    color: "#32CD32",
    icon: "◉",
    dmgRating: 2,
  };
}
