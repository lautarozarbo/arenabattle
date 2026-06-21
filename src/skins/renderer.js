import { getSkinsFor } from './catalog.js';

// ── Canvas decoration helpers ─────────────────────────────────────────────────

function _wizardHat(ctx, x, y, r) {
  const brimY = y - r * 0.62;
  const brimRx = r * 0.78;
  const brimRy = r * 0.16;
  const tipY = brimY - r * 1.1;

  ctx.save();

  const grad = ctx.createLinearGradient(x, tipY, x, brimY);
  grad.addColorStop(0, "#150340");
  grad.addColorStop(0.5, "#3a0e90");
  grad.addColorStop(1, "#5a1dbe");
  ctx.beginPath();
  ctx.moveTo(x, tipY);
  ctx.quadraticCurveTo(
    x - brimRx * 0.35,
    brimY - r * 0.25,
    x - brimRx * 0.82,
    brimY,
  );
  ctx.lineTo(x + brimRx * 0.82, brimY);
  ctx.quadraticCurveTo(x + brimRx * 0.35, brimY - r * 0.25, x, tipY);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#8b50e0";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.rect(x - brimRx * 0.82, brimY - r * 0.18, brimRx * 1.64, r * 0.14);
  ctx.fillStyle = "#f0d040";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(x, brimY, brimRx, brimRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#3d0ea0";
  ctx.fill();
  ctx.strokeStyle = "#8b50e0";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, brimY, brimRx, brimRy, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = "rgba(140,80,255,0.35)";
  ctx.fill();

  ctx.font = `bold ${r * 0.44}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f8e040";
  ctx.shadowColor = "#f8e040";
  ctx.shadowBlur = 4;
  ctx.fillText("★", x, tipY + (brimY - tipY) * 0.52);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function _angelWings(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.25, y - r * 0.1);
  ctx.bezierCurveTo(
    x - r * 1.55,
    y - r * 0.95,
    x - r * 1.7,
    y + r * 0.15,
    x - r * 0.8,
    y + r * 0.35,
  );
  ctx.bezierCurveTo(
    x - r * 0.45,
    y + r * 0.45,
    x - r * 0.15,
    y + r * 0.1,
    x - r * 0.25,
    y - r * 0.1,
  );
  const wL = ctx.createLinearGradient(x - r * 1.7, y - r, x, y);
  wL.addColorStop(0, "rgba(255,252,230,0.92)");
  wL.addColorStop(0.6, "rgba(240,220,175,0.75)");
  wL.addColorStop(1, "rgba(240,220,175,0.0)");
  ctx.fillStyle = wL;
  ctx.fill();
  ctx.strokeStyle = "rgba(220,200,140,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + r * 0.25, y - r * 0.1);
  ctx.bezierCurveTo(
    x + r * 1.55,
    y - r * 0.95,
    x + r * 1.7,
    y + r * 0.15,
    x + r * 0.8,
    y + r * 0.35,
  );
  ctx.bezierCurveTo(
    x + r * 0.45,
    y + r * 0.45,
    x + r * 0.15,
    y + r * 0.1,
    x + r * 0.25,
    y - r * 0.1,
  );
  const wR = ctx.createLinearGradient(x, y - r, x + r * 1.7, y);
  wR.addColorStop(0, "rgba(240,220,175,0.0)");
  wR.addColorStop(0.4, "rgba(240,220,175,0.75)");
  wR.addColorStop(1, "rgba(255,252,230,0.92)");
  ctx.fillStyle = wR;
  ctx.fill();
  ctx.strokeStyle = "rgba(220,200,140,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function _halo(ctx, x, y, r) {
  const hy = y - r - r * 0.2;
  const hrx = r * 0.52;
  const hry = r * 0.12;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, hy + 2, hrx, hry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, hy, hrx, hry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "#f8c93e";
  ctx.lineWidth = 3.5;
  ctx.shadowColor = "#f8c93e";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Replaced headband → full ninja mask with eye slit and ribbon tails
function _ninjaMask(ctx, x, y, r) {
  ctx.save();
  const slitY = y - r * 0.12;

  // Eye slit clipped to circle
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(x - r, slitY - r * 0.09, r * 2, r * 0.18);
  ctx.fillStyle = "rgba(10, 10, 10, 0.7)";
  ctx.fill();
  // Narrow bright opening in the center
  ctx.beginPath();
  ctx.rect(x - r * 0.6, slitY - r * 0.045, r * 1.2, r * 0.09);
  ctx.fillStyle = "rgba(80, 80, 80, 0.3)";
  ctx.fill();

  // Red glowing eyes
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = r * 0.45;
  for (const ex of [x - r * 0.28, x + r * 0.28]) {
    ctx.beginPath();
    ctx.arc(ex, slitY, r * 0.085, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 0, 0, 0.95)';
    ctx.fill();
    // bright pupil
    ctx.beginPath();
    ctx.arc(ex, slitY, r * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 120, 120, 1)';
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  // Two ribbon tails — wind-like irregular fabric motion
  const t = Date.now() * 0.001;

  // Layered sines at different frequencies to break regularity
  function wind(freq, amp, phase) {
    return (
      Math.sin(t * freq + phase)               * amp +
      Math.sin(t * freq * 2.3 + phase + 1.1)  * amp * 0.45 +
      Math.sin(t * freq * 5.1 + phase + 2.7)  * amp * 0.18
    );
  }

  // Upper tail — control points get progressively more displacement
  const u1y = wind(1.7,  r * 0.07, 0.0);
  const u1x = wind(1.3,  r * 0.05, 0.8);
  const u2y = wind(1.7,  r * 0.13, 0.5);
  const u2x = wind(1.3,  r * 0.09, 1.5);
  const u3y = wind(1.7,  r * 0.19, 1.1);
  const u3x = wind(1.3,  r * 0.13, 2.2);

  // Lower tail — different base phase so they move independently
  const l1y = wind(2.1,  r * 0.07, 3.0);
  const l1x = wind(1.6,  r * 0.05, 3.7);
  const l2y = wind(2.1,  r * 0.13, 3.5);
  const l2x = wind(1.6,  r * 0.09, 4.2);
  const l3y = wind(2.1,  r * 0.19, 4.1);
  const l3x = wind(1.6,  r * 0.13, 5.0);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = r * 0.15;
  ctx.strokeStyle = "#111111";

  ctx.beginPath();
  ctx.moveTo(x + r * 0.92, slitY - r * 0.09);
  ctx.bezierCurveTo(
    x + r * 1.3  + u1x, slitY - r * 0.12 + u1y,
    x + r * 1.45 + u2x, slitY - r * 0.32 + u2y,
    x + r * 1.22 + u3x, slitY - r * 0.56 + u3y,
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + r * 0.92, slitY + r * 0.09);
  ctx.bezierCurveTo(
    x + r * 1.3  + l1x, slitY + r * 0.14 + l1y,
    x + r * 1.42 + l2x, slitY + r * 0.42 + l2y,
    x + r * 1.18 + l3x, slitY + r * 0.64 + l3y,
  );
  ctx.stroke();
  ctx.restore();
}

function _vampireCape(ctx, x, y, r) {
  ctx.save();
  const cx = x,
    cy = y + r * 0.18;

  ctx.beginPath();
  ctx.moveTo(cx - r * 0.28, cy - r * 0.3);
  ctx.bezierCurveTo(
    cx - r * 1.45,
    cy - r * 0.75,
    cx - r * 1.55,
    cy + r * 0.35,
    cx - r * 0.85,
    cy + r * 0.95,
  );
  ctx.bezierCurveTo(
    cx - r * 0.5,
    cy + r * 1.1,
    cx - r * 0.1,
    cy + r * 0.55,
    cx,
    cy + r * 0.25,
  );
  ctx.fillStyle = "#1a0000";
  ctx.fill();
  ctx.strokeStyle = "#8B0000";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + r * 0.28, cy - r * 0.3);
  ctx.bezierCurveTo(
    cx + r * 1.45,
    cy - r * 0.75,
    cx + r * 1.55,
    cy + r * 0.35,
    cx + r * 0.85,
    cy + r * 0.95,
  );
  ctx.bezierCurveTo(
    cx + r * 0.5,
    cy + r * 1.1,
    cx + r * 0.1,
    cy + r * 0.55,
    cx,
    cy + r * 0.25,
  );
  ctx.fillStyle = "#1a0000";
  ctx.fill();
  ctx.strokeStyle = "#8B0000";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function _alienAntenna(ctx, x, y, r) {
  ctx.save();
  ctx.strokeStyle = "rgba(220,240,220,0.9)";
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = "round";

  const ltx = x - r * 0.5,
    lty = y - r - r * 0.85;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.3, y - r);
  ctx.quadraticCurveTo(x - r * 0.38, y - r * 1.4, ltx, lty);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ltx, lty, r * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = "#e8ffe8";
  ctx.shadowColor = "#aaffaa";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  const rtx = x + r * 0.5,
    rty = y - r - r * 0.85;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.3, y - r);
  ctx.quadraticCurveTo(x + r * 0.38, y - r * 1.4, rtx, rty);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rtx, rty, r * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = "#e8ffe8";
  ctx.shadowColor = "#aaffaa";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// Rotating rocket decoration — angle = direction of travel (Math.atan2(vy, vx))
// Default orientation has nose pointing up (-π/2), so we rotate by (angle + π/2)
function _rocketDecoration(ctx, x, y, r, phase, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.translate(-x, -y);

  if (phase === "below") {
    const ny = y + r * 0.82;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.32, ny);
    ctx.lineTo(x - r * 0.48, ny + r * 0.5);
    ctx.lineTo(x + r * 0.48, ny + r * 0.5);
    ctx.lineTo(x + r * 0.32, ny);
    ctx.closePath();
    ctx.fillStyle = "#555";
    ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.stroke();

    const flame = ctx.createRadialGradient(
      x,
      ny + r * 0.5,
      0,
      x,
      ny + r * 0.5,
      r * 0.45,
    );
    flame.addColorStop(0, "rgba(255,255,180,0.95)");
    flame.addColorStop(0.3, "rgba(255,140,20,0.85)");
    flame.addColorStop(0.7, "rgba(200,50,0,0.5)");
    flame.addColorStop(1, "rgba(150,20,0,0)");
    ctx.beginPath();
    ctx.ellipse(x, ny + r * 0.55, r * 0.35, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = flame;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y + r * 0.4);
    ctx.lineTo(x - r * 1.1, y + r * 0.9);
    ctx.lineTo(x - r * 0.5, y + r * 0.85);
    ctx.closePath();
    ctx.fillStyle = "#c0392b";
    ctx.fill();
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + r * 0.7, y + r * 0.4);
    ctx.lineTo(x + r * 1.1, y + r * 0.9);
    ctx.lineTo(x + r * 0.5, y + r * 0.85);
    ctx.closePath();
    ctx.fillStyle = "#c0392b";
    ctx.fill();
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (phase === "above") {
    const coneBase = y - r * 0.78;
    const coneTip = y - r - r * 0.75;
    const grad = ctx.createLinearGradient(
      x - r * 0.28,
      coneBase,
      x + r * 0.28,
      coneBase,
    );
    grad.addColorStop(0, "#e74c3c");
    grad.addColorStop(0.4, "#ff8a7a");
    grad.addColorStop(1, "#c0392b");
    ctx.beginPath();
    ctx.moveTo(x, coneTip);
    ctx.quadraticCurveTo(
      x - r * 0.05,
      coneBase - r * 0.1,
      x - r * 0.28,
      coneBase,
    );
    ctx.lineTo(x + r * 0.28, coneBase);
    ctx.quadraticCurveTo(x + r * 0.05, coneBase - r * 0.1, x, coneTip);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y - r * 0.25, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(140,220,255,0.7)";
    ctx.fill();
    ctx.strokeStyle = "rgba(180,240,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function _potatoSkin(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();

  const patches = [
    [x - r * 0.3, y - r * 0.25, r * 0.22],
    [x + r * 0.25, y + r * 0.15, r * 0.18],
    [x - r * 0.1, y + r * 0.35, r * 0.15],
    [x + r * 0.1, y - r * 0.4, r * 0.14],
    [x - r * 0.45, y + r * 0.1, r * 0.12],
  ];
  for (const [px, py, pr] of patches) {
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(60,35,5,0.22)";
    ctx.fill();
  }

  const eyes = [
    [x + r * 0.18, y - r * 0.3],
    [x - r * 0.32, y + r * 0.18],
    [x + r * 0.35, y + r * 0.28],
  ];
  for (const [ex, ey] of eyes) {
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.1, r * 0.07, Math.PI * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(50,25,0,0.55)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex, ey - r * 0.05, r * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(80,120,20,0.7)";
    ctx.fill();
  }

  const shine = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  shine.addColorStop(0, "rgba(255,220,140,0.18)");
  shine.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = shine;
  ctx.fill();

  ctx.restore();
}

function _turtleShell(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.5;
  const hr = r * 0.38;
  const offsets = [
    [0, 0],
    [-hr * 1.72, -hr],
    [hr * 1.72, -hr],
    [0, -hr * 2],
    [-hr * 1.72, hr],
    [hr * 1.72, hr],
    [0, hr * 2],
  ];
  for (const [dx, dy] of offsets) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const hx = x + dx + hr * 0.82 * Math.cos(a);
      const hy = y + dy + hr * 0.82 * Math.sin(a);
      i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

// Decorative multi-color spikes radiating from the circle edge (drawn below = behind circle)
function _spikePintado(ctx, x, y, r) {
  const colors = [
    "#2ecc71",
    "#27ae60",
    "#1abc9c",
    "#16a085",
    "#a8e063",
    "#52d68a",
    "#0f9b58",
    "#58d68d",
  ];
  const count = 8;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 8;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const px = -ny;
    const py = nx;
    const wx = x + nx * r;
    const wy = y + ny * r;
    const tipLen = r * 0.52;
    const baseHalf = r * 0.17;

    ctx.beginPath();
    ctx.moveTo(wx + nx * tipLen, wy + ny * tipLen);
    ctx.lineTo(wx + px * baseHalf - nx * 2, wy + py * baseHalf - ny * 2);
    ctx.lineTo(wx - px * baseHalf - nx * 2, wy - py * baseHalf - ny * 2);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

// Time-based fire embers for volcano brasas skin (used in preview + game)
function _volcanoBrasas(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  ctx.save();
  for (let i = 0; i < 10; i++) {
    const phase = (t * 1.1 + i * 0.63) % 1.0;
    const a = (i / 10) * Math.PI * 2 + Math.sin(t * 0.6 + i) * 0.7;
    const ex = x + Math.cos(a) * r * (0.25 + Math.sin(t * 1.9 + i * 1.3) * 0.2);
    const ey =
      y + r * 0.55 - phase * r * 1.7 + Math.sin(t * 1.6 + i * 0.8) * r * 0.18;
    const alpha =
      Math.min(1, phase < 0.15 ? phase / 0.15 : (1 - phase) / 0.85) * 0.88;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(255,${Math.floor(55 + (1 - phase) * 140)},0)`;
    ctx.beginPath();
    ctx.arc(ex, ey, 1.8 + (1 - phase) * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Always-on electric spark particles orbiting the circle
function _electricSparks(ctx, x, y, r) {
  ctx.save();
  const t = Date.now() * 0.001;
  for (let i = 0; i < 7; i++) {
    const baseAngle = (i / 7) * Math.PI * 2 + t * 2.2;
    const jA = baseAngle + (Math.random() - 0.5) * 0.9;
    const jB = baseAngle + (Math.random() - 0.5) * 0.7;
    const d1 = r + 3 + Math.random() * 11;
    const d2 = r + 1 + Math.random() * 5;
    const alpha = 0.45 + Math.random() * 0.55;
    const g = 200 + Math.floor(Math.random() * 55);
    ctx.strokeStyle = `rgba(180,${g},255,${alpha})`;
    ctx.lineWidth = 0.8 + Math.random() * 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(jA) * d1, y + Math.sin(jA) * d1);
    ctx.lineTo(x + Math.cos(jB) * d2, y + Math.sin(jB) * d2);
    ctx.stroke();
  }
  // Occasional bright flash spark
  if (Math.random() < 0.25) {
    const a = Math.random() * Math.PI * 2;
    ctx.strokeStyle = "rgba(255,255,200,0.92)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r + 13), y + Math.sin(a) * (r + 13));
    ctx.lineTo(
      x + Math.cos(a + 0.45) * (r + 3),
      y + Math.sin(a + 0.45) * (r + 3),
    );
    ctx.stroke();
  }
  ctx.restore();
}

function _chessBoard(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();

  const sq = (r * 2) / 8;
  const ox = x - r,
    oy = y - r;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const light = (row + col) % 2 === 0;
      ctx.fillStyle = light ? "rgba(240,217,181,0.92)" : "rgba(95,60,25,0.88)";
      ctx.fillRect(ox + col * sq, oy + row * sq, sq, sq);
    }
  }
  ctx.restore();
}

function _chromaticRainbow(ctx, x, y, r) {
  const rot = Date.now() * 0.0012; // noticeable rotation
  const segs = 48;

  // Rainbow glow ring OUTSIDE circle (overwrites any purple glow underneath)
  ctx.save();
  for (let i = 0; i < segs; i++) {
    const hue = (i / segs) * 360;
    const a0 = (i / segs) * Math.PI * 2 + rot;
    const a1 = ((i + 1) / segs) * Math.PI * 2 + rot;
    const grd = ctx.createRadialGradient(x, y, r * 0.85, x, y, r * 1.7);
    grd.addColorStop(0, `hsla(${hue},100%,55%,0.55)`);
    grd.addColorStop(1, `hsla(${hue},100%,55%,0)`);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r * 1.7, a0, a1);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();
  }
  ctx.restore();

  // Rainbow circle fill (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < segs; i++) {
    const hue = (i / segs) * 360;
    const a0 = (i / segs) * Math.PI * 2 + rot;
    const a1 = ((i + 1) / segs) * Math.PI * 2 + rot;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, a0, a1);
    ctx.closePath();
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fill();
  }
  // Shine
  const shine = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, 0, x, y, r);
  shine.addColorStop(0, "rgba(255,255,255,0.45)");
  shine.addColorStop(0.4, "rgba(255,255,255,0.1)");
  shine.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = shine;
  ctx.fill();
  ctx.restore();
}

function _saiyanPreview(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  const intensity = 0.52 + 0.18 * Math.abs(Math.sin(t * 1.8));
  const pulse = 0.65 + 0.35 * Math.abs(Math.sin(t * 3.5));
  const ar = 255,
    ag = 195,
    ab = 20;

  ctx.save();

  // Outer diffuse glow
  const glow = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.2);
  glow.addColorStop(0, `rgba(${ar},${ag},${ab},${0.42 * pulse})`);
  glow.addColorStop(0.5, `rgba(${ar},${ag},${ab},0.10)`);
  glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Flame spikes
  const spikeCount = 10;
  ctx.lineCap = "round";
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2 + t * 2.0;
    const a = angle + Math.sin(t * 3.7 + i * 2.1) * 0.3;
    const len =
      (r * 0.3 + r * 0.55 * intensity) *
      (0.5 + 0.5 * Math.abs(Math.sin(t * 2.8 + i * 1.9)));
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.55 * pulse})`;
    ctx.lineWidth = 1.5 + intensity * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r + 1), y + Math.sin(a) * (r + 1));
    ctx.lineTo(x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len));
    ctx.stroke();
  }

  // Inner bright ring
  ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.65 * pulse})`;
  ctx.lineWidth = 2 + intensity * 3;
  ctx.shadowColor = `rgba(${ar},${ag},${ab},0.85)`;
  ctx.shadowBlur = 8 + intensity * 6;
  ctx.beginPath();
  ctx.arc(x, y, r + 2 + intensity * 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function _brickWall(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();

  // Mortar background
  ctx.fillStyle = "#4a3828";
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  const bH = r * 0.3;
  const bW = r * 0.52;
  const mort = 1.8;
  const rows = Math.ceil((r * 2) / bH) + 2;

  for (let row = 0; row <= rows; row++) {
    const offset = row % 2 === 0 ? 0 : bW * 0.5;
    const by = y - r - bH + row * bH;
    const cols = Math.ceil((r * 2) / bW) + 3;
    for (let col = -1; col < cols; col++) {
      const bx = x - r - bW + col * bW + offset;
      const v = (Math.sin(row * 6.1 + col * 9.7) * 0.5 + 0.5) * 22;
      const rv = Math.floor(158 + v),
        gv = Math.floor(74 + v * 0.45),
        bv = Math.floor(42 + v * 0.25);
      ctx.fillStyle = `rgb(${rv},${gv},${bv})`;
      ctx.fillRect(bx + mort, by + mort, bW - mort * 2, bH - mort * 2);
    }
  }

  // Subtle highlight from top-left
  const shine = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  shine.addColorStop(0, "rgba(255,200,150,0.12)");
  shine.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = shine;
  ctx.fill();

  ctx.restore();
}

function _gasMaskFilters(ctx, x, y, r) {
  const fw  = r * 0.40;   // canister half-width
  const fh  = r * 0.58;   // canister half-height
  const gap = r * 0.10;   // space between circle edge and canister inner edge

  for (const side of [-1, 1]) {
    const fx = x + side * (r + gap + fw);
    const fy = y + r * 0.05;

    // Hose connecting circle to canister
    ctx.save();
    const tw = r * 0.085;
    ctx.beginPath();
    ctx.moveTo(x + side * (r - 1), fy - tw);
    ctx.lineTo(x + side * (r - 1), fy + tw);
    ctx.lineTo(fx - side * fw,     fy + tw * 0.65);
    ctx.lineTo(fx - side * fw,     fy - tw * 0.65);
    ctx.closePath();
    ctx.fillStyle = '#1e2d1e';
    ctx.fill();
    ctx.restore();

    // Canister body
    ctx.save();
    const grd = ctx.createLinearGradient(fx - fw, fy, fx + fw, fy);
    grd.addColorStop(0,    '#192319');
    grd.addColorStop(0.22, '#364e2a');
    grd.addColorStop(0.55, '#4a6438');
    grd.addColorStop(0.80, '#354830');
    grd.addColorStop(1,    '#192319');

    ctx.beginPath();
    ctx.roundRect(fx - fw, fy - fh, fw * 2, fh * 2, fw * 0.22);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = '#0d150d';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Horizontal ridges
    const ridges = 5;
    for (let i = 1; i < ridges; i++) {
      const ry = fy - fh + (fh * 2 / ridges) * i;
      ctx.strokeStyle = 'rgba(0,0,0,0.38)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(fx - fw * 0.86, ry);
      ctx.lineTo(fx + fw * 0.86, ry);
      ctx.stroke();
      // subtle lighter ridge below
      ctx.strokeStyle = 'rgba(120,180,90,0.15)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(fx - fw * 0.86, ry + 1.4);
      ctx.lineTo(fx + fw * 0.86, ry + 1.4);
      ctx.stroke();
    }

    // Specular highlight strip
    const hiGrd = ctx.createLinearGradient(fx - fw * 0.65, fy, fx - fw * 0.08, fy);
    hiGrd.addColorStop(0,   'rgba(180,255,140,0)');
    hiGrd.addColorStop(0.5, 'rgba(180,255,140,0.11)');
    hiGrd.addColorStop(1,   'rgba(180,255,140,0)');
    ctx.beginPath();
    ctx.roundRect(fx - fw * 0.65, fy - fh * 0.82, fw * 0.55, fh * 1.64, fw * 0.12);
    ctx.fillStyle = hiGrd;
    ctx.fill();

    // Bottom circular mesh cap
    ctx.beginPath();
    ctx.ellipse(fx, fy + fh, fw * 0.80, fw * 0.17, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0a120a';
    ctx.fill();
    ctx.strokeStyle = '#182318';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Mesh holes on cap
    ctx.fillStyle = 'rgba(70,110,60,0.55)';
    for (let col = -2; col <= 2; col++) {
      for (let row = 0; row < 2; row++) {
        if (Math.abs(col) === 2 && row === 1) continue;
        ctx.beginPath();
        ctx.arc(fx + col * fw * 0.20, fy + fh + (row - 0.5) * fw * 0.11, fw * 0.038, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

function _liquidGlass(ctx, x, y, r) {
  const t = Date.now() * 0.001;

  // ── 1. Interior glass body (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();

  // Blurred frosted scatter — simulates light diffusion through glass
  ctx.filter = 'blur(4px)';
  const bodyGrd = ctx.createLinearGradient(x, y - r, x, y + r);
  bodyGrd.addColorStop(0,    'rgba(255,255,255,0.38)');
  bodyGrd.addColorStop(0.40, 'rgba(255,255,255,0.08)');
  bodyGrd.addColorStop(1,    'rgba(190,235,255,0.22)');
  ctx.fillStyle = bodyGrd;
  ctx.fillRect(x - r - 6, y - r - 6, r * 2 + 12, r * 2 + 12);
  ctx.filter = 'none';

  // Caustic refraction ring — small light blobs orbiting at ~0.52r
  for (let i = 0; i < 7; i++) {
    const a   = (i / 7) * Math.PI * 2 + t * 0.22;
    const d   = r * (0.50 + 0.06 * Math.sin(t * 1.4 + i * 1.7));
    const cr  = r * (0.052 + 0.034 * Math.abs(Math.sin(t * 1.8 + i * 2.3)));
    const alpha = 0.14 + 0.10 * Math.sin(t * 2.1 + i);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, cr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  // Primary highlight — large upper-left sheen
  const shine = ctx.createRadialGradient(x - r * 0.18, y - r * 0.30, 0, x - r * 0.05, y - r * 0.10, r * 0.50);
  shine.addColorStop(0,    'rgba(255,255,255,0.72)');
  shine.addColorStop(0.28, 'rgba(255,255,255,0.30)');
  shine.addColorStop(0.65, 'rgba(255,255,255,0.05)');
  shine.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // Secondary small specular — bottom-right
  const shine2 = ctx.createRadialGradient(x + r * 0.28, y + r * 0.30, 0, x + r * 0.28, y + r * 0.30, r * 0.22);
  shine2.addColorStop(0, 'rgba(255,255,255,0.30)');
  shine2.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine2;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  ctx.restore();

  // ── 2. Chromatic aberration rings at the glass border (RGB split)
  ctx.save();
  const caRings = [
    { rr: r + 0.5, color: 'rgba(255,60,60,0.24)',   lw: 2.2 },
    { rr: r - 2.0, color: 'rgba(60,255,160,0.18)',  lw: 1.8 },
    { rr: r - 4.0, color: 'rgba(80,180,255,0.16)',  lw: 1.5 },
  ];
  for (const ring of caRings) {
    ctx.beginPath();
    ctx.arc(x, y, ring.rr, 0, Math.PI * 2);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth   = ring.lw;
    ctx.stroke();
  }
  ctx.restore();

  // ── 3. Specular rim — the signature Apple glass crystal edge
  ctx.save();
  const rimOff = t * 0.18; // very slow rotation

  // Bright upper arc (~200° sweep, upper-left lit)
  ctx.beginPath();
  ctx.arc(x, y, r - 1.8, -Math.PI * 0.85 + rimOff, Math.PI * 0.22 + rimOff);
  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth   = 3.0;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Soft glow halo behind the bright arc
  ctx.beginPath();
  ctx.arc(x, y, r - 1.8, -Math.PI * 0.85 + rimOff, Math.PI * 0.22 + rimOff);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth   = 7.0;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Dim arc on the opposite side
  ctx.beginPath();
  ctx.arc(x, y, r - 1.8, Math.PI * 0.22 + rimOff, -Math.PI * 0.85 + rimOff + Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth   = 1.8;
  ctx.lineCap     = 'round';
  ctx.stroke();

  ctx.restore();
}

function _fenixAlas(ctx, x, y, r) {
  const t    = Date.now() * 0.001;
  const flap = Math.sin(t * 3.2) * 0.07; // subtle wing beat

  // Colour palette: deep crimson → orange → bright gold
  const C = [
    [110, 10,  0 ],  // 0 deep crimson
    [175, 28,  0 ],  // 1 crimson
    [225, 65,  0 ],  // 2 dark orange
    [255, 105, 0 ],  // 3 fenix orange
    [255, 155, 10],  // 4 amber
    [255, 205, 30],  // 5 gold
    [255, 235, 90],  // 6 pale gold
  ];
  function col(i, a) { const c = C[Math.min(i, 6)]; return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  // Draw one feather
  // (ox, oy) = rachis base, len = length, hw = half-width, ang = direction (rad)
  // ci = colour palette index at base; tip fades to ci+3
  function feather(ox, oy, len, hw, ang, ci) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const px = -sa, py = ca; // perpendicular
    const tx = ox + ca * len, ty = oy + sa * len;

    // Gradient from base colour to pale gold tip fading to transparent
    const grd = ctx.createLinearGradient(ox, oy, tx, ty);
    grd.addColorStop(0,    col(ci,     0.85));
    grd.addColorStop(0.45, col(ci + 2, 0.80));
    grd.addColorStop(0.80, col(ci + 3, 0.65));
    grd.addColorStop(1,    col(6,      0   ));

    // Vane silhouette: wide belly, tapers at both ends
    // The leading edge (positive perp) is more convex than trailing
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.bezierCurveTo(
      ox + ca * len * 0.28 + px * hw * 1.1,
      oy + sa * len * 0.28 + py * hw * 1.1,
      ox + ca * len * 0.68 + px * hw * 0.95,
      oy + sa * len * 0.68 + py * hw * 0.95,
      tx, ty,
    );
    ctx.bezierCurveTo(
      ox + ca * len * 0.65 - px * hw * 0.45,
      oy + sa * len * 0.65 - py * hw * 0.45,
      ox + ca * len * 0.25 - px * hw * 0.22,
      oy + sa * len * 0.25 - py * hw * 0.22,
      ox, oy,
    );
    ctx.fillStyle = grd;
    ctx.fill();

    // Barbs — fine parallel lines across the vane
    const nBarbs = Math.max(4, Math.floor(len / 6));
    ctx.strokeStyle = col(ci + 4, 0.22);
    ctx.lineWidth   = 0.45;
    ctx.lineCap     = 'round';
    for (let i = 1; i < nBarbs; i++) {
      const f  = i / nBarbs;
      const bx = ox + ca * len * f;
      const by = oy + sa * len * f;
      const bw = hw * Math.sin(f * Math.PI); // tapers at both ends
      ctx.beginPath();
      ctx.moveTo(bx + px * bw,        by + py * bw);
      ctx.lineTo(bx - px * bw * 0.42, by - py * bw * 0.42);
      ctx.stroke();
    }

    // Rachis — central shaft
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = col(ci + 4, 0.45);
    ctx.lineWidth   = 0.75;
    ctx.stroke();
  }

  // Wing rows — defined for the RIGHT wing; left wing mirrors angles as (π - angle)
  // Rows drawn back→front: coverts, secondaries, primaries
  const ROWS = [
    {
      // Coverts: short, tight, near body
      n: 5,
      attach: { dx: r * 0.55, dy: -r * 0.05 },
      angles: [-0.80, -0.50, -0.20, 0.10, 0.36],
      lens:   [r * 0.72, r * 0.80, r * 0.83, r * 0.80, r * 0.70],
      hws:    [r * 0.145, r * 0.16, r * 0.165, r * 0.16, r * 0.14],
      ci:     0,
    },
    {
      // Secondaries: medium
      n: 4,
      attach: { dx: r * 0.62, dy: -r * 0.12 },
      angles: [-1.00, -0.65, -0.28, 0.10],
      lens:   [r * 1.10, r * 1.22, r * 1.25, r * 1.10],
      hws:    [r * 0.21, r * 0.235, r * 0.24, r * 0.21],
      ci:     2,
    },
    {
      // Primaries: long, outermost
      n: 5,
      attach: { dx: r * 0.70, dy: -r * 0.20 },
      angles: [-1.22, -0.88, -0.54, -0.20, 0.16],
      lens:   [r * 1.60, r * 1.78, r * 1.88, r * 1.78, r * 1.55],
      hws:    [r * 0.28, r * 0.32, r * 0.335, r * 0.32, r * 0.27],
      ci:     3,
    },
  ];

  ctx.save();

  for (const side of [1, -1]) { // right then left
    for (let ri = 0; ri < ROWS.length; ri++) {
      const row   = ROWS[ri];
      const flapD = flap * (ri + 1) * 0.5 * side;
      const ax    = x + side * row.attach.dx;
      const ay    = y + row.attach.dy;

      for (let fi = 0; fi < row.n; fi++) {
        // Mirror: left wing angle = π - rightAngle
        const baseAng  = side === 1 ? row.angles[fi] : Math.PI - row.angles[fi];
        const finalAng = baseAng + flapD;
        const ci       = Math.min(row.ci + Math.floor(fi * 1.5 / row.n), 4);
        feather(ax, ay, row.lens[fi], row.hws[fi], finalAng, ci);
      }
    }
  }

  ctx.restore();
}

function _blackWidowLegs(ctx, x, y, r) {
  // 4 legs per side. Each defined as [attach angle on circle, upper-segment dir, lower-segment dir]
  const LEGS = [
    { a: -0.82, d1: -1.15, d2: -0.60 },
    { a: -0.22, d1: -0.45, d2: -0.02 },
    { a:  0.42, d1:  0.18, d2:  0.65 },
    { a:  0.98, d1:  0.75, d2:  1.28 },
  ];
  const upLen  = r * 0.74;
  const loLen  = r * 0.64;
  const legW   = r * 0.075;

  ctx.save();
  ctx.strokeStyle = '#181818';
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  for (const side of [1, -1]) {
    for (const leg of LEGS) {
      const aA  = side === 1 ? leg.a  : Math.PI - leg.a;
      const d1A = side === 1 ? leg.d1 : Math.PI - leg.d1;
      const d2A = side === 1 ? leg.d2 : Math.PI - leg.d2;

      const ax = x + Math.cos(aA) * (r - 2);
      const ay = y + Math.sin(aA) * (r - 2);
      const jx = ax + Math.cos(d1A) * upLen;
      const jy = ay + Math.sin(d1A) * upLen;
      const tx = jx + Math.cos(d2A) * loLen;
      const ty = jy + Math.sin(d2A) * loLen;

      // Main leg
      ctx.lineWidth = legW;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(jx, jy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Bristles on upper segment
      ctx.lineWidth = 0.65;
      const ux = jx - ax, uy = jy - ay;
      const upn = Math.sqrt(ux * ux + uy * uy) || 1;
      const upx = -uy / upn, upy = ux / upn; // perpendicular
      for (let i = 1; i <= 4; i++) {
        const f  = i / 5;
        const hx = ax + ux * f, hy = ay + uy * f;
        const hl = r * 0.11;
        ctx.beginPath();
        ctx.moveTo(hx + upx * hl, hy + upy * hl);
        ctx.lineTo(hx - upx * hl * 0.4, hy - upy * hl * 0.4);
        ctx.stroke();
      }

      // Bristles on lower segment (taper toward tip)
      const lx = tx - jx, ly = ty - jy;
      const lon = Math.sqrt(lx * lx + ly * ly) || 1;
      const lpx = -ly / lon, lpy = lx / lon;
      for (let i = 1; i <= 3; i++) {
        const f  = i / 4;
        const hx = jx + lx * f, hy = jy + ly * f;
        const hl = r * (0.09 - f * 0.022);
        ctx.beginPath();
        ctx.moveTo(hx + lpx * hl, hy + lpy * hl);
        ctx.lineTo(hx - lpx * hl * 0.4, hy - lpy * hl * 0.4);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function _blackWidowMark(ctx, x, y, r) {
  // Red hourglass — the iconic black widow marking
  ctx.save();
  ctx.fillStyle = '#CC1010';
  // Upper half
  ctx.beginPath();
  ctx.moveTo(x,            y - r * 0.06);
  ctx.lineTo(x - r * 0.20, y - r * 0.30);
  ctx.lineTo(x + r * 0.20, y - r * 0.30);
  ctx.closePath();
  ctx.fill();
  // Lower half
  ctx.beginPath();
  ctx.moveTo(x,            y + r * 0.06);
  ctx.lineTo(x - r * 0.20, y + r * 0.30);
  ctx.lineTo(x + r * 0.20, y + r * 0.30);
  ctx.closePath();
  ctx.fill();
  // Thin connecting waist
  ctx.fillStyle = '#BB0E0E';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.045, r * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function _neonBorder(ctx, x, y, r) {
  const hue = (Date.now() * 0.06) % 360; // full cycle every ~6s

  ctx.save();

  // Outer diffuse glow rings
  for (let i = 4; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(x, y, r + i * 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 100%, 62%, ${0.10 / i})`;
    ctx.lineWidth   = i * 4;
    ctx.stroke();
  }

  // Mid glow
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle   = `hsla(${hue}, 100%, 78%, 0.52)`;
  ctx.lineWidth     = 5.5;
  ctx.shadowColor   = `hsl(${hue}, 100%, 65%)`;
  ctx.shadowBlur    = 14;
  ctx.stroke();
  ctx.shadowBlur    = 0;

  // Bright core tube
  ctx.beginPath();
  ctx.arc(x, y, r + 1, 0, Math.PI * 2);
  ctx.strokeStyle   = `hsla(${hue}, 100%, 96%, 0.92)`;
  ctx.lineWidth     = 2.2;
  ctx.shadowColor   = `hsl(${hue}, 100%, 90%)`;
  ctx.shadowBlur    = 10;
  ctx.stroke();
  ctx.shadowBlur    = 0;

  ctx.restore();
}

function _apostadorTraje(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();

  // Left suit lapel
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.1);
  ctx.lineTo(x - r * 0.18, y - r * 0.22);
  ctx.lineTo(x, y + r * 0.08);
  ctx.lineTo(x - r, y + r);
  ctx.closePath();
  ctx.fillStyle = '#111828';
  ctx.fill();

  // Right suit lapel
  ctx.beginPath();
  ctx.moveTo(x + r, y - r * 0.1);
  ctx.lineTo(x + r * 0.18, y - r * 0.22);
  ctx.lineTo(x, y + r * 0.08);
  ctx.lineTo(x + r, y + r);
  ctx.closePath();
  ctx.fillStyle = '#111828';
  ctx.fill();

  // White dress shirt centre strip
  ctx.beginPath();
  ctx.moveTo(x - r * 0.18, y - r * 0.22);
  ctx.lineTo(x + r * 0.18, y - r * 0.22);
  ctx.lineTo(x + r * 0.06, y + r);
  ctx.lineTo(x - r * 0.06, y + r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(235,238,255,0.92)';
  ctx.fill();

  // Suit lapel notch/fold lines
  ctx.strokeStyle = 'rgba(80,100,160,0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.18, y - r * 0.22);
  ctx.lineTo(x - r * 0.38, y - r * 0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.18, y - r * 0.22);
  ctx.lineTo(x + r * 0.38, y - r * 0.05);
  ctx.stroke();

  ctx.restore();

  // Gold bow tie (drawn above clip so it sits at the circle edge)
  ctx.save();
  const ty = y + r * 0.06;
  ctx.fillStyle = '#D4AF37';
  // Left wing
  ctx.beginPath();
  ctx.moveTo(x - r * 0.03, ty - r * 0.03);
  ctx.lineTo(x - r * 0.2, ty - r * 0.11);
  ctx.lineTo(x - r * 0.2, ty + r * 0.11);
  ctx.lineTo(x - r * 0.03, ty + r * 0.03);
  ctx.closePath();
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(x + r * 0.03, ty - r * 0.03);
  ctx.lineTo(x + r * 0.2, ty - r * 0.11);
  ctx.lineTo(x + r * 0.2, ty + r * 0.11);
  ctx.lineTo(x + r * 0.03, ty + r * 0.03);
  ctx.closePath();
  ctx.fill();
  // Centre knot
  ctx.beginPath();
  ctx.ellipse(x, ty, r * 0.045, r * 0.055, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#B8941F';
  ctx.fill();
  ctx.restore();
}

function _yinYang(ctx, x, y, r) {
  const cr = r * 0.86;
  const t = Date.now() * 0.001;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.32);

  ctx.beginPath();
  ctx.arc(0, 0, cr, 0, Math.PI * 2);
  ctx.clip();

  // Yang half (white/light)
  ctx.fillStyle = 'rgba(238, 232, 255, 0.97)';
  ctx.fillRect(-cr, -cr, cr * 2, cr * 2);

  // Yin half (dark)
  ctx.fillStyle = 'rgba(12, 4, 24, 0.97)';
  ctx.fillRect(-cr, -cr, cr, cr * 2);

  // Upper bump: white circle into dark territory
  ctx.beginPath();
  ctx.arc(0, -cr / 2, cr / 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(238, 232, 255, 0.97)';
  ctx.fill();

  // Lower bump: dark circle into white territory
  ctx.beginPath();
  ctx.arc(0, cr / 2, cr / 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12, 4, 24, 0.97)';
  ctx.fill();

  // Upper dot (dark in white bump)
  ctx.beginPath();
  ctx.arc(0, -cr / 2, cr / 6.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(12, 4, 24, 0.97)';
  ctx.fill();

  // Lower dot (white in dark bump)
  ctx.beginPath();
  ctx.arc(0, cr / 2, cr / 6.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(238, 232, 255, 0.97)';
  ctx.fill();

  // Subtle purple tint to keep Karma's identity
  ctx.beginPath();
  ctx.arc(0, 0, cr, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(162, 96, 255, 0.10)';
  ctx.fill();

  ctx.restore();

  // Outer ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, cr, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function _atomOrbits(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  const orbitals = [
    { rot: 0,              speed:  1.1 },
    { rot: Math.PI / 3,    speed: -0.8 },
    { rot: 2 * Math.PI / 3, speed:  1.5 },
  ];
  const rx = r * 1.58;
  const ry = r * 0.38;

  ctx.save();
  for (const orb of orbitals) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(orb.rot);

    // Orbit ring
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(80, 180, 255, 0.38)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Electron
    const ea = t * orb.speed;
    const ex = Math.cos(ea) * rx;
    const ey = Math.sin(ea) * ry;
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.115, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150, 220, 255, 0.95)';
    ctx.shadowColor = '#55ccff';
    ctx.shadowBlur = 7;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // Nucleus glow
  ctx.beginPath();
  ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(80, 180, 255, 0.18)';
  ctx.fill();

  ctx.restore();
}

// ── Parasite: Simbionte ───────────────────────────────────────────────────────
function _simbionteBelow(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  for (let i = 0; i < 6; i++) {
    const phase = (i / 6) * Math.PI * 2;
    const speed = 0.8 + (i % 3) * 0.3;
    const ext   = 0.5 + 0.5 * Math.sin(t * speed + phase);
    const angle = (i / 6) * Math.PI * 2 + Math.sin(t * 0.4 + phase) * 0.4;
    const len   = r * (0.4 + 0.6 * ext);
    const tx0 = x + Math.cos(angle) * r * 0.9, ty0 = y + Math.sin(angle) * r * 0.9;
    const tx1 = x + Math.cos(angle) * (r + len), ty1 = y + Math.sin(angle) * (r + len);
    const lw  = 1.5 + ext * 2.0;
    ctx.save();
    ctx.strokeStyle = `rgba(20,0,30,${0.55 + ext*0.35})`; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx0,ty0); ctx.lineTo(tx1,ty1); ctx.stroke();
    ctx.beginPath(); ctx.arc(tx1, ty1, lw*0.6, 0, Math.PI*2);
    ctx.fillStyle = `rgba(150,0,200,${ext*0.6})`; ctx.shadowColor='#9000c8'; ctx.shadowBlur=6; ctx.fill();
    ctx.shadowBlur=0; ctx.restore();
  }
  const ag = ctx.createRadialGradient(x,y,r*0.6,x,y,r*1.8);
  ag.addColorStop(0,'rgba(50,0,70,0.10)'); ag.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(x,y,r*1.8,0,Math.PI*2); ctx.fill();
}

function _simbionteAbove(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  // Liquid ripple rings
  ctx.save(); ctx.beginPath(); ctx.arc(x,y,r-1,0,Math.PI*2); ctx.clip();
  for (let i = 0; i < 3; i++) {
    const ph = ((t*0.7 + i/3) % 1);
    ctx.beginPath(); ctx.arc(x, y, r*ph*0.9, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(100,0,140,${(1-ph)*0.15})`; ctx.lineWidth=2; ctx.stroke();
  }
  ctx.restore();
  // Asymmetric white eyes (blink occasionally)
  const blink  = Math.sin(t*0.3) > 0.85 ? 0 : 1;
  const eyeP   = 0.75 + 0.25*Math.sin(t*2.2);
  if (blink) {
    for (const [ex, ey, rx, ry, poff] of [
      [x-r*0.25, y-r*0.10, r*0.18, r*0.11, -0.3],
      [x+r*0.28, y-r*0.08, r*0.15, r*0.08,  0.2],
    ]) {
      ctx.save(); ctx.shadowColor='#ffffff'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.ellipse(ex,ey,rx,ry*eyeP,poff,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${eyeP*0.92})`; ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.90)'; ctx.shadowBlur=0;
      ctx.beginPath(); ctx.ellipse(ex,ey,rx*0.38,ry*0.65*eyeP,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
  // Purple pulsing rim
  const rp = 0.50+0.25*Math.sin(t*1.8);
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=`rgba(120,0,180,${rp})`; ctx.lineWidth=3;
  ctx.shadowColor='#6000aa'; ctx.shadowBlur=14; ctx.stroke(); ctx.shadowBlur=0;
}

// ── Turret: Mech ──────────────────────────────────────────────────────────────
function _mechBelow(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  const gears = [
    { dist:r*1.45, sp: 0.50, teeth:8, sz:r*0.13, ph:0.0 },
    { dist:r*1.72, sp:-0.34, teeth:6, sz:r*0.10, ph:2.1 },
    { dist:r*1.56, sp: 0.68, teeth:5, sz:r*0.08, ph:4.2 },
  ];
  for (const g of gears) {
    const a = t*g.sp + g.ph;
    const gx = x+Math.cos(a)*g.dist, gy = y+Math.sin(a)*g.dist;
    ctx.save(); ctx.translate(gx,gy); ctx.rotate(t*g.sp*3);
    ctx.beginPath(); ctx.arc(0,0,g.sz*0.65,0,Math.PI*2);
    ctx.fillStyle='rgba(50,65,85,0.88)'; ctx.strokeStyle='rgba(80,160,255,0.35)'; ctx.lineWidth=1; ctx.fill(); ctx.stroke();
    for (let i=0; i<g.teeth; i++) {
      const ta=(i/g.teeth)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ta)*g.sz*0.65*0.85, Math.sin(ta)*g.sz*0.65*0.85);
      ctx.lineTo(Math.cos(ta)*g.sz, Math.sin(ta)*g.sz);
      ctx.lineWidth=g.sz*0.3; ctx.strokeStyle='rgba(60,80,100,0.85)'; ctx.lineCap='round'; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0,0,g.sz*0.22,0,Math.PI*2);
    ctx.fillStyle='rgba(20,30,45,0.9)'; ctx.fill();
    ctx.restore();
  }
}

function _mechAbove(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  ctx.save(); ctx.beginPath(); ctx.arc(x,y,r-1,0,Math.PI*2); ctx.clip();
  const hR = r*0.32, hH = Math.sqrt(3)*hR;
  for (const [dx,dy] of [[0,0],[hH,hR*1.5],[-hH,hR*1.5],[hH,-hR*1.5],[-hH,-hR*1.5],[hH*2,0],[-hH*2,0],[0,hR*3],[0,-hR*3]]) {
    if (Math.sqrt(dx**2+dy**2)>r*1.6) continue;
    ctx.beginPath();
    for (let i=0;i<6;i++){const a=(i/6)*Math.PI*2-Math.PI/6; ctx.lineTo(x+dx+Math.cos(a)*hR*0.85,y+dy+Math.sin(a)*hR*0.85);}
    ctx.closePath();
    ctx.strokeStyle=`rgba(80,160,255,${0.10+0.04*Math.sin(t*1.2+dx*0.05+dy*0.05)})`; ctx.lineWidth=0.8; ctx.stroke();
  }
  ctx.restore();
  // Blue energy core
  const cp = 0.5+0.5*Math.abs(Math.sin(t*2.0));
  const cg = ctx.createRadialGradient(x,y,0,x,y,r*0.35);
  cg.addColorStop(0,`rgba(100,200,255,${0.6+cp*0.3})`); cg.addColorStop(0.5,`rgba(50,120,255,${0.2+cp*0.15})`); cg.addColorStop(1,'rgba(0,80,200,0)');
  ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(x,y,r*0.35,0,Math.PI*2); ctx.fill();
  // Mechanical rim
  const rp=0.45+0.20*Math.sin(t*1.5);
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=`rgba(80,160,255,${rp})`; ctx.lineWidth=2.8; ctx.shadowColor='#0080ff'; ctx.shadowBlur=12; ctx.stroke(); ctx.shadowBlur=0;
}

// ── Portal: Singularidad ──────────────────────────────────────────────────────
function _singularidadBelow(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  ctx.save(); ctx.translate(x,y); ctx.rotate(t*0.14);
  const disk = [
    {rx:r*2.2,ry:r*0.28,col:`rgba(180,80,0,`,lw:8, fp:0.20},
    {rx:r*1.55,ry:r*0.20,col:`rgba(255,155,15,`,lw:4, fp:0.32},
    {rx:r*0.90,ry:r*0.12,col:`rgba(255,235,195,`,lw:2.5,fp:0.45},
  ];
  for (const d of disk) {
    ctx.beginPath(); ctx.ellipse(0,0,d.rx,d.ry,0,0,Math.PI*2);
    ctx.strokeStyle=`${d.col}${d.fp+0.08*Math.sin(t*1.1)})`;
    ctx.lineWidth=d.lw; ctx.stroke();
  }
  ctx.restore();
  const bg=ctx.createRadialGradient(x,y,r*0.3,x,y,r*2.5);
  bg.addColorStop(0,'rgba(60,0,90,0.12)'); bg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(x,y,r*2.5,0,Math.PI*2); ctx.fill();
}

function _singularidadAbove(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  ctx.save(); ctx.beginPath(); ctx.arc(x,y,r-1,0,Math.PI*2); ctx.clip();
  // Spiral arms pulling inward
  for (let arm=0;arm<3;arm++) {
    const basePhase=(arm/3)*Math.PI*2+t*0.3;
    ctx.beginPath();
    for (let step=0;step<=60;step++) {
      const frac=step/60;
      const a=basePhase+frac*Math.PI*4;
      const rr=r*(1-frac*0.98);
      step===0 ? ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr) : ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);
    }
    ctx.strokeStyle=`rgba(140,60,200,${0.10+0.04*Math.sin(t+arm)})`; ctx.lineWidth=0.8; ctx.stroke();
  }
  // Central void
  const vg=ctx.createRadialGradient(x,y,0,x,y,r*0.55);
  vg.addColorStop(0,'rgba(0,0,0,0.80)'); vg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=vg; ctx.fillRect(x-r,y-r,r*2,r*2);
  ctx.restore();
  // Lensing rings
  for (let i=0;i<3;i++) {
    const ph=((t*0.4+i/3)%1);
    ctx.beginPath(); ctx.arc(x,y,r*(1.05+ph*1.6),0,Math.PI*2);
    ctx.strokeStyle=`rgba(100,0,180,${(1-ph)*0.28})`; ctx.lineWidth=1.8*(1-ph); ctx.stroke();
  }
  const rp=0.60+0.20*Math.sin(t*1.5);
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=`rgba(120,0,200,${rp})`; ctx.lineWidth=3.0; ctx.shadowColor='#5000aa'; ctx.shadowBlur=16; ctx.stroke(); ctx.shadowBlur=0;
}

// ── Clock: Cronos ─────────────────────────────────────────────────────────────
function _cronosAbove(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  ctx.save(); ctx.beginPath(); ctx.arc(x,y,r-1,0,Math.PI*2); ctx.clip();
  // Bezel
  ctx.beginPath(); ctx.arc(x,y,r*0.92,0,Math.PI*2);
  ctx.strokeStyle='rgba(180,140,60,0.35)'; ctx.lineWidth=2; ctx.stroke();
  // Hour tick marks
  for (let h=0;h<12;h++) {
    const a=(h/12)*Math.PI*2-Math.PI/2;
    const isMain=h%3===0;
    ctx.beginPath();
    ctx.moveTo(x+Math.cos(a)*r*(isMain?0.72:0.78), y+Math.sin(a)*r*(isMain?0.72:0.78));
    ctx.lineTo(x+Math.cos(a)*r*0.88, y+Math.sin(a)*r*0.88);
    ctx.strokeStyle=`rgba(200,162,60,${isMain?0.40:0.22})`; ctx.lineWidth=isMain?2:1; ctx.stroke();
  }
  ctx.restore();
  // Minute hand
  const mA = t*0.5-Math.PI/2;
  ctx.save(); ctx.strokeStyle='rgba(180,150,60,0.70)'; ctx.lineWidth=1.5; ctx.lineCap='round';
  ctx.shadowColor='#b49030'; ctx.shadowBlur=4;
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(mA)*r*0.68,y+Math.sin(mA)*r*0.68); ctx.stroke(); ctx.restore();
  // Hour hand
  const hA = t*(0.5/12)-Math.PI/2;
  ctx.save(); ctx.strokeStyle='rgba(220,192,80,0.82)'; ctx.lineWidth=2.5; ctx.lineCap='round';
  ctx.shadowColor='#d4aa40'; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(hA)*r*0.48,y+Math.sin(hA)*r*0.48); ctx.stroke(); ctx.restore();
  // Center pin
  ctx.beginPath(); ctx.arc(x,y,r*0.055,0,Math.PI*2);
  ctx.fillStyle='rgba(230,196,80,0.92)'; ctx.shadowColor='#d4aa40'; ctx.shadowBlur=6; ctx.fill(); ctx.shadowBlur=0;
  // Time distortion rings
  for (let i=0;i<2;i++){
    const ph=((t*0.38+i*0.5)%1);
    ctx.beginPath(); ctx.arc(x,y,r*(1.05+ph*1.8),0,Math.PI*2);
    ctx.strokeStyle=`rgba(180,150,60,${(1-ph)*0.30})`; ctx.lineWidth=1.8*(1-ph); ctx.stroke();
  }
  // Bronze rim
  const rp=0.50+0.22*Math.sin(t*1.6);
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=`rgba(190,150,55,${rp})`; ctx.lineWidth=2.8; ctx.shadowColor='#b49030'; ctx.shadowBlur=10; ctx.stroke(); ctx.shadowBlur=0;
}

// ── CrystalBeam: Prisma ───────────────────────────────────────────────────────
function _prismaBelow(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  for (let i=0;i<6;i++) {
    const baseA=(i/6)*Math.PI*2+t*0.08;
    const hue  =(i/6)*360;
    const pulse=Math.max(0, Math.sin(t*0.9+(i/6)*Math.PI*2));
    if (pulse<0.12) continue;
    const bLen =r*(0.8+0.6*pulse);
    const bx0=x+Math.cos(baseA)*r*0.92, by0=y+Math.sin(baseA)*r*0.92;
    const bx1=x+Math.cos(baseA)*(r+bLen), by1=y+Math.sin(baseA)*(r+bLen);
    const hw  =r*0.065*pulse;
    const perp=baseA+Math.PI/2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bx0+Math.cos(perp)*hw, by0+Math.sin(perp)*hw);
    ctx.lineTo(bx1,by1);
    ctx.lineTo(bx0+Math.cos(perp-Math.PI)*hw, by0+Math.sin(perp-Math.PI)*hw);
    ctx.fillStyle=`hsla(${hue},100%,70%,${pulse*0.38})`; ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx0,by0); ctx.lineTo(bx1,by1);
    ctx.strokeStyle=`hsla(${hue},100%,85%,${pulse*0.55})`; ctx.lineWidth=1.2;
    ctx.shadowColor=`hsl(${hue},100%,65%)`; ctx.shadowBlur=6; ctx.stroke(); ctx.shadowBlur=0;
    ctx.restore();
  }
}

function _prismaAbove(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  ctx.save(); ctx.beginPath(); ctx.arc(x,y,r-1,0,Math.PI*2); ctx.clip();
  // Triangular crystal facets
  for (let i=0;i<8;i++) {
    const a0=(i/8)*Math.PI*2, a1=((i+1)/8)*Math.PI*2;
    const hue=((i/8)*360+t*18)%360;
    const al=0.08+0.04*Math.sin(t*1.2+i*0.8);
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x+Math.cos(a0)*r, y+Math.sin(a0)*r);
    ctx.lineTo(x+Math.cos(a1)*r, y+Math.sin(a1)*r);
    ctx.closePath();
    ctx.fillStyle=`hsla(${hue},80%,70%,${al})`; ctx.fill();
    ctx.strokeStyle=`hsla(${hue},90%,82%,${al*1.6})`; ctx.lineWidth=0.6; ctx.stroke();
  }
  // Rainbow shimmer rotating
  const sa=t*0.4;
  const sg=ctx.createLinearGradient(x+Math.cos(sa)*r,y+Math.sin(sa)*r,x+Math.cos(sa+Math.PI)*r,y+Math.sin(sa+Math.PI)*r);
  for (let s=0;s<=6;s++) sg.addColorStop(s/6,`hsla(${(s/6)*360},90%,65%,0.07)`);
  ctx.fillStyle=sg; ctx.fillRect(x-r,y-r,r*2,r*2);
  ctx.restore();
  // Prismatic rim (color-shifting)
  const rimHue=(t*45)%360;
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=`hsla(${rimHue},100%,72%,${0.60+0.20*Math.sin(t*2.5)})`;
  ctx.lineWidth=2.8; ctx.shadowColor=`hsl(${rimHue},100%,65%)`; ctx.shadowBlur=12; ctx.stroke(); ctx.shadowBlur=0;
}

// ── Serpiente: Cascabel ───────────────────────────────────────────────────────
function _cascabelAbove(ctx, x, y, r) {
  const t = Date.now() * 0.001;

  // Scale pattern — overlapping semicircles in offset rows
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.clip();
  const sr = r * 0.22;
  for (let row = -1; row * sr * 1.5 < r * 2 + sr; row++) {
    const off = (row % 2) * sr;
    for (let col = -1; col * sr * 2 < r * 2 + sr * 2; col++) {
      const sx  = x - r + col * sr * 2 + off;
      const sy  = y - r + row * sr * 1.5;
      const hue = (((sx - x) + (sy - y)) * 1.3 + t * 32) % 360;
      const al  = 0.14 + 0.06 * Math.sin(t * 1.2 + row * 0.6 + col * 0.8);
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 0.90, 0, Math.PI);
      ctx.strokeStyle = `hsla(${hue},65%,50%,${al})`;
      ctx.lineWidth = 0.9; ctx.stroke();
    }
  }
  // Iridescent shimmer overlay
  const shimHue = (t * 38) % 360;
  const sg = ctx.createRadialGradient(
    x + r * 0.22 * Math.cos(t * 0.55), y + r * 0.22 * Math.sin(t * 0.55), 0,
    x, y, r
  );
  sg.addColorStop(0,   `hsla(${shimHue},80%,65%,0.14)`);
  sg.addColorStop(0.5, `hsla(${(shimHue+60)%360},80%,55%,0.05)`);
  sg.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();

  // Amber slit eyes
  const eyeR = r * 0.115;
  const eyeY = y - r * 0.15;
  for (const ex of [x - r * 0.28, x + r * 0.28]) {
    const eg = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, eyeR);
    eg.addColorStop(0,    'rgba(255,210,10,0.98)');
    eg.addColorStop(0.55, 'rgba(210,110,0,0.85)');
    eg.addColorStop(1,    'rgba(100,40,0,0)');
    ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = eg; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 10; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.90)'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(ex, eyeY, eyeR * 0.16, eyeR * 0.78, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Forked tongue (periodic flick)
  const tph = ((t * 0.9) % (Math.PI * 2));
  const tout = Math.max(0, Math.sin(tph));
  if (tout > 0.05) {
    const stemLen = r * 0.65 * tout;
    const forkLen = r * 0.28 * tout;
    ctx.save();
    ctx.strokeStyle = `rgba(200,25,25,${Math.min(1, tout * 1.2)})`;
    ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.85); ctx.lineTo(x, y + r * 0.85 + stemLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.85 + stemLen); ctx.lineTo(x - forkLen * 0.65, y + r * 0.85 + stemLen + forkLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.85 + stemLen); ctx.lineTo(x + forkLen * 0.65, y + r * 0.85 + stemLen + forkLen); ctx.stroke();
    ctx.restore();
  }

  // Iridescent rim
  const rimHue = (110 + 25 * Math.sin(t * 1.5)) % 360;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${rimHue},75%,52%,${0.55 + 0.20 * Math.sin(t * 2.0)})`;
  ctx.lineWidth = 2.5; ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 10;
  ctx.stroke(); ctx.shadowBlur = 0;
}

// ── Earthquake: Tectónico ─────────────────────────────────────────────────────
function _tectonicBelow(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  const rocks = [
    { s: 0,   sp: 0.40,  d: r * 1.55, sz: r * 0.12 },
    { s: 50,  sp: -0.30, d: r * 1.80, sz: r * 0.09 },
    { s: 25,  sp: 0.58,  d: r * 1.65, sz: r * 0.08 },
    { s: 75,  sp: -0.48, d: r * 1.45, sz: r * 0.10 },
  ];
  for (const rock of rocks) {
    const angle = t * rock.sp + rock.s;
    const rx = x + Math.cos(angle) * rock.d;
    const ry = y + Math.sin(angle) * rock.d;
    ctx.save();
    ctx.translate(rx, ry); ctx.rotate(angle * 1.3);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const h = Math.sin(rock.s * 13.7 + i * 57.3) * 43758.5453;
      const rr = rock.sz * (0.72 + 0.28 * (h - Math.floor(h)));
      i === 0 ? ctx.moveTo(Math.cos(a)*rr, Math.sin(a)*rr) : ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr);
    }
    ctx.closePath();
    ctx.fillStyle   = 'rgba(70,48,22,0.88)';
    ctx.strokeStyle = 'rgba(200,115,20,0.45)';
    ctx.lineWidth   = 0.8; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

function _tectonicAbove(ctx, x, y, r) {
  const t = Date.now() * 0.001;

  // Cracked lava surface
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.clip();
  for (let i = 0; i < 9; i++) {
    const hx  = Math.sin(i * 127.1) * 43758.5453;
    const hy  = Math.sin(i * 311.7 + 5.3) * 43758.5453;
    const hd  = Math.sin(i * 91.3  + 7.1)  * 43758.5453;
    const hl  = Math.sin(i * 57.3  + 2.7)  * 43758.5453;
    const hp  = Math.sin(i * 231.1 + 41.3) * 43758.5453;
    const cx1 = x + (hx - Math.floor(hx) - 0.5) * r * 1.5;
    const cy1 = y + (hy - Math.floor(hy) - 0.5) * r * 1.5;
    const ang  = (hd - Math.floor(hd)) * Math.PI * 2;
    const len  = r * (0.28 + (hl - Math.floor(hl)) * 0.55);
    const pulse = 0.45 + 0.55 * Math.sin(t * 1.5 + (hp - Math.floor(hp)) * Math.PI * 2);
    ctx.shadowColor = `rgba(255,110,0,${pulse * 0.9})`;
    ctx.shadowBlur  = 5 + pulse * 7;
    ctx.strokeStyle = `rgba(255,${Math.round(75 + pulse * 65)},0,${0.45 + pulse * 0.45})`;
    ctx.lineWidth   = 0.9 + pulse * 0.9;
    ctx.beginPath(); ctx.moveTo(cx1, cy1);
    ctx.lineTo(cx1 + Math.cos(ang) * len, cy1 + Math.sin(ang) * len); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.restore();

  // Shockwave rings
  for (let i = 0; i < 2; i++) {
    const phase = ((t / 2.2 + i * 0.5) % 1);
    const ringR = r * (1.05 + phase * 1.9);
    const alpha = (1 - phase) * 0.42;
    ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(200,115,15,${alpha})`;
    ctx.lineWidth   = 2.5 * (1 - phase); ctx.stroke();
  }

  // Rocky rim
  const rp = 0.45 + 0.20 * Math.sin(t * 1.8);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(180,88,10,${rp})`;
  ctx.lineWidth   = 2.8; ctx.shadowColor = '#ca6f1e'; ctx.shadowBlur = 10;
  ctx.stroke(); ctx.shadowBlur = 0;
}

// ── Caballero: Eclipse ────────────────────────────────────────────────────────
function _eclipseBelow(ctx, x, y, r) {
  const t = Date.now() * 0.001;
  // Shadow mist orbiting
  const mists = [
    { sp: 0.30,  d: r*1.30, sz: r*0.20, ph: 0.0  },
    { sp: -0.22, d: r*1.55, sz: r*0.16, ph: 2.1  },
    { sp: 0.42,  d: r*1.42, sz: r*0.18, ph: 4.2  },
    { sp: -0.35, d: r*1.65, sz: r*0.13, ph: 1.05 },
    { sp: 0.26,  d: r*1.22, sz: r*0.22, ph: 3.35 },
  ];
  for (const m of mists) {
    const a = t * m.sp + m.ph;
    const mx = x + Math.cos(a) * m.d, my = y + Math.sin(a) * m.d;
    const al = 0.11 + 0.05 * Math.sin(t * 1.5 + m.ph);
    const g  = ctx.createRadialGradient(mx, my, 0, mx, my, m.sz);
    g.addColorStop(0, `rgba(80,0,10,${al})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(mx, my, m.sz, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
  }
  // Dark halo
  const dg = ctx.createRadialGradient(x, y, r*0.5, x, y, r*2.0);
  dg.addColorStop(0, 'rgba(70,0,15,0.09)'); dg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(x, y, r*2.0, 0, Math.PI*2); ctx.fill();
}

function _eclipseAbove(ctx, x, y, r) {
  const t = Date.now() * 0.001;

  // Dark energy veins inside ball
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.clip();
  for (let i = 0; i < 6; i++) {
    const hx = Math.sin(i*200.7)*43758.5453, hy = Math.sin(i*321.3+4.1)*43758.5453;
    const hd = Math.sin(i*117.9+2.3)*43758.5453, hp = Math.sin(i*89.1+8.7)*43758.5453;
    const vx1 = x + (hx-Math.floor(hx)-0.5)*r*1.3;
    const vy1 = y + (hy-Math.floor(hy)-0.5)*r*1.3;
    const ang  = (hd - Math.floor(hd)) * Math.PI * 2;
    const pulse = 0.28 + 0.42 * Math.sin(t*1.2 + (hp-Math.floor(hp))*Math.PI*2);
    ctx.strokeStyle = `rgba(200,0,0,${pulse*0.55})`;
    ctx.lineWidth   = 0.9; ctx.shadowColor='rgba(255,0,0,0.5)'; ctx.shadowBlur=4;
    ctx.beginPath(); ctx.moveTo(vx1,vy1);
    ctx.lineTo(vx1+Math.cos(ang)*r*0.52, vy1+Math.sin(ang)*r*0.52); ctx.stroke();
  }
  // Visor panel lines
  const vY = y - r*0.08;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(140,0,0,0.22)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x-r*0.88,vY); ctx.lineTo(x+r*0.88,vY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x,vY-r*0.22); ctx.lineTo(x,vY+r*0.55); ctx.stroke();
  ctx.restore();

  // Glowing red eye slits
  const ep = 0.62 + 0.38 * Math.abs(Math.sin(t*1.8));
  const eyeY = y - r*0.08;
  for (const ex of [x-r*0.30, x+r*0.30]) {
    ctx.save();
    ctx.shadowColor='#ff0000'; ctx.shadowBlur=16;
    ctx.beginPath(); ctx.ellipse(ex, eyeY, r*0.115, r*0.062, 0, 0, Math.PI*2);
    ctx.fillStyle=`rgba(255,18,18,${ep})`; ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex, eyeY, r*0.055, r*0.032, 0, 0, Math.PI*2);
    ctx.fillStyle=`rgba(255,175,175,${ep*0.80})`; ctx.fill();
    ctx.restore();
  }

  // Crown spikes above the ball
  ctx.save();
  const spikes = 5;
  for (let i = 0; i < spikes; i++) {
    const frac  = (i-(spikes-1)/2)/((spikes-1)/2);
    const sx    = x + frac*r*0.80;
    const baseY = y - r + 2;
    const ht    = r*(0.30 - Math.abs(frac)*0.12) + r*0.04*Math.sin(t*1.6+i*0.9);
    ctx.beginPath();
    ctx.moveTo(sx - r*0.065, baseY);
    ctx.lineTo(sx, baseY - ht);
    ctx.lineTo(sx + r*0.065, baseY);
    ctx.closePath();
    const sa = 0.68 - Math.abs(frac)*0.18;
    ctx.fillStyle   = `rgba(30,0,0,${sa})`;
    ctx.strokeStyle = `rgba(180,0,0,${sa*0.55})`;
    ctx.lineWidth   = 0.8; ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  // Pulsing dark rim
  const rp = 0.55 + 0.26*Math.sin(t*2.0);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.strokeStyle = `rgba(185,0,0,${rp})`;
  ctx.lineWidth   = 3.2; ctx.shadowColor='#aa0000'; ctx.shadowBlur=18;
  ctx.stroke(); ctx.shadowBlur=0;
}

function _pulsarQuasarBelow(ctx, x, y, r) {
  const t = Date.now() * 0.001;

  // Accretion disk — three nested rotating ellipses (hot inner edge → cool outer)
  const rx   = r * 2.3;
  const ry   = r * 0.30;
  const rot  = t * 0.12;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // Outer glow band
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0,190,255,${0.16 + 0.06 * Math.sin(t * 0.8)})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Mid ring
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.68, ry * 0.68, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(60,220,255,${0.28 + 0.08 * Math.sin(t * 1.1)})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Hot inner edge
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.42, ry * 0.42, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(180,245,255,${0.40 + 0.10 * Math.sin(t * 1.6)})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  // Background nebula glow
  const bgGlow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.3);
  bgGlow.addColorStop(0, 'rgba(0,170,255,0.09)');
  bgGlow.addColorStop(1, 'rgba(0,100,200,0)');
  ctx.fillStyle = bgGlow;
  ctx.beginPath(); ctx.arc(x, y, r * 2.3, 0, Math.PI * 2); ctx.fill();
}

function _pulsarQuasarAbove(ctx, x, y, r) {
  const t = Date.now() * 0.001;

  // ── Magnetic field bands inside the ball
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.clip();
  for (let i = 0; i < 4; i++) {
    const frac  = (i + 0.5) / 4;
    const by    = y + (frac - 0.5) * r * 1.9;
    const halfW = Math.sqrt(Math.max(0, r * r - (by - y) ** 2));
    const alpha = 0.07 + 0.03 * Math.sin(t * 1.3 + i * 1.4);
    ctx.beginPath();
    ctx.moveTo(x - halfW, by); ctx.lineTo(x + halfW, by);
    ctx.strokeStyle = `rgba(0,210,255,${alpha})`;
    ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.restore();

  // ── Emission rings — expanding periodically from the star
  const period = 1.6;
  for (let i = 0; i < 3; i++) {
    const phase = ((t / period + i / 3) % 1);
    const ringR = r * (1.05 + phase * 2.2);
    const alpha = (1 - phase) * 0.38;
    ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,215,255,${alpha})`;
    ctx.lineWidth   = 2.2 * (1 - phase);
    ctx.stroke();
  }

  // ── Polar jets (top and bottom)
  const pulse  = 0.50 + 0.22 * Math.abs(Math.sin(t * 2.2));
  const jetLen = r * 2.6;
  const jHalf  = r * 0.14;

  for (const dir of [-1, 1]) {
    const jy0 = y + dir * r;
    const jy1 = y + dir * (r + jetLen);
    const grd = ctx.createLinearGradient(x, jy0, x, jy1);
    grd.addColorStop(0,    `rgba(100,235,255,${pulse})`);
    grd.addColorStop(0.35, `rgba(0,200,255,${pulse * 0.5})`);
    grd.addColorStop(1,     'rgba(0,170,255,0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - jHalf, jy0);
    ctx.lineTo(x, jy1);
    ctx.lineTo(x + jHalf, jy0);
    ctx.fillStyle = grd; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, jy0); ctx.lineTo(x, jy1);
    ctx.strokeStyle = `rgba(220,252,255,${pulse * 0.88})`;
    ctx.lineWidth   = 1.8;
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Rotating hot spot (magnetic pole on the star surface)
  const sa = t * 2.8;
  ctx.beginPath();
  ctx.arc(x + Math.cos(sa) * r * 0.70, y + Math.sin(sa) * r * 0.70, r * 0.09, 0, Math.PI * 2);
  ctx.fillStyle   = 'rgba(220,255,255,0.92)';
  ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur  = 0;

  // ── Pulsing rim glow
  const rimA = 0.58 + 0.24 * Math.sin(t * 2.5);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0,228,255,${rimA})`;
  ctx.lineWidth   = 2.8;
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur  = 0;
}

// ── Public draw API ───────────────────────────────────────────────────────────

// Called BEFORE drawing the main circle (things that go behind it).
// angle = facing direction in radians (Math.atan2(vy,vx)); default = -π/2 (up)
export function drawSkinDecorationBelow(
  ctx,
  x,
  y,
  r,
  charId,
  skinId,
  angle = -Math.PI / 2,
) {
  if (!skinId || skinId === "default") return;
  if (charId === "angel" && skinId === "wings") _angelWings(ctx, x, y, r);
  if (charId === "vampire" && skinId === "cape") _vampireCape(ctx, x, y, r);
  if (charId === "rocket" && skinId === "rocket")
    _rocketDecoration(ctx, x, y, r, "below", angle);
  if (charId === "spike" && skinId === "espinas") _spikePintado(ctx, x, y, r);
  if (charId === "fenix" && skinId === "alas") _fenixAlas(ctx, x, y, r);
  if (charId === "toxictrail" && skinId === "gasmask") _gasMaskFilters(ctx, x, y, r);
  if (charId === "spider"    && skinId === "viudanegra") _blackWidowLegs(ctx, x, y, r);
  if (charId === "pulsar"      && skinId === "quasar")       _pulsarQuasarBelow(ctx, x, y, r);
  if (charId === "earthquake"  && skinId === "tectonico")    _tectonicBelow(ctx, x, y, r);
  if (charId === "caballero"   && skinId === "eclipse")      _eclipseBelow(ctx, x, y, r);
  if (charId === "parasite"    && skinId === "simbionte")    _simbionteBelow(ctx, x, y, r);
  if (charId === "turret"      && skinId === "mech")         _mechBelow(ctx, x, y, r);
  if (charId === "portal"      && skinId === "singularidad") _singularidadBelow(ctx, x, y, r);
  if (charId === "crystalbeam" && skinId === "prisma")       _prismaBelow(ctx, x, y, r);
}

// Called AFTER drawing the main circle (things that go in front / above it).
export function drawSkinDecorationAbove(
  ctx,
  x,
  y,
  r,
  charId,
  skinId,
  angle = -Math.PI / 2,
) {
  if (!skinId || skinId === "default") return;
  if (charId === "mage" && skinId === "wizard") _wizardHat(ctx, x, y, r);
  if (charId === "angel" && skinId === "wings") _halo(ctx, x, y, r);
  if (charId === "ninja" && skinId === "mask") _ninjaMask(ctx, x, y, r);
  if (charId === "alien" && skinId === "antenna") _alienAntenna(ctx, x, y, r);
  if (charId === "tortuga" && skinId === "shell") _turtleShell(ctx, x, y, r);
  if (charId === "rocket" && skinId === "rocket")
    _rocketDecoration(ctx, x, y, r, "above", angle);
  if (charId === "hotpotato" && skinId === "potato") _potatoSkin(ctx, x, y, r);
  if (charId === "electric" && skinId === "chispas")
    _electricSparks(ctx, x, y, r);
  if (charId === "volcano" && skinId === "brasas") _volcanoBrasas(ctx, x, y, r);
  if (charId === "chess" && skinId === "tablero") _chessBoard(ctx, x, y, r);
  if (charId === "cursedwall" && skinId === "ladrillos")
    _brickWall(ctx, x, y, r);
  if (charId === "apostador" && skinId === "traje")
    _apostadorTraje(ctx, x, y, r);
  if (charId === "glass"    && skinId === "liquidglass") _liquidGlass(ctx, x, y, r);
  if (charId === "spider"   && skinId === "viudanegra")  _blackWidowMark(ctx, x, y, r);
  if (charId === "laser"    && skinId === "neon")        _neonBorder(ctx, x, y, r);
  if (charId === "karma"    && skinId === "yinyang")     _yinYang(ctx, x, y, r);
  if (charId === "diminuto" && skinId === "atomo")       _atomOrbits(ctx, x, y, r);
  if (charId === "pulsar"      && skinId === "quasar")       _pulsarQuasarAbove(ctx, x, y, r);
  if (charId === "serpiente"   && skinId === "cascabel")     _cascabelAbove(ctx, x, y, r);
  if (charId === "earthquake"  && skinId === "tectonico")    _tectonicAbove(ctx, x, y, r);
  if (charId === "caballero"   && skinId === "eclipse")      _eclipseAbove(ctx, x, y, r);
  if (charId === "parasite"    && skinId === "simbionte")    _simbionteAbove(ctx, x, y, r);
  if (charId === "turret"      && skinId === "mech")         _mechAbove(ctx, x, y, r);
  if (charId === "portal"      && skinId === "singularidad") _singularidadAbove(ctx, x, y, r);
  if (charId === "clock"       && skinId === "cronos")       _cronosAbove(ctx, x, y, r);
  if (charId === "crystalbeam" && skinId === "prisma")       _prismaAbove(ctx, x, y, r);
}

// Renders a full character circle preview onto a canvas element.
// opts: { rScale = 0.27, yScale = 0.6 } — scale factors for radius/y-center
export function drawCharPreview(canvas, meta, skinId = "default", opts = {}) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const skins = getSkinsFor(meta.id);
  const skin = skins?.find((s) => s.id === skinId);
  const color = skin?.color ?? meta.color;

  const r = Math.round(Math.min(W, H) * (opts.rScale ?? 0.27));
  const x = Math.round(W * 0.5);
  const y = Math.round(H * (opts.yScale ?? 0.6));

  const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.8);
  const glowStop = color.startsWith("rgba(")
    ? color.replace(/,\s*[\d.]+\)$/, ", 0.28)")
    : `${color}55`;
  glow.addColorStop(0, glowStop);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  drawSkinDecorationBelow(ctx, x, y, r, meta.id, skinId);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.font = `${Math.round(r * 0.72)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillText(meta.icon, x, y);
  ctx.restore();

  drawSkinDecorationAbove(ctx, x, y, r, meta.id, skinId);

  // Saiyan aura preview (only in modal/chest preview, not in-game)
  if (meta.id === "momentum" && skinId === "saiyan")
    _saiyanPreview(ctx, x, y, r);

  // Saw needs preview rendering (rotation is handled by SawPower in-game)
  if (meta.id === "saw") {
    const teeth = 14;
    const toothH = r * 0.26;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a1 = (i / teeth) * Math.PI * 2;
      const amid = ((i + 0.5) / teeth) * Math.PI * 2;
      const a2 = ((i + 1) / teeth) * Math.PI * 2;
      const p1x = Math.cos(a1) * r,
        p1y = Math.sin(a1) * r;
      const pmx = Math.cos(amid) * (r + toothH),
        pmy = Math.sin(amid) * (r + toothH);
      const p2x = Math.cos(a2) * r,
        p2y = Math.sin(a2) * r;
      if (i === 0) ctx.moveTo(p1x, p1y);
      else ctx.lineTo(p1x, p1y);
      ctx.lineTo(pmx, pmy);
      ctx.lineTo(p2x, p2y);
    }
    ctx.closePath();
    if (skinId === "metalica") {
      ctx.fillStyle = "rgba(200,200,200,0.72)";
      ctx.fill();
      ctx.strokeStyle = "rgba(80,80,80,0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = "rgba(80,80,80,0.45)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
        ctx.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(60,60,60,0.7)";
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(210,210,210,0.88)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }
}
