import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const MINI_COUNT = 10;
const MINI_SCALE = 0.42;
const TEETH = 7;
const TOOTH_H = 5;

function drawMiniSaw(ctx, mx, my, r, angle, alpha) {
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let i = 0; i < TEETH; i++) {
    const a1 = (i / TEETH) * Math.PI * 2;
    const amid = ((i + 0.5) / TEETH) * Math.PI * 2;
    const a2 = ((i + 1) / TEETH) * Math.PI * 2;
    const x1 = Math.cos(a1) * r,
      y1 = Math.sin(a1) * r;
    const xm = Math.cos(amid) * (r + TOOTH_H),
      ym = Math.sin(amid) * (r + TOOTH_H);
    const x2 = Math.cos(a2) * r,
      y2 = Math.sin(a2) * r;
    if (i === 0) ctx.moveTo(x1, y1);
    else ctx.lineTo(x1, y1);
    ctx.lineTo(xm, ym);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(210,220,255,${0.75 * alpha})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(100,120,200,${0.6 * alpha})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

// Build a mini object that looks like a Circle to enemy powers.
function makeMini(x, y, vx, vy, hp, radius, baseSpeed) {
  const m = {
    x,
    y,
    vx,
    vy,
    radius,
    hp,
    maxHp: hp,
    isAlive: true,
    baseSpeed,
    _invulnerable: false,
    _speedOverride: null,
    _flashTimer: 0,
    _hitCd: 0, // game.js _handleMini cooldown
    bladeAngle: Math.random() * Math.PI * 2,
    bladeCd: 0,
    // Venom state (applied by VenomPower.onCollide → applyVenom)
    _venomTimer: 0,
    _venomDps: 0,
    _venomAccum: 0,
    _slowTimer: 0,
    _slowFactor: 1,
    // Powers check power?._comp — return null-safe stub
    power: { _comp: null },
  };

  m.takeDamage = (n) => {
    if (!m.isAlive || m._invulnerable || n <= 0) return;
    m.hp -= n;
    m._flashTimer = 0.12;
    if (m.hp <= 0) {
      m.hp = 0;
      m.isAlive = false;
    }
  };

  m.applyVenom = (slowDur, poisonDur, dps /*, slowFactor */) => {
    m._venomTimer = poisonDur;
    m._venomDps = dps;
    m._venomAccum = 0;
    m._slowTimer = slowDur;
  };

  return m;
}

export class SplitPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._state = "idle"; // 'idle' | 'split'
    this._idleTimer = 0;
    this._splitTimer = 0;
    this._minis = [];
    this._savedSpeed = null;

    this.IDLE_TIME = 5.0;
    this.SPLIT_TIME = 3.0;
    this.MINI_SPEED = 215;
    this.BLADE_DMG = 8;
    this.BLADE_CD = 0.4;
  }

  // Exposed so game.js can call enemy power interactions on each mini.
  get _splitMinis() {
    return this._state === "split" ? this._minis : [];
  }

  // ── Split / merge ─────────────────────────────────────────────────────────

  _doSplit() {
    const { x, y, hp, radius, baseSpeed } = this.owner;
    const miniHp = hp / MINI_COUNT;
    const miniR = radius * MINI_SCALE;
    const spd = this.MINI_SPEED;

    this._minis = [];
    for (let i = 0; i < MINI_COUNT; i++) {
      const ang = (i / MINI_COUNT) * Math.PI * 2 + Math.random() * 0.4;
      const s = spd * (0.7 + Math.random() * 0.6);
      const m = makeMini(
        x + Math.cos(ang) * (radius + miniR + 2),
        y + Math.sin(ang) * (radius + miniR + 2),
        Math.cos(ang) * s,
        Math.sin(ang) * s,
        miniHp,
        miniR,
        baseSpeed,
      );
      this._minis.push(m);
    }

    this._savedSpeed = this.owner.baseSpeed;
    this.owner._invulnerable = true;
    this.owner._speedOverride = 0;
    this._splitTimer = this.SPLIT_TIME;
    this._state = "split";
    sfx.glassBreak();
  }

  _doMerge() {
    const totalHp = this._minis
      .filter((m) => m.isAlive)
      .reduce((acc, m) => acc + m.hp, 0);

    this.owner.hp = Math.max(0, totalHp);
    this.owner.baseSpeed = this._savedSpeed ?? this.owner.baseSpeed;
    this.owner._invulnerable = false;
    this.owner._speedOverride = null;

    if (totalHp > 0) {
      const ang = Math.random() * Math.PI * 2;
      const spd = this.owner.baseSpeed;
      this.owner.vx = Math.cos(ang) * spd;
      this.owner.vy = Math.sin(ang) * spd;
    }

    this._minis = [];
    this._savedSpeed = null;
    this._idleTimer = 0;
    this._state = "idle";
    sfx.collide();
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    if (this._state === "idle") {
      this._idleTimer += dt;
      if (this._idleTimer >= this.IDLE_TIME) {
        this._idleTimer = 0;
        this._doSplit();
      }
      return;
    }

    // ── split ──
    this._splitTimer -= dt;
    const { left, right, top, bottom } = this.arena;

    for (const m of this._minis) {
      if (!m.isAlive) continue;

      if (m._flashTimer > 0) m._flashTimer -= dt;
      if (m._hitCd > 0) m._hitCd -= dt;
      if (m.bladeCd > 0) m.bladeCd -= dt;

      // Venom tick
      if (m._venomTimer > 0) {
        m._venomTimer -= dt;
        m._venomAccum += dt;
        if (m._venomAccum >= 1) {
          this._dealDmg(m, m._venomDps);
          m._venomAccum -= 1;
        }
      }

      // Movement — respect _speedOverride = 0 (Electric freeze, etc.)
      if (m._speedOverride === 0) {
        m.vx = 0;
        m.vy = 0;
      } else {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        // Wall bounce
        if (m.x - m.radius < left) {
          m.x = left + m.radius;
          m.vx = Math.abs(m.vx);
        }
        if (m.x + m.radius > right) {
          m.x = right - m.radius;
          m.vx = -Math.abs(m.vx);
        }
        if (m.y - m.radius < top) {
          m.y = top + m.radius;
          m.vy = Math.abs(m.vy);
        }
        if (m.y + m.radius > bottom) {
          m.y = bottom - m.radius;
          m.vy = -Math.abs(m.vy);
        }
      }

      m.bladeAngle += dt * 5.5;

      if (m.hp <= 0) m.isAlive = false;
    }

    // Sync owner HP
    const livingHp = this._minis
      .filter((m) => m.isAlive)
      .reduce((acc, m) => acc + m.hp, 0);
    this.owner.hp = Math.max(0, livingHp);

    if (!this._minis.some((m) => m.isAlive) || this._splitTimer <= 0) {
      this._doMerge();
    }
  }

  // ── Enemy interactions ────────────────────────────────────────────────────
  // Mini blade → enemy damage (called from SplitPower directly for blade hits)

  onEnemyFrame(enemy) {
    if (this._state !== "split" || !enemy.isAlive) return;
    for (const m of this._minis) {
      if (!m.isAlive) continue;
      const dx = enemy.x - m.x;
      const dy = enemy.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      if (dist < m.radius + enemy.radius && m.bladeCd <= 0) {
        this._dealDmg(enemy, this.BLADE_DMG);
        sfx.spikeHit();
        m.bladeCd = this.BLADE_CD;
      }
    }
    const comp = enemy.power?._comp;
    if (comp?.isAlive) {
      for (const m of this._minis) {
        if (!m.isAlive) continue;
        const dx = comp.x - m.x;
        const dy = comp.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (dist < m.radius + comp.radius && m.bladeCd <= 0) {
          this._dealDmg(comp, this.BLADE_DMG);
          sfx.spikeHit();
          m.bladeCd = this.BLADE_CD;
        }
      }
    }
  }

  getHitDamage() {
    return this._state === "idle" ? 1 : 0;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    if (this._state !== "split") return;
    const ownerColor = this.owner.color ?? "#88aaff";

    for (const m of this._minis) {
      if (!m.isAlive) continue;
      const hpFrac = Math.max(0, m.hp / m.maxHp);
      const flash = m._flashTimer > 0;

      drawMiniSaw(ctx, m.x, m.y, m.radius, m.bladeAngle, 1);

      ctx.save();
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fillStyle = flash ? "#ffffff" : ownerColor;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // HP bar
      const bw = m.radius * 2.2,
        bh = 3;
      const bx = m.x - bw / 2,
        by = m.y - m.radius - 6;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle =
        hpFrac > 0.5 ? "#4edd6a" : hpFrac > 0.2 ? "#f0b800" : "#e03c3c";
      ctx.fillRect(bx, by, bw * hpFrac, bh);

      ctx.restore();
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;

    if (this._state === "idle") {
      const frac = Math.min(1, this._idleTimer / this.IDLE_TIME);
      if (frac < 0.03) return;
      ctx.save();
      ctx.strokeStyle = `rgba(160,190,255,${0.35 + 0.6 * frac})`;
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
      if (frac > 0.85) {
        const pulse = Math.abs(Math.sin(Date.now() / 80));
        ctx.beginPath();
        ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180,210,255,${0.4 * pulse})`;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      ctx.restore();
    } else if (this._state === "split") {
      const alive = this._minis.filter((m) => m.isAlive).length;
      const t = this._splitTimer / this.SPLIT_TIME;
      const pulse = 0.45 + 0.45 * Math.abs(Math.sin(Date.now() / 160));

      ctx.save();
      ctx.strokeStyle = `rgba(160,190,255,${0.55 * pulse * t})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
      ctx.stroke();

      const fs = Math.max(10, Math.floor(radius * 0.75));
      ctx.font = `bold ${fs}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.strokeText(String(alive), x, y);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(String(alive), x, y);
      ctx.restore();
    }
  }

  static meta = {
    id: "split",
    name: "Escisión",
    description:
      "Cada 5s se divide en 10 mini círculos con la vida repartida. Cada uno tiene una cuchilla giratoria (5 daño).",
    color: "#5DADE2",
    icon: "⊕",
    dmgRating: 3,
  };
}
