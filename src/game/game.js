import { Arena  } from './arena.js';
import { Circle } from './circle.js';
import { vec2   } from '../utils/vec2.js';
import { sfx    } from '../audio/index.js';

export class Game {
  constructor(canvas, { onGameOver = () => {} } = {}) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.state  = 'idle'; // idle | playing | gameover
    this.circles = [];
    this.arena   = null;
    this.onGameOver = onGameOver;
    this._raf  = null;
    this._last = null;
    this.timeScale = 1;
  }

  // cfgs: array of fighter configs. arenaOpts: { obstacles: [{x,y,r}] } (normalized 0-1).
  start(cfgs, arenaOpts = {}) {
    if (!Array.isArray(cfgs)) cfgs = [cfgs, arenaOpts]; // legacy 2-arg compat
    const N = cfgs.length;
    const obstaclesNorm = arenaOpts.obstacles ?? [];

    const W = this.canvas.width;
    const H = this.canvas.height;
    const pad = 4;
    const size = Math.min(W, H) - pad * 2;
    const ax = (W - size) / 2;
    const ay = (H - size) / 2;

    const obstaclesAbs = obstaclesNorm.map(o => ({
      cx: ax + o.x * size,
      cy: ay + o.y * size,
      r:  o.r * size,
    }));

    this.arena = new Arena({ x: ax, y: ay, width: size, height: size, obstacles: obstaclesAbs, skinId: arenaOpts.skinId ?? 'default' });
    const a = this.arena;

    const cpad  = (cfgs[0].radius ?? 28) + 14;
    const speed = 310;

    this.circles = cfgs.map((cfg, i) => {
      const sliceW = a.width / N;
      const x = a.left + sliceW * i + cpad + Math.random() * Math.max(0, sliceW - cpad * 2);
      const y = a.top + cpad + Math.random() * (a.height - cpad * 2);
      const ang = Math.random() * Math.PI * 2;
      return new Circle({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, ...cfg });
    });

    for (const c of this.circles) c.power.arena = this.arena;

    this.state = 'playing';
    this._last = null;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._tick();
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this.state = 'idle';
  }

  // Swap a fighter in-place: new fighter appears at the old one's position/velocity.
  // Velocity is normalized to default speed so slows/boosts don't carry over.
  swapFighter(idx, newCfg) {
    const old = this.circles[idx];
    if (!old || !this.arena) return;
    // Release any power-induced effects (frozen silences, speed overrides) that
    // the outgoing power placed on OTHER circles before it gets garbage-collected.
    old.power.clearState();
    const DEFAULT_SPEED = 310;
    const curSpeed = Math.sqrt(old.vx ** 2 + old.vy ** 2);
    // If the outgoing circle had zero velocity (e.g. Rocket charging), compute a
    // random direction so the incoming circle gets a non-zero baseSpeed — otherwise
    // Circle sets baseSpeed = 0 and clampToBaseSpeed never applies the unstick kick.
    let vx, vy;
    if (curSpeed < 0.001) {
      const a = Math.random() * Math.PI * 2;
      vx = Math.cos(a) * DEFAULT_SPEED;
      vy = Math.sin(a) * DEFAULT_SPEED;
    } else {
      const scale = DEFAULT_SPEED / curSpeed;
      vx = old.vx * scale;
      vy = old.vy * scale;
    }
    const incoming = new Circle({
      ...newCfg,
      x: old.x, y: old.y,
      vx, vy,
    });
    incoming.power.arena = this.arena;
    this.arena.pushOutOfObstacles(incoming);
    this.circles[idx] = incoming;
  }

  _tick() {
    this._raf = requestAnimationFrame(ts => {
      if (this._last === null) this._last = ts;
      const dt = Math.min((ts - this._last) / 1000, 0.05) * this.timeScale;
      this._last = ts;
      this._update(dt);
      this._render();
      if (this.state === 'playing') this._tick();
    });
  }

  _update(dt) {
    for (const c of this.circles) {
      c.update(dt);
      this.arena.bounceCircle(c);
      this.arena.bounceCircleOffObstacles(c);
    }

    const alive = this.circles.filter(c => c.isAlive);

    for (let i = 0; i < alive.length; i++)
      for (let j = i + 1; j < alive.length; j++)
        this._handlePair(alive[i], alive[j], dt);

    for (const c of alive) {
      if (c._silenced) continue;
      for (const e of alive) {
        if (e === c) continue;
        if (c.teamId != null && c.teamId === e.teamId) continue;
        c.power.onEnemyFrame(e, dt);
      }
    }

    for (const c of alive) c.clampToBaseSpeed();

    const survivors = this.circles.filter(c => c.isAlive);
    const hasTeams  = this.circles.some(c => c.teamId != null);
    const over      = hasTeams
      ? new Set(survivors.map(c => c.teamId)).size <= 1
      : survivors.length <= 1;

    if (over) {
      this.state = 'gameover';
      const winner    = survivors[0] ?? null;
      const winnerIdx = winner ? this.circles.indexOf(winner) : -1;
      this.onGameOver(winner, winnerIdx);
    }
  }

  _handlePair(c1, c2, dt) {
    const dx   = c2.x - c1.x;
    const dy   = c2.y - c1.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const minD = c1.radius + c2.radius;

    if (dist >= minD) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // Separate so they don't overlap
    const overlap = minD - dist;
    const total   = c1.mass + c2.mass;
    c1.x -= nx * overlap * (c2.mass / total);
    c1.y -= ny * overlap * (c2.mass / total);
    c2.x += nx * overlap * (c1.mass / total);
    c2.y += ny * overlap * (c1.mass / total);

    // Relative velocity along normal
    const dvx = c1.vx - c2.vx;
    const dvy = c1.vy - c2.vy;
    const vRel = dvx * nx + dvy * ny;

    // Elastic bounce (only when approaching)
    if (vRel > 0) {
      const m1 = c1.mass, m2 = c2.mass;
      const imp = (2 * vRel) / (m1 + m2);
      c1.vx -= imp * m2 * nx;
      c1.vy -= imp * m2 * ny;
      c2.vx += imp * m1 * nx;
      c2.vy += imp * m1 * ny;

      const sameTeam = c1.teamId != null && c1.teamId === c2.teamId;
      if (!sameTeam) {
        const c1Hit = c1._hitCooldown <= 0;
        const c2Hit = c2._hitCooldown <= 0;
        if (c1Hit || c2Hit) {
          if (c2Hit) { c2.takeDamage(c1.power.getHitDamage()); c2._hitCooldown = 0.5; }
          if (c1Hit) { c1.takeDamage(c2.power.getHitDamage()); c1._hitCooldown = 0.5; }
          c1.power.onCollide(c2);
          c2.power.onCollide(c1);
          sfx.collide();
        }
      }
    }
  }

  _render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(0, 0, W, H);

    this.arena.render(ctx);

    // Phase 1: area effects behind all circles (fixes z-order for full-arena powers)
    for (const c of this.circles) c.renderBelowEffects(ctx);
    // Phase 2: circle bodies and above-circle effects
    for (const c of this.circles) c.render(ctx);
  }

  // Returns live HP snapshot for HUD polling
  getHpSnapshot() {
    return this.circles.map(c => ({
      hp: c.hp, maxHp: c.maxHp, isAlive: c.isAlive,
      _hudHp: c._hudHp, _hudMaxHp: c._hudMaxHp,
    }));
  }
}
