import { CHAR_SKINS, ANIMATED_SKIN_IDS, drawCharPreview } from '../skins/index.js';
import { ARENA_SKINS, drawArenaBg } from '../skins/arenaSkins.js';
import { isSkinUnlocked, isArenaSkinUnlocked } from '../persistence/rewards.js';
import { getAllPowerMetas } from '../powers/registry.js';
import { sfx } from '../audio/index.js';

const _metas = getAllPowerMetas();

let _tab   = 'chars';
let _rafId = null;

export function openWardrobe() {
  sfx.uiClick();
  document.getElementById('wardrobe-modal').classList.remove('hidden');
  _tab = 'chars';
  document.getElementById('wardrobe-tab-chars').classList.add('active');
  document.getElementById('wardrobe-tab-arena').classList.remove('active');
  _renderContent();
  _startAnim();
}

export function closeWardrobe() {
  sfx.uiClick();
  document.getElementById('wardrobe-modal').classList.add('hidden');
  _stopAnim();
}

export function switchWardrobeTab(tab) {
  if (_tab === tab) return;
  sfx.uiClick();
  _tab = tab;
  document.getElementById('wardrobe-tab-chars').classList.toggle('active', tab === 'chars');
  document.getElementById('wardrobe-tab-arena').classList.toggle('active', tab === 'arena');
  if (tab === 'chars') { _renderContent(); _startAnim(); }
  else                 { _stopAnim(); _renderContent(); }
}

function _startAnim() {
  if (_rafId) return;
  function tick() {
    document.querySelectorAll('.wardrobe-skin-canvas[data-animated]').forEach(cvs => {
      const meta = _metas.find(m => m.id === cvs.dataset.charid);
      if (meta) drawCharPreview(cvs, meta, cvs.dataset.skinid, { rScale: 0.28, yScale: 0.5 });
    });
    _rafId = requestAnimationFrame(tick);
  }
  _rafId = requestAnimationFrame(tick);
}

function _stopAnim() {
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
}

function _renderContent() {
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
    group.className = 'wardrobe-char-group';

    const label = document.createElement('div');
    label.className = 'wardrobe-char-label';
    label.textContent = meta.name;
    group.appendChild(label);

    const row = document.createElement('div');
    row.className = 'wardrobe-skins-row';

    for (const skin of nonDefault) {
      const owned = isSkinUnlocked(charId, skin.id);
      const card  = document.createElement('div');
      card.className = 'wardrobe-skin-card' + (owned ? '' : ' locked');

      const cvs = document.createElement('canvas');
      cvs.width  = 120;
      cvs.height = 120;
      cvs.className = 'wardrobe-skin-canvas wardrobe-skin-canvas--char';

      if (ANIMATED_SKIN_IDS.has(skin.id)) {
        cvs.dataset.animated = '1';
        cvs.dataset.charid   = charId;
        cvs.dataset.skinid   = skin.id;
      }

      drawCharPreview(cvs, meta, skin.id, { rScale: 0.28, yScale: 0.5 });
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

      row.appendChild(card);
    }

    group.appendChild(row);
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

    const cvs = document.createElement('canvas');
    cvs.width  = 200;
    cvs.height = 120;
    cvs.className = 'wardrobe-skin-canvas';
    _drawArenaSkinThumb(cvs, skin);
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
