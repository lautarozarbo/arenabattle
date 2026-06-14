import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";
import { getHpVisible } from "../game/circle.js";

function drawBeam(ctx, x1, y1, x2, y2, alpha) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(180,80,255,${0.18 * alpha})`;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(220,150,255,${0.9 * alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,220,255,${0.7 * alpha})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export class DuoPower extends BasePower {
  constructor(owner) {
    super(owner);

    // Each unit has 50 HP; respect saved HP when swapping back in
    const savedOwnerHp = Math.min(owner.hp, 50);
    const savedCompHp  = owner._duoCompHp ?? 50;
    owner.maxHp = 50;
    owner.hp    = savedOwnerHp;

    this._comp = {
      x: owner.x,
      y: owner.y,
      vx: -(owner.vx ?? 0) * 0.85 + 40,
      vy: (owner.vy ?? 0) * 0.85 - 40,
      hp: savedCompHp,
      maxHp: 50,
      isAlive: savedCompHp > 0,
      radius: owner.radius,
      _flashTimer: 0,
      _dmgNums: [],
      _passesObstacles: false,
      power: { onObstacleBounce: () => {} },
    };
    this._compReady = false;
    // Expose takeDamage so external powers can damage the companion uniformly
    this._comp.takeDamage = (n) => this._compTakeDamage(n);

    // Staggered beams so they don't fire simultaneously
    this._beamA = this._newBeam(0.8); // owner
    this._beamB = this._newBeam(2.2); // companion

    this._lastEnemyX = 0;
    this._lastEnemyY = 0;
    this._hasEnemy = false;

    this.BEAM_DURATION = 3;
    this.BEAM_TICK = 0.4;
    this.BEAM_COOLDOWN = 2;
  }

  _newBeam(startCooldown) {
    return { active: false, timer: 0, accum: 0, cooldown: startCooldown };
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    if (!this.arena) return;

    // Init companion position once arena is known
    if (!this._compReady) {
      const a = this.arena,
        r = this._comp.radius;
      this._comp.x = Math.max(
        a.left + r + 4,
        Math.min(a.right - r - 4, this.owner.x + r * 3),
      );
      this._comp.y = Math.max(
        a.top + r + 4,
        Math.min(a.bottom - r - 4, this.owner.y + r * 3),
      );
      this._comp.vx = -(this.owner.vx ?? 0) * 0.85;
      this._comp.vy = (this.owner.vy ?? 0) * 0.85;
      this._compReady = true;
    }

    if (this._comp.isAlive) {
      this._comp._flashTimer = Math.max(0, this._comp._flashTimer - dt);

      // Tick down damage numbers
      for (const n of this._comp._dmgNums) n.t -= dt * 1.1;
      this._comp._dmgNums = this._comp._dmgNums.filter((n) => n.t > 0);

      // Move
      this._comp.x += this._comp.vx * dt;
      this._comp.y += this._comp.vy * dt;

      // Wall bounce
      const { left, right, top, bottom } = this.arena;
      const r = this._comp.radius;
      if (this._comp.x - r < left) {
        this._comp.x = left + r;
        this._comp.vx *= -1;
      }
      if (this._comp.x + r > right) {
        this._comp.x = right - r;
        this._comp.vx *= -1;
      }
      if (this._comp.y - r < top) {
        this._comp.y = top + r;
        this._comp.vy *= -1;
      }
      if (this._comp.y + r > bottom) {
        this._comp.y = bottom - r;
        this._comp.vy *= -1;
      }

      // Obstacle collision
      this.arena.bounceCircleOffObstacles(this._comp);

      // Clamp companion speed
      const spd = Math.sqrt(this._comp.vx ** 2 + this._comp.vy ** 2);
      if (spd > 0.001) {
        const s = this.owner.baseSpeed / spd;
        this._comp.vx *= s;
        this._comp.vy *= s;
      }
    }

    this._tickBeam(this._beamA, dt);
    if (this._comp.isAlive) this._tickBeam(this._beamB, dt);

    // Combined HP for HUD display (0-100 scale, doesn't affect game logic)
    const compHp = this._comp.isAlive ? this._comp.hp : 0;
    this.owner._hudHp    = Math.max(0, this.owner.hp) + compHp;
    this.owner._hudMaxHp = 100;
  }

  _tickBeam(beam, dt) {
    if (beam.active) {
      beam.timer -= dt;
      if (beam.timer <= 0) {
        beam.active = false;
        beam.cooldown = this.BEAM_COOLDOWN;
      }
    } else {
      beam.cooldown -= dt;
      if (beam.cooldown <= 0) {
        beam.active = true;
        beam.timer = this.BEAM_DURATION;
        beam.accum = 0;
        sfx.duoBeamFire();
      }
    }
  }

  // ── Enemy interactions ────────────────────────────────────────────────────

  _onBeforeDeath() {
    if (this._comp.isAlive) {
      this._swapToCompanion();
      return true; // prevent death — owner now runs as companion
    }
    return false;
  }

  onEnemyFrame(enemy, dt) {
    if (!enemy.isAlive) return;
    this._hasEnemy = true;
    this._lastEnemyX = enemy.x;
    this._lastEnemyY = enemy.y;

    // Companion ↔ enemy collision
    if (this._comp.isAlive) {
      const dx = enemy.x - this._comp.x;
      const dy = enemy.y - this._comp.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const minD = this._comp.radius + enemy.radius;

      if (dist < minD) {
        const nx = dx / dist,
          ny = dy / dist;
        const half = (minD - dist) * 0.5;
        this._comp.x -= nx * half;
        this._comp.y -= ny * half;
        enemy.x += nx * half;
        enemy.y += ny * half;

        const dvx = this._comp.vx - enemy.vx;
        const dvy = this._comp.vy - enemy.vy;
        const vRel = dvx * nx + dvy * ny;
        if (vRel > 0) {
          const m1 = this._comp.radius ** 2,
            m2 = enemy.radius ** 2;
          const imp = (2 * vRel) / (m1 + m2);
          this._comp.vx -= imp * m2 * nx;
          this._comp.vy -= imp * m2 * ny;
          enemy.vx += imp * m1 * nx;
          enemy.vy += imp * m1 * ny;
          this._dealDmg(enemy, 1);
          this._compTakeDamage(enemy.power.getHitDamage());
        }
      }
    }

    // Beam DPS
    this._applyBeamDPS(this._beamA, enemy, dt);
    if (this._comp.isAlive) this._applyBeamDPS(this._beamB, enemy, dt);
  }

  _applyBeamDPS(beam, enemy, dt) {
    if (!beam.active) return;
    beam.accum += dt;
    if (beam.accum >= this.BEAM_TICK) {
      this._dealDmg(enemy, 1);
      sfx.duoBeamTick();
      beam.accum -= this.BEAM_TICK;
    }
  }

  // ── Companion damage & death ──────────────────────────────────────────────

  _compTakeDamage(amount) {
    if (amount <= 0 || !this._comp.isAlive) return;
    if (amount > 0.5) {
      this._comp._flashTimer = 0.08;
      this._comp._dmgNums.push({
        x: this._comp.x + (Math.random() * 16 - 8),
        y: this._comp.y - this._comp.radius - 4,
        val: Math.ceil(amount),
        t: 1.0,
      });
    }
    this._comp.hp = Math.max(0, this._comp.hp - amount);
    if (this._comp.hp <= 0) {
      this._comp.isAlive = false;
      this._beamB.active = false;
    }
  }

  // Move companion data into owner so the game continues with one circle
  _swapToCompanion() {
    this.owner.x = this._comp.x;
    this.owner.y = this._comp.y;
    this.owner.vx = this._comp.vx;
    this.owner.vy = this._comp.vy;
    this.owner.hp = this._comp.hp;
    this.owner.maxHp = this._comp.maxHp;
    this.owner.isAlive = true;
    this._comp.isAlive = false;
    this._beamB.active = false;
    // Inherit companion beam progress so there's no dead silence after swap
    this._beamA = { ...this._beamB };
  }

  getHitDamage() {
    return 1;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  renderBelow(ctx) {
    if (!this._hasEnemy) return;
    const ex = this._lastEnemyX,
      ey = this._lastEnemyY;
    if (this._beamA.active) {
      drawBeam(
        ctx,
        this.owner.x,
        this.owner.y,
        ex,
        ey,
        0.4 + 0.6 * (this._beamA.timer / this.BEAM_DURATION),
      );
    }
    if (this._comp.isAlive && this._beamB.active) {
      drawBeam(
        ctx,
        this._comp.x,
        this._comp.y,
        ex,
        ey,
        0.4 + 0.6 * (this._beamB.timer / this.BEAM_DURATION),
      );
    }
  }

  renderAbove(ctx) {
    if (this._comp.isAlive) {
      // Companion circle body
      const flash = this._comp._flashTimer > 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this._comp.x, this._comp.y, this._comp.radius, 0, Math.PI * 2);
      ctx.fillStyle = flash ? "#ffffff" : this.owner.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // HP inside companion
      const r = this._comp.radius;
      if (getHpVisible()) {
        ctx.font = `bold ${r * 0.75}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.strokeText(String(Math.ceil(this._comp.hp)), this._comp.x, this._comp.y);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(Math.ceil(this._comp.hp)), this._comp.x, this._comp.y);
      }
      ctx.restore();

      // Companion beam indicator
      this._drawBeamIndicator(ctx, this._comp.x, this._comp.y, r, this._beamB);

      // Companion damage numbers
      for (const n of this._comp._dmgNums) {
        const rise = (1 - n.t) * 38;
        const alpha = n.t < 0.5 ? n.t * 2 : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.strokeText(n.val, n.x, n.y - rise);
        ctx.fillStyle = "#ff3333";
        ctx.fillText(n.val, n.x, n.y - rise);
        ctx.restore();
      }
    }

    // Owner beam indicator
    this._drawBeamIndicator(
      ctx,
      this.owner.x,
      this.owner.y,
      this.owner.radius,
      this._beamA,
    );
  }

  _drawBeamIndicator(ctx, x, y, r, beam) {
    if (!beam.active) {
      const frac = Math.min(1, 1 - beam.cooldown / this.BEAM_COOLDOWN);
      if (frac <= 0.04) return;
      ctx.save();
      ctx.strokeStyle = `rgba(200,120,255,${0.3 + 0.55 * frac})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();
    } else {
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 160));
      ctx.save();
      ctx.strokeStyle = `rgba(200,120,255,${0.7 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  static meta = {
    id: "duo",
    name: "Dúo",
    description:
      "Dos círculos. Cada uno dispara un rayo teledirigido. Eliminar uno deja al otro en juego.",
    color: "#8E44AD",
    icon: "◈",
    dmgRating: 2,
  };
}
