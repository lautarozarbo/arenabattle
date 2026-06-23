import { supabase } from '../supabase.js';
import { loadMissions, setActiveBadge } from '../persistence/missionsSave.js';
import { BADGES, PROFILE_SKINS } from '../missions/definitions.js';
import { applyBadgeToElement } from './badge.js';

const STORAGE_KEY = 'profile_theme';
const FREE_THEMES = ['', 'neon', 'forest', 'fire', 'arctic'];
const ALL_THEMES  = [...FREE_THEMES, ...Object.keys(PROFILE_SKINS).map(k => PROFILE_SKINS[k].cssTheme)];

const FREE_THEME_META = {
  '':       { name: 'Predeterminado', preview: '#0e1022' },
  'neon':   { name: 'Neón',          preview: '#0e0020' },
  'forest': { name: 'Bosque',        preview: '#060e08' },
  'fire':   { name: 'Fuego',         preview: '#100600' },
  'arctic': { name: 'Ártico',        preview: '#04080e' },
};

let _onBadgeChange = null;

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
  document.getElementById('customize-modal').classList.add('hidden');
}

function _renderModal() {
  const state       = loadMissions();
  const activeTheme = localStorage.getItem(STORAGE_KEY) ?? '';
  const unlocked    = state.unlockedBadges ?? [];
  const activeBadge = state.activeBadge;
  const unlockedSkins = state.unlockedSkins ?? [];

  // ── Theme cards (free) ───────────────────────────────────────────────────
  const themeCardsHtml = FREE_THEMES.map(t => {
    const meta = FREE_THEME_META[t];
    return `<div class="cz-theme-card ${activeTheme === t ? 'cz-theme-card--active' : ''}" data-theme="${t}">
      <div class="cz-theme-preview" style="background:${meta.preview}"></div>
      <span class="cz-theme-name">${meta.name}</span>
    </div>`;
  }).join('');

  // ── Skin cards (unlockable) ───────────────────────────────────────────────
  const skinCardsHtml = Object.entries(PROFILE_SKINS).map(([skinId, skin]) => {
    const isUnlocked = unlockedSkins.includes(skinId);
    const isActive   = activeTheme === skin.cssTheme;
    return `<div class="cz-theme-card cz-skin-card ${isActive ? 'cz-theme-card--active' : ''} ${!isUnlocked ? 'cz-skin-card--locked' : ''}"
      data-theme="${skin.cssTheme}" data-locked="${!isUnlocked}">
      <div class="cz-theme-preview" style="background:${skin.color}"></div>
      <span class="cz-theme-name">${skin.name}</span>
      ${!isUnlocked ? `<span class="cz-skin-lock">🔒<br><small>${skin.category}</small></span>` : ''}
    </div>`;
  }).join('');

  // ── Badge selector ───────────────────────────────────────────────────────
  const badgeHtml = unlocked.length === 0
    ? `<p class="ms-empty">Completá misiones de racha para desbloquear marcos.</p>`
    : `<div class="ms-badge-grid">${
        [null, ...unlocked].map(bid => {
          const isActive = bid === activeBadge;
          const meta = bid ? BADGES[bid] : null;
          return `<button class="ms-badge-btn ${isActive ? 'ms-badge-btn--active' : ''}" data-badge="${bid ?? ''}">
            <span class="ms-badge-preview ${bid ? `badge--${bid.replace('badge_', '')}` : 'badge--none'}">Aa</span>
            <span class="ms-badge-name">${meta ? meta.name : 'Sin marco'}</span>
          </button>`;
        }).join('')
      }</div>`;

  const container = document.getElementById('cz-modal-content');
  container.innerHTML = `
    <div class="cz-section">
      <div class="cz-section-hd">Temas de perfil</div>
      <div class="cz-themes" id="cz-themes-grid">${themeCardsHtml}</div>
    </div>

    <div class="cz-section">
      <div class="cz-section-hd">Skins desbloqueables</div>
      <p class="cz-skin-hint">Completá las 5 misiones de victorias de cada categoría para desbloquear su skin.</p>
      <div class="cz-themes" id="cz-skins-grid">${skinCardsHtml}</div>
    </div>

    <div class="cz-section">
      <div class="cz-section-hd">Marco de nombre</div>
      ${badgeHtml}
    </div>
  `;

  // Theme + skin click
  container.addEventListener('click', e => {
    const card = e.target.closest('.cz-theme-card');
    if (!card) return;
    if (card.dataset.locked === 'true') return;
    const theme = card.dataset.theme;
    localStorage.setItem(STORAGE_KEY, theme);
    _applyOwnTheme(theme);
    _saveThemeToCloud(theme);
    _renderModal();
  });

  // Badge click
  container.addEventListener('click', e => {
    const btn = e.target.closest('.ms-badge-btn');
    if (!btn) return;
    const bid = btn.dataset.badge || null;
    setActiveBadge(bid);
    _onBadgeChange?.(bid);
    _renderModal();
  });
}

export function _applyOwnTheme(theme) {
  if (theme && ALL_THEMES.includes(theme)) {
    document.body.dataset.profileTheme = theme;
  } else {
    delete document.body.dataset.profileTheme;
  }
}

async function _saveThemeToCloud(theme) {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return;
  const { data: stats } = await supabase
    .from('user_stats')
    .select('missions_progress')
    .eq('user_id', uid)
    .single();
  const current = stats?.missions_progress ?? {};
  supabase.from('user_stats')
    .upsert(
      { user_id: uid, missions_progress: { ...current, profileTheme: theme || null }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .then(() => {});
}

/** Called from userProfile.js to apply someone else's theme to the modal panel */
export function applyThemeToModal(panel, theme) {
  if (theme && ALL_THEMES.includes(theme)) {
    panel.dataset.theme = theme;
  } else {
    delete panel.dataset.theme;
  }
}
