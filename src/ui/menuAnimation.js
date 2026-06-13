import { getAllPowerMetas } from '../powers/registry.js';

const _metas = getAllPowerMetas();
const _bgCanvas = document.getElementById("bg-battle-canvas");
let _bgBattle = null;

export function bgBattleResume() {
  requestAnimationFrame(() => {
    if (!_bgBattle) _bgBattle = new MenuAnimation(_bgCanvas);
    else _bgBattle.resume();
  });
}

export function bgBattlePause() {
  if (_bgBattle) _bgBattle.pause();
}

class MenuAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this._active = true;
    this._circles = [];
    this._raf = null;
    this._lastT = null;
    this._fit();
    this._spawn();
    this._raf = requestAnimationFrame(ts => this._tick(ts));
  }

  _fit() {
    this.canvas.width  = this.canvas.offsetWidth  || 430;
    this.canvas.height = this.canvas.offsetHeight || 700;
  }

  _makeCircle(initial = false) {
    const meta  = _metas[Math.floor(Math.random() * _metas.length)];
    const r     = 14 + Math.random() * 30;
    const alpha = 0.18 + Math.random() * 0.28;
    const speed = 28 + Math.random() * 55;
    const baseY = r + Math.random() * (this.canvas.height - r * 2);
    const x     = initial
      ? Math.random() * (this.canvas.width + r * 2) - r
      : this.canvas.width + r + Math.random() * 180;
    const drift      = (Math.random() - 0.5) * 20;
    const driftSpeed = 0.3 + Math.random() * 0.7;
    const driftPhase = Math.random() * Math.PI * 2;
    return { meta, x, y: baseY, baseY, r, speed, alpha, drift, driftSpeed, driftPhase };
  }

  _spawn() {
    for (let i = 0; i < 20; i++) this._circles.push(this._makeCircle(true));
  }

  _tick(ts) {
    if (!this._active) return;
    const dt   = this._lastT ? Math.min((ts - this._lastT) / 1000, 0.05) : 0;
    this._lastT = ts;
    const time = ts / 1000;

    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const c of this._circles) {
      c.x -= c.speed * dt;
      c.y  = c.baseY + Math.sin(time * c.driftSpeed + c.driftPhase) * c.drift;
      if (c.x < -c.r * 2.5) Object.assign(c, this._makeCircle(false));
      this._draw(ctx, c, time);
    }

    this._raf = requestAnimationFrame(ts => this._tick(ts));
  }

  _draw(ctx, c, time) {
    ctx.save();
    ctx.globalAlpha = c.alpha;
    ctx.shadowBlur  = c.r * 1.1;
    ctx.shadowColor = c.meta.color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = c.meta.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = Math.min(1, c.alpha * 2.8);
    ctx.fillStyle   = "rgba(0,0,0,0.55)";
    ctx.font        = `${Math.round(c.r * 0.78)}px sans-serif`;
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.meta.icon, c.x, c.y);
    ctx.restore();
  }

  pause() {
    this._active = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  resume() {
    if (this._active) return;
    this._active = true;
    this._fit();
    this._lastT = null;
    this._raf = requestAnimationFrame(ts => this._tick(ts));
  }
}
