import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

// ── Piece definitions ─────────────────────────────────────────────────────────

const PIECES = [
  {
    id: "rook",
    name: "Torre",
    icon: "♜",
    build(cx, cy, a, r) {
      return [
        { x: cx, y: a.top + r },
        { x: cx, y: a.bottom - r },
        { x: a.left + r, y: cy },
        { x: a.right - r, y: cy },
      ];
    },
  },
  {
    id: "bishop",
    name: "Alfil",
    icon: "♝",
    build(cx, cy, a, r) {
      return [
        { x: a.left + r, y: a.top + r },
        { x: a.right - r, y: a.top + r },
        { x: a.right - r, y: a.bottom - r },
        { x: a.left + r, y: a.bottom - r },
      ];
    },
  },
  {
    id: "knight",
    name: "Caballo",
    icon: "♞",
    build(cx, cy, a, r) {
      const d = Math.min(a.width, a.height) / 5;
      const d2 = d * 2;
      const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const lox = a.left + r + 2,
        hix = a.right - r - 2;
      const loy = a.top + r + 2,
        hiy = a.bottom - r - 2;
      // Two L-shapes: one going up, one going down
      // Up: go up 2d first, then right 1d
      const up = {
        via: { x: cx, y: cl(cy - d2, loy, hiy) },
        x: cl(cx + d, lox, hix),
        y: cl(cy - d2, loy, hiy),
      };
      // Down: go down 2d first, then left 1d
      const down = {
        via: { x: cx, y: cl(cy + d2, loy, hiy) },
        x: cl(cx - d, lox, hix),
        y: cl(cy + d2, loy, hiy),
      };
      return [up, down];
    },
  },
];

// ── Power ─────────────────────────────────────────────────────────────────────

export class ChessPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._state = "idle"; // idle | centering | announcing | executing
    this._idleTimer = 0;
    this._piece = null;
    this._destinations = [];
    this._destIdx = 0;
    this._returning = false; // true = moving back to center between destinations
    this._subLeg = false; // true = going to via point, false = going to final dest
    this._hitThisLeg = false; // prevents multi-hit when enemy blocks the path
    this._legTimer = 0; // time on current leg — forces arrival if blocked too long
    this._announceTimer = 0;
    this._savedBaseSpeed = null;

    this.IDLE_INTERVAL = 3.5; // seconds between chess activations
    this.CHESS_SPEED = 820;
    this.ARRIVAL_R = 18;
    this.ANNOUNCE_DUR = 0.8;
    this.HIT_DAMAGE = 6;

    this._savedOrigSpeed = null; // owner._origBaseSpeed saved before chess starts
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _cx() {
    return (this.arena.left + this.arena.right) / 2;
  }
  _cy() {
    return (this.arena.top + this.arena.bottom) / 2;
  }

  _moveTo(tx, ty, dt) {
    const dx = tx - this.owner.x;
    const dy = ty - this.owner.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this._legTimer += dt;
    // Snap to target if close enough OR if blocked too long (e.g. by another chess circle)
    if (dist < this.ARRIVAL_R || this._legTimer > 1.5) {
      this.owner.x = tx;
      this.owner.y = ty;
      this.owner.vx = 0;
      this.owner.vy = 0;
      this.owner._speedOverride = 0; // freeze — prevents clampToBaseSpeed random kick
      this._legTimer = 0;
      return true;
    }
    this.owner.vx = (dx / dist) * this.CHESS_SPEED;
    this.owner.vy = (dy / dist) * this.CHESS_SPEED;
    this.owner.baseSpeed = this.CHESS_SPEED;
    this.owner._speedOverride = null; // let clampToBaseSpeed enforce CHESS_SPEED
    return false;
  }

  // ── State transitions ──────────────────────────────────────────────────────

  _startCentering() {
    this._savedBaseSpeed = this.owner.baseSpeed;
    this._savedOrigSpeed = this.owner._origBaseSpeed; // preserve slow state
    this.owner.baseSpeed = this.CHESS_SPEED;
    this.owner._invulnerable = true;
    this.owner._passesObstacles = true; // follows programmatic paths, must not be blocked
    this._legTimer = 0;
    this._state = "centering";
  }

  _startAnnouncing() {
    this._piece = PIECES[Math.floor(Math.random() * PIECES.length)];
    const cx = this._cx(),
      cy = this._cy();
    this._destinations = this._piece.build(
      cx,
      cy,
      this.arena,
      this.owner.radius,
    );
    this._announceTimer = this.ANNOUNCE_DUR;
    this._state = "announcing";
    sfx.chessAnnounce();
  }

  _startExecuting() {
    this._destIdx = 0;
    this._returning = false;
    this._subLeg = false;
    this._hitThisLeg = false;
    this._legTimer = 0;
    this._state = "executing";
    sfx.chessMove();
  }

  _endChess() {
    const spd = this._savedBaseSpeed ?? 300;
    this.owner.baseSpeed = spd;
    // Restore the pre-chess _origBaseSpeed so a slow that fired during chess
    // doesn't erroneously restore to the chess speed when it expires.
    this.owner._origBaseSpeed = this._savedOrigSpeed;
    this.owner._speedOverride = null;
    const angle = Math.random() * Math.PI * 2;
    this.owner.vx = Math.cos(angle) * spd;
    this.owner.vy = Math.sin(angle) * spd;
    this.owner._invulnerable = false;
    this.owner._passesObstacles = false; // back to normal physics
    this._savedBaseSpeed = null;
    this._savedOrigSpeed = null;
    this._piece = null;
    this._destinations = [];
    this._idleTimer = 0;
    this._state = "idle";
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    switch (this._state) {
      case "idle":
        this._idleTimer += dt;
        if (this._idleTimer >= this.IDLE_INTERVAL) this._startCentering();
        break;

      case "centering":
        if (this._moveTo(this._cx(), this._cy(), dt)) this._startAnnouncing();
        break;

      case "announcing":
        this.owner.vx = 0;
        this.owner.vy = 0;
        this._announceTimer -= dt;
        if (this._announceTimer <= 0) this._startExecuting();
        break;

      case "executing": {
        if (this._destIdx >= this._destinations.length) {
          this._endChess();
          break;
        }
        if (this._returning) {
          if (this._moveTo(this._cx(), this._cy(), dt)) {
            this._returning = false;
            this._subLeg = false;
            this._hitThisLeg = false;
            this._destIdx++;
          }
        } else {
          const d = this._destinations[this._destIdx];
          if (d.via && !this._subLeg) {
            // First go to the via (knee) point
            if (this._moveTo(d.via.x, d.via.y, dt)) this._subLeg = true;
          } else {
            // Then go to the final destination
            if (this._moveTo(d.x, d.y, dt)) {
              this._returning = true;
              this._subLeg = false;
              this._hitThisLeg = false;
            }
          }
        }
        break;
      }
    }
  }

  // ── Damage ─────────────────────────────────────────────────────────────────

  getHitDamage() {
    if (this._state !== "executing" || this._hitThisLeg) return 0;
    this._hitThisLeg = true; // one hit per leg (outward or return)
    return this.HIT_DAMAGE;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    if (
      !this._piece ||
      (this._state !== "announcing" && this._state !== "executing")
    )
      return;
    if (!this.arena) return;

    const cx = this._cx(),
      cy = this._cy();
    const fadeIn =
      this._state === "announcing"
        ? 1 - this._announceTimer / this.ANNOUNCE_DUR
        : 1;

    ctx.save();
    this._destinations.forEach((dest, i) => {
      const isCurrent =
        this._state === "executing" && i === this._destIdx && !this._returning;
      const isDone = this._state === "executing" && i < this._destIdx;

      const color = isCurrent
        ? `rgba(255,255,180,${0.9 * fadeIn})`
        : isDone
          ? `rgba(255,255,180,${0.1 * fadeIn})`
          : `rgba(255,255,180,${0.38 * fadeIn})`;

      ctx.strokeStyle = color;
      ctx.lineWidth = isCurrent ? 2.5 : 1.5;
      ctx.setLineDash(isCurrent || isDone ? [] : [5, 5]);

      // Draw L-shape if via exists, else straight line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      if (dest.via) {
        ctx.lineTo(dest.via.x, dest.via.y);
        ctx.lineTo(dest.x, dest.y);
      } else {
        ctx.lineTo(dest.x, dest.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Dot at destination
      ctx.beginPath();
      ctx.arc(dest.x, dest.y, isCurrent ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent
        ? `rgba(255,255,180,${0.95 * fadeIn})`
        : `rgba(255,255,180,${0.28 * fadeIn})`;
      ctx.fill();
    });
    ctx.restore();
  }

  renderAbove(ctx) {
    // Invulnerability shimmer ring
    if (this._state !== "idle") {
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 220));
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,210,${pulse * 0.9})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        this.owner.x,
        this.owner.y,
        this.owner.radius + 6,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }

    // Idle charge arc (fills as timer approaches IDLE_INTERVAL)
    if (this._state === "idle") {
      const frac = Math.min(1, this._idleTimer / this.IDLE_INTERVAL);
      if (frac > 0.08) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,200,${0.3 + 0.55 * frac})`;
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

  clearState() {
    if (this._state !== "idle") {
      if (this._savedBaseSpeed !== null) {
        this.owner.baseSpeed = this._savedBaseSpeed;
        this._savedBaseSpeed = null;
      }
      this.owner._origBaseSpeed = this._savedOrigSpeed;
      this._savedOrigSpeed = null;
      this.owner._invulnerable = false;
      this.owner._passesObstacles = false;
      this._piece = null;
      this._destinations = [];
      this._state = "idle";
      this._idleTimer = 0;
    }
  }

  static meta = {
    id: "chess",
    name: "Ajedrez",
    description:
      "Va al centro, se vuelve invulnerable y ejecuta una pieza aleatoria: Torre, Alfil o Caballo.",
    color: "#BDC3C7",
    icon: "♟",
    dmgRating: 3,
  };
}
