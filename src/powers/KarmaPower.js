import { BasePower } from "./BasePower.js";

const CYCLE_DUR   = 5.0;  // seconds between absorb phases
const ABSORB_DUR  = 3.0;  // how long the absorb window lasts
const MAX_STORE   = 55;   // damage cap (can't store more than this)
const RELEASE_TTL = 5.0;  // seconds before stored damage expires if not released
const BASE_HIT    = 8;

export class KarmaPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._cycleTimer     = CYCLE_DUR;
    this._absorbActive   = false;
    this._absorbTimer    = 0;
    this._stored         = 0;
    this._pendingRelease = false;
    this._releaseTimer   = 0;
    this._hpLastFrame    = null;
  }

  update(dt) {
    // ── HP monitor: absorb incoming damage ─────────────────────────────────
    if (this._absorbActive && this._hpLastFrame !== null) {
      const dropped = this._hpLastFrame - this.owner.hp;
      if (dropped > 0.05) {
        const absorb = Math.min(dropped, MAX_STORE - this._stored);
        this._stored += absorb;
        this.owner.hp = Math.min(this.owner.maxHp, this.owner.hp + absorb);
        // Remove the damage number that just floated up — it was absorbed
        if (this.owner._dmgNums.length > 0) this.owner._dmgNums.pop();
      }
    }
    this._hpLastFrame = this.owner.hp;

    // ── Absorb phase timer ─────────────────────────────────────────────────
    if (this._absorbActive) {
      this._absorbTimer -= dt;
      if (this._absorbTimer <= 0) {
        this._absorbActive = false;
        if (this._stored > 0) {
          this._pendingRelease = true;
          this._releaseTimer   = RELEASE_TTL;
        }
        this._cycleTimer = CYCLE_DUR;
      }
    } else {
      // ── Cycle cooldown ─────────────────────────────────────────────────
      this._cycleTimer -= dt;
      if (this._cycleTimer <= 0 && this.owner.isAlive) {
        this._absorbActive   = true;
        this._absorbTimer    = ABSORB_DUR;
        this._stored         = 0;
        this._pendingRelease = false;
        this._hpLastFrame    = this.owner.hp;
      }

      // ── Stored damage expiry ───────────────────────────────────────────
      if (this._pendingRelease) {
        this._releaseTimer -= dt;
        if (this._releaseTimer <= 0) {
          this._pendingRelease = false;
          this._stored         = 0;
        }
      }
    }
  }

  onCollide(enemy) {
    if (!this._pendingRelease || this._stored <= 0) return;
    enemy.takeDamage(this._stored);
    enemy._dmgNums.push({
      x:     enemy.x + (Math.random() * 16 - 8),
      y:     enemy.y - enemy.radius - 4,
      val:   `☯${Math.ceil(this._stored)}`,
      t:     1.2,
      color: "#f97316",
    });
    this._stored         = 0;
    this._pendingRelease = false;
  }

  getHitDamage() { return BASE_HIT; }

  clearState() {
    this._absorbActive   = false;
    this._pendingRelease = false;
    this._stored         = 0;
    this._cycleTimer     = CYCLE_DUR;
    this._absorbTimer    = 0;
    this._releaseTimer   = 0;
    this._hpLastFrame    = null;
  }

  renderAbove(ctx) {
    const { x, y, radius: r } = this.owner;
    const now = Date.now();

    if (this._absorbActive) {
      const frac  = 1 - this._absorbTimer / ABSORB_DUR; // 0→1 as time passes
      const fill  = this._stored / MAX_STORE;            // 0→1 as damage accumulates
      const pulse = 0.7 + 0.3 * Math.sin(now * 0.009);

      // Color shifts purple → orange as stored damage grows
      const red   = Math.round(180 + 75  * fill);
      const green = Math.round(80  - 60  * fill);
      const blue  = Math.round(252 - 210 * fill);
      const col   = `rgb(${red},${green},${blue})`;

      // Outer glowing ring
      ctx.save();
      ctx.strokeStyle = `rgba(${red},${green},${blue},${0.55 + 0.45 * pulse})`;
      ctx.lineWidth   = 2.5 + 3 * fill;
      ctx.shadowBlur  = 14;
      ctx.shadowColor = `rgba(${red},${green},${blue},0.75)`;
      ctx.beginPath();
      ctx.arc(x, y, r + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Fill arc showing absorb time remaining (drains clockwise)
      ctx.save();
      ctx.strokeStyle = `rgba(${red},${green},${blue},0.35)`;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac));
      ctx.stroke();
      ctx.restore();

      // Stored damage label
      if (this._stored > 1) {
        ctx.save();
        ctx.font         = "bold 12px system-ui";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle  = "rgba(0,0,0,0.85)";
        ctx.lineWidth    = 3;
        ctx.strokeText(`+${Math.ceil(this._stored)}`, x, y - r - 18);
        ctx.fillStyle    = col;
        ctx.fillText(`+${Math.ceil(this._stored)}`, x, y - r - 18);
        ctx.restore();
      }
      return;
    }

    if (this._pendingRelease) {
      // Pulsing orange/red ring — ready to release
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.007));
      ctx.save();
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.5 + 0.5 * pulse})`;
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 18;
      ctx.shadowColor = "rgba(249, 115, 22, 0.85)";
      ctx.beginPath();
      ctx.arc(x, y, r + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Waiting: small arc showing cooldown progress
    const cycleProgress = 1 - this._cycleTimer / CYCLE_DUR;
    if (cycleProgress > 0.05) {
      ctx.save();
      ctx.strokeStyle = "rgba(192, 132, 252, 0.25)";
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cycleProgress);
      ctx.stroke();
      ctx.restore();
    }
  }

  static meta = {
    id:          "karma",
    name:        "Karma",
    description: "Cada 5s entra en modo absorción (3s): acumula todo el daño recibido y lo devuelve de golpe en la próxima colisión.",
    color:       "#c084fc",
    icon:        "☯",
    dmgRating:   3,
  };
}
