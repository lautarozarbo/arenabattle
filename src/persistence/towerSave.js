/**
 * Tower run persistence.
 *
 * In-progress run saved to:
 *   - localStorage  (instant, offline fallback)
 *   - Supabase user_stats.tower_saved_run  (cross-device)
 *
 * Best run saved to:
 *   - localStorage  (local display / fallback)
 *   - Supabase user_stats.tower_max_floor / tower_best_char  (via stats.js)
 */

import { supabase } from '../supabase.js';

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

  // Fire-and-forget cloud save
  _saveToCloud(payload);
}

async function _saveToCloud(payload) {
  const uid = await _getUID();
  if (!uid) return;
  supabase.from('user_stats')
    .upsert({ user_id: uid, tower_saved_run: payload, updated_at: new Date().toISOString() },
             { onConflict: 'user_id' })
    .then(() => {});
}

export function loadTowerRun() {
  try {
    const raw = localStorage.getItem(LS_SAVED);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Load saved run from cloud (used on fresh device where localStorage is empty). */
export async function loadTowerRunCloud() {
  const uid = await _getUID();
  if (!uid) return null;
  const { data } = await supabase
    .from('user_stats')
    .select('tower_saved_run')
    .eq('user_id', uid)
    .single();
  return data?.tower_saved_run ?? null;
}

export function clearTowerRun() {
  try { localStorage.removeItem(LS_SAVED); } catch {}
  _clearFromCloud();
}

async function _clearFromCloud() {
  const uid = await _getUID();
  if (!uid) return;
  supabase.from('user_stats')
    .update({ tower_saved_run: null, updated_at: new Date().toISOString() })
    .eq('user_id', uid)
    .then(() => {});
}

// ── Best run record (local only — cloud via stats.js recordTowerRun) ─────────

export function maybeSaveBestRun(run) {
  const best = getBestTowerRun();
  if (best && best.floor >= run.floor) return;
  const record = {
    floor:        run.floor,
    powerMetaId:  run.powerMeta.id,
    powerName:    run.powerMeta.name,
    upgradeCount: run.upgrades.length,
    date:         Date.now(),
  };
  try { localStorage.setItem(LS_BEST, JSON.stringify(record)); } catch {}
}

export function getBestTowerRun() {
  try {
    const raw = localStorage.getItem(LS_BEST);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
