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
    this._hideDeadCircles  = arenaOpts.hideDeadCircles ?? false;
    this._activeAbilities  = arenaOpts.activeAbilities  ?? false;
    this._playerSide       = arenaOpts.playerSide       ?? 0;
    this._impacts = [];
    const a = this.arena;

    const cpad        = (cfgs[0].radius ?? 28) + 14;
    const defaultSpeed = 310;

    // For 4-player FFA (no teams), start in 2×2 quadrant positions instead of a horizontal strip
    const ffa4 = N === 4 && cfgs.every(c => c.teamId == null);
    this.circles = cfgs.map((cfg, i) => {
      let x, y;
      if (ffa4) {
        const col = i % 2, row = Math.floor(i / 2);
        const qw = a.width / 2, qh = a.height / 2;
        const rand = (v) => (Math.random() * 2 - 1) * Math.min(v * 0.3, 30);
        x = a.left + qw * col + qw / 2 + rand(qw);
        y = a.top  + qh * row + qh / 2 + rand(qh);
      } else {
        const sliceW = a.width / N;
        x = a.left + sliceW * i + cpad + Math.random() * Math.max(0, sliceW - cpad * 2);
        y = a.top + cpad + Math.random() * (a.height - cpad * 2);
      }
      const spd = cfg.enemySpeed ?? defaultSpeed;
      const ang = Math.random() * Math.PI * 2;
      return new Circle({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, ...cfg });
    });

    for (const c of this.circles) {
      c.power.arena = this.arena;
      c.power._spawnImpact = (x, y, intensity = 0.8) => {
        this._impacts.push({ x, y, t: 0, maxT: 0.28 + intensity * 0.15, intensity, seed: Math.random() * 1000 | 0 });
      };

      // Apply tower run mods to the player circle (towerMods is set by InfiniteTower)
      const tm = c.towerMods;
      if (tm) {
        if (tm.speedMult && tm.speedMult !== 1) {
          const newSpeed = c.baseSpeed * tm.speedMult;
          c.baseSpeed = newSpeed;
          const mag = Math.sqrt(c.vx * c.vx + c.vy * c.vy) || 1;
          c.vx = (c.vx / mag) * newSpeed;
          c.vy = (c.vy / mag) * newSpeed;
        }
        if (tm.contactDmgAdd) c._contactDmgAdd      = tm.contactDmgAdd;
        if (tm.bleedPerSec)  { c._contactBleedDPS = tm.bleedPerSec; c._contactBleedDur = tm.bleedDuration ?? 3; }
        if (tm.regenPerSec)   c.applyHeal(tm.regenPerSec, Infinity);
      }
    }

    // Init AI ability timers for enemy circles
    if (this._activeAbilities) {
      const hasTeams = this.circles.some(c => c.teamId != null);
      this.circles.forEach((c, i) => {
        const isPlayer = hasTeams ? c.teamId === 0 : i === 0;
        if (!isPlayer) {
          c._aiSpeedCd  = 8  + Math.random() * 12;
          c._aiDamageCd = 10 + Math.random() * 14;
          c._aiHealCd   = 4  + Math.random() * 8;
        }
      });
    }

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

    // AI abilities for enemy circles
    if (this._activeAbilities) {
      const hasTeams = this.circles.some(c => c.teamId != null);
      this.circles.forEach((c, i) => {
        if (!c.isAlive) return;
        const isPlayer = hasTeams ? c.teamId === 0 : i === 0;
        if (!isPlayer && c._aiSpeedCd !== undefined) this._aiUpdateAbilities(c, dt);
      });
    }

    // Advance impact frame timers
    if (this._impacts.length) {
      for (const imp of this._impacts) imp.t += dt;
      this._impacts = this._impacts.filter(imp => imp.t < imp.maxT);
    }

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
      // Only deal damage on real impacts (not grazing/sliding contact).
      // At 310 px/s base speed a head-on hit has vRel ~620; tangential sliding is < 50.
      if (!sameTeam && vRel > 100) {
        const c1Hit = c1._hitCooldown <= 0;
        const c2Hit = c2._hitCooldown <= 0;
        if (c1Hit && c2Hit) {
          c2.takeDamage((c1.power.getHitDamage() + (c1._contactDmgAdd ?? 0)) * c1._dmgBuffMult); c2._hitCooldown = 1.0;
          c1.takeDamage((c2.power.getHitDamage() + (c2._contactDmgAdd ?? 0)) * c2._dmgBuffMult); c1._hitCooldown = 1.0;
          if ((c1._contactBleedDPS ?? 0) > 0) c2.applyBleed(c1._contactBleedDur ?? 3, c1._contactBleedDPS);
          if ((c2._contactBleedDPS ?? 0) > 0) c1.applyBleed(c2._contactBleedDur ?? 3, c2._contactBleedDPS);
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
    for (const c of this.circles) if (!this._hideDeadCircles || c.isAlive) c.renderBelowEffects(ctx);
    // Phase 2: circle bodies and above-circle effects
    for (const c of this.circles) if (!this._hideDeadCircles || c.isAlive) c.render(ctx);

    // Phase 3: impact frames (manga-style radial lines on hit)
    for (const imp of this._impacts) _renderImpactFrame(ctx, imp);
  }

  _aiUpdateAbilities(c, dt) {
    // Speed: activate periodically
    c._aiSpeedCd -= dt;
    if (c._aiSpeedCd <= 0) {
      c.applySpeedBuff(5, 1.7);
      c._aiSpeedCd = 18 + Math.random() * 16;
    }

    // Damage: activate periodically
    c._aiDamageCd -= dt;
    if (c._aiDamageCd <= 0) {
      c.applyDamageBuff(5, 2);
      c._aiDamageCd = 20 + Math.random() * 14;
    }

    // Heal: activate when HP is low, or periodically
    c._aiHealCd -= dt;
    if (c._aiHealCd <= 0) {
      const hpFrac = c.hp / c.maxHp;
      if (hpFrac < 0.55) {
        c.applyHeal(5, 4);
        c._aiHealCd = 14 + Math.random() * 10;
      } else {
        c._aiHealCd = 4 + Math.random() * 6;
      }
    }
  }

  applyActiveBuff(type) {
    const hasTeams  = this.circles.some(c => c.teamId != null);
    const playerIdx = this._playerSide ?? 0;
    const targets   = this.circles.filter((c, i) =>
      c.isAlive && (hasTeams ? c.teamId === 0 : i === playerIdx)
    );
    for (const c of targets) {
      if (type === 'speed')  c.applySpeedBuff(5, 1.7);
      if (type === 'heal')   c.applyHeal(5, 4);
      if (type === 'damage') c.applyDamageBuff(5, 2);
    }
  }

  // Returns live HP snapshot for HUD polling
  getHpSnapshot() {
    return this.circles.map(c => ({
      hp: c.hp, maxHp: c.maxHp, isAlive: c.isAlive,
      _hudHp: c._hudHp, _hudMaxHp: c._hudMaxHp,
    }));
  }
}

// ── Impact frame renderer (manga-style radial lines) ─────────────────────────

function _seededRand(seed, i) {
  let h = (seed * 1664525 + i * 1013904223) & 0xffffffff;
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

function _renderImpactFrame(ctx, { x, y, t, maxT, intensity, seed }) {
  const progress = t / maxT;
  // Sharp pop then slow fade
  const alpha = progress < 0.15
    ? progress / 0.15
    : 1 - (progress - 0.15) / 0.85;

  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  // Max distance from impact point to canvas corner
  const maxDist = Math.sqrt(
    Math.max(x, W - x) ** 2 + Math.max(y, H - y) ** 2
  );

  const numLines = Math.round(42 + intensity * 30);
  const innerGap = 10 + intensity * 8;

  ctx.save();

  // Subtle full-canvas flash — just a slight bright pulse, not blinding
  const flashAlpha = progress < 0.15
    ? (progress / 0.15) * (0.12 + intensity * 0.10)
    : Math.max(0, (1 - (progress - 0.15) / 0.25)) * (0.12 + intensity * 0.10);
  if (flashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Clip to canvas so lines don't bleed outside
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  // Radial lines from impact point to canvas edges
  for (let i = 0; i < numLines; i++) {
    const r0 = _seededRand(seed, i * 3);
    const r1 = _seededRand(seed, i * 3 + 1);
    const r2 = _seededRand(seed, i * 3 + 2);

    const angle   = (i / numLines) * Math.PI * 2 + (r0 - 0.5) * 0.18;
    // Lines reach 70–100% of the way to the canvas corner
    const lineLen = maxDist * (0.70 + r1 * 0.30);
    const thick   = r2 < 0.28;
    const lw      = thick ? 3.5 + intensity * 3 : 1.0 + intensity * 1.2;
    const darkA   = thick
      ? (0.85 + intensity * 0.15) * alpha
      : (0.45 + intensity * 0.3) * alpha;

    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * innerGap,             y + Math.sin(angle) * innerGap);
    ctx.lineTo(x + Math.cos(angle) * (innerGap + lineLen), y + Math.sin(angle) * (innerGap + lineLen));
    ctx.strokeStyle = `rgba(8,8,8,${darkA})`;
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'butt';
    ctx.stroke();
  }

  // Small bright core at impact point
  const coreR = 8 + intensity * 14;
  const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, coreR);
  coreGrad.addColorStop(0,   `rgba(255,255,255,${alpha})`);
  coreGrad.addColorStop(0.5, `rgba(255,240,180,${0.6 * alpha})`);
  coreGrad.addColorStop(1,   `rgba(255,255,255,0)`);
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(x, y, coreR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
