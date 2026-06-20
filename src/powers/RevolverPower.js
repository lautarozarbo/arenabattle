import { BasePower } from "./BasePower.js";
import { sfx } from "../audio/index.js";

const SHOT_CD            = 2.2;
const SHOT_SPEED         = 300;
const SHOT_DMG           = 7;
const CYLINDER_CD        = 9.0;
const CYLINDER_SHOTS     = 6;
const CYLINDER_DMG       = 7;
const CYLINDER_BOUNCES   = 2;
const CYLINDER_FIRE_INT  = 0.18; // s between sequential shots during dump
const BULLET_R           = 3.5;
const BULLET_LIFE        = 4.5;
const TRAIL_MAX          = 7;
const BARREL_LEN         = 42;

// ── Bullet ──────────────────────────────────────────────────────────────────

class Bullet {
  constructor(x, y, vx, vy, dmg, maxBounces) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.dmg = dmg;
    this.bounces = 0;
    this.maxBounces = maxBounces;
    this.life = BULLET_LIFE;
    this.dead = false;
    this.trail = [];
  }

  update(dt, arena) {
    if (this.dead) return;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > TRAIL_MAX) this.trail.length = TRAIL_MAX;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (!arena) return;

    let bounced = false;
    if (this.x - BULLET_R <= arena.left   && this.vx < 0) { this.vx =  Math.abs(this.vx); this.x = arena.left   + BULLET_R; bounced = true; }
    if (this.x + BULLET_R >= arena.right  && this.vx > 0) { this.vx = -Math.abs(this.vx); this.x = arena.right  - BULLET_R; bounced = true; }
    if (this.y - BULLET_R <= arena.top    && this.vy < 0) { this.vy =  Math.abs(this.vy); this.y = arena.top    + BULLET_R; bounced = true; }
    if (this.y + BULLET_R >= arena.bottom && this.vy > 0) { this.vy = -Math.abs(this.vy); this.y = arena.bottom - BULLET_R; bounced = true; }
    if (bounced) this._onBounce();

    for (const obs of (arena.obstacles ?? [])) {
      const dx = this.x - obs.cx, dy = this.y - obs.cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const minD = BULLET_R + obs.r;
      if (dist < minD) {
        const nx = dx / dist, ny = dy / dist;
        this.x = obs.cx + nx * minD;
        this.y = obs.cy + ny * minD;
        const dot = this.vx * nx + this.vy * ny;
        if (dot < 0) { this.vx -= 2 * dot * nx; this.vy -= 2 * dot * ny; this._onBounce(); }
      }
    }
  }

  _onBounce() {
    this.bounces++;
    if (this.bounces > this.maxBounces) this.dead = true;
  }

  checkHit(enemy) {
    if (this.dead) return false;
    const dx = enemy.x - this.x, dy = enemy.y - this.y;
    if (dx * dx + dy * dy < (enemy.radius + BULLET_R) ** 2) { this.dead = true; return true; }
    return false;
  }
}

// ── Power ───────────────────────────────────────────────────────────────────

export class RevolverPower extends BasePower {
  constructor(owner) {
    super(owner);
    this._angle          = 0;
    this._bullets        = [];
    this._shotCd         = SHOT_CD * 0.6;
    this._cylinderCd     = CYLINDER_CD * 0.55;
    this._cylAngle       = 0;
    // Sequential cylinder dump state
    this._dumping        = false;
    this._dumpShotsLeft  = 0;
    this._dumpFireTimer  = 0;
    this._dumpAngle      = 0;
    this._dumpDrawAngle  = 0;
    this._dumpStartAngle = 0;
    this._dumpElapsed    = 0;
    // Return animation after dump
    this._returning      = false;
    this._returnTimer    = 0;
    this._returnFrom     = 0;
    // Muzzle flash
    this._muzzleTimer    = 0;
    this._muzzleAngle    = 0;
  }

  update(dt) {
    const DUMP_TOTAL = (CYLINDER_SHOTS + this._extraProj()) * CYLINDER_FIRE_INT;

    // Cylinder visual rotation (slow idle, fast while dumping)
    this._cylAngle += dt * (this._dumping ? 18 : 0.5);

    if (this._dumping) {
      this._dumpElapsed   += dt;
      // Smooth continuous rotation: one full 360° over the dump duration
      const frac = Math.min(1, this._dumpElapsed / DUMP_TOTAL);
      this._dumpDrawAngle  = this._dumpStartAngle + frac * Math.PI * 2;

      this._dumpFireTimer -= dt;
      if (this._dumpFireTimer <= 0 && this._dumpShotsLeft > 0) {
        this._spawn(this._dumpAngle, SHOT_SPEED, CYLINDER_DMG, CYLINDER_BOUNCES);
        sfx.revolverShot();
        this._dumpAngle     += Math.PI * 2 / (CYLINDER_SHOTS + this._extraProj());
        this._dumpShotsLeft -= 1;
        this._dumpFireTimer  = CYLINDER_FIRE_INT;
        if (this._dumpShotsLeft === 0) {
          this._dumping      = false;
          this._cylinderCd   = this._cd(CYLINDER_CD);
          this._returning    = true;
          this._returnTimer  = 0.35;
          this._returnFrom   = this._dumpDrawAngle;
        }
      }
    } else if (this._returning) {
      this._returnTimer -= dt;
      if (this._returnTimer <= 0) { this._returning = false; this._returnTimer = 0; }
    } else {
      this._cylinderCd -= dt;
      if (this._cylinderCd <= 0) {
        this._dumping        = true;
        this._dumpShotsLeft  = CYLINDER_SHOTS + this._extraProj();
        this._dumpFireTimer  = 0;
        this._dumpAngle      = this._angle;
        this._dumpStartAngle = this._angle;
        this._dumpDrawAngle  = this._angle;
        this._dumpElapsed    = 0;
        sfx.revolverCylinder();
      } else {
        this._shotCd -= dt;
        if (this._shotCd <= 0) {
          this._fireSingle();
          this._shotCd = this._cd(SHOT_CD);
        }
      }
    }

    if (this._muzzleTimer > 0) this._muzzleTimer -= dt;

    for (const b of this._bullets) b.update(dt, this.arena);
    this._bullets = this._bullets.filter(b => !b.dead);
  }

  _spawn(angle, speed, dmg, bounces) {
    const sr = this.owner.radius + 6;
    this._bullets.push(new Bullet(
      this.owner.x + Math.cos(angle) * sr,
      this.owner.y + Math.sin(angle) * sr,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      dmg, bounces,
    ));
    this._muzzleTimer = 0.1;
    this._muzzleAngle = angle;
  }

  _fireSingle() { this._spawn(this._angle, SHOT_SPEED, SHOT_DMG, 0); sfx.revolverShot(); }

  onEnemyFrame(enemy) {
    if (!enemy.isAlive) return;
    const dx = enemy.x - this.owner.x, dy = enemy.y - this.owner.y;
    this._angle = Math.atan2(dy, dx);
    for (const b of this._bullets) {
      if (b.checkHit(enemy)) this._dealDmg(enemy, b.dmg);
      const comp = enemy.power?._comp;
      if (comp?.isAlive && b.checkHit(comp)) this._dealDmg(comp, b.dmg);
    }
  }

  getHitDamage() { return 1; }

  renderAbove(ctx) {
    const { x, y, radius: r } = this.owner;

    for (const b of this._bullets) this._drawBullet(ctx, b);
    if (this._muzzleTimer > 0) this._drawMuzzleFlash(ctx, x, y, r);
    this._drawRevolver(ctx, x, y, r);

    const frac = Math.max(0, 1 - this._cylinderCd / CYLINDER_CD);
    if (frac > 0.04 && !this._dumping) {
      ctx.save();
      ctx.strokeStyle = `rgba(210,170,60,${0.18 + 0.42 * frac})`;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawRevolver(ctx, x, y, r) {
    let gunAngle;
    if (this._dumping) {
      gunAngle = this._dumpDrawAngle;
    } else if (this._returning) {
      const p  = 1 - this._returnTimer / 0.35;
      const ep = 1 - (1 - p) * (1 - p); // ease-out quad
      const diff = this._angle - this._returnFrom;
      const dw = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI; // shortest path
      gunAngle = this._returnFrom + dw * ep;
    } else {
      gunAngle = this._angle;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(gunAngle);

    const o = r + 5;

    // ── palette ──
    const steel0  = '#13131f'; // darkest
    const steel1  = '#22223a'; // dark
    const steel2  = '#32324a'; // mid
    const steel3  = '#44445e'; // light
    const shine   = 'rgba(210,210,255,0.13)';
    const woodDk  = '#3a200c';
    const woodMid = '#6a3a18';
    const woodLt  = '#8a5228';

    // ── BARREL ──────────────────────────────────────────────────────────────
    // Main barrel block
    ctx.fillStyle = steel2;
    ctx.beginPath();
    ctx.rect(o, -3, BARREL_LEN, 6);
    ctx.fill();

    // Top strap (raised rib along barrel top)
    ctx.fillStyle = steel1;
    ctx.beginPath();
    ctx.rect(o + 2, -4.5, BARREL_LEN - 10, 1.8);
    ctx.fill();

    // Front sight blade
    ctx.fillStyle = steel3;
    ctx.beginPath();
    ctx.rect(o + BARREL_LEN - 10, -5.5, 2.5, 2.5);
    ctx.fill();

    // Barrel underside (slightly darker, gives thickness)
    ctx.fillStyle = steel1;
    ctx.beginPath();
    ctx.rect(o, 2.5, BARREL_LEN, 1.5);
    ctx.fill();

    // Top shine strip
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.rect(o + 4, -3, BARREL_LEN - 16, 1.2);
    ctx.fill();

    // Muzzle cap
    ctx.fillStyle = steel0;
    ctx.beginPath();
    ctx.rect(o + BARREL_LEN - 1, -4, 5, 8);
    ctx.fill();

    // Bore
    ctx.fillStyle = '#07070f';
    ctx.beginPath();
    ctx.arc(o + BARREL_LEN + 4, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    // ── FRAME / RECEIVER ────────────────────────────────────────────────────
    // Outer frame
    ctx.fillStyle = steel3;
    ctx.beginPath();
    ctx.moveTo(o,      -3);
    ctx.lineTo(o + 24, -3);
    ctx.lineTo(o + 24,  3);   // step down at rear of barrel
    ctx.lineTo(o + 26,  3);
    ctx.lineTo(o + 26, 15);
    ctx.lineTo(o,      15);
    ctx.closePath();
    ctx.fill();

    // Inner side-plate inset (recessed panel)
    ctx.fillStyle = steel2;
    ctx.beginPath();
    ctx.moveTo(o + 1,  -1.5);
    ctx.lineTo(o + 23, -1.5);
    ctx.lineTo(o + 23,  2.5);
    ctx.lineTo(o + 25,  2.5);
    ctx.lineTo(o + 25, 13.5);
    ctx.lineTo(o + 1,  13.5);
    ctx.closePath();
    ctx.fill();

    // Top-of-frame shine
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.rect(o, -3, 26, 1);
    ctx.fill();

    // Frame screws (detail)
    for (const [sx, sy] of [[o + 5, 5], [o + 18, 10]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = steel1;
      ctx.fill();
      ctx.strokeStyle = steel0;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(sx - 1, sy); ctx.lineTo(sx + 1, sy);
      ctx.stroke();
    }

    // ── CYLINDER ────────────────────────────────────────────────────────────
    const cx = o + 13, cy = 10, cr = 7.5;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy + 1.5, cr, 0, Math.PI * 2);
    ctx.fill();

    // Cylinder body
    ctx.fillStyle = '#35354e';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();

    // Fluting (6 grooves between chambers)
    ctx.strokeStyle = steel1;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const fa = (Math.PI * 2 * i) / 6 + this._cylAngle + Math.PI / 6;
      const ix = cx + Math.cos(fa) * (cr - 0.5), iy = cy + Math.sin(fa) * (cr - 0.5);
      const ox2 = cx + Math.cos(fa) * cr, oy2 = cy + Math.sin(fa) * cr;
      ctx.beginPath();
      ctx.moveTo(ix, iy); ctx.lineTo(ox2, oy2);
      ctx.stroke();
    }

    // 6 chambers
    for (let i = 0; i < 6; i++) {
      const ca  = (Math.PI * 2 * i) / 6 + this._cylAngle;
      const hx  = cx + Math.cos(ca) * 4.5;
      const hy  = cy + Math.sin(ca) * 4.5;
      // Case
      ctx.beginPath();
      ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(190,140,35,0.75)';
      ctx.fill();
      // Bore
      ctx.beginPath();
      ctx.arc(hx, hy, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = '#07070f';
      ctx.fill();
    }

    // Center pin
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = steel0;
    ctx.fill();

    // Cylinder rim
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.strokeStyle = steel0;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Specular highlight
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, cr * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // ── HAMMER ──────────────────────────────────────────────────────────────
    ctx.fillStyle = steel2;
    ctx.beginPath();
    ctx.moveTo(o + 22, -3);
    ctx.lineTo(o + 27, -3);
    ctx.lineTo(o + 27, -9);
    ctx.lineTo(o + 23, -9);
    ctx.lineTo(o + 22, -5);
    ctx.closePath();
    ctx.fill();

    // Hammer spur serrations
    ctx.strokeStyle = steel0;
    ctx.lineWidth = 0.5;
    for (let hs = 0; hs < 3; hs++) {
      ctx.beginPath();
      ctx.moveTo(o + 23, -8 + hs);
      ctx.lineTo(o + 26, -8 + hs);
      ctx.stroke();
    }

    // ── GRIP ────────────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(o + 6, 14);
    ctx.rotate(0.28);

    // Grip backstrap
    ctx.fillStyle = woodMid;
    ctx.beginPath();
    ctx.moveTo(-5.5, 0);
    ctx.lineTo( 5.5, 0);
    ctx.bezierCurveTo( 6.5, 7,  5, 16,  3, 20);
    ctx.lineTo(-3, 20);
    ctx.bezierCurveTo(-5, 16, -6.5, 7, -5.5, 0);
    ctx.closePath();
    ctx.fill();

    // Grip edge outline
    ctx.strokeStyle = woodDk;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Checkering: fine grid
    ctx.save();
    ctx.clip(); // confine lines to grip shape
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 0.6;
    for (let row = 2.5; row < 20; row += 2.6) {
      ctx.beginPath(); ctx.moveTo(-6, row); ctx.lineTo(6, row); ctx.stroke();
    }
    for (let col = -4; col <= 4; col += 2.4) {
      ctx.beginPath(); ctx.moveTo(col, 0); ctx.lineTo(col + 1.5, 20); ctx.stroke();
    }
    ctx.restore();

    // Wood highlight along left edge
    ctx.strokeStyle = `rgba(180,120,60,0.2)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.bezierCurveTo(-6, 8, -5.5, 14, -3, 20);
    ctx.stroke();

    ctx.restore();

    // ── TRIGGER GUARD ───────────────────────────────────────────────────────
    ctx.strokeStyle = steel2;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(o + 10, 14, 7, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // Trigger
    ctx.strokeStyle = steel0;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(o + 11, 13);
    ctx.lineTo(o + 13, 18.5);
    ctx.stroke();

    ctx.restore();
  }

  _drawMuzzleFlash(ctx, x, y, r) {
    const frac = this._muzzleTimer / 0.1;
    const tx   = x + Math.cos(this._muzzleAngle) * (r + 5 + BARREL_LEN + 4);
    const ty   = y + Math.sin(this._muzzleAngle) * (r + 5 + BARREL_LEN + 4);
    const perp = this._muzzleAngle + Math.PI / 2;

    ctx.save();
    ctx.globalAlpha = frac * 0.95;

    // Core flash
    ctx.beginPath();
    ctx.arc(tx, ty, 5.5 * frac, 0, Math.PI * 2);
    ctx.fillStyle   = '#fff9e0';
    ctx.shadowBlur  = 16;
    ctx.shadowColor = 'rgba(255,230,80,1)';
    ctx.fill();

    // Side petals
    for (const s of [-1, 1]) {
      const sx = tx + Math.cos(perp) * s * 4 * frac;
      const sy = ty + Math.sin(perp) * s * 4 * frac;
      const ex = tx + Math.cos(this._muzzleAngle) * 12 * frac + Math.cos(perp) * s * 8 * frac;
      const ey = ty + Math.sin(this._muzzleAngle) * 12 * frac + Math.sin(perp) * s * 8 * frac;
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = '#ffe080';
      ctx.lineWidth   = 2.5 * frac;
      ctx.lineCap     = 'round';
      ctx.shadowBlur  = 8;
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawBullet(ctx, b) {
    const bouncing = b.maxBounces > 0;
    const col = bouncing ? '255,155,55' : '255,215,70';

    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const a = (1 - i / b.trail.length) * 0.4;
      const s = BULLET_R * (1 - i / b.trail.length * 0.65);
      ctx.beginPath();
      ctx.arc(t.x, t.y, s, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col},${a})`;
      ctx.fill();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2);
    ctx.fillStyle   = `rgb(${col})`;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = `rgba(${col},0.9)`;
    ctx.fill();
    ctx.restore();
  }

  clearState() {
    this._bullets       = [];
    this._shotCd        = SHOT_CD * 0.6;
    this._cylinderCd    = CYLINDER_CD * 0.55;
    this._dumping        = false;
    this._dumpShotsLeft  = 0;
    this._dumpElapsed    = 0;
    this._returning      = false;
    this._returnTimer    = 0;
    this._muzzleTimer    = 0;
  }

  static meta = {
    id:          'revolver',
    name:        'Revolver',
    description: 'Apunta y dispara al enemigo. Al cargar, gira y vacía el tambor en 6 disparos consecutivos con balas que rebotan.',
    color:       '#4a4a5a',
    icon:        '⊙',
    dmgRating:   3,
  };
}
