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
  ctx.restore();

  // Two ribbon tails on the right side
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = r * 0.15;
  ctx.strokeStyle = "#111111";
  ctx.beginPath();
  ctx.moveTo(x + r * 0.92, slitY - r * 0.09);
  ctx.bezierCurveTo(
    x + r * 1.3,
    slitY - r * 0.12,
    x + r * 1.45,
    slitY - r * 0.32,
    x + r * 1.22,
    slitY - r * 0.56,
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + r * 0.92, slitY + r * 0.09);
  ctx.bezierCurveTo(
    x + r * 1.3,
    slitY + r * 0.14,
    x + r * 1.42,
    slitY + r * 0.42,
    x + r * 1.18,
    slitY + r * 0.64,
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
  if (charId === "glass"   && skinId === "liquidglass")  _liquidGlass(ctx, x, y, r);
  if (charId === "spider"  && skinId === "viudanegra")   _blackWidowMark(ctx, x, y, r);
  if (charId === "laser"   && skinId === "neon")         _neonBorder(ctx, x, y, r);
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
