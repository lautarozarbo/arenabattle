import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const ARROW_SPEED = 430;
const ARROW_DMG = 3;
const ARROW_LIFE = 2.0;
const MAX_INTERVAL = 1.2; // seconds between shots at base speed
const MIN_INTERVAL = 0.25; // seconds between shots at max fury
const RAMP_TIME = 6; // seconds without collision to reach full fury

export class ArcherPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._arrows = []; // { x, y, vx, vy, life, angle }
    this._shotTimer = 1.5;
    this._timeSinceHit = 0; // time without circle-to-circle collision
    this._lastEnemyX = 0;
    this._lastEnemyY = 0;
    this._hasEnemy = false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _fury() {
    return Math.min(1, this._timeSinceHit / RAMP_TIME);
  }

  _currentInterval() {
    return MAX_INTERVAL - this._fury() * (MAX_INTERVAL - MIN_INTERVAL);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    this._timeSinceHit += dt;

    // Advance shot timer
    this._shotTimer -= dt;
    if (this._shotTimer <= 0 && this._hasEnemy) {
      this._fire();
      this._shotTimer = this._currentInterval();
    }

    // Move arrows
    const a = this.arena;
    this._arrows = this._arrows.filter((arr) => {
      arr.x += arr.vx * dt;
      arr.y += arr.vy * dt;
      arr.life -= dt;

      // Out of bounds or expired
      if (
        arr.life <= 0 ||
        arr.x < a.left ||
        arr.x > a.right ||
        arr.y < a.top ||
        arr.y > a.bottom
      )
        return false;

      // Hit obstacle → remove (no rate effect)
      for (const obs of a.obstacles) {
        const dx = arr.x - obs.cx,
          dy = arr.y - obs.cy;
        if (dx * dx + dy * dy < obs.r * obs.r) return false;
      }

      return true;
    });
  }

  _fire() {
    const dx = this._lastEnemyX - this.owner.x;
    const dy = this._lastEnemyY - this.owner.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const baseAngle = Math.atan2(dy, dx);
    const spawnDist = this.owner.radius + 6;
    const count = 1 + this._extraProj();
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * (5 * Math.PI / 180);
      const angle = baseAngle + offset;
      this._arrows.push({
        x: this.owner.x + Math.cos(baseAngle) * spawnDist,
        y: this.owner.y + Math.sin(baseAngle) * spawnDist,
        vx: Math.cos(angle) * ARROW_SPEED,
        vy: Math.sin(angle) * ARROW_SPEED,
        life: ARROW_LIFE,
        angle,
      });
    }
    sfx.archerShot();
  }

  // ── Enemy interaction ─────────────────────────────────────────────────────

  onCollide(enemy) {
    // Physical circle collision → reset fury
    this._timeSinceHit = 0;
    if (this._shotTimer < 0.4) this._shotTimer = 0.4; // small pause after clash
  }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;
    this._hasEnemy = true;
    this._lastEnemyX = enemy.x;
    this._lastEnemyY = enemy.y;

    // Check arrow → enemy hits (duo companion too)
    this._checkArrowHits(enemy, false);
    const comp = enemy.power?._comp;
    if (comp?.isAlive) this._checkArrowHits(comp, true);
  }

  _checkArrowHits(target, isComp) {
    const r2 = (target.radius + 3) ** 2;
    this._arrows = this._arrows.filter((arr) => {
      const dx = target.x - arr.x,
        dy = target.y - arr.y;
      if (dx * dx + dy * dy < r2) {
        this._dealDmg(target, ARROW_DMG);
        sfx.archerHit();
        return false;
      }
      return true;
    });
  }

  clearState() {
    this._arrows = [];
    this._shotTimer = this._cd(MAX_INTERVAL);
    this._timeSinceHit = 0;
    this._hasEnemy = false;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    for (const arr of this._arrows) {
      this._drawArrow(ctx, arr);
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;
    const fury = this._fury();
    if (fury < 0.04) return;

    const r = radius + 8;
    // Background ring
    ctx.save();
    ctx.strokeStyle = "rgba(107,142,35,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Fury fill arc
    const pulse =
      fury >= 1 ? 0.7 + 0.3 * Math.abs(Math.sin(Date.now() / 120)) : 1;
    const alpha = 0.4 + 0.55 * fury;
    ctx.save();
    ctx.strokeStyle =
      fury >= 1
        ? `rgba(200,230,60,${alpha * pulse})`
        : `rgba(140,200,50,${alpha})`;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    if (fury >= 1) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#aaff44";
    }
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fury);
    ctx.stroke();
    ctx.restore();
  }

  _drawArrow(ctx, arr) {
    const len = 18;
    const headL = 7;
    const headW = 4;

    ctx.save();
    ctx.translate(arr.x, arr.y);
    ctx.rotate(arr.angle);

    // Shaft
    ctx.strokeStyle = "#8B5E1A";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2 - headL, 0);
    ctx.stroke();

    // Arrowhead
    ctx.fillStyle = "#c8a040";
    ctx.beginPath();
    ctx.moveTo(len / 2, 0);
    ctx.lineTo(len / 2 - headL, -headW / 2);
    ctx.lineTo(len / 2 - headL, headW / 2);
    ctx.closePath();
    ctx.fill();

    // Tail fletching (two short lines)
    ctx.strokeStyle = "#6B8E23";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-len / 2 + 1, 0);
    ctx.lineTo(-len / 2 + 1 - 4, -3);
    ctx.moveTo(-len / 2 + 1, 0);
    ctx.lineTo(-len / 2 + 1 - 4, 3);
    ctx.stroke();

    ctx.restore();
  }

  static meta = {
    id: "archer",
    name: "Arquero",
    description:
      "Dispara flechas al enemigo. Mientras más tiempo pase sin colisionar con él, más rápido dispara. Al chocar, la cadencia se reinicia.",
    color: "#6B8E23",
    icon: "▷",
    dmgRating: 2,
  };
}
