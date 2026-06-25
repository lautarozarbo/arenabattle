import { supabase } from '../supabase.js';
import { localCache } from './localCache.js';

const LS_STATS = 'arena_stats_lc';

let _cache = null;

function _defaults() {
  return {
    wins:          { quick1v1: 0, quick2v2: 0, sim2v2: 0, battle: 0, league: 0, tournament: 0, tower: 0 },
    losses:        { quick1v1: 0, quick2v2: 0, sim2v2: 0, battle: 0, league: 0, tournament: 0, tower: 0 },
    draws:         { quick1v1: 0, quick2v2: 0, sim2v2: 0, battle: 0, league: 0, tournament: 0 },
    championships: { league: 0, tournament: 0 },
    charUses:      {},
    favorites:     [],
    towerMaxFloor: 0,
    towerBestChar: null,
  };
}

function _get() {
  if (!_cache) {
    // Load from localStorage so stats survive page reloads without a cloud round-trip
    try {
      const saved = localStorage.getItem(LS_STATS);
      _cache = saved ? JSON.parse(saved) : null;
    } catch {}
    if (!_cache) _cache = _defaults();
  }
  return _cache;
}

async function _getUID() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function _persist(s) {
  _cache = s;
  // Write to localStorage immediately — survives page close, no network needed
  try { localStorage.setItem(LS_STATS, JSON.stringify(s)); } catch {}
  // Fire-and-forget cloud write
  (async () => {
    const uid = await _getUID();
    if (!uid) return;
    supabase.from('user_stats').upsert({
      user_id:          uid,
      wins:             s.wins,
      losses:           s.losses,
      draws:            s.draws,
      championships:    s.championships,
      char_uses:        s.charUses,
      favorites:        s.favorites,
      tower_max_floor:  s.towerMaxFloor ?? 0,
      tower_best_char:  s.towerBestChar ?? null,
      updated_at:       new Date().toISOString(),
    }).then(() => {});
  })();
}

// Merge two stat objects taking the maximum for each counter.
// Protects offline progress: if local has more wins than cloud, we keep the higher value.
function _mergeStats(local, cloud) {
  const def = _defaults();
  const maxKeys = (a, b, defaults) => {
    const result = { ...defaults };
    for (const k of Object.keys(result)) {
      result[k] = Math.max((a ?? {})[k] ?? 0, (b ?? {})[k] ?? 0);
    }
    return result;
  };
  // charUses: take max per character (avoids double-counting across devices)
  const allCharUses = {};
  for (const [id, n] of Object.entries(local.charUses ?? {})) allCharUses[id] = n;
  for (const [id, n] of Object.entries(cloud.charUses ?? {})) {
    allCharUses[id] = Math.max(allCharUses[id] ?? 0, n);
  }
  // favorites: union of both lists
  const favSet = new Set([...(local.favorites ?? []), ...(cloud.favorites ?? [])]);
  return {
    wins:          maxKeys(local.wins,          cloud.wins,          def.wins),
    losses:        maxKeys(local.losses,        cloud.losses,        def.losses),
    draws:         maxKeys(local.draws,         cloud.draws,         def.draws),
    championships: maxKeys(local.championships, cloud.championships, def.championships),
    charUses:      allCharUses,
    favorites:     [...favSet],
    towerMaxFloor: Math.max(local.towerMaxFloor ?? 0, cloud.towerMaxFloor ?? 0),
    towerBestChar: (cloud.towerMaxFloor ?? 0) >= (local.towerMaxFloor ?? 0)
      ? (cloud.towerBestChar ?? local.towerBestChar ?? null)
      : (local.towerBestChar ?? null),
  };
}

export async function syncStatsFromCloud() {
  const uid = await _getUID();
  if (!uid) {
    _cache = _defaults();
    return;
  }
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', uid)
    .single();

  const local = _get();
  if (data) {
    const def = _defaults();
    const cloud = {
      wins:          { ...def.wins,          ...(data.wins          ?? {}) },
      losses:        { ...def.losses,        ...(data.losses        ?? {}) },
      draws:         { ...def.draws,         ...(data.draws         ?? {}) },
      championships: { ...def.championships, ...(data.championships ?? {}) },
      charUses:      data.char_uses ?? {},
      favorites:     Array.isArray(data.favorites) ? data.favorites : [],
      towerMaxFloor: data.tower_max_floor ?? 0,
      towerBestChar: data.tower_best_char ?? null,
    };
    // Merge local + cloud, taking the higher value for all counters
    const merged = _mergeStats(local, cloud);
    _cache = merged;
    // Push merged state back to cloud if local was ahead
    if (JSON.stringify(merged) !== JSON.stringify(cloud)) _persist(merged);
    else { _cache = merged; try { localStorage.setItem(LS_STATS, JSON.stringify(merged)); } catch {} }
  } else {
    // No cloud row yet — persist local state to cloud
    _persist(local);
  }
}

function _key(mode) {
  if (mode === 'quickmatch')  return 'quick1v1';
  if (mode === 'tag2v2')      return 'quick2v2';
  if (mode === 'sim2v2')      return 'sim2v2';
  if (mode === 'battle')      return 'battle';
  if (mode === 'league')      return 'league';
  if (mode === 'tournament')  return 'tournament';
  if (mode === 'tower')       return 'tower';
  return null;
}

export function getStats()  { return _get(); }

export function recordWin(mode) {
  const s = _get(), k = _key(mode);
  if (!k) return;
  s.wins[k] = (s.wins[k] || 0) + 1;
  _persist(s);
}

export function recordLoss(mode) {
  const s = _get(), k = _key(mode);
  if (!k) return;
  s.losses[k] = (s.losses[k] || 0) + 1;
  _persist(s);
}

export function recordDraw(mode) {
  const s = _get(), k = _key(mode);
  if (!k) return;
  s.draws[k] = (s.draws[k] || 0) + 1;
  _persist(s);
}

export function recordChampionship(type) {
  const s = _get();
  if (type === 'league' || type === 'tournament') {
    s.championships[type]++;
    _persist(s);
  }
}

export function recordCharUse(powerId) {
  if (!powerId) return;
  const s = _get();
  s.charUses[powerId] = (s.charUses[powerId] || 0) + 1;
  _persist(s);
}

export function recordTowerRun(run) {
  const s = _get();
  if (run.floor > (s.towerMaxFloor ?? 0)) {
    s.towerMaxFloor = run.floor;
    s.towerBestChar = run.powerMeta?.id ?? null;
    _persist(s);
  }
}

export function getMostUsedChar(metas) {
  const s = _get();
  let bestId = null, bestCount = 0;
  for (const [id, count] of Object.entries(s.charUses)) {
    if (count > bestCount) { bestCount = count; bestId = id; }
  }
  if (!bestId) return null;
  return { meta: metas.find(m => m.id === bestId) ?? null, count: bestCount };
}

export function getFavorites()  { return _get().favorites; }
export function isFavorite(id) { return _get().favorites.includes(id); }

export function toggleFavorite(id) {
  const s = _get();
  const idx = s.favorites.indexOf(id);
  if (idx >= 0) s.favorites.splice(idx, 1);
  else s.favorites.push(id);
  _persist(s);
  return s.favorites.includes(id);
}
