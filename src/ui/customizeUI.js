import { supabase } from '../supabase.js';

const STORAGE_KEY = 'profile_theme';
const THEMES = ['', 'neon', 'forest', 'fire', 'arctic'];

export function initCustomizeUI() {
  _applyOwnTheme(localStorage.getItem(STORAGE_KEY) ?? '');

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
    _applyOwnTheme(theme);
    _syncCards(theme);
    _saveThemeToCloud(theme);
  });
}

function _open() {
  document.getElementById('customize-modal').classList.remove('hidden');
  _syncCards(localStorage.getItem(STORAGE_KEY) ?? '');
}

function _close() {
  document.getElementById('customize-modal').classList.add('hidden');
}

function _applyOwnTheme(theme) {
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
  if (theme && THEMES.includes(theme)) {
    panel.dataset.theme = theme;
  } else {
    delete panel.dataset.theme;
  }
}
