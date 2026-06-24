import { loadMissions } from '../persistence/missionsSave.js';
import {
  MISSION_CATEGORIES, STREAK_MILESTONES, BADGES,
  getCategoryMission, CAT_LEVELS_COUNT,
  getCategoryWinMission, WIN_CAT_LEVELS_COUNT,
  PROFILE_SKINS, CATEGORY_WIN_REWARDS,
} from '../missions/definitions.js';

export function initMissionsUI({ onBadgeChange }) {
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

// Returns the reward badge HTML for a given win mission level
function _winRewardBadge(cat, levelIdx, isDone) {
  const catRew = CATEGORY_WIN_REWARDS[cat];
  if (!catRew) return '';
  const mission = getCategoryWinMission(cat, levelIdx);
  if (!mission) return '';

  if (mission.rewardType === 'profile_skin_a') {
    const skin = PROFILE_SKINS[catRew.skinA];
    if (!skin) return '';
    return isDone
      ? `<span class="ms-skin-reward ms-skin-reward--done">✓ Skin de perfil "${skin.name}"</span>`
      : `<span class="ms-skin-reward">Skin de perfil: <b>${skin.name}</b></span>`;
  }
  if (mission.rewardType === 'profile_skin_b') {
    const skin = PROFILE_SKINS[catRew.skinB];
    if (!skin) return '';
    return isDone
      ? `<span class="ms-skin-reward ms-skin-reward--done">✓ Skin de perfil "${skin.name}"</span>`
      : `<span class="ms-skin-reward">Skin de perfil: <b>${skin.name}</b></span>`;
  }
  if (mission.rewardType === 'char_skin') {
    const cs = catRew.charSkin;
    if (!cs) return '';
    return isDone
      ? `<span class="ms-skin-reward ms-skin-reward--done ms-skin-reward--epic">✓ Skin: ${cs.name}</span>`
      : `<span class="ms-skin-reward ms-skin-reward--epic">Skin: <b>${cs.name}</b></span>`;
  }
  return '';
}

function _missionCardHtml(cat, cp, getMission, levelsCount, color, abbr, type) {
  const isDone  = cp.level >= levelsCount;
  const mission = isDone ? null : getMission(cat, cp.level);
  const count   = isDone ? (getMission(cat, levelsCount - 1)?.target ?? 0) : cp.count;
  const target  = isDone ? (getMission(cat, levelsCount - 1)?.target ?? 0) : mission.target;
  const pct     = isDone ? 100 : Math.min(100, Math.round((count / target) * 100));
  const levelLabel = isDone ? `${levelsCount}/${levelsCount}` : `Niv. ${cp.level + 1}/${levelsCount}`;

  let rewardHtml = '';
  if (type === 'win') {
    if (isDone) {
      // Show the final (level 4 = index 4) reward as done
      rewardHtml = _winRewardBadge(cat, levelsCount - 1, true);
    } else {
      const xpLine = mission.xp > 0
        ? `<span class="ms-xp-reward">+${mission.xp} XP</span>`
        : '';
      const specialReward = _winRewardBadge(cat, cp.level, false);
      rewardHtml = xpLine + specialReward;
    }
  } else {
    rewardHtml = !isDone && mission
      ? `<span class="ms-xp-reward">+${mission.xp} XP</span>`
      : '';
  }

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
    ${rewardHtml}
  </div>`;
}

function _render() {
  const state = loadMissions();
  const modal = document.getElementById('missions-modal');

  // ── Category play ────────────────────────────────────────────────────────
  const catPlayHtml = MISSION_CATEGORIES.map(cat => {
    const cp    = state.categoryPlay[cat] ?? { level: 0, count: 0 };
    return _missionCardHtml(cat, cp, getCategoryMission, CAT_LEVELS_COUNT, CAT_COLOR[cat] ?? '#7c9dff', CAT_ABBR[cat] ?? '??', 'play');
  }).join('');

  // ── Category win ─────────────────────────────────────────────────────────
  const catWinHtml = MISSION_CATEGORIES.map(cat => {
    const cw    = state.categoryWin?.[cat] ?? { level: 0, count: 0 };
    return _missionCardHtml(cat, cw, getCategoryWinMission, WIN_CAT_LEVELS_COUNT, CAT_COLOR[cat] ?? '#7c9dff', CAT_ABBR[cat] ?? '??', 'win');
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
      <div class="ms-missions-list">${catPlayHtml}</div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header">Victorias por categoría</div>
      <div class="ms-missions-list">${catWinHtml}</div>
    </div>

    <div class="ms-section">
      <div class="ms-section-header">Victorias seguidas</div>
      <div class="ms-missions-list">${streakHtml}</div>
    </div>
  `;
}
