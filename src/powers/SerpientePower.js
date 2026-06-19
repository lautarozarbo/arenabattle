import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const HIST_STEP = 4; // px of movement before recording a history entry
const SEG_ENTRIES = 6; // history entries between segments (~24px gap, circles overlap)
const BASE_RATIO = 0.93; // each segment radius = prev * this
const GROWTH_SCALE = 0.45; // growing segment appears at this fraction of full size
const TAIL_DMG = 4; // damage per tail collision
const TAIL_HIT_CD = 0.85; // seconds before same segment can hit again
const HEAD_DMG = 3; // physical head collision damage
const MAX_SEGMENTS = 8;

export class SerpientePower extends BasePower {
  constructor(owner) {
    super(owner);
    this._history = [];
    this._segments = []; // { x, y, r, fullR, hitCd, state: 'full'|'growing' }
    this._ready = false;
    this._hpLastFrame = null;
  }

  _init() {
    const r = Math.round(this.owner.radius * BASE_RATIO);
    this._segments = [
      {
        x: this.owner.x,
        y: this.owner.y,
        r,
        fullR: r,
        hitCd: 0,
        state: "full",
      },
    ];
    this._ready = true;
  }

  update(dt) {
    if (!this._ready) this._init();

    // Grow tail when damaged by any power (not just tail collisions)
    if (this._hpLastFrame !== null && this.owner.hp < this._hpLastFrame) {
      this._growTail();
    }
    this._hpLastFrame = this.owner.hp;

    // Record history every HIST_STEP px so spacing is speed-independent
    if (this._history.length === 0) {
      this._history.push({ x: this.owner.x, y: this.owner.y });
    } else {
      const last = this._history[0];
      const dx = this.owner.x - last.x;
      const dy = this.owner.y - last.y;
      if (dx * dx + dy * dy >= HIST_STEP * HIST_STEP) {
        this._history.unshift({ x: this.owner.x, y: this.owner.y });
        const cap = (this._segments.length + 2) * SEG_ENTRIES + 10;
        if (this._history.length > cap) this._history.length = cap;
      }
    }

    // Move segments along history trail and tick cooldowns
    for (let i = 0; i < this._segments.length; i++) {
      const seg = this._segments[i];
      const idx = (i + 1) * SEG_ENTRIES;
      if (idx < this._history.length) {
        seg.x = this._history[idx].x;
        seg.y = this._history[idx].y;
      }
      if (seg.hitCd > 0) seg.hitCd = Math.max(0, seg.hitCd - dt);
    }
  }

  onEnemyFrame(enemy, dt) {
    if (!enemy.isAlive) return;
    for (const seg of this._segments) {
      if (seg.hitCd > 0) continue;
      const dx = enemy.x - seg.x;
      const dy = enemy.y - seg.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      if (dist >= seg.r + enemy.radius) continue;

      this._dealDmg(enemy, TAIL_DMG);
      seg.hitCd = TAIL_HIT_CD;
      sfx.collide();

      // Push enemy out and apply impulse
      const nx = dx / dist;
      const ny = dy / dist;
      const pen = seg.r + enemy.radius - dist;
      enemy.x += nx * pen;
      enemy.y += ny * pen;
      enemy.vx += nx * 380;
      enemy.vy += ny * 380;

      this._growTail();
    }
  }

  _growTail() {
    if (this._segments.length >= MAX_SEGMENTS) return;
    const growingIdx = this._segments.findIndex((s) => s.state === "growing");
    if (growingIdx !== -1) {
      // Second hit — complete the growing segment
      const g = this._segments[growingIdx];
      g.r = g.fullR;
      g.state = "full";
    } else {
      // First hit — spawn a small new segment at the tail
      const prevFullR =
        this._segments[this._segments.length - 1]?.fullR ?? this.owner.radius;
      const fullR = prevFullR * BASE_RATIO;
      const last = this._segments[this._segments.length - 1];
      this._segments.push({
        x: last?.x ?? this.owner.x,
        y: last?.y ?? this.owner.y,
        r: fullR * GROWTH_SCALE,
        fullR,
        hitCd: 0,
        state: "growing",
      });
    }
  }

  getHitDamage() {
    return HEAD_DMG;
  }

  renderBelow(ctx) {
    if (!this._ready || this._segments.length === 0) return;

    // Draw segment circles from tail to neck (larger ones render on top)
    for (let i = this._segments.length - 1; i >= 0; i--) {
      const seg = this._segments[i];
      ctx.save();
      if (seg.state === "growing") ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, seg.r, 0, Math.PI * 2);
      ctx.fillStyle = this.owner.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  clearState() {
    this._history = [];
    this._segments = [];
    this._ready = false;
    this._hpLastFrame = null;
  }

  static meta = {
    id: "serpiente",
    name: "Serpiente",
    description:
      "Lleva una cola que crece al recibir golpes. La cola daña a los enemigos.",
    color: "#22c55e",
    icon: "〰",
    dmgRating: 2,
  };
}
