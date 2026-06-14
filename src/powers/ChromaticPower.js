import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const ROWS = 2;
const COLS = 3;

// 6 distinct palette entries — one per cell
const PAL = [
  { r: 231, g: 76, b: 60 }, // red
  { r: 230, g: 126, b: 34 }, // orange
  { r: 241, g: 196, b: 15 }, // yellow
  { r: 46, g: 204, b: 113 }, // green
  { r: 52, g: 152, b: 219 }, // blue
  { r: 155, g: 89, b: 182 }, // purple
];

export class ChromaticPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._state = "idle"; // 'idle' | 'flash' | 'active'
    this._cells = []; // { x, y, w, h, ci } — ci = PAL index
    this._chosenCi = -1;
    this._idleTimer = 0;
    this._flashTimer = 0;
    this._activeTimer = 0;
    this._dmgAccum = 0;
    this._compDmgAccum = 0;

    this.IDLE_TIME = 3.0;
    this.FLASH_TIME = 0.9;
    this.ACTIVE_TIME = 4;
    this.DPS_TICK = 6; // damage every tick
    this.TICK = 0.3;
  }

  // ── Grid ──────────────────────────────────────────────────────────────────

  _buildGrid() {
    const { left, top, width, height } = this.arena;
    const cw = width / COLS,
      ch = height / ROWS;
    // Shuffle palette indices so each cell gets a unique color
    const ids = [0, 1, 2, 3, 4, 5];
    for (let i = 5; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    this._cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this._cells.push({
          x: left + c * cw,
          y: top + r * ch,
          w: cw,
          h: ch,
          ci: ids[r * COLS + c],
        });
      }
    }
    sfx.gridSpawn();
  }

  _cellOf(px, py) {
    for (const cell of this._cells) {
      if (
        px >= cell.x &&
        px < cell.x + cell.w &&
        py >= cell.y &&
        py < cell.y + cell.h
      )
        return cell;
    }
    return null;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    if (this._state === "idle") {
      if (this._cells.length === 0) this._buildGrid();
      this._idleTimer += dt;
      if (this._idleTimer >= this.IDLE_TIME) {
        this._idleTimer = 0;
        // Choose the color of the cell the owner is standing on
        const standing = this._cellOf(this.owner.x, this.owner.y);
        this._chosenCi = standing ? standing.ci : Math.floor(Math.random() * 6);
        this._state = "flash";
        this._flashTimer = this.FLASH_TIME;
        sfx.mageWarn();
      }
    } else if (this._state === "flash") {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) {
        this._state = "active";
        this._activeTimer = this.ACTIVE_TIME;
        this._dmgAccum = 0;
        this._compDmgAccum = 0;
        sfx.territoryPlace();
      }
    } else if (this._state === "active") {
      this._activeTimer -= dt;
      if (this._activeTimer <= 0) {
        this._state = "idle";
        this._idleTimer = 0;
        this._cells = [];
        this._chosenCi = -1;
      }
    }
  }

  // ── Damage ────────────────────────────────────────────────────────────────

  _tickDamage(circle, accumKey, dt) {
    if (!circle.isAlive) return;
    const cell = this._cellOf(circle.x, circle.y);
    if (cell?.ci === this._chosenCi) {
      this[accumKey] += dt;
      if (this[accumKey] >= this.TICK) {
        this._dealDmg(circle, this.DPS_TICK);
        sfx.venomTick();
        this[accumKey] -= this.TICK;
      }
    } else {
      this[accumKey] = 0;
    }
  }

  onEnemyFrame(enemy, dt) {
    if (this._state !== "active") return;
    if (!enemy.isAlive) return;
    this._tickDamage(enemy, "_dmgAccum", dt);
    const comp = enemy.power?._comp;
    if (comp?.isAlive) this._tickDamage(comp, "_compDmgAccum", dt);
  }

  getHitDamage() {
    return 1;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    if (this._cells.length === 0) return;

    if (this._state === "idle") {
      for (const cell of this._cells) {
        const { r, g, b } = PAL[cell.ci];
        ctx.save();
        ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        ctx.restore();
      }
    } else if (this._state === "flash") {
      const t = 1 - this._flashTimer / this.FLASH_TIME; // 0→1
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 70));
      for (const cell of this._cells) {
        const { r, g, b } = PAL[cell.ci];
        const chosen = cell.ci === this._chosenCi;
        ctx.save();
        if (chosen) {
          ctx.fillStyle = `rgba(${r},${g},${b},${(0.25 + 0.45 * t) * pulse})`;
          ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.95 * pulse})`;
          ctx.lineWidth = 3.5;
          ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        } else {
          const fade = (1 - t) * 0.6;
          ctx.fillStyle = `rgba(${r},${g},${b},${0.1 * fade})`;
          ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.4 * fade})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        }
        ctx.restore();
      }
    } else if (this._state === "active") {
      const fade = this._activeTimer / this.ACTIVE_TIME;
      const pulse = 0.65 + 0.35 * Math.abs(Math.sin(Date.now() / 110));
      for (const cell of this._cells) {
        if (cell.ci !== this._chosenCi) continue;
        const { r, g, b } = PAL[cell.ci];
        ctx.save();
        // Fill glow
        ctx.fillStyle = `rgba(${r},${g},${b},${0.28 * fade * pulse})`;
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
        // Border
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.9 * fade})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        // Outer edge glow
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.3 * fade * pulse})`;
        ctx.lineWidth = 8;
        ctx.strokeRect(cell.x + 4, cell.y + 4, cell.w - 8, cell.h - 8);
        ctx.restore();
      }
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;

    if (this._state === "idle" && this._cells.length > 0) {
      const frac = Math.min(1, this._idleTimer / this.IDLE_TIME);
      if (frac < 0.03) return;
      // Arc color = cell the owner is currently standing on
      const standing = this._cellOf(x, y);
      const { r, g, b } = standing ? PAL[standing.ci] : PAL[0];
      ctx.save();
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.35 + 0.6 * frac})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        x,
        y,
        radius + 7,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * frac,
      );
      ctx.stroke();
      ctx.restore();
    }

    if (this._state === "flash") {
      const { r, g, b } = PAL[this._chosenCi];
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 70));
      ctx.save();
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.9 * pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  clearState() {
    this._state = "idle";
    this._cells = [];
    this._chosenCi = -1;
    this._idleTimer = 0;
    this._flashTimer = 0;
    this._activeTimer = 0;
    this._dmgAccum = 0;
    this._compDmgAccum = 0;
  }

  getNetState() {
    return {
      state: this._state, cells: this._cells.map(c => ({ ...c })), chosenCi: this._chosenCi,
      idleTimer: this._idleTimer, flashTimer: this._flashTimer, activeTimer: this._activeTimer,
    };
  }
  applyNetState(s) {
    this._state       = s.state;
    this._cells       = s.cells;
    this._chosenCi    = s.chosenCi;
    this._idleTimer   = s.idleTimer;
    this._flashTimer  = s.flashTimer;
    this._activeTimer = s.activeTimer;
  }

  static meta = {
    id: "chromatic",
    name: "Cromático",
    description:
      "El mapa siempre tiene 6 casillas de colores. Activa una: esa zona inflige daño/s al enemigo dentro.",
    color: "#9B59B6",
    icon: "⬡",
    dmgRating: 3,
  };
}
