const LS_ARENA_SKIN = 'arena_skin_selected';

export const ARENA_SKINS = [
  {
    id: 'default', name: 'Clásico',
    bg: '#0d1119', bgGrad: null,
    gridColor: 'rgba(255,255,255,0.03)', gridStyle: 'square',
    borderColor: '#273047', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(80,115,185,0.25)', obsOuter: 'rgba(40,60,110,0.45)',
    obsRing: 'rgba(100,145,215,0.45)', obsGlow: false,
  },
  {
    id: 'crepusculo', name: 'Crepúsculo',
    bg: '#130a1a', bgGrad: ['#130a1a', '#1f0d0d'],
    gridColor: 'rgba(200,100,255,0.04)', gridStyle: 'square',
    borderColor: '#7a2fa0', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(160,60,220,0.3)', obsOuter: 'rgba(80,20,120,0.55)',
    obsRing: 'rgba(180,80,240,0.55)', obsGlow: false,
  },
  {
    id: 'sangre', name: 'Sangre',
    bg: '#120606', bgGrad: ['#120606', '#1a0a08'],
    gridColor: 'rgba(255,60,60,0.04)', gridStyle: 'square',
    borderColor: '#6b1515', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(200,40,40,0.28)', obsOuter: 'rgba(100,15,15,0.55)',
    obsRing: 'rgba(220,50,50,0.5)', obsGlow: false,
  },
  {
    id: 'abismo', name: 'Abismo',
    bg: '#040e10', bgGrad: null,
    gridColor: 'rgba(0,200,210,0.04)', gridStyle: 'square',
    borderColor: '#0d4a52', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(0,180,200,0.2)', obsOuter: 'rgba(0,80,100,0.5)',
    obsRing: 'rgba(0,210,230,0.45)', obsGlow: false,
  },
  {
    id: 'neon_azul', name: 'Neón Azul',
    bg: '#030810', bgGrad: null,
    gridColor: 'rgba(0,220,255,0.07)', gridStyle: 'square',
    borderColor: '#00e5ff', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(0,180,255,0.2)', obsOuter: 'rgba(0,60,100,0.55)',
    obsRing: 'rgba(0,220,255,0.8)', obsGlow: true,
  },
  {
    id: 'neon_rosa', name: 'Neón Rosa',
    bg: '#0d030e', bgGrad: null,
    gridColor: 'rgba(255,0,180,0.07)', gridStyle: 'square',
    borderColor: '#ff00cc', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(255,0,180,0.2)', obsOuter: 'rgba(100,0,80,0.55)',
    obsRing: 'rgba(255,0,200,0.8)', obsGlow: true,
  },
  {
    id: 'neon_verde', name: 'Neón Verde',
    bg: '#030e05', bgGrad: null,
    gridColor: 'rgba(0,255,80,0.07)', gridStyle: 'square',
    borderColor: '#00ff55', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(0,220,70,0.2)', obsOuter: 'rgba(0,80,25,0.55)',
    obsRing: 'rgba(0,255,80,0.8)', obsGlow: true,
  },
  {
    id: 'hexagrid', name: 'Hexagrid',
    bg: '#080c14', bgGrad: null,
    gridColor: 'rgba(100,160,255,0.16)', gridStyle: 'hex',
    borderColor: '#2a4080', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(60,110,200,0.25)', obsOuter: 'rgba(30,55,120,0.55)',
    obsRing: 'rgba(80,140,240,0.5)', obsGlow: false,
  },
  {
    id: 'circuitos', name: 'Circuitos',
    bg: '#060c0a', bgGrad: null,
    gridColor: 'rgba(0,200,120,0.18)', gridStyle: 'circuit',
    borderColor: '#0d4a30', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(0,180,100,0.2)', obsOuter: 'rgba(0,70,40,0.55)',
    obsRing: 'rgba(0,220,130,0.5)', obsGlow: false,
  },
  {
    id: 'nebulosa', name: 'Nebulosa',
    bg: '#07050f', bgGrad: ['#07050f', '#0d0820'],
    gridColor: 'rgba(200,150,255,0.65)', gridStyle: 'dots',
    borderColor: '#4a2080', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(140,80,255,0.25)', obsOuter: 'rgba(60,20,120,0.55)',
    obsRing: 'rgba(160,100,255,0.5)', obsGlow: false,
  },
  {
    id: 'dorado', name: 'Dorado',
    bg: '#0e0a02', bgGrad: ['#0e0a02', '#150f04'],
    gridColor: 'rgba(255,210,50,0.05)', gridStyle: 'square',
    borderColor: '#8a6a00', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(220,180,30,0.25)', obsOuter: 'rgba(100,75,0,0.55)',
    obsRing: 'rgba(240,200,50,0.5)', obsGlow: false,
  },
  {
    id: 'lava', name: 'Lava',
    bg: '#0f0600', bgGrad: ['#0f0600', '#180800'],
    gridColor: 'rgba(255,100,0,0.06)', gridStyle: 'square',
    borderColor: '#7a3000', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(255,100,0,0.3)', obsOuter: 'rgba(120,40,0,0.6)',
    obsRing: 'rgba(255,130,20,0.6)', obsGlow: true,
  },
  {
    id: 'tormenta', name: 'Tormenta',
    bg: '#060a12', bgGrad: ['#060a12', '#0a0f1c'],
    gridColor: 'rgba(180,210,255,0.09)', gridStyle: 'diag',
    borderColor: '#3a6aaa', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(160,200,255,0.22)', obsOuter: 'rgba(30,60,120,0.6)',
    obsRing: 'rgba(140,190,255,0.75)', obsGlow: true,
  },
  {
    id: 'esmeralda', name: 'Esmeralda',
    bg: '#030f08', bgGrad: ['#030f08', '#051409'],
    gridColor: 'rgba(0,255,140,0.12)', gridStyle: 'hex',
    borderColor: '#1a6640', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(0,200,100,0.28)', obsOuter: 'rgba(0,70,35,0.6)',
    obsRing: 'rgba(0,230,120,0.6)', obsGlow: false,
  },
];

export function getSelectedArenaSkinId() {
  return localStorage.getItem(LS_ARENA_SKIN) ?? 'default';
}
export function setSelectedArenaSkinId(id) {
  localStorage.setItem(LS_ARENA_SKIN, id);
}
export function getArenaSkinById(id) {
  return ARENA_SKINS.find(s => s.id === id) ?? ARENA_SKINS[0];
}

function _drawGrid(ctx, x, y, w, h, skin) {
  ctx.save();
  ctx.strokeStyle = skin.gridColor;
  ctx.lineWidth = 1;

  if (skin.gridStyle === 'square') {
    const step = Math.max(w, h) / 7;
    for (let gx = x + step; gx < x + w; gx += step) {
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
    }
    for (let gy = y + step; gy < y + h; gy += step) {
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
    }

  } else if (skin.gridStyle === 'hex') {
    // Pointy-top hexagons tiled over the arena
    const R  = Math.max(w, h) / 9;
    const hw = Math.sqrt(3) * R;
    const rh = R * 1.5;
    ctx.beginPath();
    for (let row = -1; row * rh < h + R * 2; row++) {
      const off = (row % 2 !== 0) ? hw / 2 : 0;
      for (let col = -1; col * hw < w + hw; col++) {
        const cx = x + col * hw + off;
        const cy = y + row * rh;
        for (let i = 0; i < 6; i++) {
          const a  = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + R * Math.cos(a);
          const py = cy + R * Math.sin(a);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
    }
    ctx.stroke();

  } else if (skin.gridStyle === 'circuit') {
    const step = Math.max(w, h) / 7;
    // Thin verticals
    ctx.lineWidth = 0.5;
    for (let gx = x + step; gx < x + w; gx += step) {
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
    }
    // Horizontals — alternating thickness
    let row = 0;
    for (let gy = y + step; gy < y + h; gy += step) {
      ctx.lineWidth = (row % 2 === 0) ? 1.5 : 0.5;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
      row++;
    }
    // Nodes at intersections
    ctx.fillStyle = skin.gridColor;
    for (let gx = x + step; gx < x + w; gx += step) {
      for (let gy = y + step; gy < y + h; gy += step) {
        ctx.beginPath(); ctx.arc(gx, gy, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

  } else if (skin.gridStyle === 'diag') {
    // Diagonal cross-hatch lines
    const step = Math.max(w, h) / 8;
    ctx.lineWidth = 0.8;
    for (let d = -(h); d < w + h; d += step) {
      ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + h, y + h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + d + h, y); ctx.lineTo(x + d, y + h); ctx.stroke();
    }

  } else if (skin.gridStyle === 'dots') {
    // Star field — deterministic dots via sin-hash
    ctx.fillStyle = skin.gridColor;
    const spacing = Math.max(w, h) / 11;
    for (let gx = x + spacing * 0.5; gx < x + w; gx += spacing) {
      for (let gy = y + spacing * 0.5; gy < y + h; gy += spacing) {
        const h1 = Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453;
        const h2 = Math.sin(gx * 269.5 + gy * 183.3) * 43758.5453;
        const h3 = Math.sin(gx * 91.3  + gy * 57.7)  * 43758.5453;
        const ox   = (h1 - Math.floor(h1) - 0.5) * spacing * 0.8;
        const oy   = (h2 - Math.floor(h2) - 0.5) * spacing * 0.8;
        const size = 0.6 + (h3 - Math.floor(h3)) * 1.4;
        ctx.beginPath(); ctx.arc(gx + ox, gy + oy, size, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  ctx.restore();
}

export function drawArenaBg(ctx, x, y, w, h, skinId) {
  const skin = getArenaSkinById(skinId);

  // Background fill / gradient
  if (skin.bgGrad) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, skin.bgGrad[0]);
    grad.addColorStop(1, skin.bgGrad[1]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = skin.bg;
  }
  ctx.fillRect(x, y, w, h);

  // Grid / pattern
  _drawGrid(ctx, x, y, w, h, skin);

  // Border (with optional glow)
  ctx.save();
  if (skin.borderGlow) {
    ctx.shadowColor = skin.borderColor;
    ctx.shadowBlur  = 14;
  }
  ctx.strokeStyle = skin.borderColor;
  ctx.lineWidth   = skin.borderWidth;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export function drawArenaObstacle(ctx, cx, cy, r, skinId) {
  const skin = getArenaSkinById(skinId);

  ctx.save();
  if (skin.obsGlow) {
    ctx.shadowColor = skin.obsRing;
    ctx.shadowBlur  = 12;
  }
  const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
  grad.addColorStop(0, skin.obsInner);
  grad.addColorStop(1, skin.obsOuter);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = skin.obsRing;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Inner highlight (subtle top-left glint)
  ctx.beginPath();
  ctx.arc(cx - r * 0.22, cy - r * 0.22, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
}
