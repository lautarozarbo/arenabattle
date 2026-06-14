import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

// Beam config per charge level (0–3)
const BEAM_LEVELS = [
  { width: 2.5, tickDmg: 1, tickInterval: 0.8 }, // 0 frags:  ~3.7 dmg / 3s beam
  { width: 5, tickDmg: 2, tickInterval: 0.55 }, // 1–2 frags:~10  dmg / 3s beam
  { width: 9, tickDmg: 3, tickInterval: 0.4 }, // 3–4 frags:~22  dmg / 3s beam
  { width: 14, tickDmg: 5, tickInterval: 0.3 }, // 5+ frags: ~50  dmg / 3s beam
];

function beamLevel(charge) {
  if (charge >= 5) return 3;
  if (charge >= 3) return 2;
  if (charge >= 1) return 1;
  return 0;
}

export class CrystalBeamPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._frags = []; // { x, y, phase }
    this._charge = 0; // fragments collected since last beam
    this._spawnCd = 0.8; // cooldown to next fragment spawn
    this._beamCd = 4.0; // cooldown to next beam fire
    this._beam = null; // active beam: { level, timer, accum, tx, ty }
    this._lastEnemyX = 0;
    this._lastEnemyY = 0;
    this._hasEnemy = false;

    this.SPAWN_INTERVAL = 1.5;
    this.MAX_FRAGS = 5;
    this.BEAM_COOLDOWN = 6.0;
    this.BEAM_DURATION = 2.5;
    this.FRAG_RADIUS = 7;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    // Animate fragment phase
    for (const f of this._frags) f.phase += dt * 2.8;

    // Spawn new fragment
    this._spawnCd -= dt;
    if (this._spawnCd <= 0 && this._frags.length < this.MAX_FRAGS) {
      this._spawnCd = this.SPAWN_INTERVAL;
      const a = this.arena,
        pad = 24;
      const x = a.left + pad + Math.random() * (a.width - pad * 2);
      const y = a.top + pad + Math.random() * (a.height - pad * 2);
      this._frags.push({ x, y, phase: Math.random() * Math.PI * 2 });
      sfx.crystalSpawn();
    }

    // Collect fragments on contact
    const pickup = this.owner.radius + this.FRAG_RADIUS + 4;
    this._frags = this._frags.filter((f) => {
      const dx = f.x - this.owner.x;
      const dy = f.y - this.owner.y;
      if (dx * dx + dy * dy < pickup * pickup) {
        this._charge = Math.min(this._charge + 1, 8);
        sfx.crystalCollect();
        return false;
      }
      return true;
    });

    // Beam cooldown / fire
    if (this._beam) {
      this._beam.timer -= dt;
      if (this._beam.timer <= 0) {
        this._beam = null;
        this._beamCd = this.BEAM_COOLDOWN;
        this._charge = 0;
      }
    } else {
      this._beamCd -= dt;
      if (this._beamCd <= 0 && this._hasEnemy) {
        const lvl = beamLevel(this._charge);
        this._beam = {
          level: lvl,
          timer: this.BEAM_DURATION,
          accum: 0,
          tx: this._lastEnemyX,
          ty: this._lastEnemyY,
        };
        sfx.crystalBeamFire(lvl);
      }
    }
  }

  // ── Enemy interactions ──────────────────────────────────────────────────────

  onEnemyFrame(enemy, dt) {
    if (!enemy.isAlive) return;
    this._hasEnemy = true;
    this._lastEnemyX = enemy.x;
    this._lastEnemyY = enemy.y;

    if (!this._beam) return;

    // Homing: update target each frame
    this._beam.tx = enemy.x;
    this._beam.ty = enemy.y;

    const cfg = BEAM_LEVELS[this._beam.level];
    this._beam.accum += dt;
    while (this._beam.accum >= cfg.tickInterval) {
      this._dealDmg(enemy, cfg.tickDmg);
      sfx.crystalBeamTick();
      this._beam.accum -= cfg.tickInterval;
    }
  }

  clearState() {
    this._frags = [];
    this._charge = 0;
    this._spawnCd = this.SPAWN_INTERVAL;
    this._beamCd = this.BEAM_COOLDOWN;
    this._beam = null;
    this._hasEnemy = false;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    // Fragments
    for (const f of this._frags) this._drawFrag(ctx, f);

    // Active beam
    if (this._beam && this._hasEnemy) this._drawBeam(ctx, this._beam);

    // Charge arc (cooldown indicator)
    if (!this._beam) {
      const frac = Math.max(0, 1 - this._beamCd / this.BEAM_COOLDOWN);
      if (frac > 0.04) {
        ctx.save();
        ctx.strokeStyle = `rgba(0,210,255,${0.3 + 0.55 * frac})`;
        ctx.lineWidth = 2;
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
    }
  }

  _drawFrag(ctx, f) {
    const s = this.FRAG_RADIUS;
    const alpha = 0.65 + 0.35 * Math.sin(f.phase);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y - s);
    ctx.lineTo(f.x + s * 0.6, f.y);
    ctx.lineTo(f.x, f.y + s);
    ctx.lineTo(f.x - s * 0.6, f.y);
    ctx.closePath();
    ctx.fillStyle = "#88EEFF";
    ctx.fill();
    ctx.strokeStyle = "#00BBEE";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  _drawBeam(ctx, beam) {
    const cfg = BEAM_LEVELS[beam.level];
    const fade = Math.min(1, beam.timer / 0.4); // fade out last 0.4s
    const alpha = (0.5 + 0.5 * (beam.timer / this.BEAM_DURATION)) * fade;
    const { x, y } = this.owner;
    const { tx, ty, level } = beam;
    const w = cfg.width;

    ctx.save();
    ctx.lineCap = "round";
    // Outer glow
    ctx.strokeStyle = `rgba(0,180,255,${0.12 * alpha})`;
    ctx.lineWidth = w * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // Mid
    ctx.strokeStyle = `rgba(80,220,255,${0.65 * alpha})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // Core white
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * alpha})`;
    ctx.lineWidth = Math.max(1, w * 0.35);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
  }

  renderAbove(ctx) {
    if (this._charge === 0 && !this._beam) return;

    const r = this.owner.radius;
    const angle = Date.now() / 550;
    const count = this._beam ? this._beam.level + 1 : Math.min(this._charge, 8);
    const orbitR = r + 11;

    // Orbiting charge dots
    for (let i = 0; i < count; i++) {
      const a = angle + (i / Math.max(count, 1)) * Math.PI * 2;
      const ox = this.owner.x + Math.cos(a) * orbitR;
      const oy = this.owner.y + Math.sin(a) * orbitR;
      ctx.save();
      ctx.globalAlpha = this._beam
        ? 0.5 + 0.5 * Math.abs(Math.sin(Date.now() / 120 + i))
        : 0.85;
      ctx.beginPath();
      ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#00CCFF";
      ctx.fill();
      ctx.restore();
    }
  }

  static meta = {
    id: "crystalbeam",
    name: "Cristal",
    description:
      "Recoge fragmentos de la arena y carga un rayo teledirigido. Más fragmentos = rayo más potente.",
    color: "#00BCD4",
    icon: "◆",
    dmgRating: 3,
  };
}
