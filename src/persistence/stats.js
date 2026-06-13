const LS_STATS = 'arena_stats';

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

function _load() {
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

function _save(s) {
  try { localStorage.setItem(LS_STATS, JSON.stringify(s)); } catch {}
}

function _key(mode) {
  if (mode === 'quickmatch')  return 'quick1v1';
  if (mode === 'tag2v2')      return 'quick2v2';
  if (mode === 'league')      return 'league';
  if (mode === 'tournament')  return 'tournament';
  return null;
}

export function getStats() { return _load(); }

export function recordWin(mode) {
  const s = _load(), k = _key(mode);
  if (!k) return;
  s.wins[k] = (s.wins[k] || 0) + 1;
  _save(s);
}

export function recordLoss(mode) {
  const s = _load(), k = _key(mode);
  if (!k) return;
  s.losses[k] = (s.losses[k] || 0) + 1;
  _save(s);
}

export function recordDraw(mode) {
  const s = _load(), k = _key(mode);
  if (!k) return;
  s.draws[k] = (s.draws[k] || 0) + 1;
  _save(s);
}

export function recordChampionship(type) {
  const s = _load();
  if (type === 'league' || type === 'tournament') {
    s.championships[type]++;
    _save(s);
  }
}

export function recordCharUse(powerId) {
  if (!powerId) return;
  const s = _load();
  s.charUses[powerId] = (s.charUses[powerId] || 0) + 1;
  _save(s);
}

export function getMostUsedChar(metas) {
  const s = _load();
  let bestId = null, bestCount = 0;
  for (const [id, count] of Object.entries(s.charUses)) {
    if (count > bestCount) { bestCount = count; bestId = id; }
  }
  if (!bestId) return null;
  return { meta: metas.find(m => m.id === bestId) ?? null, count: bestCount };
}

export function getFavorites() {
  return _load().favorites;
}

export function isFavorite(id) {
  return _load().favorites.includes(id);
}

export function toggleFavorite(id) {
  const s = _load();
  const idx = s.favorites.indexOf(id);
  if (idx >= 0) s.favorites.splice(idx, 1);
  else s.favorites.push(id);
  _save(s);
  return s.favorites.includes(id);
}
