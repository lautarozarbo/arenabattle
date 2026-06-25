import { CHAR_SKINS, ANIMATED_SKIN_IDS, drawCharPreview } from '../skins/index.js';
import { ARENA_SKINS, drawArenaBg, isAnimatedArenaSkin } from '../skins/arenaSkins.js';
import { isSkinUnlocked, isArenaSkinUnlocked } from '../persistence/rewards.js';
import { getAllPowerMetas } from '../powers/registry.js';
import { sfx } from '../audio/index.js';

const _metas = getAllPowerMetas();

let _tab  = 'chars';
let _rafId = null;

// Only canvases currently visible (IntersectionObserver manages this set)
const _visibleAnimCanvases = new Set(); // { cvs, meta, skinId } | { cvs, skinId, isArena }

let _observer = null;

export function openWardrobe() {
  sfx.uiClick();
  document.getElementById('wardrobe-modal').classList.remove('hidden');
  _tab = 'chars';
  document.getElementById('wardrobe-tab-chars').classList.add('active');
  document.getElementById('wardrobe-tab-arena').classList.remove('active');
  _renderContent();
}

export function closeWardrobe() {
  sfx.uiClick();
  document.getElementById('wardrobe-modal').classList.add('hidden');
  _stopAnim();
  _observer?.disconnect();
  _observer = null;
}

export function switchWardrobeTab(tab) {
  if (_tab === tab) return;
  sfx.uiClick();
  _tab = tab;
  document.getElementById('wardrobe-tab-chars').classList.toggle('active', tab === 'chars');
  document.getElementById('wardrobe-tab-arena').classList.toggle('active', tab === 'arena');
  _renderContent();
}

// ── Animation loop ────────────────────────────────────────────────────────────
// Only draws canvases that are currently visible — no scroll jitter.

function _startAnim() {
  if (_rafId) return;
  function tick() {
    if (_visibleAnimCanvases.size === 0) {
      _rafId = null;
      return; // nothing visible — stop until observer wakes us
    }
    const t = performance.now() / 1000;
    for (const entry of _visibleAnimCanvases) {
      if (entry.isArena) {
        const ctx = entry.cvs.getContext('2d');
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, entry.cvs.width, entry.cvs.height, 8);
        ctx.clip();
        drawArenaBg(ctx, 0, 0, entry.cvs.width, entry.cvs.height, entry.skinId, t);
        ctx.restore();
      } else {
        drawCharPreview(entry.cvs, entry.meta, entry.skinId, { rScale: 0.28, yScale: 0.5 });
      }
    }
    _rafId = requestAnimationFrame(tick);
  }
  _rafId = requestAnimationFrame(tick);
}

function _stopAnim() {
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  _visibleAnimCanvases.clear();
}

// ── IntersectionObserver — starts/stops animation per-canvas ─────────────────

function _observeAnimCanvas(entry) {
  const content = document.getElementById('wardrobe-content');
  if (!_observer) {
    _observer = new IntersectionObserver((entries) => {
      let changed = false;
      for (const ie of entries) {
        const e = ie.target._animEntry;
        if (!e) continue;
        if (ie.isIntersecting) {
          _visibleAnimCanvases.add(e);
          changed = true;
        } else {
          _visibleAnimCanvases.delete(e);
        }
      }
      if (changed && _visibleAnimCanvases.size > 0) _startAnim();
    }, { root: content, threshold: 0 });
  }
  entry.cvs._animEntry = entry;
  _observer.observe(entry.cvs);
}

// ── Render ────────────────────────────────────────────────────────────────────

function _renderContent() {
  _stopAnim();
  _observer?.disconnect();
  _observer = null;

  const content = document.getElementById('wardrobe-content');
  content.innerHTML = '';

  if (_tab === 'chars') _renderChars(content);
  else                  _renderArena(content);
}

function _renderChars(container) {
  for (const [charId, skinList] of Object.entries(CHAR_SKINS)) {
    const nonDefault = skinList.filter(s => s.id !== 'default');
    if (!nonDefault.length) continue;

    const meta = _metas.find(m => m.id === charId);
    if (!meta) continue;

    const group = document.createElement('div');
    group.className = 'wd-char-group';

    const groupLabel = document.createElement('div');
    groupLabel.className = 'wd-char-label';
    groupLabel.style.color = meta.color;
    groupLabel.textContent = meta.name;
    group.appendChild(groupLabel);

    const grid = document.createElement('div');
    grid.className = 'wd-skins-grid';

    for (const skin of nonDefault) {
      const owned     = isSkinUnlocked(charId, skin.id);
      const nameColor = owned
        ? (skin.labelColor ?? skin.color ?? meta.color)
        : 'rgba(255,255,255,0.28)';

      const card = document.createElement('div');
      card.className = 'wd-skin-card' + (owned ? '' : ' wd-skin-card--locked');

      // Canvas wrap
      const wrap = document.createElement('div');
      wrap.className = 'wd-canvas-wrap';

      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const cvs = document.createElement('canvas');
      cvs.width  = 130 * dpr;
      cvs.height = 130 * dpr;
      cvs.className = 'wd-skin-canvas';
      drawCharPreview(cvs, meta, skin.id, { rScale: 0.28, yScale: 0.5 });

      if (ANIMATED_SKIN_IDS.has(skin.id)) {
        _observeAnimCanvas({ cvs, meta, skinId: skin.id, isArena: false });
      }

      wrap.appendChild(cvs);

      if (!owned) {
        const overlay = document.createElement('div');
        overlay.className = 'wd-lock-overlay';
        overlay.textContent = '🔒';
        wrap.appendChild(overlay);
      }

      card.appendChild(wrap);

      // Info section
      const info = document.createElement('div');
      info.className = 'wd-skin-info';

      const nameEl = document.createElement('span');
      nameEl.className = 'wd-skin-name';
      nameEl.style.color = nameColor;
      nameEl.textContent = skin.name;
      info.appendChild(nameEl);

      const statusEl = document.createElement('span');
      if (owned) {
        statusEl.className = 'wd-skin-status wd-skin-status--owned';
        statusEl.textContent = '✓ Desbloqueada';
      } else {
        statusEl.className = 'wd-skin-status';
        statusEl.textContent = skin.missionOnly ? 'Solo misiones' : 'En cofres';
      }
      info.appendChild(statusEl);

      card.appendChild(info);
      grid.appendChild(card);
    }

    group.appendChild(grid);
    container.appendChild(group);
  }
}

function _renderArena(container) {
  const grid = document.createElement('div');
  grid.className = 'wardrobe-arena-grid';

  for (const skin of ARENA_SKINS) {
    if (skin.id === 'default') continue;
    const owned = isArenaSkinUnlocked(skin.id);

    const card = document.createElement('div');
    card.className = 'wardrobe-skin-card' + (owned ? '' : ' locked');

    const dpr2 = Math.min(window.devicePixelRatio || 1, 3);
    const cvs = document.createElement('canvas');
    cvs.width  = 200 * dpr2;
    cvs.height = 120 * dpr2;
    cvs.className = 'wardrobe-skin-canvas';

    if (isAnimatedArenaSkin(skin.id)) {
      _observeAnimCanvas({ cvs, skinId: skin.id, isArena: true });
    } else {
      _drawArenaSkinThumb(cvs, skin);
    }

    card.appendChild(cvs);

    if (!owned) {
      const lock = document.createElement('span');
      lock.className   = 'wardrobe-lock-icon';
      lock.textContent = '🔒';
      card.appendChild(lock);
    }

    const lbl = document.createElement('div');
    lbl.className   = 'wardrobe-skin-label';
    lbl.textContent = skin.name;
    card.appendChild(lbl);

    grid.appendChild(card);
  }

  container.appendChild(grid);
}

function _drawArenaSkinThumb(canvas, skin) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 8);
  ctx.clip();
  drawArenaBg(ctx, 0, 0, W, H, skin.id);
  ctx.restore();
}
