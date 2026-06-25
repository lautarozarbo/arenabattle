// Persistent localStorage layer for cloud-synced user data.
// All UI reads come from here (instant, offline-safe).
// Supabase is write-only during gameplay; reads only populate this cache.

const LS_KEY = 'arena_lc';

function _read() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') ?? {}; } catch { return {}; }
}
function _write(obj) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch {}
}

export const localCache = {
  get(field)        { return _read()[field]; },
  set(field, value) { const o = _read(); o[field] = value; _write(o); },
  merge(updates)    { const o = _read(); Object.assign(o, updates); _write(o); },
  clear()           { try { localStorage.removeItem(LS_KEY); } catch {} },
};

// Call on logout so the next user doesn't see stale data.
export function clearUserCaches() {
  localCache.clear();
  try { localStorage.removeItem('arena_stats_lc');    } catch {}
  try { localStorage.removeItem('arena_rewards_lc');  } catch {}
  try { localStorage.removeItem('arena_friend_code'); } catch {}
}
