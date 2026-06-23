const STORAGE_KEY = 'profile_theme';

const THEMES = ['', 'neon', 'forest', 'fire', 'arctic'];

export function initCustomizeUI() {
  _applyTheme(localStorage.getItem(STORAGE_KEY) ?? '');

  document.getElementById('btn-personalizacion').addEventListener('click', _open);
  document.getElementById('btn-customize-close').addEventListener('click', _close);
  document.getElementById('customize-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) _close();
  });

  document.getElementById('cz-themes-grid').addEventListener('click', e => {
    const card = e.target.closest('.cz-theme-card');
    if (!card) return;
    const theme = card.dataset.theme;
    localStorage.setItem(STORAGE_KEY, theme);
    _applyTheme(theme);
    _syncCards(theme);
  });
}

function _open() {
  const modal = document.getElementById('customize-modal');
  modal.classList.remove('hidden');
  _syncCards(localStorage.getItem(STORAGE_KEY) ?? '');
}

function _close() {
  document.getElementById('customize-modal').classList.add('hidden');
}

function _applyTheme(theme) {
  if (theme && THEMES.includes(theme)) {
    document.body.dataset.profileTheme = theme;
  } else {
    delete document.body.dataset.profileTheme;
  }
}

function _syncCards(activeTheme) {
  document.querySelectorAll('.cz-theme-card').forEach(card => {
    card.classList.toggle('cz-theme-card--active', card.dataset.theme === activeTheme);
  });
}
