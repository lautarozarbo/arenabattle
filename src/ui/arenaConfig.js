import { ARENA_SKINS, getSelectedArenaSkinId, drawArenaBg, drawArenaObstacle, isAnimatedArenaSkin } from '../skins/arenaSkins.js';
import { isArenaSkinUnlocked } from '../persistence/rewards.js';

export const ARENA_SIZES = [
  { id: 'small',  label: 'Chica',  canvas: 320 },
  { id: 'normal', label: 'Normal', canvas: 420 },
  { id: 'large',  label: 'Grande', canvas: 540 },
];

export const ARENA_LAYOUTS = [
  { id: 'open',      name: 'Abierta',   obstacles: [] },
  { id: 'pilares',   name: 'Pilares',   obstacles: [
    {x:0.30,y:0.30,r:0.045},{x:0.70,y:0.30,r:0.045},
    {x:0.30,y:0.70,r:0.045},{x:0.70,y:0.70,r:0.045},
  ]},
  { id: 'central',   name: 'Central',   obstacles: [
    {x:0.5,y:0.5,r:0.08},
  ]},
  { id: 'cruz',      name: 'Cruz',      obstacles: [
    {x:0.5,y:0.26,r:0.045},{x:0.5,y:0.74,r:0.045},
    {x:0.26,y:0.5,r:0.045},{x:0.74,y:0.5,r:0.045},
  ]},
  { id: 'laberinto', name: 'Laberinto', obstacles: [
    {x:0.28,y:0.28,r:0.042},{x:0.72,y:0.28,r:0.042},
    {x:0.5,y:0.5,r:0.058},
    {x:0.28,y:0.72,r:0.042},{x:0.72,y:0.72,r:0.042},
  ]},
];

// ── State ──────────────────────────────────────────────────────────────────────
let quickArenaSizeIdx   = 1;
let quickArenaLayoutIdx = 0;
let quickArenaSkinIdx   = Math.max(0, ARENA_SKINS.findIndex(s => s.id === getSelectedArenaSkinId()));
let _prematchSkinIdx    = quickArenaSkinIdx;
let _prematchLayoutIdx  = 0;

// ── Getters / Setters ──────────────────────────────────────────────────────────
export const getQuickArenaSizeIdx   = () => quickArenaSizeIdx;
export const getQuickArenaLayoutIdx = () => quickArenaLayoutIdx;
export const getQuickArenaSkinIdx   = () => quickArenaSkinIdx;
export const getPrematchSkinIdx     = () => _prematchSkinIdx;
export const getPrematchLayoutIdx   = () => _prematchLayoutIdx;

export function setQuickArenaSizeIdx(v)   { quickArenaSizeIdx   = v; }
export function setQuickArenaLayoutIdx(v) { quickArenaLayoutIdx = v; }
export function setQuickArenaSkinIdx(v)   { quickArenaSkinIdx   = v; }
export function setPrematchSkinIdx(v)     { _prematchSkinIdx    = v; }
export function setPrematchLayoutIdx(v)   { _prematchLayoutIdx  = v; }

// ── Arena option builders ──────────────────────────────────────────────────────
export function getQuickArenaOpts() {
  const skin = ARENA_SKINS[quickArenaSkinIdx];
  return {
    canvasSize: ARENA_SIZES[quickArenaSizeIdx].canvas,
    obstacles:  ARENA_LAYOUTS[quickArenaLayoutIdx].obstacles,
    skinId:     isArenaSkinUnlocked(skin.id) ? skin.id : 'default',
  };
}

export function buildCompArenaOpts() {
  const skin   = ARENA_SKINS[_prematchSkinIdx];
  const skinId = isArenaSkinUnlocked(skin.id) ? skin.id : 'default';
  return { canvasSize: 420, obstacles: ARENA_LAYOUTS[_prematchLayoutIdx].obstacles, skinId };
}

// ── Preview renderers ──────────────────────────────────────────────────────────
let _quickRafId    = null;
let _prematchRafId = null;

function _renderArenaFrame(ctx, W, H, skinId, layout, nameEl) {
  const pad = 6;
  const aW  = W - pad * 2;
  const aH  = H - pad * 2;
  ctx.clearRect(0, 0, W, H);
  drawArenaBg(ctx, pad, pad, aW, aH, skinId, performance.now() / 1000);
  for (const o of layout.obstacles) {
    drawArenaObstacle(ctx, pad + o.x * aW, pad + o.y * aH, o.r * Math.min(aW, aH), skinId);
  }
  if (nameEl) nameEl.textContent = layout.name;
}

export function drawArenaPreview() {
  const cvs = document.getElementById('arena-preview');
  if (!cvs) return;
  if (_quickRafId) { cancelAnimationFrame(_quickRafId); _quickRafId = null; }
  const ctx    = cvs.getContext('2d');
  const skinId = ARENA_SKINS[quickArenaSkinIdx].id;
  const layout = ARENA_LAYOUTS[quickArenaLayoutIdx];
  const nameEl = document.getElementById('arena-layout-name');
  if (isAnimatedArenaSkin(skinId)) {
    const loop = () => {
      _renderArenaFrame(ctx, cvs.width, cvs.height, skinId, layout, nameEl);
      _quickRafId = requestAnimationFrame(loop);
    };
    _quickRafId = requestAnimationFrame(loop);
  } else {
    _renderArenaFrame(ctx, cvs.width, cvs.height, skinId, layout, nameEl);
  }
}

export function drawPrematchArenaPreview() {
  const cvs = document.getElementById('prematch-arena-preview');
  if (!cvs) return;
  if (_prematchRafId) { cancelAnimationFrame(_prematchRafId); _prematchRafId = null; }
  const ctx    = cvs.getContext('2d');
  const skinId = ARENA_SKINS[_prematchSkinIdx].id;
  const layout = ARENA_LAYOUTS[_prematchLayoutIdx];
  const nameEl = document.getElementById('prematch-layout-name');
  if (isAnimatedArenaSkin(skinId)) {
    const loop = () => {
      _renderArenaFrame(ctx, cvs.width, cvs.height, skinId, layout, nameEl);
      _prematchRafId = requestAnimationFrame(loop);
    };
    _prematchRafId = requestAnimationFrame(loop);
  } else {
    _renderArenaFrame(ctx, cvs.width, cvs.height, skinId, layout, nameEl);
  }
}

export function syncPrematchSkinSelector() {
  const skin   = ARENA_SKINS[_prematchSkinIdx];
  const locked = !isArenaSkinUnlocked(skin.id);
  const nameEl = document.getElementById('prematch-skin-name');
  const lockEl = document.getElementById('prematch-skin-lock');
  if (nameEl) nameEl.textContent = skin.name;
  if (lockEl) lockEl.classList.toggle('lock-invisible', !locked);
  drawPrematchArenaPreview();
}
