import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

export class TrampPower extends BasePower {
  constructor(owner) {
    super(owner);
    // { x, y, fallTimer, landed, timer, trapped, hitCooldown }
    this._bombs = [];
    this._volley = 2.0; // seconds until first volley

    this.FALL_TIME = 0.85;
    this.BOMB_RADIUS = 82;
    this.ZONE_LIFE = 2;
    this.VOLLEY_CD = 5;
    this.COUNT = 2;
    this.WALL_DAMAGE_IN = 3; // damage when trapped inside and hits wall
    this.WALL_DAMAGE_OUT = 1; // damage when free outside and bounces off zone
    this.HIT_CD = 0.35;
  }

  update(dt) {
    this._volley -= dt;
    if (this._volley <= 0) {
      this._volley = this.VOLLEY_CD;
      this._launch();
    }

    for (const b of this._bombs) {
      if (!b.landed) {
        b.fallTimer -= dt;
        if (b.fallTimer <= 0) {
          b.landed = true;
          b.timer = this.ZONE_LIFE;
          b.checkPending = true; // evaluate trap once on first onEnemyFrame
          b.compCheckPending = true; // same for companion
          sfx.bombLand();
        }
      } else {
        b.timer -= dt;
        if (b.hitCooldown > 0) b.hitCooldown -= dt;
      }
    }
    this._bombs = this._bombs.filter((b) => !b.landed || b.timer > 0);
  }

  _launch() {
    if (!this.arena) return;
    const { left, right, top, bottom } = this.arena;
    const m = this.BOMB_RADIUS + 6; // keep zone fully inside arena
    const w = right - left - m * 2;
    const h = bottom - top - m * 2;
    if (w <= 0 || h <= 0) return;

    for (let i = 0; i < this.COUNT; i++) {
      this._bombs.push({
        x: left + m + Math.random() * w,
        y: top + m + Math.random() * h,
        fallTimer: this.FALL_TIME,
        landed: false,
        radius: this.BOMB_RADIUS,
        timer: 0,
        trapped: false, // main enemy
        checkPending: false,
        hitCooldown: 0,
        compTrapped: false, // DUO companion
        compCheckPending: false,
        compHitCooldown: 0,
      });
    }
    sfx.bombThrow();
  }

  onEnemyFrame(enemy, dt) {
    if (!enemy.isAlive) return;

    for (const b of this._bombs) {
      if (!b.landed) continue;

      const dx = enemy.x - b.x;
      const dy = enemy.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const nx = dx / dist,
        ny = dy / dist;

      // One-time trap check the frame the bomb lands
      if (b.checkPending) {
        b.checkPending = false;
        if (dist < b.radius) {
          b.trapped = true;
          // Pull fully inside if circle clips the zone wall
          if (dist + enemy.radius > b.radius) {
            const clamp = b.radius - enemy.radius - 1;
            if (clamp > 0) {
              enemy.x = b.x + nx * clamp;
              enemy.y = b.y + ny * clamp;
            }
          }
        }
      }

      if (!b.trapped) {
        // Not trapped: zone is a solid obstacle — bounce off outside with minor damage
        if (dist < b.radius + enemy.radius) {
          enemy.x = b.x + nx * (b.radius + enemy.radius + 0.5);
          enemy.y = b.y + ny * (b.radius + enemy.radius + 0.5);
          const vIn = enemy.vx * nx + enemy.vy * ny;
          if (vIn < 0) {
            enemy.vx -= 2 * vIn * nx;
            enemy.vy -= 2 * vIn * ny;
            if (b.hitCooldown <= 0) {
              enemy.takeDamage(this.WALL_DAMAGE_OUT);
              sfx.bombTrap();
              b.hitCooldown = this.HIT_CD;
            }
          }
        }
        continue;
      }

      // Enemy is trapped — enforce circular wall with full damage
      if (dist + enemy.radius >= b.radius) {
        enemy.x = b.x + nx * (b.radius - enemy.radius - 0.5);
        enemy.y = b.y + ny * (b.radius - enemy.radius - 0.5);
        const vOut = enemy.vx * nx + enemy.vy * ny;
        if (vOut > 0) {
          enemy.vx -= 2 * vOut * nx;
          enemy.vy -= 2 * vOut * ny;
          if (b.hitCooldown <= 0) {
            enemy.takeDamage(this.WALL_DAMAGE_IN);
            sfx.bombTrap();
            b.hitCooldown = this.HIT_CD;
          }
        }
      }

      // ── DUO companion (same logic, separate state) ─────────────────────────
      const comp = enemy.power?._comp;
      if (comp?.isAlive) {
        const cdx = comp.x - b.x,
          cdy = comp.y - b.y;
        const cd = Math.sqrt(cdx * cdx + cdy * cdy) || 0.001;
        const cnx = cdx / cd,
          cny = cdy / cd;

        if (b.compCheckPending) {
          b.compCheckPending = false;
          if (cd < b.radius) {
            b.compTrapped = true;
            if (cd + comp.radius > b.radius) {
              const clamp = b.radius - comp.radius - 1;
              if (clamp > 0) {
                comp.x = b.x + cnx * clamp;
                comp.y = b.y + cny * clamp;
              }
            }
          }
        }

        if (!b.compTrapped) {
          // Solid obstacle — bounce companion off outside with minor damage
          if (cd < b.radius + comp.radius) {
            comp.x = b.x + cnx * (b.radius + comp.radius + 0.5);
            comp.y = b.y + cny * (b.radius + comp.radius + 0.5);
            const vIn = comp.vx * cnx + comp.vy * cny;
            if (vIn < 0) {
              comp.vx -= 2 * vIn * cnx;
              comp.vy -= 2 * vIn * cny;
              if (b.compHitCooldown <= 0) {
                comp.takeDamage(this.WALL_DAMAGE_OUT);
                sfx.bombTrap();
                b.compHitCooldown = this.HIT_CD;
              }
            }
          }
        } else if (cd + comp.radius >= b.radius) {
          comp.x = b.x + cnx * (b.radius - comp.radius - 0.5);
          comp.y = b.y + cny * (b.radius - comp.radius - 0.5);
          const vOut = comp.vx * cnx + comp.vy * cny;
          if (vOut > 0) {
            comp.vx -= 2 * vOut * cnx;
            comp.vy -= 2 * vOut * cny;
            if (b.compHitCooldown <= 0) {
              comp.takeDamage(this.WALL_DAMAGE_IN);
              sfx.bombTrap();
              b.compHitCooldown = this.HIT_CD;
            }
          }
        }
        if (b.compHitCooldown > 0) b.compHitCooldown -= dt;
      }
    }
  }

  getHitDamage() {
    return 1;
  }

  renderBelow(ctx) {
    for (const b of this._bombs) {
      if (!b.landed) {
        const prog = 1 - b.fallTimer / this.FALL_TIME; // 0→1
        const dotR = 4 + prog * 9;
        // Target reticle
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,100,0,${0.15 + 0.3 * prog})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        // Crosshair lines
        const ch = b.radius * 0.22;
        ctx.beginPath();
        ctx.moveTo(b.x - ch, b.y);
        ctx.lineTo(b.x + ch, b.y);
        ctx.moveTo(b.x, b.y - ch);
        ctx.lineTo(b.x, b.y + ch);
        ctx.strokeStyle = `rgba(255,140,0,${0.25 * prog})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        // Falling dot
        ctx.beginPath();
        ctx.arc(b.x, b.y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,80,0,${0.5 + 0.4 * prog})`;
        ctx.fill();
        ctx.restore();
      } else {
        const fade = b.timer / this.ZONE_LIFE;
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,80,0,${0.07 * fade})`;
        ctx.fill();
        ctx.strokeStyle = b.trapped
          ? `rgba(255,60,0,${0.85 * fade})`
          : `rgba(255,130,0,${0.55 * fade})`;
        ctx.lineWidth = b.trapped ? 2.5 : 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  renderAbove(ctx) {
    const { x, y, radius } = this.owner;
    const remaining = Math.min(this._volley, this.VOLLEY_CD);
    const frac = Math.max(0, 1 - remaining / this.VOLLEY_CD);
    if (frac < 0.02) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(255,120,0,${0.4 + 0.5 * frac})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
    if (frac > 0.85) {
      const pulse = Math.abs(Math.sin(Date.now() / 80));
      ctx.beginPath();
      ctx.arc(x, y, radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,180,50,${0.35 * pulse})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  }

  clearState() {
    this._bombs = [];
  }

  static meta = {
    id: "bomb",
    name: "Trampero",
    description:
      "Lanza trampas. El enemigo queda atrapado dentro y recibe daño al tocar la pared.",
    color: "#FF6B00",
    icon: "◉",
    dmgRating: 3,
  };
}
