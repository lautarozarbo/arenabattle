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

const CAT_COLOR = {
  'Cuerpo a cuerpo': '#ff6b6b',
  'Proyectiles':     '#7c9dff',
  'Control de zona': '#c084fc',
  'Invocación':      '#4ade80',
};
const CAT_ABBR = {
  'Cuerpo a cuerpo': 'CC',
  'Proyectiles':     'PR',
  'Control de zona': 'CZ',
  'Invocación':      'IN',
};

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
    const color   = CAT_COLOR[cat] ?? '#7c9dff';
    const abbr    = CAT_ABBR[cat]  ?? '??';
    const levelLabel = isDone ? `${CAT_LEVELS_COUNT}/${CAT_LEVELS_COUNT}` : `Niv. ${cp.level + 1}/${CAT_LEVELS_COUNT}`;

    return `<div class="ms-mission-card ${isDone ? 'ms-done' : ''}" style="--cat-color:${color}">
      <div class="ms-mission-header">
        <span class="ms-cat-abbr" style="background:${color}22;color:${color};border-color:${color}44">${abbr}</span>
        <span class="ms-cat-name">${cat}</span>
        <span class="ms-level-tag">${levelLabel}</span>
      </div>
      <div class="ms-mission-label">${isDone ? 'Todas las misiones completadas' : mission.label}</div>
      <div class="ms-progress-row">
        <div class="ms-progress-bar"><div class="ms-progress-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="ms-progress-text">${isDone ? 'Completado' : `${count}/${target}`}</span>
      </div>
      ${!isDone ? `<span class="ms-xp-reward">+${mission.xp} XP</span>` : ''}
    </div>`;
  }).join('');

  // ── Streak missions ───────────────────────────────────────────────────────
  const curStreak  = state.winStreak?.current ?? 0;
  const completed  = new Set(state.winStreak?.completed ?? []);
  const nextStreak = STREAK_MILESTONES.find(ms => !completed.has(ms.target));

  const streakHtml = STREAK_MILESTONES.map(ms => {
    const done   = completed.has(ms.target);
    const isNext = nextStreak && ms.target === nextStreak.target;
    const pct    = done ? 100 : isNext ? Math.min(100, Math.round((curStreak / ms.target) * 100)) : 0;
    return `<div class="ms-mission-card ${done ? 'ms-done' : ''}">
      <div class="ms-mission-header">
        <span class="ms-streak-chip">×${ms.target}</span>
        <span class="ms-cat-name">${ms.target} victorias seguidas</span>
        ${ms.badge ? `<span class="ms-badge-chip badge--${ms.badge.replace('badge_','')}">Marco ${BADGES[ms.badge].name}</span>` : ''}
      </div>
      ${isNext ? `<div class="ms-progress-row">
        <div class="ms-progress-bar"><div class="ms-progress-fill ms-fill--streak" style="width:${pct}%"></div></div>
        <span class="ms-progress-text">${curStreak}/${ms.target}</span>
      </div>` : done ? `<div class="ms-progress-row"><span class="ms-progress-text">Completado</span></div>` : ''}
      <span class="ms-xp-reward">${done ? '' : `+${ms.xp} XP`}${ms.badge && !done ? ` · Marco ${BADGES[ms.badge].name}` : ''}</span>
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
      <div class="ms-streak-number">${curStreak}</div>
      <div class="ms-streak-info">
        <span class="ms-streak-title">Racha actual</span>
        <span class="ms-streak-sub">${nextStreak ? `Próximo hito: ×${nextStreak.target} victorias` : 'Todos los hitos completados'}</span>
      </div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header">Partidas por categoría</div>
      <div class="ms-missions-list">${catHtml}</div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header">Victorias seguidas</div>
      <div class="ms-missions-list">${streakHtml}</div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header">Marcos de nombre</div>
      ${badgeHtml}
    </div>
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
