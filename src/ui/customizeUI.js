import { loadMissions, setActiveBadge, setProfileTheme } from '../persistence/missionsSave.js';
import { BADGES, PROFILE_SKINS, CATEGORY_WIN_REWARDS } from '../missions/definitions.js';
import { isSkinUnlocked } from '../persistence/rewards.js';
import { drawCharPreview } from '../skins/renderer.js';
import { ANIMATED_SKIN_IDS } from '../skins/catalog.js';

const STORAGE_KEY = 'profile_theme';

const FREE_THEMES = [
  { id: '',          name: 'Predeterminado', color: '#0e1022' },
  { id: 'neon',      name: 'Neón',          color: '#0e0020' },
  { id: 'forest',    name: 'Bosque',        color: '#060e08' },
  { id: 'fire',      name: 'Fuego',         color: '#100600' },
  { id: 'arctic',    name: 'Ártico',        color: '#04080e' },
  { id: 'tormenta',  name: 'Tormenta',      color: '#060a14' },
];

const ALL_THEMES = [
  ...FREE_THEMES.map(t => t.id),
  ...Object.values(PROFILE_SKINS).map(s => s.cssTheme),
];

const EPIC_META = {
  angel:      { id: 'angel',      name: 'Ángel',    color: '#fff3e0', icon: '◎' },
  cursedwall: { id: 'cursedwall', name: 'Muro',     color: '#9B59B6', icon: '✦' },
  bloodshard: { id: 'bloodshard', name: 'Sanguíneo',color: '#C0392B', icon: '◈' },
  assassin:   { id: 'assassin',   name: 'Asesino',  color: '#4A3E6A', icon: '†' },
};

const EPIC_CAT_COLOR = {
  'Cuerpo a cuerpo': '#8833ee',
  'Proyectiles':     '#dc1a30',
  'Control de zona': '#9040ff',
  'Invocación':      '#d4c090',
};

let _onBadgeChange = null;
let _epicRafId     = null;
let _activeTab     = 'perfil';

function _cancelEpicRaf() {
  if (_epicRafId !== null) { cancelAnimationFrame(_epicRafId); _epicRafId = null; }
}

function _unlockHint(skin) {
  const level = skin.level === 2 ? 'Nivel 2' : 'Nivel 4';
  return `${level} de victorias con ${skin.category}`;
}

export function initCustomizeUI({ onBadgeChange } = {}) {
  _onBadgeChange = onBadgeChange ?? null;
  _applyOwnTheme(localStorage.getItem(STORAGE_KEY) ?? '');

  document.getElementById('btn-personalizacion').addEventListener('click', _open);
  document.getElementById('btn-customize-close').addEventListener('click', _close);
  document.getElementById('customize-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) _close();
  });
}

function _open() {
  _renderModal();
  document.getElementById('customize-modal').classList.remove('hidden');
}

function _close() {
  _cancelEpicRaf();
  document.getElementById('customize-modal').classList.add('hidden');
}

function _renderModal() {
  _cancelEpicRaf();
  const state          = loadMissions();
  const activeTheme    = localStorage.getItem(STORAGE_KEY) ?? '';
  const unlockedBadges = state.unlockedBadges ?? [];
  const activeBadge    = state.activeBadge;
  const unlockedSkins  = state.unlockedSkins ?? [];

  // ── Tab: Perfil ──────────────────────────────────────────────────────────
  const freeCardsHtml = FREE_THEMES.map(t => {
    const isActive = activeTheme === t.id;
    return `<div class="cz-theme-card ${isActive ? 'cz-theme-card--active' : ''}" data-theme="${t.id}">
      <div class="cz-theme-preview" style="background:${t.color}"></div>
      <span class="cz-theme-name">${t.name}</span>
    </div>`;
  }).join('');

  const missionCardsHtml = Object.entries(PROFILE_SKINS).map(([skinId, skin]) => {
    const isUnlocked = unlockedSkins.includes(skinId);
    const isActive   = activeTheme === skin.cssTheme;
    return `<div class="cz-theme-card cz-skin-card ${isActive ? 'cz-theme-card--active' : ''} ${!isUnlocked ? 'cz-skin-card--locked' : ''}"
      data-theme="${skin.cssTheme}" data-locked="${!isUnlocked}">
      <div class="cz-theme-preview cz-theme-preview--mission" data-mission-theme="${skin.cssTheme}"></div>
      <span class="cz-theme-name">${skin.name}</span>
      ${!isUnlocked ? `<span class="cz-skin-lock">🔒</span><span class="cz-skin-hint">${_unlockHint(skin)}</span>` : ''}
    </div>`;
  }).join('');

  // ── Tab: Personajes ──────────────────────────────────────────────────────
  const epicCardsHtml = Object.entries(CATEGORY_WIN_REWARDS).map(([cat, rew]) => {
    const cs       = rew.charSkin;
    if (!cs) return '';
    const unlocked = isSkinUnlocked(cs.charId, cs.skinId);
    const color    = EPIC_CAT_COLOR[cat] ?? '#ffffff';
    const charName = EPIC_META[cs.charId]?.name ?? cs.charId;
    return `<div class="cz-theme-card cz-skin-card--epic ${!unlocked ? 'cz-skin-card--locked' : ''}">
      <div class="cz-epic-canvas-wrap">
        <canvas class="cz-epic-canvas" data-char="${cs.charId}" data-skin="${cs.skinId}" width="130" height="130"></canvas>
        ${!unlocked ? `<div class="cz-epic-lock-overlay">🔒</div>` : ''}
      </div>
      <div class="cz-epic-info">
        <span class="cz-theme-name" style="color:${color}">${cs.name}</span>
        <span class="cz-epic-charname">${charName}</span>
        <span class="cz-skin-hint${unlocked ? ' cz-skin-hint--unlocked' : ''}">
          ${unlocked ? '✓ Desbloqueada' : `Niv. 5 victorias con ${cat}`}
        </span>
      </div>
    </div>`;
  }).join('');

  // ── Tab: Marcos ──────────────────────────────────────────────────────────
  const badgeHtml = unlockedBadges.length === 0
    ? `<p class="ms-empty">Completá misiones de racha para desbloquear marcos.</p>`
    : `<div class="ms-badge-grid">${
        [null, ...unlockedBadges].map(bid => {
          const isActive = bid === activeBadge;
          const meta = bid ? BADGES[bid] : null;
          return `<button class="ms-badge-btn ${isActive ? 'ms-badge-btn--active' : ''}" data-badge="${bid ?? ''}">
            <span class="ms-badge-preview ${bid ? `badge--${bid.replace('badge_', '')}` : 'badge--none'}">Aa</span>
            <span class="ms-badge-name">${meta ? meta.name : 'Sin marco'}</span>
          </button>`;
        }).join('')
      }</div>`;

  const t = _activeTab;
  const tabIndex = t === 'personajes' ? 1 : t === 'marcos' ? 2 : 0;
  const container = document.getElementById('cz-modal-content');
  container.innerHTML = `
    <div class="cz-tabs">
      <button class="cz-tab-btn ${t === 'perfil'      ? 'cz-tab-btn--active' : ''}" data-tab="perfil">Perfil</button>
      <button class="cz-tab-btn ${t === 'personajes'  ? 'cz-tab-btn--active' : ''}" data-tab="personajes">Personajes</button>
      <button class="cz-tab-btn ${t === 'marcos'      ? 'cz-tab-btn--active' : ''}" data-tab="marcos">Marcos</button>
      <div class="cz-tab-indicator" style="transform:translateX(${tabIndex * 100}%)"></div>
    </div>

    <div class="cz-tab-content${t === 'perfil' ? '' : ' cz-tab-hidden'}">
      <div class="cz-themes" id="cz-themes-grid">${freeCardsHtml}${missionCardsHtml}</div>
    </div>

    <div class="cz-tab-content${t === 'personajes' ? '' : ' cz-tab-hidden'}">
      <div class="cz-themes" id="cz-epic-grid">${epicCardsHtml}</div>
    </div>

    <div class="cz-tab-content${t === 'marcos' ? '' : ' cz-tab-hidden'} cz-tab-marcos">
      ${badgeHtml}
    </div>
  `;

  if (t === 'personajes') _startEpicPreviews(container);

  container.addEventListener('click', e => {
    // Tab switch
    const tabBtn = e.target.closest('.cz-tab-btn');
    if (tabBtn) {
      _switchTab(tabBtn.dataset.tab, container);
      return;
    }
    // Profile skin
    const card = e.target.closest('#cz-themes-grid .cz-theme-card');
    if (card) {
      if (card.dataset.locked === 'true') return;
      const theme = card.dataset.theme;
      if (theme === undefined) return;
      localStorage.setItem(STORAGE_KEY, theme);
      _applyOwnTheme(theme);
      setProfileTheme(theme);
      _renderModal();
      return;
    }
    // Badge
    const btn = e.target.closest('.ms-badge-btn');
    if (btn) {
      const bid = btn.dataset.badge || null;
      setActiveBadge(bid);
      _onBadgeChange?.(bid);
      _renderModal();
    }
  });
}

function _switchTab(tab, container) {
  _activeTab = tab;
  const tabIndex = tab === 'personajes' ? 1 : tab === 'marcos' ? 2 : 0;

  container.querySelectorAll('.cz-tab-btn').forEach(btn => {
    btn.classList.toggle('cz-tab-btn--active', btn.dataset.tab === tab);
  });

  const indicator = container.querySelector('.cz-tab-indicator');
  if (indicator) indicator.style.transform = `translateX(${tabIndex * 100}%)`;

  const contents = container.querySelectorAll('.cz-tab-content');
  const order = ['perfil', 'personajes', 'marcos'];
  contents.forEach((el, i) => el.classList.toggle('cz-tab-hidden', order[i] !== tab));

  if (tab === 'personajes') _startEpicPreviews(container);
  else _cancelEpicRaf();
}

function _startEpicPreviews(container) {
  const canvases = container.querySelectorAll('.cz-epic-canvas');
  if (!canvases.length) return;
  const drawAll = () => {
    for (const canvas of canvases) {
      const meta = EPIC_META[canvas.dataset.char];
      if (meta) drawCharPreview(canvas, meta, canvas.dataset.skin, { rScale: 0.31, yScale: 0.50 });
    }
  };
  const hasAnim = [...canvases].some(c => ANIMATED_SKIN_IDS.has(c.dataset.skin));
  if (hasAnim) {
    const loop = () => { drawAll(); _epicRafId = requestAnimationFrame(loop); };
    _epicRafId = requestAnimationFrame(loop);
  } else {
    drawAll();
  }
}

export function _applyOwnTheme(theme) {
  if (theme && ALL_THEMES.includes(theme)) {
    document.body.dataset.profileTheme = theme;
  } else {
    delete document.body.dataset.profileTheme;
  }
}

export function applyThemeToModal(panel, theme) {
  if (theme && ALL_THEMES.includes(theme)) {
    panel.dataset.theme = theme;
  } else {
    delete panel.dataset.theme;
  }
}
