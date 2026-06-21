/**
 * Mission progress persistence.
 *   - localStorage (instant, offline fallback)
 *   - Supabase user_stats.missions_progress (cross-device)
 */

import { supabase } from '../supabase.js';
import { MISSION_CATEGORIES, STREAK_MILESTONES, getCategoryMission, CAT_LEVELS_COUNT } from '../missions/definitions.js';

const LS_KEY = 'arena_missions';

// ── Default state ─────────────────────────────────────────────────────────────

function _defaultState() {
  const categoryPlay = {};
  for (const cat of MISSION_CATEGORIES) {
    categoryPlay[cat] = { level: 0, count: 0 };
  }
  return {
    categoryPlay,
    winStreak: { current: 0, completed: [] },
    unlockedBadges: [],
    activeBadge: null,
  };
}

// ── Local load/save ───────────────────────────────────────────────────────────

export function loadMissions() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return _defaultState();
    const parsed = JSON.parse(raw);
    // Merge so new fields from _defaultState are always present
    const def = _defaultState();
    return {
      categoryPlay:   { ...def.categoryPlay,   ...(parsed.categoryPlay   ?? {}) },
      winStreak:      { ...def.winStreak,       ...(parsed.winStreak      ?? {}) },
      unlockedBadges: parsed.unlockedBadges ?? [],
      activeBadge:    parsed.activeBadge    ?? null,
    };
  } catch { return _defaultState(); }
}

function _save(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  _saveToCloud(state);
}

// ── Cloud ─────────────────────────────────────────────────────────────────────

async function _getUID() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function _saveToCloud(state) {
  (async () => {
    const uid = await _getUID();
    if (!uid) return;
    supabase.from('user_stats')
      .upsert({ user_id: uid, missions_progress: state, updated_at: new Date().toISOString() },
               { onConflict: 'user_id' })
      .then(() => {});
  })();
}

export async function syncMissionsFromCloud() {
  try {
    const uid = await _getUID();
    if (!uid) return;
    const { data } = await supabase
      .from('user_stats')
      .select('missions_progress')
      .eq('user_id', uid)
      .single();
    const cloud = data?.missions_progress;
    if (!cloud) return;
    // Cloud wins — merge into local
    const local = loadMissions();
    const merged = _mergeStates(local, cloud);
    try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch {}
  } catch {}
}

function _mergeStates(a, b) {
  // Take whichever has more progress per field
  const categoryPlay = {};
  for (const cat of MISSION_CATEGORIES) {
    const ac = a.categoryPlay?.[cat] ?? { level: 0, count: 0 };
    const bc = b.categoryPlay?.[cat] ?? { level: 0, count: 0 };
    categoryPlay[cat] = (bc.level > ac.level || (bc.level === ac.level && bc.count > ac.count)) ? bc : ac;
  }
  const aStreak = a.winStreak ?? { current: 0, completed: [] };
  const bStreak = b.winStreak ?? { current: 0, completed: [] };
  const completedSet = new Set([...(aStreak.completed ?? []), ...(bStreak.completed ?? [])]);
  const badgeSet = new Set([...(a.unlockedBadges ?? []), ...(b.unlockedBadges ?? [])]);
  return {
    categoryPlay,
    winStreak: {
      current:   Math.max(aStreak.current ?? 0, bStreak.current ?? 0),
      completed: [...completedSet],
    },
    unlockedBadges: [...badgeSet],
    activeBadge:    b.activeBadge ?? a.activeBadge ?? null,
  };
}

// ── Game event handlers ───────────────────────────────────────────────────────

/**
 * Call after every game result.
 * charCategory: e.g. 'Cuerpo a cuerpo' — the category of the char the player used.
 * won: true/false/null (null = draw)
 * Returns array of completed missions { type, label, xp, badge? } for toast display.
 */
export function recordMissionEvent(charCategory, won) {
  const state    = loadMissions();
  const rewards  = [];

  // ── Category play ──────────────────────────────────────────────────────────
  if (charCategory && state.categoryPlay[charCategory] !== undefined) {
    const cp = state.categoryPlay[charCategory];
    if (cp.level < CAT_LEVELS_COUNT) {
      cp.count++;
      const mission = getCategoryMission(charCategory, cp.level);
      if (cp.count >= mission.target) {
        rewards.push({ type: 'category', label: mission.label, xp: mission.xp });
        cp.level++;
        cp.count = 0;
      }
    }
  }

  // ── Win streak ─────────────────────────────────────────────────────────────
  if (won === true) {
    state.winStreak.current++;
    const cur = state.winStreak.current;
    for (const ms of STREAK_MILESTONES) {
      if (cur >= ms.target && !state.winStreak.completed.includes(ms.target)) {
        state.winStreak.completed.push(ms.target);
        const reward = { type: 'streak', label: `¡${ms.target} victorias seguidas!`, xp: ms.xp };
        if (ms.badge) {
          reward.badge = ms.badge;
          if (!state.unlockedBadges.includes(ms.badge)) {
            state.unlockedBadges.push(ms.badge);
          }
        }
        rewards.push(reward);
      }
    }
  } else if (won === false) {
    state.winStreak.current = 0;
  }
  // draw: don't reset streak, don't increment

  _save(state);
  return rewards;
}

export function setActiveBadge(badgeId) {
  const state = loadMissions();
  state.activeBadge = badgeId;
  _save(state);
}
