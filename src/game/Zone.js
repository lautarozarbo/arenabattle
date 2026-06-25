/**
 * Zone — shrinking safe zone (battle-royale style).
 *
 * Timeline:
 *   0s → countdown s : safe zone = full arena (no damage)
 *   countdown → countdown + shrinkDur : zone shrinks to radius 0
 *   after shrinkDur  : radius = 0, everyone takes damage until fight ends
 */
export class Zone {
  constructor({ x, y, width, height }) {
    this.cx       = x + width  / 2;
    this.cy       = y + height / 2;
    this.areaTop  = y;
    this._ax = x; this._ay = y; this._aw = width; this._ah = height;

    // Start radius just large enough to cover all 4 corners of the square arena
    this.startRadius = Math.hypot(width, height) / 2 + 6;
    this.radius      = this.startRadius;

    this.countdown = 90; // seconds before shrinking starts
    this.shrinkDur = 60; // seconds to reach radius 0
    this.dps       = 5;  // HP per second while outside

    this.elapsed = 0;
    this.phase   = 'countdown'; // 'countdown' | 'shrinking' | 'closed'
    this._dmgAccum = new Map(); // circle → accumulated zone damage
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt, circles) {
    this.elapsed += dt;

    if (this.phase === 'countdown' && this.elapsed >= this.countdown) {
      this.phase = 'shrinking';
    }

    if (this.phase === 'shrinking') {
      const t = Math.min(1, (this.elapsed - this.countdown) / this.shrinkDur);
      this.radius = this.startRadius * (1 - t);
      if (t >= 1) { this.radius = 0; this.phase = 'closed'; }
    }

    if (this.phase === 'countdown') return; // no damage during countdown

    // Apply damage to circles outside the zone (once-per-second ticks for feedback)
    for (const c of circles) {
      if (!c.isAlive) continue;
      const dx = c.x - this.cx;
      const dy = c.y - this.cy;
      const outside = Math.hypot(dx, dy) > this.radius;

      if (outside) {
        const acc = (this._dmgAccum.get(c) ?? 0) + this.dps * dt;
        if (acc >= 1) {
          c.takeDamage(Math.floor(acc));
          this._dmgAccum.set(c, acc - Math.floor(acc));
        } else {
          this._dmgAccum.set(c, acc);
        }
      } else {
        this._dmgAccum.delete(c);
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  render(ctx, W, H) {
    if (this.phase !== 'countdown') {
      this._renderStorm(ctx, W, H);
    }
    // Timer is rendered as a DOM element — see getTimerInfo()
  }

  _renderStorm(ctx, W, H) {
    const r = this.radius;

    // Storm overlay — fill only inside arena bounds, outside safe circle
    ctx.save();
    ctx.beginPath();
    ctx.rect(this._ax, this._ay, this._aw, this._ah);
    if (r > 1) {
      ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2, true); // CCW = hole = safe zone
    }
    ctx.fillStyle = 'rgba(20, 2, 45, 0.50)';
    ctx.fill('evenodd');
    ctx.restore();

    // Glowing border ring at safe-zone edge
    if (r > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
      ctx.lineWidth   = 2;
      ctx.shadowBlur  = 14;
      ctx.shadowColor = '#a855f7';
      ctx.stroke();
      // Second thin inner stroke for crispness
      ctx.lineWidth   = 0.8;
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.stroke();
      ctx.restore();
    }
  }

  // Returns timer display info for the DOM element — called every frame from game.js
  getTimerInfo() {
    if (this.phase === 'closed') return null;
    const remaining = this.phase === 'countdown'
      ? this.countdown - this.elapsed
      : (this.countdown + this.shrinkDur) - this.elapsed;
    const secs = Math.max(0, remaining);
    const m    = Math.floor(secs / 60);
    const s    = Math.floor(secs % 60);
    return {
      text:    `${m}:${s.toString().padStart(2, '0')}`,
      active:  this.phase !== 'countdown',
      warning: this.phase !== 'countdown' ? secs < 10 : secs < 15,
    };
  }
}
