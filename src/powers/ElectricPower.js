import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

// Jagged lightning bolt between two points — random each call → natural flicker
function drawBolt(ctx, x1, y1, x2, y2, segs = 7, rough = 18) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const pts = [{ x: x1, y: y1 }];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    pts.push({
      x: x1 + dx * t + (Math.random() - 0.5) * rough,
      y: y1 + dy * t + (Math.random() - 0.5) * rough,
    });
  }
  pts.push({ x: x2, y: y2 });
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

export class ElectricPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._state = "charging"; // 'charging' | 'charged' | 'shocking'
    this._chargeTimer = 0;
    this._shockTimer = 0;
    this._shockAccum = 0;
    this._shockedEnemy = null;
    this._sparkAngle = 0;

    this.CHARGE_DURATION = 2.5;
    this.SHOCK_DURATION = 2.5;
    this.SHOCK_DPS = 3;
    this.SHOCK_TICK = 0.5;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    this._sparkAngle += dt * 3.5;

    if (this._state === "charging") {
      this._chargeTimer += dt;
      if (this._chargeTimer >= this.CHARGE_DURATION) this._state = "charged";
    } else if (this._state === "shocking") {
      this._shockTimer -= dt;
      this._shockAccum += dt;
      if (this._shockAccum >= this.SHOCK_TICK) {
        if (this._shockedEnemy?.isAlive) {
          this._shockedEnemy.takeDamage(this.SHOCK_DPS);
          sfx.electricZap();
        }
        this._shockAccum -= this.SHOCK_TICK;
      }
      if (this._shockTimer <= 0) this._endShock();
    }
  }

  // ── Enemy interactions ────────────────────────────────────────────────────

  // Shock triggers here — onCollide fires after _handlePair detects a real collision,
  // reliably even though the circles are already separated by the physics step.
  onCollide(enemy) {
    if (!enemy.isAlive || enemy._invulnerable) return;
    if (this._state === "charged") this._startShock(enemy);
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;

    // If the enemy turned invulnerable mid-shock (chess activating), abort cleanly
    // without touching its speed — that power manages its own state.
    if (
      this._state === "shocking" &&
      this._shockedEnemy === enemy &&
      enemy._invulnerable
    ) {
      this._abortShock();
      return;
    }

    // _speedOverride = 0 set in _startShock keeps the enemy frozen via clampToBaseSpeed.
  }

  // ── State transitions ─────────────────────────────────────────────────────

  _startShock(enemy) {
    enemy._speedOverride = 0; // freeze via clampToBaseSpeed — no random kick since target=0
    this._shockedEnemy = enemy;
    this._shockTimer = this.SHOCK_DURATION;
    this._shockAccum = this.SHOCK_TICK; // pre-load → instant first tick
    this._state = "shocking";
    sfx.electricShock();
  }

  _endShock() {
    if (this._shockedEnemy) {
      this._shockedEnemy._speedOverride = null; // unfreeze before kicking
      if (this._shockedEnemy.isAlive && !this._shockedEnemy._invulnerable) {
        const spd = this._shockedEnemy.baseSpeed;
        if (spd > 1) {
          const angle = Math.random() * Math.PI * 2;
          this._shockedEnemy.vx = Math.cos(angle) * spd;
          this._shockedEnemy.vy = Math.sin(angle) * spd;
        }
      }
    }
    this._shockedEnemy = null;
    this._chargeTimer = 0;
    this._shockAccum = 0;
    this._state = "charging";
  }

  // Called when shock must be cancelled without restoring anything
  // (e.g. enemy became invulnerable mid-shock)
  _abortShock() {
    if (this._shockedEnemy) this._shockedEnemy._speedOverride = null;
    this._shockedEnemy = null;
    this._chargeTimer = 0;
    this._shockAccum = 0;
    this._state = "charging";
  }

  // ── Damage ────────────────────────────────────────────────────────────────

  getHitDamage() {
    return this._state === "charging" ? 1 : 0;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    if (this._state !== "shocking" || !this._shockedEnemy?.isAlive) return;

    const { x: ox, y: oy } = this.owner;
    const { x: ex, y: ey, radius: er } = this._shockedEnemy;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Outer glow bolt
    ctx.strokeStyle = "rgba(100,220,255,0.22)";
    ctx.lineWidth = 8;
    drawBolt(ctx, ox, oy, ex, ey, 8, 24);

    // Main bolt
    ctx.strokeStyle = "rgba(180,235,255,0.88)";
    ctx.lineWidth = 2;
    drawBolt(ctx, ox, oy, ex, ey, 8, 20);

    // Secondary bright fork
    ctx.strokeStyle = "rgba(255,255,200,0.65)";
    ctx.lineWidth = 1;
    drawBolt(ctx, ox, oy, ex, ey, 6, 14);

    // Sparks around shocked enemy
    for (let i = 0; i < 7; i++) {
      const ang =
        (i / 7) * Math.PI * 2 + this._sparkAngle + (Math.random() - 0.5) * 0.5;
      const ang2 = ang + (Math.random() - 0.5) * 0.8;
      const d1 = er + 3 + Math.random() * 12;
      const d2 = er + 2 + Math.random() * 4;
      ctx.strokeStyle = `rgba(180,235,255,${0.5 + Math.random() * 0.5})`;
      ctx.lineWidth = 1 + Math.random();
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(ang) * d1, ey + Math.sin(ang) * d1);
      ctx.lineTo(ex + Math.cos(ang2) * d2, ey + Math.sin(ang2) * d2);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderAbove(ctx) {
    const { x: ox, y: oy, radius: r } = this.owner;

    if (this._state === "charging") {
      const frac = Math.min(1, this._chargeTimer / this.CHARGE_DURATION);
      if (frac > 0.04) {
        ctx.save();
        ctx.strokeStyle = `rgba(80,200,255,${0.3 + 0.6 * frac})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ox, oy, r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
        ctx.restore();
      }
    } else if (this._state === "charged") {
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 140));
      ctx.save();
      // Outer glow
      ctx.strokeStyle = `rgba(80,200,255,${0.22 * pulse})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(ox, oy, r + 7, 0, Math.PI * 2);
      ctx.stroke();
      // Main ring
      ctx.strokeStyle = `rgba(130,230,255,${0.85 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ox, oy, r + 7, 0, Math.PI * 2);
      ctx.stroke();
      // Orbiting sparks
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + this._sparkAngle;
        const jitter = Math.sin(this._sparkAngle * 2.5 + i * 1.3) * 3;
        ctx.beginPath();
        ctx.arc(
          ox + Math.cos(ang) * (r + 7 + jitter),
          oy + Math.sin(ang) * (r + 7 + jitter),
          2,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = `rgba(210,245,255,${0.95 * pulse})`;
        ctx.fill();
      }
      ctx.restore();
    } else if (this._state === "shocking") {
      const frac = this._shockTimer / this.SHOCK_DURATION;
      const pulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 100));
      ctx.save();
      ctx.strokeStyle = `rgba(130,230,255,${0.85 * frac * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ox, oy, r + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  clearState() {
    if (this._shockedEnemy) {
      this._shockedEnemy._speedOverride = null;
      this._shockedEnemy = null;
    }
    this._chargeTimer = 0;
    this._shockAccum = 0;
    this._state = "charging";
  }

  static meta = {
    id: "electric",
    name: "Eléctrico",
    description:
      "Se carga y al tocar al enemigo lo electrocuta: lo paraliza y le quita vida.",
    color: "#F1C40F",
    icon: "϶",
    dmgRating: 3,
  };
}
