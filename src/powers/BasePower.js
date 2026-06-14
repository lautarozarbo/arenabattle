/**
 * Base class for all powers.
 * To create a new power:
 *   1. Extend BasePower, override the methods you need
 *   2. Set a static `meta` object
 *   3. Import and add to src/powers/registry.js
 *   — That's it. No other file needs to change.
 */
export class BasePower {
  constructor(owner) {
    this.owner = owner;
  }

  // Called every frame. Use for animations, timers, spawning effects.
  update(dt) {}

  // Called once when owner bounces a wall. wallNormal = {x, y}
  onWallBounce(wallNormal) {}

  // Called once when owner bounces a circular obstacle. normal = {x, y} (radial)
  // Default: forwards to onWallBounce so all powers keep working on obstacles.
  onObstacleBounce(normal) { this.onWallBounce(normal); }

  // Called once at the moment of collision with enemy circle.
  onCollide(enemy) {}

  // Called every frame with the other circle (for area/field effects).
  onEnemyFrame(enemy, dt) {}

  // Convenience: deal damage to a target applying the owner's active damage buff.
  _dealDmg(target, amount) {
    target.takeDamage(amount * (this.owner._dmgBuffMult ?? 1));
  }

  // Flat damage dealt to the enemy on each physical hit/bounce.
  getHitDamage() { return 1; }

  // Damage per second applied while circles are overlapping.
  getContactDPS() { return 0; }

  // Render anything this power draws (called before the circle body).
  renderBelow(ctx) {}

  // Render anything this power draws on top of the circle.
  renderAbove(ctx) {}

  // Wipe all active map state (projectiles, zones, effects).
  clearState() {}

  // Drain the power's charge/cooldown progress back to zero.
  // Generic fallback resets common timer fields by convention;
  // specific powers can override for precision.
  drainCharge() {
    if (this._cooldownTimer != null && this.COOLDOWN != null)
      this._cooldownTimer = this.COOLDOWN;
    if (this._chargeTimer != null)
      this._chargeTimer = 0;
    if (this._cdTimer != null && this.BURST_CD != null)
      this._cdTimer = this.BURST_CD;
    if (this._idleTimer != null)
      this._idleTimer = 0;
  }

  // Called when the owner is unsilenced (e.g. clock freeze ends). Powers can use
  // this to resync stale internal state that accumulated while silenced.
  onUnsilenced() {}

  // Called when owner hp reaches 0. Return true to intercept death (revive mechanic).
  _onBeforeDeath() { return false; }

  static meta = {
    id: 'base',
    name: 'Base',
    description: '',
    color: '#888888',
    icon: '●',
  };
}
