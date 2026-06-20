import { BasePower } from "./BasePower.js";

const PORTAL_R = 30; // detection + visual radius
const PORTAL_LIFE = 7; // s before portals relocate
const USE_CD = 1; // s a portal stays "used" (prevents instant back-teleport)
const SPAWN_DELAY = 1.2; // s before first portals appear
const HEAL_AMOUNT = 5;
const ENEMY_DMG = 8;

export class PortalPower extends BasePower {
  constructor(owner) {
    super(owner);
    this.arena = null;
    this._portals = []; // [{ x, y, useCd }]
    this._lifeTimer = 0;
    this._spawnTimer = SPAWN_DELAY;
    this._ownerCd = 0; // prevents owner from re-entering immediately
    this._enemyCd = 0;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    if (this._ownerCd > 0) this._ownerCd -= dt;
    if (this._enemyCd > 0) this._enemyCd -= dt;

    if (this._portals.length < 2) {
      this._spawnTimer -= dt;
      if (this._spawnTimer <= 0) {
        this._spawnPortals();
        this._lifeTimer = PORTAL_LIFE;
        this._spawnTimer = 0;
      }
      return;
    }

    for (const p of this._portals) {
      if (p.useCd > 0) p.useCd -= dt;
    }

    this._lifeTimer -= dt;
    if (this._lifeTimer <= 0) {
      this._portals = [];
      this._spawnTimer = this._cd(0.4);
    }

    // Owner teleport check
    if (this._ownerCd <= 0) {
      const idx = this._overlapping(this.owner);
      if (idx !== -1) {
        const p = this._portals[idx];
        if (p.useCd <= 0) {
          const dest = this._portals[1 - idx];
          this.owner.x = dest.x;
          this.owner.y = dest.y;
          this.owner.hp = Math.min(
            this.owner.maxHp,
            this.owner.hp + HEAL_AMOUNT,
          );
          this.owner._dmgNums.push({
            x: dest.x + (Math.random() * 16 - 8),
            y: dest.y - this.owner.radius - 4,
            val: `+${HEAL_AMOUNT}`,
            t: 1.0,
            color: "#4ade80",
          });
          p.useCd = USE_CD;
          dest.useCd = USE_CD;
          this._ownerCd = USE_CD;
        }
      }
    }
  }

  // ── Enemy interactions ───────────────────────────────────────────────────────

  onEnemyFrame(enemy) {
    if (!enemy.isAlive || this._portals.length < 2) return;
    if (this._enemyCd > 0) return;

    const idx = this._overlapping(enemy);
    if (idx !== -1) {
      const p = this._portals[idx];
      if (p.useCd <= 0) {
        const dest = this._portals[1 - idx];
        enemy.x = dest.x;
        enemy.y = dest.y;
        this._dealDmg(enemy, ENEMY_DMG);
        p.useCd = USE_CD;
        dest.useCd = USE_CD;
        this._enemyCd = USE_CD;
      }
    }
  }

  _overlapping(circle) {
    for (let i = 0; i < this._portals.length; i++) {
      const p = this._portals[i];
      const dx = circle.x - p.x;
      const dy = circle.y - p.y;
      if (dx * dx + dy * dy < (PORTAL_R + circle.radius * 0.5) ** 2) return i;
    }
    return -1;
  }

  _spawnPortals() {
    const { left, right, top, bottom } = this.arena;
    const m = PORTAL_R + 2; // margin from wall edge

    // Pick 2 different walls for the portals
    const walls = [0, 1, 2, 3];
    for (let i = walls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [walls[i], walls[j]] = [walls[j], walls[i]];
    }

    this._portals = [walls[0], walls[1]].map((wall) => {
      let x, y;
      const pad = PORTAL_R + 30; // padding from corners
      if (wall === 0) {
        // top
        x = left + pad + Math.random() * (right - left - pad * 2);
        y = top + m;
      } else if (wall === 1) {
        // right
        x = right - m;
        y = top + pad + Math.random() * (bottom - top - pad * 2);
      } else if (wall === 2) {
        // bottom
        x = left + pad + Math.random() * (right - left - pad * 2);
        y = bottom - m;
      } else {
        // left
        x = left + m;
        y = top + pad + Math.random() * (bottom - top - pad * 2);
      }
      return { x, y, useCd: 0 };
    });
  }

  clearState() {
    this._portals = [];
    this._lifeTimer = 0;
    this._spawnTimer = SPAWN_DELAY;
    this._ownerCd = 0;
    this._enemyCd = 0;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  renderAbove(ctx) {
    if (this._portals.length >= 2) return;
    const frac = Math.min(1, 1 - this._spawnTimer / SPAWN_DELAY);
    if (frac <= 0.02) return;
    ctx.save();
    ctx.strokeStyle = `rgba(140,80,255,${0.3 + 0.6 * frac})`;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(160,100,255,0.7)";
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

  renderBelow(ctx) {
    if (this._portals.length < 2) return;

    const t = Date.now() / 1000;
    const lifeFrac = Math.max(0, this._lifeTimer / PORTAL_LIFE);

    // Line connecting the two portals (faint)
    const [a, b] = this._portals;
    ctx.save();
    ctx.strokeStyle = `rgba(120,80,255,${0.08 + 0.06 * lifeFrac})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    for (let i = 0; i < this._portals.length; i++) {
      const p = this._portals[i];
      const used = p.useCd > 0;
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.2 + i * Math.PI));
      const alpha = used ? 0.3 : lifeFrac * (0.6 + 0.4 * pulse);

      ctx.save();
      ctx.translate(p.x, p.y);

      // Outer ring
      ctx.strokeStyle = used
        ? `rgba(80,80,120,${alpha})`
        : `rgba(140,80,255,${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = used ? 0 : 14 * pulse;
      ctx.shadowColor = "rgba(160,100,255,0.7)";
      ctx.beginPath();
      ctx.arc(0, 0, PORTAL_R, 0, Math.PI * 2);
      ctx.stroke();

      // Inner swirl (rotating arcs)
      if (!used) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(200,150,255,${0.5 * pulse})`;
        ctx.lineWidth = 2;
        const rot = t * 2.5 * (i === 0 ? 1 : -1);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(
            0,
            0,
            PORTAL_R * 0.55,
            rot + (k / 3) * Math.PI * 2,
            rot + (k / 3) * Math.PI * 2 + Math.PI * 0.7,
          );
          ctx.stroke();
        }
      }

      // Center fill
      ctx.beginPath();
      ctx.arc(0, 0, PORTAL_R * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = used
        ? "rgba(40,30,60,0.4)"
        : `rgba(100,50,200,${0.25 * pulse})`;
      ctx.fill();

      ctx.restore();
    }
  }

  static meta = {
    id: "portal",
    name: "Portal",
    description:
      "Abre 2 portales en las paredes. Atravesarlos te teletransporta y te cura. Al enemigo le saca vida.",
    color: "#8040CC",
    icon: "◎",
    dmgRating: 2,
  };
}
