import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const ROWS = 2;
const COLS = 3;

export class GridPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._cells = []; // { x, y, w, h, dmg }
    this._gridTimer = 0; // remaining active time
    this._cooldownTimer = 4; // start charging, not spawned

    this.COOLDOWN = 4;
    this.DURATION = 3.5;
    this._compHitCooldown = 0;
  }

  update(dt) {
    if (this._compHitCooldown > 0) this._compHitCooldown -= dt;
    if (!this.arena) return;
    if (this._cells.length > 0) {
      this._gridTimer -= dt;
      if (this._gridTimer <= 0) {
        this._cells = [];
        this._cooldownTimer = this._cd(this.COOLDOWN);
      }
    } else {
      this._cooldownTimer -= dt;
      if (this._cooldownTimer <= 0) this._spawnGrid();
    }
  }

  _spawnGrid() {
    const { left, top, width, height } = this.arena;
    const cellW = width / COLS;
    const cellH = height / ROWS;
    const startX = left;
    const startY = top;

    this._cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this._cells.push({
          x: startX + c * cellW,
          y: startY + r * cellH,
          w: cellW,
          h: cellH,
          dmg: 1 + Math.floor(Math.random() * 20),
        });
      }
    }
    this._gridTimer = this.DURATION;
    sfx.gridSpawn();
  }

  // Grid damage replaces normal collision damage.
  // onCollide checks which cell the enemy is in and deals that cell's damage.
  // getHitDamage returns 0 while grid is active so there's no double-hit.
  getHitDamage() {
    return this._cells.length === 0 ? 1 : 0;
  }

  onCollide(enemy) {
    if (!enemy.isAlive || this._cells.length === 0) return;
    for (const cell of this._cells) {
      if (enemy.x >= cell.x && enemy.x <= cell.x + cell.w &&
          enemy.y >= cell.y && enemy.y <= cell.y + cell.h) {
        this._dealDmg(enemy, cell.dmg);
        sfx.gridHit(cell.dmg);
        return;
      }
    }
    // Fallback: shouldn't happen since grid covers the full arena
    this._dealDmg(enemy, 1);
    sfx.gridHit(1);
  }

  onEnemyFrame(enemy) {
    // DUO companion: companion↔owner collision goes through DuoPower internally,
    // bypassing onCollide. Check proximity and apply the correct cell damage.
    if (this._cells.length === 0 || this._compHitCooldown > 0 || !this.arena) return;
    const comp = enemy.power?._comp;
    if (!comp?.isAlive) return;
    const dx   = comp.x - this.owner.x, dy = comp.y - this.owner.y;
    const minD = this.owner.radius + comp.radius;
    if (dx * dx + dy * dy >= minD * minD) return;

    // Map companion position to cell index (robust against floating-point boundary issues)
    const { left, top, width, height } = this.arena;
    const cellW = width  / COLS;
    const cellH = height / ROWS;
    const col   = Math.min(COLS - 1, Math.max(0, Math.floor((comp.x - left) / cellW)));
    const row   = Math.min(ROWS - 1, Math.max(0, Math.floor((comp.y - top)  / cellH)));
    const cell  = this._cells[row * COLS + col];
    if (cell) {
      this._dealDmg(comp, cell.dmg);
      sfx.gridHit(cell.dmg);
      this._compHitCooldown = 0.15;
    }
  }

  renderBelow(ctx) {
    if (this._cells.length === 0) return;

    // Fade-out in last 0.35s
    const alpha = Math.min(1, this._gridTimer / 0.35);

    ctx.save();
    for (const cell of this._cells) {
      // Fill
      ctx.fillStyle = `rgba(52,152,219,${0.15 * alpha})`;
      ctx.fillRect(cell.x, cell.y, cell.w, cell.h);

      // Border
      ctx.strokeStyle = `rgba(52,152,219,${0.7 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);

      // Damage number
      const fs = Math.min(cell.w, cell.h) * 0.45;
      ctx.font = `bold ${fs}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(0,0,0,${0.85 * alpha})`;
      const cx = cell.x + cell.w / 2;
      const cy = cell.y + cell.h / 2;
      ctx.strokeText(String(cell.dmg), cx, cy);
      ctx.fillStyle = `rgba(255,255,255,${0.97 * alpha})`;
      ctx.fillText(String(cell.dmg), cx, cy);
    }
    ctx.restore();
  }

  renderAbove(ctx) {
    if (this._cells.length > 0) return;
    const frac = Math.min(1, 1 - this._cooldownTimer / this.COOLDOWN);
    if (frac <= 0.04) return;
    ctx.save();
    ctx.strokeStyle = `rgba(52,152,219,${0.3 + 0.6 * frac})`;
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

  clearState() {
    this._cells = [];
    this._cooldownTimer = this._cd(this.COOLDOWN);
  }

  static meta = {
    id: "grid",
    name: "Cuadrícula",
    description:
      "Coloca 6 casillas con daño aleatorio. Al chocar al enemigo dentro de una, recibe ese daño.",
    color: "#2980B9",
    icon: "⊞",
    dmgRating: 3,
  };
}
