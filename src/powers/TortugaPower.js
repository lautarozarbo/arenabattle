import { BasePower } from "./BasePower.js";

const TORTUGA_SPEED = 30; // px/s along path (base)
const CONTACT_DMG = 6; // HP removed per contact hit
const CONTACT_CD = 0.55; // s between contact damage ticks
const GOAL_DMG = 100; // damage dealt when path is fully completed
const HUGE_MASS = 1e9; // makes tortuga effectively immovable in collisions

// All patterns use [fracX, fracY] inside arena, each covering similar total distance.
// Two horizontal snakes (rows) + two vertical snakes (columns), from different corners.
const PATHS = [
  // A — TL→BR horizontal snake (3 rows)
  [
    [0, 0],
    [1, 0],
    [1, 1 / 3],
    [0, 1 / 3],
    [0, 2 / 3],
    [1, 2 / 3],
    [1, 1],
  ],
  // B — TR→BL horizontal snake (3 rows)
  [
    [1, 0],
    [0, 0],
    [0, 1 / 3],
    [1, 1 / 3],
    [1, 2 / 3],
    [0, 2 / 3],
    [0, 1],
  ],
  // C — TL→BR vertical snake (3 columns)
  [
    [0, 0],
    [0, 1],
    [1 / 3, 1],
    [1 / 3, 0],
    [2 / 3, 0],
    [2 / 3, 1],
    [1, 1],
  ],
  // D — BL→TR vertical snake (3 columns)
  [
    [0, 1],
    [0, 0],
    [1 / 3, 0],
    [1 / 3, 1],
    [2 / 3, 1],
    [2 / 3, 0],
    [1, 0],
  ],
];

export class TortugaPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._waypoints = [];
    this._wpIdx = 0;
    this._goalFire = false;
    this._contactCd = 0;
    this._origMass = null;
    this._initialSpeed = null;
    this._tramHitCd   = 0;
    this._cactusHitCd = 0;
  }

  // ── Path initialization ─────────────────────────────────────────────────────

  _buildPath() {
    const a = this.arena;
    const r = this.owner.radius;
    const W = a.right - a.left;
    const H = a.bottom - a.top;

    const pattern = PATHS[Math.floor(Math.random() * PATHS.length)];
    this._waypoints = pattern.map(([fx, fy]) => ({
      x: a.left + r + fx * (W - 2 * r),
      y: a.top + r + fy * (H - 2 * r),
    }));

    this.owner.x = this._waypoints[0].x;
    this.owner.y = this._waypoints[0].y;
    this.owner.vx = 0;
    this.owner.vy = 0;
    this._wpIdx = 1;

    // Huge mass minimizes displacement from collision resolution
    this._origMass = this.owner.mass;
    this.owner.mass = HUGE_MASS;
    this.owner._passesObstacles = true; // follows its own path, ignores obstacle physics

    // Baseline speed used to scale speed-modifier effects (venom, etc.)
    this._initialSpeed = this.owner.baseSpeed || 1;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;
    if (this._waypoints.length === 0) this._buildPath();

    // Speed scales with owner.baseSpeed so venom/vampire slows the tortuga naturally
    const ratio =
      this._initialSpeed > 0 ? this.owner.baseSpeed / this._initialSpeed : 1;
    const speed = TORTUGA_SPEED * Math.max(0.05, ratio);

    const target = this._waypoints[this._wpIdx];
    const dx = target.x - this.owner.x;
    const dy = target.y - this.owner.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= speed * dt + 0.5) {
      this.owner.x = target.x;
      this.owner.y = target.y;
      this._wpIdx++;
      if (this._wpIdx >= this._waypoints.length) {
        // Restart from beginning and flag goal damage for onEnemyFrame
        this.owner.x = this._waypoints[0].x;
        this.owner.y = this._waypoints[0].y;
        this._wpIdx  = 1;
        this._goalFire = true;
      }
    } else {
      this.owner.x += (dx / dist) * speed * dt;
      this.owner.y += (dy / dist) * speed * dt;
    }

    // Suppress physics — position is dictated by the path
    this.owner.vx = 0;
    this.owner.vy = 0;
    this.owner._speedOverride = 0; // prevents clampToBaseSpeed random kick

    if (this._contactCd > 0) this._contactCd -= dt;
    if (this._tramHitCd   > 0) this._tramHitCd   -= dt;
    if (this._cactusHitCd > 0) this._cactusHitCd -= dt;
  }

  // ── Enemy interactions ──────────────────────────────────────────────────────

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;

    this._checkTramWalls(enemy);
    this._checkCactiDamage(enemy);

    if (this._goalFire) {
      this._goalFire = false;
      this._dealDmg(enemy, GOAL_DMG);
      return;
    }

    if (this._contactCd <= 0) {
      const dx = enemy.x - this.owner.x;
      const dy = enemy.y - this.owner.y;
      if (dx * dx + dy * dy < (enemy.radius + this.owner.radius) ** 2) {
        this._dealDmg(enemy, CONTACT_DMG);
        this._contactCd = CONTACT_CD;
      }
    }
  }

  // TramPower walls: velocity-based checks never fire for the tortuga (vx=vy=0),
  // so we detect zone-wall contact directly and deal damage ourselves.
  _checkTramWalls(enemy) {
    const bombs = enemy.power?._bombs;
    if (!bombs) return;
    const r = this.owner.radius;
    for (const b of bombs) {
      if (!b.landed) continue;
      const dx = this.owner.x - b.x;
      const dy = this.owner.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dist - b.radius) < r + 5 && this._tramHitCd <= 0) {
        this.owner.takeDamage(enemy.power.WALL_DAMAGE_IN ?? 3);
        this._tramHitCd = 0.45;
      }
    }
  }

  // CactusPower spikes: same issue — velocity check never fires, detect by proximity.
  _checkCactiDamage(enemy) {
    const cacti = enemy.power?._cacti;
    if (!cacti) return;
    const cactusR = enemy.power.CACTUS_RADIUS ?? 18;
    const dmg     = enemy.power.HIT_DAMAGE    ?? 4;
    const r = this.owner.radius;
    for (const c of cacti) {
      const dx = this.owner.x - c.x;
      const dy = this.owner.y - c.y;
      if (dx * dx + dy * dy < (cactusR + r) ** 2 && this._cactusHitCd <= 0) {
        this.owner.takeDamage(dmg);
        this._cactusHitCd = 0.4;
        break; // one hit per frame is enough
      }
    }
  }

  // Path is authoritative — discard wall-bounce events
  onWallBounce() {}

  clearState() {
    if (this._origMass !== null) {
      this.owner.mass = this._origMass;
      this._origMass = null;
    }
    this.owner._speedOverride = null;
    this.owner._passesObstacles = false;
    this._waypoints = [];
    this._wpIdx = 0;
    this._goalFire = false;
    this._contactCd = 0;
    this._initialSpeed = null;
    this._tramHitCd   = 0;
    this._cactusHitCd = 0;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    if (this._waypoints.length < 2) return;

    ctx.save();
    ctx.lineCap = "round";

    for (let i = 0; i < this._waypoints.length - 1; i++) {
      const from = this._waypoints[i];
      const to = this._waypoints[i + 1];
      const done = i < this._wpIdx - 1;

      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = done
        ? "rgba(90, 195, 90, 0.16)"
        : "rgba(90, 195, 90, 0.48)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Start dot
    const start = this._waypoints[0];
    ctx.strokeStyle = "rgba(90, 195, 90, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Goal marker — pulsing red ring with X (always visible since path loops)
    {
      const goal = this._waypoints[this._waypoints.length - 1];
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 550));
      ctx.strokeStyle = `rgba(255, 65, 65, ${0.85 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      const s = 6;
      ctx.strokeStyle = `rgba(255, 65, 65, ${0.7 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(goal.x - s, goal.y - s);
      ctx.lineTo(goal.x + s, goal.y + s);
      ctx.moveTo(goal.x + s, goal.y - s);
      ctx.lineTo(goal.x - s, goal.y + s);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderAbove(ctx) {
    if (this._waypoints.length === 0) return;
    const target = this._waypoints[this._wpIdx];
    if (!target) return;

    const dx = target.x - this.owner.x;
    const dy = target.y - this.owner.y;
    const angle = Math.atan2(dy, dx);
    const r = this.owner.radius;

    // Direction arrow pointing toward next waypoint
    ctx.save();
    ctx.translate(this.owner.x, this.owner.y);
    ctx.rotate(angle);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    const len = r * 0.5;
    ctx.beginPath();
    ctx.moveTo(-len * 0.3, 0);
    ctx.lineTo(len, 0);
    ctx.moveTo(len - 5, -4);
    ctx.lineTo(len, 0);
    ctx.lineTo(len - 5, 4);
    ctx.stroke();
    ctx.restore();
  }

  static meta = {
    id: "tortuga",
    name: "Tortuga",
    description:
      "Avanza por un camino marcado sin detenerse. Al llegar al final inflije daño.",
    color: "#4CAF50",
    icon: "◈",
    dmgRating: 1,
  };
}
