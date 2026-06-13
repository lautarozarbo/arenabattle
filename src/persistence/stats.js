import { supabase } from '../supabase.js';

const LS_STATS = 'arena_stats';

let _cache = null;

function _defaults() {
  return {
    wins:          { quick1v1: 0, quick2v2: 0, league: 0, tournament: 0 },
    losses:        { quick1v1: 0, quick2v2: 0, league: 0, tournament: 0 },
    draws:         { quick1v1: 0, quick2v2: 0, league: 0, tournament: 0 },
    championships: { league: 0, tournament: 0 },
    charUses:      {},
    favorites:     [],
  };
}

function _loadLocal() {
  try {
    const raw = localStorage.getItem(LS_STATS);
    if (raw) {
      const d   = JSON.parse(raw);
      const def = _defaults();
      return {
        wins:          { ...def.wins,          ...d.wins          },
        losses:        { ...def.losses,        ...d.losses        },
        draws:         { ...def.draws,         ...d.draws         },
        championships: { ...def.championships, ...d.championships },
        charUses:      { ...(d.charUses ?? {}) },
        favorites:     Array.isArray(d.favorites) ? [...d.favorites] : [],
      };
    }
  } catch {}
  return _defaults();
}

function _getCache() {
  if (!_cache) _cache = _loadLocal();
  return _cache;
}

async function _getUID() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function _persist(s) {
  _cache = s;
  try { localStorage.setItem(LS_STATS, JSON.stringify(s)); } catch {}
  const uid = await _getUID();
  if (!uid) return;
  supabase.from('user_stats').upsert({
    user_id:       uid,
    wins:          s.wins,
    losses:        s.losses,
    draws:         s.draws,
    championships: s.championships,
    char_uses:     s.charUses,
    favorites:     s.favorites,
    updated_at:    new Date().toISOString(),
  }).then(() => {});
}

export async function syncStatsFromCloud(migrateLocal = false) {
  const uid = await _getUID();
  if (!uid) return;
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', uid)
    .single();
  if (data) {
    const def = _defaults();
    _cache = {
      wins:          { ...def.wins,          ...(data.wins          ?? {}) },
      losses:        { ...def.losses,        ...(data.losses        ?? {}) },
      draws:         { ...def.draws,         ...(data.draws         ?? {}) },
      championships: { ...def.championships, ...(data.championships ?? {}) },
      charUses:      data.char_uses  ?? {},
      favorites:     Array.isArray(data.favorites) ? data.favorites : [],
    };
    try { localStorage.setItem(LS_STATS, JSON.stringify(_cache)); } catch {}
  } else if (migrateLocal) {
    const local = _loadLocal();
    const hasLocal = Object.values(local.wins).some(v => v > 0)
      || Object.values(local.losses).some(v => v > 0)
      || Object.keys(local.charUses).length > 0;
    if (hasLocal) {
      _cache = local;
      await supabase.from('user_stats').upsert({
        user_id:       uid,
        wins:          local.wins,
        losses:        local.losses,
        draws:         local.draws,
        championships: local.championships,
        char_uses:     local.charUses,
        favorites:     local.favorites,
        updated_at:    new Date().toISOString(),
      });
    }
  }
}

function _key(mode) {
  if (mode === 'quickmatch')  return 'quick1v1';
  if (mode === 'tag2v2')      return 'quick2v2';
  if (mode === 'league')      return 'league';
  if (mode === 'tournament')  return 'tournament';
  return null;
}

export function getStats() { return _getCache(); }

export function recordWin(mode) {
  const s = _getCache(), k = _key(mode);
  if (!k) return;
  s.wins[k] = (s.wins[k] || 0) + 1;
  _persist(s);
}

export function recordLoss(mode) {
  const s = _getCache(), k = _key(mode);
  if (!k) return;
  s.losses[k] = (s.losses[k] || 0) + 1;
  _persist(s);
}

export function recordDraw(mode) {
  const s = _getCache(), k = _key(mode);
  if (!k) return;
  s.draws[k] = (s.draws[k] || 0) + 1;
  _persist(s);
}

export function recordChampionship(type) {
  const s = _getCache();
  if (type === 'league' || type === 'tournament') {
    s.championships[type]++;
    _persist(s);
  }
}

export function recordCharUse(powerId) {
  if (!powerId) return;
  const s = _getCache();
  s.charUses[powerId] = (s.charUses[powerId] || 0) + 1;
  _persist(s);
}

export function getMostUsedChar(metas) {
  const s = _getCache();
  let bestId = null, bestCount = 0;
  for (const [id, count] of Object.entries(s.charUses)) {
    if (count > bestCount) { bestCount = count; bestId = id; }
  }
  if (!bestId) return null;
  return { meta: metas.find(m => m.id === bestId) ?? null, count: bestCount };
}

export function getFavorites() {
  return _getCache().favorites;
}

export function isFavorite(id) {
  return _getCache().favorites.includes(id);
}

export function toggleFavorite(id) {
  const s = _getCache();
  const idx = s.favorites.indexOf(id);
  if (idx >= 0) s.favorites.splice(idx, 1);
  else s.favorites.push(id);
  _persist(s);
  return s.favorites.includes(id);
}
