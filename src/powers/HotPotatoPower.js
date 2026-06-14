import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const TIMER_MAX = 9.0; // s until explosion
const EXPLOSION_DMG = 30;
const RESET_CD = 2.5; // s before bomb respawns on owner
const TRANSFER_CD = 0.38; // s cooldown to prevent immediate back-transfer
const BOMB_R = 9; // visual radius of bomb icon

export class HotPotatoPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._holder = owner; // circle currently holding the bomb
    this._timer = TIMER_MAX;
    this._active = true;
    this._resetCd = 0;
    this._transferCd = 0;
    this._tickAccum = 0;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    if (this._resetCd > 0) {
      this._resetCd -= dt;
      if (this._resetCd <= 0) {
        this._holder = this.owner;
        this._timer = TIMER_MAX;
        this._active = true;
        this._tickAccum = 0;
        sfx.hotPotatoReset();
      }
      return;
    }

    if (!this._active) return;

    if (this._transferCd > 0) this._transferCd -= dt;

    // If holder died, bomb returns to owner
    if (!this._holder.isAlive) this._holder = this.owner;

    this._timer -= dt;

    // Ticking sound — rate increases as timer runs out
    const frac = Math.max(0, this._timer / TIMER_MAX);
    if (frac < 0.75) {
      const interval = Math.max(0.07, 0.32 * frac * 1.5);
      this._tickAccum -= dt;
      if (this._tickAccum <= 0) {
        this._tickAccum = interval;
        sfx.hotPotatoTick();
      }
    }

    if (this._timer <= 0) {
      if (this._holder === this.owner) {
        this._holder.takeDamage(EXPLOSION_DMG);
      } else {
        this._dealDmg(this._holder, EXPLOSION_DMG);
      }
      sfx.hotPotatoExplode();
      this._active = false;
      this._resetCd = RESET_CD;
    }
  }

  // ── Redirect stale holder after relay swap ───────────────────────────────

  onEnemyFrame(enemy) {
    if (!this._active) return;
    // If _holder is neither the owner nor the current active enemy, the holder
    // circle was swapped out by a relay switch. Redirect the bomb to the current
    // enemy so the timer continues without the bomb disappearing.
    if (this._holder !== this.owner && this._holder !== enemy) {
      this._holder = enemy;
    }
  }

  // ── Transfer on collision ─────────────────────────────────────────────────

  onCollide(enemy) {
    if (!this._active || this._transferCd > 0 || !enemy.isAlive) return;

    if (this._holder === this.owner) {
      this._holder = enemy;
      this._transferCd = TRANSFER_CD;
      sfx.hotPotatoPass();
    } else if (this._holder === enemy) {
      this._holder = this.owner;
      this._transferCd = TRANSFER_CD;
      sfx.hotPotatoPass();
    }
  }

  clearState() {
    this._holder = this.owner;
    this._timer = TIMER_MAX;
    this._active = true;
    this._resetCd = 0;
    this._transferCd = 0;
    this._tickAccum = 0;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  renderAbove(ctx) {
    if (!this._active) return;

    const hx = this._holder.x;
    const hy = this._holder.y;
    const hr = this._holder.radius;
    const frac = Math.max(0, this._timer / TIMER_MAX); // 1 → 0
    const urgency = 1 - frac;

    // Color: green → orange → red
    const cr = Math.min(255, Math.round(80 + urgency * 175));
    const cg = Math.round(Math.max(0, 210 - urgency * 210));

    // Pulse speed and intensity increase with urgency
    const pulseHz = 1.8 + urgency * 9;
    const pulse =
      0.55 + 0.45 * Math.abs(Math.sin((Date.now() / 1000) * pulseHz));

    // ── Timer ring around holder ──────────────────────────────────────────────
    const ringAlpha = (0.45 + 0.55 * pulse) * (0.55 + 0.45 * urgency);
    ctx.save();
    ctx.strokeStyle = `rgba(${cr},${cg},0,${ringAlpha})`;
    ctx.lineWidth = 2.5 + urgency * 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    // Ring goes from 12 o'clock clockwise; frac=1 is full ring, frac=0 is empty
    ctx.arc(hx, hy, hr + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    ctx.restore();

    // ── Bomb icon above holder ────────────────────────────────────────────────
    const bombX = hx;
    const bombY = hy - hr - BOMB_R - 8;
    const wobble =
      urgency > 0.55
        ? Math.sin(Date.now() / (90 - urgency * 50)) * urgency * 3.5
        : 0;

    ctx.save();
    ctx.globalAlpha = 0.92 * (0.7 + 0.3 * pulse);

    // Bomb body
    ctx.beginPath();
    ctx.arc(bombX + wobble, bombY, BOMB_R, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${cr},${cg},0)`;
    ctx.shadowBlur = urgency > 0.5 ? 10 * urgency : 0;
    ctx.shadowColor = `rgba(${cr},${cg},0,0.8)`;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fuse line (shrinks as timer runs out)
    if (frac > 0.12) {
      const fuseLen = frac * 13 + 3;
      const fuseWave = Math.sin(Date.now() / 160) * 2.5;
      ctx.strokeStyle = "#CC8800";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bombX + wobble, bombY - BOMB_R);
      ctx.quadraticCurveTo(
        bombX + wobble + fuseWave,
        bombY - BOMB_R - fuseLen * 0.6,
        bombX + wobble + fuseWave * 0.5,
        bombY - BOMB_R - fuseLen,
      );
      ctx.stroke();

      // Spark at fuse tip
      ctx.beginPath();
      ctx.arc(
        bombX + wobble + fuseWave * 0.5,
        bombY - BOMB_R - fuseLen,
        2.5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#FFD700";
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#FFAA00";
      ctx.fill();
    }

    ctx.restore();
  }

  static meta = {
    id: "hotpotato",
    name: "Papa Caliente",
    description:
      "La bomba explota después de un tiempo. Al chocar se pasa. El que la tiene al explotar recibe el daño.",
    color: "#FF6B35",
    icon: "◉",
    dmgRating: 2,
  };
}
