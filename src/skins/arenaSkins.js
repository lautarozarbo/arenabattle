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
    gridColor: 'rgba(0,200,120,0.18)', gridStyle: 'circuit', animated: true,
    borderColor: '#0d4a30', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(0,180,100,0.2)', obsOuter: 'rgba(0,70,40,0.55)',
    obsRing: 'rgba(0,220,130,0.5)', obsGlow: false,
  },
  {
    id: 'nebulosa', name: 'Nebulosa',
    bg: '#07050f', bgGrad: ['#07050f', '#0d0820'],
    gridColor: 'rgba(200,150,255,0.65)', gridStyle: 'stardust', animated: true,
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
  {
    id: 'ajedrez', name: 'Ajedrez',
    bg: '#2c1a0a', bgGrad: null,
    gridColor: 'rgba(195,150,80,0.88)', gridStyle: 'chess',
    borderColor: '#6b4820', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(200,200,200,0.18)', obsOuter: 'rgba(70,70,70,0.55)',
    obsRing: 'rgba(180,180,180,0.45)', obsGlow: false,
  },
  {
    id: 'ladrillos', name: 'Ladrillos',
    bg: '#0e0703', bgGrad: ['#0e0703', '#160b04'],
    gridColor: 'rgba(210,140,70,0.25)', gridStyle: 'bricks',
    borderColor: '#7a3d10', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(200,110,40,0.3)', obsOuter: 'rgba(100,45,10,0.6)',
    obsRing: 'rgba(220,130,50,0.55)', obsGlow: false,
  },
  {
    id: 'ondas', name: 'Ondas',
    bg: '#030c14', bgGrad: ['#030c14', '#050f1a'],
    gridColor: 'rgba(30,180,255,0.2)', gridStyle: 'waves',
    borderColor: '#0a4d7a', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(20,160,240,0.25)', obsOuter: 'rgba(5,60,110,0.6)',
    obsRing: 'rgba(30,190,255,0.55)', obsGlow: false,
  },
  {
    id: 'voragine', name: 'Espiral',
    bg: '#060410', bgGrad: ['#060410', '#0b0620'],
    gridColor: 'rgba(120,80,255,0.15)', gridStyle: 'vortex', animated: true,
    borderColor: '#3a1880', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(100,60,220,0.25)', obsOuter: 'rgba(40,15,100,0.65)',
    obsRing: 'rgba(140,90,255,0.65)', obsGlow: true,
  },
  {
    id: 'aurora', name: 'Aurora',
    bg: '#020b0d', bgGrad: ['#020b0d', '#040e10'],
    gridColor: 'rgba(0,220,160,0.12)', gridStyle: 'aurora', animated: true,
    borderColor: '#0d4a3a', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(0,180,130,0.22)', obsOuter: 'rgba(0,60,50,0.60)',
    obsRing: 'rgba(0,210,150,0.50)', obsGlow: false,
  },
  {
    id: 'pulso', name: 'Pulso',
    bg: '#020810', bgGrad: null,
    gridColor: 'rgba(0,200,255,0.12)', gridStyle: 'pulso', animated: true,
    borderColor: '#007aaa', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(0,180,240,0.20)', obsOuter: 'rgba(0,55,100,0.60)',
    obsRing: 'rgba(0,210,255,0.70)', obsGlow: true,
  },
  {
    id: 'lluvia', name: 'Lluvia',
    bg: '#060810', bgGrad: ['#060810', '#0a0d18'],
    gridColor: 'rgba(140,180,255,0.10)', gridStyle: 'lluvia', animated: true,
    borderColor: '#253550', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(100,140,200,0.20)', obsOuter: 'rgba(30,50,90,0.60)',
    obsRing: 'rgba(120,165,230,0.50)', obsGlow: false,
  },
  {
    id: 'rayo', name: 'Rayo',
    bg: '#04060e', bgGrad: ['#04060e', '#080a18'],
    gridColor: 'rgba(180,210,255,0.10)', gridStyle: 'rayo', animated: true,
    borderColor: '#2a4aaa', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(120,160,255,0.22)', obsOuter: 'rgba(30,50,130,0.65)',
    obsRing: 'rgba(150,190,255,0.65)', obsGlow: true,
  },
  {
    id: 'cosmos', name: 'Cosmos',
    bg: '#020207', bgGrad: ['#020207', '#050210'],
    gridColor: 'rgba(200,215,255,0.10)', gridStyle: 'cosmos', animated: true,
    borderColor: '#1a1440', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(80,70,160,0.22)', obsOuter: 'rgba(20,15,60,0.65)',
    obsRing: 'rgba(100,90,200,0.50)', obsGlow: false,
  },
  {
    id: 'magma', name: 'Magma',
    bg: '#0c0400', bgGrad: ['#0c0400', '#180600'],
    gridColor: 'rgba(255,80,0,0.18)', gridStyle: 'magma', animated: true,
    borderColor: '#8a3000', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(255,90,10,0.35)', obsOuter: 'rgba(140,30,0,0.65)',
    obsRing: 'rgba(255,120,20,0.75)', obsGlow: true,
  },
  {
    id: 'matrix', name: 'Matrix',
    bg: '#000a00', bgGrad: null,
    gridColor: 'rgba(0,220,80,0.15)', gridStyle: 'matrix', animated: true,
    borderColor: '#004400', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(0,180,60,0.22)', obsOuter: 'rgba(0,60,20,0.60)',
    obsRing: 'rgba(0,220,80,0.75)', obsGlow: true,
  },
  {
    id: 'cristal_arena', name: 'Cristal',
    bg: '#040810', bgGrad: ['#040810', '#060c18'],
    gridColor: 'rgba(140,200,255,0.15)', gridStyle: 'cristal', animated: true,
    borderColor: '#1a4a80', borderWidth: 3, borderGlow: false,
    obsInner: 'rgba(100,180,255,0.28)', obsOuter: 'rgba(20,60,140,0.65)',
    obsRing: 'rgba(140,210,255,0.65)', obsGlow: false,
  },
  {
    id: 'vacio', name: 'Vacío',
    bg: '#010008', bgGrad: ['#010008', '#020010'],
    gridColor: 'rgba(100,0,200,0.12)', gridStyle: 'void', animated: true,
    borderColor: '#3a008a', borderWidth: 3, borderGlow: true,
    obsInner: 'rgba(80,0,160,0.28)', obsOuter: 'rgba(20,0,60,0.70)',
    obsRing: 'rgba(120,0,220,0.65)', obsGlow: true,
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
export function isAnimatedArenaSkin(id) {
  return !!(getArenaSkinById(id).animated);
}

function _drawGrid(ctx, x, y, w, h, skin, t = 0) {
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
    const step     = Math.max(w, h) / 7;
    const pulseLen = step * 0.65;

    // Static grid
    ctx.lineWidth = 0.5;
    for (let gx = x + step; gx < x + w; gx += step) {
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
    }
    let row = 0;
    for (let gy = y + step; gy < y + h; gy += step) {
      ctx.lineWidth = (row % 2 === 0) ? 1.5 : 0.5;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
      row++;
    }
    ctx.fillStyle = skin.gridColor;
    for (let gx = x + step; gx < x + w; gx += step) {
      for (let gy = y + step; gy < y + h; gy += step) {
        ctx.beginPath(); ctx.arc(gx, gy, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Animated data pulses along horizontal lines
    let hRow = 0;
    for (let gy = y + step; gy < y + h; gy += step) {
      const s1    = hRow * 17.3;
      const hph   = Math.sin(s1 * 127.1) * 43758.5453;
      const hspd  = Math.sin(s1 * 311.7 + 3.1) * 43758.5453;
      const phase = (hph  - Math.floor(hph))  * (w + pulseLen);
      const speed = 45 + (hspd - Math.floor(hspd)) * 60;
      const px    = x - pulseLen + ((t * speed + phase) % (w + pulseLen));
      const x1    = Math.max(x, px);
      const x2    = Math.min(x + w, px + pulseLen);
      if (x2 > x1) {
        ctx.shadowColor = 'rgba(0,255,140,0.8)';
        ctx.shadowBlur  = 7;
        ctx.strokeStyle = 'rgba(0,255,140,0.90)';
        ctx.lineWidth   = (hRow % 2 === 0) ? 2.0 : 1.0;
        ctx.beginPath(); ctx.moveTo(x1, gy); ctx.lineTo(x2, gy); ctx.stroke();
      }
      hRow++;
    }

    // Animated data pulses along vertical lines
    let vCol = 0;
    for (let gx = x + step; gx < x + w; gx += step) {
      const s2    = vCol * 23.7 + 100;
      const hph   = Math.sin(s2 * 127.1) * 43758.5453;
      const hspd  = Math.sin(s2 * 311.7 + 7.3) * 43758.5453;
      const phase = (hph  - Math.floor(hph))  * (h + pulseLen);
      const speed = 38 + (hspd - Math.floor(hspd)) * 50;
      const py    = y - pulseLen + ((t * speed + phase) % (h + pulseLen));
      const y1    = Math.max(y, py);
      const y2    = Math.min(y + h, py + pulseLen);
      if (y2 > y1) {
        ctx.shadowColor = 'rgba(0,255,140,0.6)';
        ctx.shadowBlur  = 5;
        ctx.strokeStyle = 'rgba(0,255,140,0.70)';
        ctx.lineWidth   = 0.9;
        ctx.beginPath(); ctx.moveTo(gx, y1); ctx.lineTo(gx, y2); ctx.stroke();
      }
      vCol++;
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;

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

  } else if (skin.gridStyle === 'chess') {
    // Checkerboard — alternating filled squares
    const step = Math.min(w, h) / 8;
    ctx.fillStyle = skin.gridColor;
    for (let row = 0; row * step < h; row++) {
      for (let col = 0; col * step < w; col++) {
        if ((row + col) % 2 === 0) {
          ctx.fillRect(x + col * step, y + row * step,
            Math.min(step, x + w - (x + col * step)),
            Math.min(step, y + h - (y + row * step)));
        }
      }
    }

  } else if (skin.gridStyle === 'bricks') {
    // Brick wall — offset rows of rectangles
    const bw = w / 4;
    const bh = bw * 0.42;
    ctx.strokeStyle = skin.gridColor;
    ctx.lineWidth = 1.5;
    for (let row = 0; row * bh < h + bh; row++) {
      const off = (row % 2 === 0) ? 0 : bw / 2;
      const gy  = y + row * bh;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
      for (let col = 0; col * bw < w + bw; col++) {
        const gx = x + col * bw - off;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, Math.min(gy + bh, y + h)); ctx.stroke();
      }
    }

  } else if (skin.gridStyle === 'waves') {
    // Horizontal sine waves
    const count  = 7;
    const spacingW = h / count;
    const amp    = spacingW * 0.38;
    ctx.strokeStyle = skin.gridColor;
    ctx.lineWidth   = 1.5;
    for (let i = 0; i <= count; i++) {
      const cy = y + i * spacingW;
      ctx.beginPath();
      for (let px = 0; px <= w; px += 3) {
        const py = cy + Math.sin((px / w) * Math.PI * 5) * amp;
        px === 0 ? ctx.moveTo(x + px, py) : ctx.lineTo(x + px, py);
      }
      ctx.stroke();
    }

  } else if (skin.gridStyle === 'vortex') {
    // Rotating concentric arc rings — cosmic vortex
    const cx   = x + w / 2;
    const cy   = y + h / 2;
    const maxR = Math.min(w, h) * 0.52;
    const rings = 10;

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    // Faint pulsing center glow
    const glowR = maxR * (0.28 + Math.sin(t * 0.9) * 0.04);
    const grd   = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    grd.addColorStop(0, 'rgba(100,60,255,0.10)');
    grd.addColorStop(1, 'rgba(100,60,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, w, h);

    for (let i = 1; i <= rings; i++) {
      const frac   = i / rings;
      const r      = maxR * frac;
      const speed  = 0.22 * (1 - frac * 0.65); // inner rings rotate faster
      const angle  = t * speed * Math.PI * 2;
      const arc1   = Math.PI * (0.5 + frac * 0.25);
      const arc2   = arc1 * 0.55;
      const alpha1 = 0.07 + frac * 0.14;
      const lw     = 0.7 + frac * 1.6;

      // Primary arc — purple
      ctx.beginPath();
      ctx.arc(cx, cy, r, angle, angle + arc1);
      ctx.strokeStyle = `rgba(130,70,255,${alpha1})`;
      ctx.lineWidth   = lw;
      ctx.stroke();

      // Opposing arc — cyan
      ctx.beginPath();
      ctx.arc(cx, cy, r, angle + Math.PI, angle + Math.PI + arc2);
      ctx.strokeStyle = `rgba(50,180,255,${alpha1 * 0.65})`;
      ctx.lineWidth   = lw * 0.55;
      ctx.stroke();
    }
    ctx.restore();

  } else if (skin.gridStyle === 'aurora') {
    // Northern lights — undulating horizontal bands shifting in color
    const bands = 6;
    const bandH = h / bands;

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    for (let i = 0; i < bands; i++) {
      const hue  = ((i / bands) * 140 + t * 7) % 360; // shifts green → cyan → violet
      const cy   = y + (i + 0.5) * bandH;
      const amp  = bandH * 0.45;
      const phase = t * 0.35 + i * 1.1;

      // Filled wavy band
      ctx.beginPath();
      for (let px = 0; px <= w; px += 4) {
        const wave = Math.sin((px / w) * Math.PI * 3.5 + phase) * amp * 0.55;
        const py   = cy - amp * 0.3 + wave;
        px === 0 ? ctx.moveTo(x + px, py) : ctx.lineTo(x + px, py);
      }
      for (let px = w; px >= 0; px -= 4) {
        const wave = Math.sin((px / w) * Math.PI * 3.5 + phase + 0.6) * amp * 0.55;
        const py   = cy + amp * 0.3 + wave;
        ctx.lineTo(x + px, py);
      }
      ctx.closePath();
      const pulse = 0.05 + Math.sin(t * 0.6 + i * 0.9) * 0.025;
      ctx.fillStyle = `hsla(${hue},80%,62%,${pulse})`;
      ctx.fill();

      // Bright edge line
      ctx.beginPath();
      for (let px = 0; px <= w; px += 3) {
        const py = cy + Math.sin((px / w) * Math.PI * 3.5 + phase) * amp;
        px === 0 ? ctx.moveTo(x + px, py) : ctx.lineTo(x + px, py);
      }
      const lineAlpha = 0.07 + Math.sin(t * 0.8 + i * 1.3) * 0.04;
      ctx.strokeStyle = `hsla(${hue},90%,75%,${lineAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

  } else if (skin.gridStyle === 'pulso') {
    // Sonar pulses expanding from center
    const cx    = x + w / 2;
    const cy    = y + h / 2;
    const maxR  = Math.min(w, h) * 0.54;
    const count = 5;

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    // Faint center glow
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.18);
    grd.addColorStop(0, 'rgba(0,210,255,0.12)');
    grd.addColorStop(1, 'rgba(0,210,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, w, h);

    for (let i = 0; i < count; i++) {
      const phase = (t * 0.32 + i / count) % 1; // 0..1 lifecycle
      const r     = phase * maxR;
      const alpha = (1 - phase) * 0.28;
      const lw    = (1 - phase) * 2.8 + 0.4;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,210,255,${alpha})`;
      ctx.lineWidth   = lw;
      ctx.stroke();
    }
    ctx.restore();

  } else if (skin.gridStyle === 'lluvia') {
    // Diagonal rain streaks
    const count = 65;
    const driftPerH = w * 0.25; // how far right-to-left across full height

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    for (let i = 0; i < count; i++) {
      const hx = Math.sin(i * 127.1) * 43758.5453;
      const hy = Math.sin(i * 311.7 + 19.3) * 43758.5453;
      const hs = Math.sin(i * 91.3  + 7.1)  * 43758.5453;
      const hv = Math.sin(i * 57.3  + 2.7)  * 43758.5453;

      const fx    = hx - Math.floor(hx);
      const fy0   = hy - Math.floor(hy);
      const len   = 10 + (hs - Math.floor(hs)) * 22;
      const speed = 150 + (hv - Math.floor(hv)) * 130;
      const alpha = 0.10 + (hs - Math.floor(hs)) * 0.22;

      const travel  = h + len;
      const elapsed = (t * speed + fy0 * travel) % travel;
      const py_bot  = y + elapsed;       // leading (bottom) edge of streak
      const py_top  = py_bot - len;

      if (py_top > y + h || py_bot < y) continue;

      const progress = elapsed / travel;
      const px = x + fx * w - progress * driftPerH; // drifts slightly sideways

      ctx.beginPath();
      ctx.moveTo(px, py_top);
      ctx.lineTo(px + driftPerH * (len / travel), py_bot);
      ctx.strokeStyle = `rgba(150,195,255,${alpha})`;
      ctx.lineWidth   = 0.9;
      ctx.stroke();
    }
    ctx.restore();

  } else if (skin.gridStyle === 'rayo') {
    // Lightning bolts that flash with random zigzag paths
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    const boltCount = 5;
    for (let i = 0; i < boltCount; i++) {
      // Each bolt has a seeded frequency and phase so they flash independently
      const hf  = Math.sin(i * 127.1) * 43758.5453;
      const hph = Math.sin(i * 311.7 + 19.3) * 43758.5453;
      const hx  = Math.sin(i * 91.3  + 7.1)  * 43758.5453;

      const freq    = 0.6 + (hf  - Math.floor(hf))  * 0.8; // how often it flashes
      const phase   = (hph - Math.floor(hph)) * 100;
      const xFrac   = (hx  - Math.floor(hx));

      // Bolt is visible when the fractional part of (t*freq + phase) is within a small window
      const frac = ((t * freq + phase) % 1 + 1) % 1;
      if (frac > 0.12) continue; // only visible 12% of its cycle

      const brightness = 1 - frac / 0.12; // bright at start, fades quickly

      // Build zigzag path from top to bottom at xFrac * w, using i as seed
      const bx     = x + xFrac * w;
      const steps  = 7;
      const stepH  = h / steps;

      ctx.shadowColor = `rgba(180,210,255,${brightness * 0.9})`;
      ctx.shadowBlur  = 18;
      ctx.strokeStyle = `rgba(210,230,255,${brightness * 0.95})`;
      ctx.lineWidth   = 1.5 + brightness * 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, y);

      for (let s = 1; s <= steps; s++) {
        // Zigzag offset seeded per bolt+step
        const hzx = Math.sin((i * 100 + s) * 57.3) * 43758.5453;
        const oz  = ((hzx - Math.floor(hzx)) - 0.5) * w * 0.18;
        ctx.lineTo(bx + oz, y + s * stepH);
      }
      ctx.stroke();

      // Bright core (thin white line on top)
      ctx.shadowBlur  = 4;
      ctx.strokeStyle = `rgba(255,255,255,${brightness * 0.7})`;
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      for (let s = 1; s <= steps; s++) {
        const hzx = Math.sin((i * 100 + s) * 57.3) * 43758.5453;
        const oz  = ((hzx - Math.floor(hzx)) - 0.5) * w * 0.18;
        ctx.lineTo(bx + oz, y + s * stepH);
      }
      ctx.stroke();
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.restore();

  } else if (skin.gridStyle === 'cosmos') {
    // Multi-layer parallax star field
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    const layers = [
      { count: 14, speed: 3,  size: 1.9, opacity: 0.65, twinkle: true  },
      { count: 35, speed: 9,  size: 1.1, opacity: 0.42, twinkle: false },
      { count: 65, speed: 24, size: 0.55, opacity: 0.28, twinkle: false },
    ];

    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      for (let i = 0; i < layer.count; i++) {
        const seed  = li * 1000 + i;
        const hx    = Math.sin(seed * 127.1) * 43758.5453;
        const hy    = Math.sin(seed * 311.7 + 19.3) * 43758.5453;
        const hp    = Math.sin(seed * 91.3  + 7.1)  * 43758.5453;

        const fy    = hy - Math.floor(hy);
        const fx0   = hx - Math.floor(hx);
        const phase = (hp - Math.floor(hp)) * Math.PI * 2;

        const fx    = ((fx0 + (t * layer.speed) / w) % 1 + 1) % 1;

        let alpha = layer.opacity;
        if (layer.twinkle) alpha *= 0.4 + Math.sin(t * 2.5 + phase) * 0.6;

        ctx.beginPath();
        ctx.arc(x + fx * w, y + fy * h, layer.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(215,225,255,${alpha})`;
        ctx.fill();
      }
    }
    ctx.restore();

  } else if (skin.gridStyle === 'stardust') {
    // Rising stardust particles — purple/violet cosmic variant of embers
    const count = 80;

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    // Subtle violet glow from below
    const sdGrd = ctx.createLinearGradient(x, y + h, x, y + h * 0.5);
    sdGrd.addColorStop(0, 'rgba(120,50,220,0.08)');
    sdGrd.addColorStop(1, 'rgba(120,50,220,0)');
    ctx.fillStyle = sdGrd;
    ctx.fillRect(x, y, w, h);

    for (let i = 0; i < count; i++) {
      const hx = Math.sin(i * 127.1) * 43758.5453;
      const hy = Math.sin(i * 311.7 + 19.3) * 43758.5453;
      const hs = Math.sin(i * 91.3  + 7.1)  * 43758.5453;
      const hv = Math.sin(i * 57.3  + 2.7)  * 43758.5453;
      const hd = Math.sin(i * 231.1 + 41.3) * 43758.5453;
      const hc = Math.sin(i * 173.5 + 31.7) * 43758.5453;

      const fx    = hx - Math.floor(hx);
      const fy0   = hy - Math.floor(hy);
      const size  = 0.5 + (hs - Math.floor(hs)) * 1.8;
      const speed = 12 + (hv - Math.floor(hv)) * 25;
      const drift = ((hd - Math.floor(hd)) - 0.5) * 8;
      const colorT = hc - Math.floor(hc); // 0=violet, 1=cyan

      const elapsed  = (t * speed + fy0 * h) % h;
      const py       = y + h - elapsed;
      if (py < y || py > y + h) continue;

      const progress = elapsed / h;
      const alpha    = (1 - progress * 0.80) * 0.80;
      const r = Math.round(140 + colorT * 80);   // 140..220
      const g = Math.round(60  + colorT * 100);  // 60..160
      const b = 255;

      ctx.beginPath();
      ctx.arc(x + fx * w + drift * progress, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();
    }
    ctx.restore();

  } else if (skin.gridStyle === 'embers') {
    // Rising ember particles from the arena floor
    const count = 75;

    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    // Warm glow from the bottom
    const emberGrd = ctx.createLinearGradient(x, y + h, x, y + h * 0.55);
    emberGrd.addColorStop(0, 'rgba(200,80,10,0.10)');
    emberGrd.addColorStop(1, 'rgba(200,80,10,0)');
    ctx.fillStyle = emberGrd;
    ctx.fillRect(x, y, w, h);

    for (let i = 0; i < count; i++) {
      const hx = Math.sin(i * 127.1) * 43758.5453;
      const hy = Math.sin(i * 311.7 + 19.3) * 43758.5453;
      const hs = Math.sin(i * 91.3  + 7.1)  * 43758.5453;
      const hv = Math.sin(i * 57.3  + 2.7)  * 43758.5453;
      const hd = Math.sin(i * 231.1 + 41.3) * 43758.5453;

      const fx    = hx - Math.floor(hx);          // x lane 0..1
      const fy0   = hy - Math.floor(hy);          // y phase offset 0..1
      const size  = 0.7 + (hs - Math.floor(hs)) * 2.0;
      const speed = 18 + (hv - Math.floor(hv)) * 30; // px/s
      const drift = ((hd - Math.floor(hd)) - 0.5) * 10;

      const elapsed  = (t * speed + fy0 * h) % h;
      const py       = y + h - elapsed;            // rises bottom → top
      if (py < y || py > y + h) continue;

      const progress = elapsed / h;               // 0 = just born, 1 = top
      const alpha    = (1 - progress * 0.85) * 0.75;
      const g        = Math.round(110 + progress * 90);
      const b        = Math.round(progress * 30);

      ctx.beginPath();
      ctx.arc(x + fx * w + drift * progress, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,${g},${b},${alpha})`;
      ctx.fill();
    }
    ctx.restore();
  } else if (skin.gridStyle === 'magma') {
    // Glowing lava-crack network on dark stone
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    const cracks = 14;
    // Pre-compute crack geometry and glow values
    const crackData = [];
    for (let i = 0; i < cracks; i++) {
      const hx  = Math.sin(i * 127.1) * 43758.5453;
      const hy  = Math.sin(i * 311.7 + 19.3) * 43758.5453;
      const ha  = Math.sin(i * 91.3  + 7.1)  * 43758.5453;
      const hl  = Math.sin(i * 57.3  + 2.7)  * 43758.5453;
      const hph = Math.sin(i * 193.9 + 57.1) * 43758.5453;
      const sx    = x + (hx - Math.floor(hx)) * w;
      const sy    = y + (hy - Math.floor(hy)) * h;
      const angle = (ha - Math.floor(ha)) * Math.PI * 2;
      const len   = 28 + (hl - Math.floor(hl)) * 55;
      const phase = (hph - Math.floor(hph)) * Math.PI * 2;
      const glow  = 0.40 + 0.60 * Math.abs(Math.sin(t * 0.55 + phase));
      const pts = [{ x: sx, y: sy }];
      for (let s = 1; s <= 4; s++) {
        const f   = s / 4;
        const px  = sx + Math.cos(angle) * len * f;
        const py  = sy + Math.sin(angle) * len * f;
        const hzz = Math.sin((i * 100 + s) * 57.3) * 43758.5453;
        const oz  = ((hzz - Math.floor(hzz)) - 0.5) * 16;
        pts.push({ x: px - Math.sin(angle) * oz, y: py + Math.cos(angle) * oz });
      }
      crackData.push({ pts, glow });
    }

    // Pass 1: all outer glows (one shadowBlur state for all 14)
    ctx.shadowColor = 'rgba(255,70,0,0.8)'; ctx.shadowBlur = 12; ctx.lineWidth = 5;
    for (const { pts, glow } of crackData) {
      ctx.strokeStyle = `rgba(255,100,5,${glow * 0.22})`;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p].x, pts[p].y);
      ctx.stroke();
    }
    // Pass 2: all cores (one shadowBlur state for all 14)
    ctx.shadowBlur = 4; ctx.lineWidth = 1.3;
    for (const { pts, glow } of crackData) {
      ctx.strokeStyle = `rgba(255,170,30,${glow * 0.88})`;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p].x, pts[p].y);
      ctx.stroke();
    }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.restore();

  } else if (skin.gridStyle === 'matrix') {
    // Falling digital code columns
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    const cols = 16;
    const colW = w / cols;
    for (let col = 0; col < cols; col++) {
      const hsp  = Math.sin(col * 127.1) * 43758.5453;
      const hph  = Math.sin(col * 311.7 + 19.3) * 43758.5453;
      const hlen = Math.sin(col * 91.3 + 7.1) * 43758.5453;
      const speed    = 40 + (hsp  - Math.floor(hsp))  * 80;
      const phase    = (hph  - Math.floor(hph))  * h;
      const trailLen = 5 + Math.floor((hlen - Math.floor(hlen)) * 8);
      const cx2      = x + col * colW + colW * 0.5;
      const headY    = y + ((t * speed + phase) % (h + trailLen * 14));

      for (let k = 0; k < trailLen; k++) {
        const charY = headY - k * 14;
        if (charY < y - 14 || charY > y + h) continue;
        const fade  = 1 - k / trailLen;
        const alpha = k === 0 ? 0.95 : fade * 0.55;
        const green = k === 0 ? 255 : Math.round(120 + fade * 110);
        ctx.fillStyle = k === 0
          ? `rgba(180,255,200,${alpha})`
          : `rgba(0,${green},0,${alpha})`;
        ctx.fillRect(cx2 - 3.5, charY - 6, 7, 11);
        if (k === 0) {
          ctx.shadowColor = 'rgba(0,255,80,0.9)'; ctx.shadowBlur = 8;
          ctx.fillStyle = 'rgba(180,255,200,0.95)';
          ctx.fillRect(cx2 - 3.5, charY - 6, 7, 11);
          ctx.shadowBlur = 0;
        }
      }
    }
    ctx.restore();

  } else if (skin.gridStyle === 'cristal') {
    // Crystalline diamond shards scattered across the arena with shimmer
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    const shards = 20;
    for (let i = 0; i < shards; i++) {
      const hx  = Math.sin(i * 127.1) * 43758.5453;
      const hy  = Math.sin(i * 311.7 + 19.3) * 43758.5453;
      const hl  = Math.sin(i * 91.3  + 7.1)  * 43758.5453;
      const ha  = Math.sin(i * 57.3  + 2.7)  * 43758.5453;
      const hph = Math.sin(i * 173.5 + 31.7) * 43758.5453;
      const hw  = Math.sin(i * 231.1 + 41.3) * 43758.5453;
      const sx     = x + (hx - Math.floor(hx)) * w;
      const sy     = y + (hy - Math.floor(hy)) * h;
      const len    = 18 + (hl - Math.floor(hl)) * 46;
      const angle  = (ha - Math.floor(ha)) * Math.PI * 2;
      const phase  = (hph - Math.floor(hph)) * Math.PI * 2;
      const wid    = 4 + (hw - Math.floor(hw)) * 11;
      const shimmer = 0.5 + 0.5 * Math.sin(t * 1.6 + phase);
      const alpha   = 0.04 + shimmer * 0.13;
      const ex  = sx + Math.cos(angle) * len;
      const ey  = sy + Math.sin(angle) * len;
      const px  = Math.cos(angle + Math.PI / 2) * wid * 0.5;
      const py  = Math.sin(angle + Math.PI / 2) * wid * 0.5;
      const midX = sx + Math.cos(angle) * len * 0.3;
      const midY = sy + Math.sin(angle) * len * 0.3;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(midX + px, midY + py);
      ctx.lineTo(ex, ey);
      ctx.lineTo(midX - px, midY - py);
      ctx.closePath();
      const g = ctx.createLinearGradient(sx, sy, ex, ey);
      g.addColorStop(0,   `rgba(180,220,255,${alpha * 0.5})`);
      g.addColorStop(0.5, `rgba(210,238,255,${alpha})`);
      g.addColorStop(1,   `rgba(140,200,255,${alpha * 0.3})`);
      ctx.fillStyle = g; ctx.fill();
      if (shimmer > 0.82) {
        ctx.strokeStyle = `rgba(220,242,255,${(shimmer - 0.82) * 0.55})`;
        ctx.lineWidth = 0.8; ctx.stroke();
      }
    }
    ctx.restore();

  } else if (skin.gridStyle === 'void') {
    // Swirling void — multiple dark singularities with rotating arc rings
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    const voids = 3;
    for (let v = 0; v < voids; v++) {
      const hvx = Math.sin(v * 127.1) * 43758.5453;
      const hvy = Math.sin(v * 311.7 + 19.3) * 43758.5453;
      const vcx   = x + (hvx - Math.floor(hvx)) * w;
      const vcy   = y + (hvy - Math.floor(hvy)) * h;
      const vph   = v * Math.PI * 2 / voids;
      const vspd  = 0.18 + v * 0.07;
      const maxR2 = Math.min(w, h) * (0.13 + v * 0.04);

      // Rotating arc rings
      const rings = 5;
      for (let ri = 1; ri <= rings; ri++) {
        const frac  = ri / rings;
        const rr    = maxR2 * frac;
        const rot   = t * vspd * (1 - frac * 0.55) + vph;
        const arc   = Math.PI * (0.38 + frac * 0.22);
        const alpha = (0.07 + frac * 0.11) * (0.55 + 0.45 * Math.sin(t * 0.9 + ri));
        ctx.beginPath(); ctx.arc(vcx, vcy, rr, rot, rot + arc);
        ctx.strokeStyle = `rgba(80,0,180,${alpha})`;
        ctx.lineWidth   = 0.8 + frac * 1.1; ctx.stroke();
        ctx.beginPath(); ctx.arc(vcx, vcy, rr, rot + Math.PI, rot + Math.PI + arc * 0.55);
        ctx.strokeStyle = `rgba(150,0,255,${alpha * 0.45})`;
        ctx.lineWidth   = 0.5; ctx.stroke();
      }

      // Void glow center
      const vg    = ctx.createRadialGradient(vcx, vcy, 0, vcx, vcy, maxR2 * 0.6);
      const pulse = 0.08 + 0.05 * Math.sin(t * 1.3 + vph);
      vg.addColorStop(0, `rgba(40,0,100,${pulse})`);
      vg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  ctx.restore();
}

export function drawArenaBg(ctx, x, y, w, h, skinId, t = 0) {
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
  _drawGrid(ctx, x, y, w, h, skin, t);

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
