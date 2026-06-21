import { loadMissions, setActiveBadge } from '../persistence/missionsSave.js';
import {
  MISSION_CATEGORIES, STREAK_MILESTONES, BADGES,
  getCategoryMission, CAT_LEVELS_COUNT,
} from '../missions/definitions.js';
import { applyBadgeToElement } from './badge.js';

let _onBadgeChange = null;

export function initMissionsUI({ onBadgeChange }) {
  _onBadgeChange = onBadgeChange;

  document.getElementById('btn-misiones').addEventListener('click', () => {
    openMissions();
  });
  document.getElementById('missions-close').addEventListener('click', () => {
    document.getElementById('missions-modal').classList.add('hidden');
  });
  document.getElementById('missions-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
}

export function openMissions() {
  _render();
  document.getElementById('missions-modal').classList.remove('hidden');
}

function _render() {
  const state = loadMissions();
  const modal = document.getElementById('missions-modal');

  // ── Category missions ────────────────────────────────────────────────────
  const catHtml = MISSION_CATEGORIES.map(cat => {
    const cp      = state.categoryPlay[cat] ?? { level: 0, count: 0 };
    const isDone  = cp.level >= CAT_LEVELS_COUNT;
    const mission = isDone ? null : getCategoryMission(cat, cp.level);
    const count   = isDone ? (getCategoryMission(cat, CAT_LEVELS_COUNT - 1)?.target ?? 0) : cp.count;
    const target  = isDone ? (getCategoryMission(cat, CAT_LEVELS_COUNT - 1)?.target ?? 0) : mission.target;
    const pct     = isDone ? 100 : Math.min(100, Math.round((count / target) * 100));
    const catIcon = { 'Cuerpo a cuerpo': '⚔️', 'Proyectiles': '🎯', 'Control de zona': '🔮', 'Invocación': '✨' }[cat] ?? '🎮';
    const levelLabel = isDone ? `Completado (${CAT_LEVELS_COUNT}/${CAT_LEVELS_COUNT})` : `Nivel ${cp.level + 1}/${CAT_LEVELS_COUNT}`;

    return `<div class="ms-mission-card ${isDone ? 'ms-done' : ''}">
      <div class="ms-mission-header">
        <span class="ms-cat-icon">${catIcon}</span>
        <span class="ms-cat-name">${cat}</span>
        <span class="ms-level-tag">${levelLabel}</span>
      </div>
      <div class="ms-mission-label">${isDone ? 'Todas las misiones completadas' : mission.label}</div>
      <div class="ms-progress-row">
        <div class="ms-progress-bar"><div class="ms-progress-fill" style="width:${pct}%"></div></div>
        <span class="ms-progress-text">${isDone ? '✓' : `${count}/${target}`}</span>
      </div>
      ${!isDone ? `<span class="ms-xp-reward">+${mission.xp} XP</span>` : ''}
    </div>`;
  }).join('');

  // ── Streak missions ───────────────────────────────────────────────────────
  const curStreak  = state.winStreak?.current ?? 0;
  const completed  = new Set(state.winStreak?.completed ?? []);
  const nextStreak = STREAK_MILESTONES.find(ms => !completed.has(ms.target));

  const streakHtml = STREAK_MILESTONES.map(ms => {
    const done = completed.has(ms.target);
    const isNext = nextStreak && ms.target === nextStreak.target;
    const pct  = done ? 100 : isNext ? Math.min(100, Math.round((curStreak / ms.target) * 100)) : 0;
    return `<div class="ms-mission-card ${done ? 'ms-done' : ''}">
      <div class="ms-mission-header">
        <span class="ms-cat-icon">🏆</span>
        <span class="ms-mission-label">${ms.target} victorias seguidas</span>
        ${ms.badge ? `<span class="ms-badge-chip ms-badge-chip--${ms.badge}">Marco ${BADGES[ms.badge].name}</span>` : ''}
      </div>
      ${isNext ? `<div class="ms-progress-row">
        <div class="ms-progress-bar"><div class="ms-progress-fill ms-fill--streak" style="width:${pct}%"></div></div>
        <span class="ms-progress-text">${curStreak}/${ms.target}</span>
      </div>` : done ? `<div class="ms-progress-row"><span class="ms-progress-text">✓ Completado</span></div>` : ''}
      <span class="ms-xp-reward">${done ? '' : `+${ms.xp} XP`}${ms.badge && !done ? ` + Marco ${BADGES[ms.badge].name}` : ''}</span>
    </div>`;
  }).join('');

  // ── Badge selector ───────────────────────────────────────────────────────
  const unlocked = state.unlockedBadges ?? [];
  const active   = state.activeBadge;
  const badgeHtml = unlocked.length === 0
    ? `<p class="ms-empty">Completá misiones de racha para desbloquear marcos.</p>`
    : `<div class="ms-badge-grid">${
        [null, ...unlocked].map(bid => {
          const isActive = bid === active;
          const meta = bid ? BADGES[bid] : null;
          return `<button class="ms-badge-btn ${isActive ? 'ms-badge-btn--active' : ''}" data-badge="${bid ?? ''}">
            <span class="ms-badge-preview ${bid ? `badge--${bid.replace('badge_', '')}` : 'badge--none'}">Aa</span>
            <span class="ms-badge-name">${meta ? meta.name : 'Sin marco'}</span>
          </button>`;
        }).join('')
      }</div>`;

  modal.querySelector('#missions-content').innerHTML = `
    <div class="ms-streak-counter">
      <span class="ms-streak-icon">🔥</span>
      <span class="ms-streak-label">Racha actual: <strong>${curStreak}</strong></span>
    </div>

    <h3 class="ms-section-title">Partidas por categoría</h3>
    <div class="ms-missions-list">${catHtml}</div>

    <h3 class="ms-section-title">Victorias seguidas</h3>
    <div class="ms-missions-list">${streakHtml}</div>

    <h3 class="ms-section-title">Marcos de nombre</h3>
    ${badgeHtml}
  `;

  // Badge selection
  modal.querySelectorAll('.ms-badge-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bid = btn.dataset.badge || null;
      setActiveBadge(bid);
      _onBadgeChange?.(bid);
      _render();
    });
  });
}
