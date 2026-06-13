import { ARENA_SKINS, getSelectedArenaSkinId, drawArenaBg, drawArenaObstacle } from '../skins/arenaSkins.js';
import { isArenaSkinUnlocked } from '../persistence/rewards.js';

export const ARENA_SIZES = [
  { id: 'small',  label: 'Chica',  canvas: 320 },
  { id: 'normal', label: 'Normal', canvas: 420 },
  { id: 'large',  label: 'Grande', canvas: 540 },
];

export const ARENA_LAYOUTS = [
  { id: 'open',      name: 'Abierta',   obstacles: [] },
  { id: 'pilares',   name: 'Pilares',   obstacles: [
    {x:0.27,y:0.27,r:0.055},{x:0.73,y:0.27,r:0.055},
    {x:0.27,y:0.73,r:0.055},{x:0.73,y:0.73,r:0.055},
  ]},
  { id: 'central',   name: 'Central',   obstacles: [
    {x:0.5,y:0.5,r:0.085},
  ]},
  { id: 'cruz',      name: 'Cruz',      obstacles: [
    {x:0.5,y:0.22,r:0.055},{x:0.5,y:0.78,r:0.055},
    {x:0.22,y:0.5,r:0.055},{x:0.78,y:0.5,r:0.055},
  ]},
  { id: 'laberinto', name: 'Laberinto', obstacles: [
    {x:0.25,y:0.25,r:0.05},{x:0.75,y:0.25,r:0.05},
    {x:0.5,y:0.5,r:0.065},
    {x:0.25,y:0.75,r:0.05},{x:0.75,y:0.75,r:0.05},
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
export function drawArenaPreview() {
  const cvs = document.getElementById('arena-preview');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;
  ctx.clearRect(0, 0, W, H);
  const pad    = 6;
  const aW     = W - pad * 2;
  const aH     = H - pad * 2;
  const skinId = ARENA_SKINS[quickArenaSkinIdx].id;
  drawArenaBg(ctx, pad, pad, aW, aH, skinId);
  const layout = ARENA_LAYOUTS[quickArenaLayoutIdx];
  for (const o of layout.obstacles) {
    drawArenaObstacle(ctx, pad + o.x * aW, pad + o.y * aH, o.r * Math.min(aW, aH), skinId);
  }
  const nameEl = document.getElementById('arena-layout-name');
  if (nameEl) nameEl.textContent = layout.name;
}

export function drawPrematchArenaPreview() {
  const cvs = document.getElementById('prematch-arena-preview');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;
  ctx.clearRect(0, 0, W, H);
  const pad    = 6;
  const aW     = W - pad * 2;
  const aH     = H - pad * 2;
  const skinId = ARENA_SKINS[_prematchSkinIdx].id;
  drawArenaBg(ctx, pad, pad, aW, aH, skinId);
  const layout = ARENA_LAYOUTS[_prematchLayoutIdx];
  for (const o of layout.obstacles) {
    drawArenaObstacle(ctx, pad + o.x * aW, pad + o.y * aH, o.r * Math.min(aW, aH), skinId);
  }
  const nameEl = document.getElementById('prematch-layout-name');
  if (nameEl) nameEl.textContent = layout.name;
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
