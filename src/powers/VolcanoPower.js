import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class VolcanoPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._state = "charging";
    this._chargeTimer = 0;
    this._rays = [];
    // Embers: small sparks that appear on the owner while charging
    this._embers = [];

    this._active = new Set(); // ray IDs enemy is currently inside (edge-trigger)
    this._compActive = new Set(); // same for DUO companion
    this._nextId = 0;

    this.CHARGE_TIME = 7.0;
    this.RAY_COUNT = 3;
    this.RAY_LIFE = 3.5; // seconds each ray lasts
    this.RAY_WIDTH = 14; // px — hit half-width around the ray line
    this.RAY_DAMAGE = 8; // damage each time enemy crosses a ray
  }

  // Extend a ray from (ox,oy) in direction (cos,sin) until it hits an arena wall
  _castToWall(ox, oy, cos, sin) {
    const { left, right, top, bottom } = this.arena;
    let t = 1e9;
    if (cos > 1e-9) t = Math.min(t, (right - ox) / cos);
    if (cos < -1e-9) t = Math.min(t, (left - ox) / cos);
    if (sin > 1e-9) t = Math.min(t, (bottom - oy) / sin);
    if (sin < -1e-9) t = Math.min(t, (top - oy) / sin);
    return { x: ox + cos * t, y: oy + sin * t };
  }

  // Minimum distance from point (px,py) to segment (ax,ay)→(bx,by)
  _distToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax,
      dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 0.001) return Math.hypot(px - ax, py - ay);
    const t = Math.max(
      0,
      Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq),
    );
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  _fireRays() {
    const { x, y } = this.owner;
    // 3 rays spaced ~120° apart, random base rotation
    const base = Math.random() * Math.PI * 2;
    this._rays = [];
    for (let i = 0; i < this.RAY_COUNT + this._extraProj(); i++) {
      const angle =
        base +
        ((Math.PI * 2) / (this.RAY_COUNT + this._extraProj())) * i +
        (Math.random() - 0.5) * 0.55;
      const cos = Math.cos(angle),
        sin = Math.sin(angle);
      const end = this._castToWall(x, y, cos, sin);
      this._rays.push({
        id: this._nextId++,
        ox: x,
        oy: y,
        ex: end.x,
        ey: end.y,
        life: this.RAY_LIFE,
      });
    }
    this.owner._speedOverride = 0; // freeze while firing
    sfx.volcanoFire();
  }

  update(dt) {
    if (!this.arena) return;

    // Ember particles — only active when brasas skin is equipped
    for (const e of this._embers) {
      e.life -= dt;
      e.y -= e.vy * dt;
      e.x += e.vx * dt;
    }
    this._embers = this._embers.filter((e) => e.life > 0);
    if (this.owner.skinId === 'brasas' && Math.random() < 0.35) {
      const a = Math.random() * Math.PI * 2;
      this._embers.push({
        x: this.owner.x + Math.cos(a) * this.owner.radius,
        y: this.owner.y + Math.sin(a) * this.owner.radius,
        vx: Math.cos(a) * (8 + Math.random() * 22),
        vy: 22 + Math.random() * 38,
        life: 0.5 + Math.random() * 0.6,
      });
    }

    if (this._state === "charging") {
      this._chargeTimer += dt;
      if (this._chargeTimer >= this._cd(this.CHARGE_TIME)) {
        this._chargeTimer = 0;
        this._state = "firing";
        this._fireRays();
      }
    } else {
      for (const r of this._rays) r.life -= dt;
      this._rays = this._rays.filter((r) => r.life > 0);
      if (this._rays.length === 0) {
        this.owner._speedOverride = null; // unfreeze
        this._state = "charging";
        this._chargeTimer = 0;
        this._active.clear();
        this._compActive.clear();
      }
    }
  }

  onEnemyFrame(enemy) {
    if (this._rays.length === 0 || !enemy.isAlive) return;

    // Edge-trigger: damage fires the moment the enemy enters a ray (crosses it)
    const nowActive = new Set();
    for (const r of this._rays) {
      if (
        this._distToSeg(enemy.x, enemy.y, r.ox, r.oy, r.ex, r.ey) <
        enemy.radius + this.RAY_WIDTH
      ) {
        nowActive.add(r.id);
        if (!this._active.has(r.id)) {
          this._dealDmg(enemy, this.RAY_DAMAGE);
          sfx.volcanoHit();
        }
      }
    }
    this._active = nowActive;

    // DUO companion
    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      const compNow = new Set();
      for (const r of this._rays) {
        if (
          this._distToSeg(comp.x, comp.y, r.ox, r.oy, r.ex, r.ey) <
          comp.radius + this.RAY_WIDTH
        ) {
          compNow.add(r.id);
          if (!this._compActive.has(r.id)) {
            this._dealDmg(comp, this.RAY_DAMAGE);
            sfx.volcanoHit();
          }
        }
      }
      this._compActive = compNow;
    } else {
      this._compActive = new Set();
    }
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    if (this._state !== "firing") return;

    for (const r of this._rays) {
      const fade = r.life / this.RAY_LIFE;
      const shimmer = 0.85 + 0.15 * Math.sin(Date.now() / 75 + r.ox * 0.05);

      ctx.save();
      ctx.lineCap = "round";

      // Outer heat glow
      ctx.beginPath();
      ctx.moveTo(r.ox, r.oy);
      ctx.lineTo(r.ex, r.ey);
      ctx.strokeStyle = `rgba(255,70,0,${0.2 * fade * shimmer})`;
      ctx.lineWidth = 32;
      ctx.stroke();

      // Mid orange layer
      ctx.beginPath();
      ctx.moveTo(r.ox, r.oy);
      ctx.lineTo(r.ex, r.ey);
      ctx.strokeStyle = `rgba(255,140,20,${0.58 * fade})`;
      ctx.lineWidth = 14;
      ctx.stroke();

      // Bright lava core
      ctx.beginPath();
      ctx.moveTo(r.ox, r.oy);
      ctx.lineTo(r.ex, r.ey);
      ctx.strokeStyle = `rgba(255,220,60,${0.92 * fade})`;
      ctx.lineWidth = 5;
      ctx.stroke();

      // White-hot centre
      ctx.beginPath();
      ctx.moveTo(r.ox, r.oy);
      ctx.lineTo(r.ex, r.ey);
      ctx.strokeStyle = `rgba(255,255,210,${0.65 * fade})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Splatter glow at wall impact
      const splat = 14 * fade * shimmer;
      ctx.beginPath();
      ctx.arc(r.ex, r.ey, splat, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,180,30,${0.55 * fade})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r.ex, r.ey, splat * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,160,${0.7 * fade})`;
      ctx.fill();

      ctx.restore();
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;

    // Embers (float upward from the circle edge)
    for (const e of this._embers) {
      const a = e.life * 2.5;
      ctx.save();
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = `rgba(255,${100 + Math.floor(Math.random() * 80)},0,0.9)`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this._state === "charging") {
      const frac = Math.min(1, this._chargeTimer / this.CHARGE_TIME);
      if (frac > 0.02) {
        ctx.save();
        // Filling charge arc
        ctx.strokeStyle = `rgba(255,110,0,${0.4 + 0.6 * frac})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          radius + 8,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * frac,
        );
        ctx.stroke();

        // Pulsing heat ring when close to ready
        if (frac > 0.75) {
          const heat = (frac - 0.75) / 0.25;
          const pulse = Math.abs(Math.sin(Date.now() / 85));
          ctx.beginPath();
          ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,50,0,${0.4 * heat * pulse})`;
          ctx.lineWidth = 6;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    if (this._state === "firing") {
      // Magma corona around frozen owner
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 100));
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,100,0,${0.65 * pulse})`;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,200,50,${0.3 * pulse})`;
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.restore();
    }
  }

  clearState() {
    this._rays = [];
    this._embers = [];
    this._active = new Set();
    this._compActive = new Set();
    this.owner._speedOverride = null;
    this._state = "charging";
    this._chargeTimer = 0;
  }

  static meta = {
    id: "volcano",
    name: "Volcán",
    description:
      "Carga y dispara rayos de lava. Se inmoviliza mientras dispara.",
    color: "#CC3300",
    icon: "▲",
    dmgRating: 4,
  };
}
