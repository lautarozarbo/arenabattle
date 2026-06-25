/**
 * Tower run persistence. Local-first architecture:
 *   - localStorage  (instant, offline-safe — primary source of truth)
 *   - localCache    (cross-device cloud snapshot, warmed at login)
 *   - Supabase      (write-only during gameplay; reads only at login)
 */

import { supabase } from '../supabase.js';
import { localCache } from './localCache.js';

const LS_SAVED = 'tower_saved_run';
const LS_BEST  = 'tower_best_run';

async function _getUID() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ── In-progress run ──────────────────────────────────────────────────────────

export function saveTowerRun(run, pendingFloor = null) {
  const payload = {
    powerMetaId:  run.powerMeta.id,
    category:     run.category,
    floor:        run.floor,
    upgrades:     [...run.upgrades],
    playerMods:   { ...run.playerMods },
    powerMods:    { ...run.powerMods },
    pendingFloor: pendingFloor ?? null,
    savedAt:      Date.now(),
  };
  try { localStorage.setItem(LS_SAVED, JSON.stringify(payload)); } catch {}
  localCache.set('tower_saved_run', payload); // also update cross-device cache

  // Fire-and-forget cloud save
  (async () => {
    const uid = await _getUID();
    if (!uid) return;
    supabase.from('user_stats')
      .upsert({ user_id: uid, tower_saved_run: payload, updated_at: new Date().toISOString() },
               { onConflict: 'user_id' })
      .then(() => {});
  })();
}

export function loadTowerRun() {
  try {
    const raw = localStorage.getItem(LS_SAVED);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Returns the saved run, preferring the most recent between local and cloud cache.
 * If localCache is empty (new device, first load), fetches from cloud once.
 * Never blocks the UI — falls back to local if cloud is unavailable.
 */
export async function loadTowerRunCloud() {
  const uid = await _getUID();
  if (!uid) return { save: null, loggedIn: false };

  const localSave = loadTowerRun();
  const cached    = localCache.get('tower_saved_run');

  if (cached !== undefined) {
    // Pick the most recent between local and cached cloud value
    let save;
    if (cached === null) {
      // Cloud cleared the run (e.g. abandoned on another device)
      try { localStorage.removeItem(LS_SAVED); } catch {}
      save = null;
    } else if (localSave && (localSave.savedAt ?? 0) >= (cached.savedAt ?? 0)) {
      save = localSave;
    } else {
      save = cached;
      try { localStorage.setItem(LS_SAVED, JSON.stringify(cached)); } catch {}
    }
    return { save, loggedIn: true };
  }

  // Cache miss: one-time cloud fetch (new device / first load after app update)
  try {
    const { data } = await supabase
      .from('user_stats')
      .select('tower_saved_run')
      .eq('user_id', uid)
      .single();
    const cloudSave = data?.tower_saved_run ?? null;
    localCache.set('tower_saved_run', cloudSave);
    let save;
    if (!cloudSave) {
      try { localStorage.removeItem(LS_SAVED); } catch {}
      save = null;
    } else if (localSave && (localSave.savedAt ?? 0) >= (cloudSave.savedAt ?? 0)) {
      save = localSave;
    } else {
      save = cloudSave;
      try { localStorage.setItem(LS_SAVED, JSON.stringify(cloudSave)); } catch {}
    }
    return { save, loggedIn: true };
  } catch {
    return { save: localSave, loggedIn: true };
  }
}

export function clearTowerRun() {
  try { localStorage.removeItem(LS_SAVED); } catch {}
  localCache.set('tower_saved_run', null);
  (async () => {
    const uid = await _getUID();
    if (!uid) return;
    supabase.from('user_stats')
      .update({ tower_saved_run: null, updated_at: new Date().toISOString() })
      .eq('user_id', uid)
      .then(() => {});
  })();
}

// ── Best run record ──────────────────────────────────────────────────────────

export function maybeSaveBestRun(run) {
  const best = getBestTowerRun();
  if (best && best.floor >= run.floor) return;
  const record = {
    floor:       run.floor,
    powerMetaId: run.powerMeta.id,
    upgrades:    [...run.upgrades],
    date:        Date.now(),
  };
  try { localStorage.setItem(LS_BEST, JSON.stringify(record)); } catch {}
  localCache.set('tower_best_run', record);

  (async () => {
    const uid = await _getUID();
    if (!uid) return;
    supabase.from('user_stats')
      .upsert({ user_id: uid, tower_best_run: record, updated_at: new Date().toISOString() },
               { onConflict: 'user_id' })
      .then(() => {});
  })();
}

export function getBestTowerRun() {
  try {
    const raw = localStorage.getItem(LS_BEST);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Returns the best run from local + cloud cache; never blocks on network. */
export async function loadBestTowerRunCloud() {
  const uid = await _getUID();
  if (!uid) return null;

  const localBest  = getBestTowerRun();
  const cachedBest = localCache.get('tower_best_run');

  if (cachedBest !== undefined) {
    // Pick the higher floor between local and cached cloud value
    if (!cachedBest) return localBest;
    if (!localBest || (cachedBest.floor ?? 0) >= (localBest.floor ?? 0)) return cachedBest;
    return localBest;
  }

  // Cache miss: one-time cloud fetch
  try {
    const { data } = await supabase
      .from('user_stats')
      .select('tower_best_run')
      .eq('user_id', uid)
      .single();
    const cloudBest = data?.tower_best_run ?? null;
    localCache.set('tower_best_run', cloudBest);
    if (!cloudBest) return localBest;
    if (!localBest || (cloudBest.floor ?? 0) >= (localBest.floor ?? 0)) return cloudBest;
    return localBest;
  } catch {
    return localBest;
  }
}

// ── Full sync (called at login to warm the cache) ─────────────────────────────

export async function syncTowerFromCloud() {
  const uid = await _getUID();
  if (!uid) return;
  try {
    const { data } = await supabase
      .from('user_stats')
      .select('tower_saved_run, tower_best_run')
      .eq('user_id', uid)
      .single();
    if (!data) return;
    localCache.set('tower_saved_run', data.tower_saved_run ?? null);
    localCache.set('tower_best_run',  data.tower_best_run  ?? null);
    // Apply to localStorage if cloud is newer
    const cloudSaved = data.tower_saved_run;
    const localSaved = loadTowerRun();
    if (cloudSaved && (!localSaved || (cloudSaved.savedAt ?? 0) > (localSaved.savedAt ?? 0))) {
      try { localStorage.setItem(LS_SAVED, JSON.stringify(cloudSaved)); } catch {}
    } else if (!cloudSaved && localSaved) {
      // Cloud cleared the run on another device — respect it
      try { localStorage.removeItem(LS_SAVED); } catch {}
    }
    const cloudBest = data.tower_best_run;
    const localBest = getBestTowerRun();
    if (cloudBest && (!localBest || (cloudBest.floor ?? 0) > (localBest.floor ?? 0))) {
      try { localStorage.setItem(LS_BEST, JSON.stringify(cloudBest)); } catch {}
    }
  } catch {}
}
