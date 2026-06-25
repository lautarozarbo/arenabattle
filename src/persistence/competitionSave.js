/**
 * Cloud sync for in-progress league and tournament saves.
 *
 * Local-first: reads always come from localCache (instant, offline-safe).
 * Supabase is used only for writes (fire-and-forget) and the full sync at login.
 */

import { supabase } from '../supabase.js';
import { localCache } from './localCache.js';

async function _getUID() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function _upsert(fields) {
  const uid = await _getUID();
  if (!uid) return;
  supabase.from('user_stats')
    .upsert({ user_id: uid, ...fields, updated_at: new Date().toISOString() },
             { onConflict: 'user_id' })
    .then(() => {});
}

async function _clear(fields) {
  const uid = await _getUID();
  if (!uid) return;
  supabase.from('user_stats')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('user_id', uid)
    .then(() => {});
}

// ── League ────────────────────────────────────────────────────────────────────

export function saveLeagueCloud(payload) {
  localCache.set('league_saved', payload); // instant local write
  _upsert({ league_saved: payload });
}

export function clearLeagueCloud() {
  localCache.set('league_saved', null);
  _clear({ league_saved: null });
}

/**
 * Returns the current league save. Reads from localCache (instant).
 * If localCache is empty (first load on a new device), fetches from cloud once
 * and caches the result for all future calls.
 */
export async function loadLeagueCloud() {
  const uid = await _getUID();
  if (!uid) return { save: null, loggedIn: false };

  const cached = localCache.get('league_saved');
  if (cached !== undefined) {
    return { save: cached, loggedIn: true };
  }

  // Cache miss: one-time cloud fetch (new device / first load after app update)
  try {
    const { data } = await supabase
      .from('user_stats')
      .select('league_saved')
      .eq('user_id', uid)
      .single();
    const save = data?.league_saved ?? null;
    localCache.set('league_saved', save);
    return { save, loggedIn: true };
  } catch {
    return { save: null, loggedIn: true };
  }
}

// ── Tournament ────────────────────────────────────────────────────────────────

export function saveTournamentCloud(payload) {
  localCache.set('tournament_saved', payload);
  _upsert({ tournament_saved: payload });
}

export function clearTournamentCloud() {
  localCache.set('tournament_saved', null);
  _clear({ tournament_saved: null });
}

export async function loadTournamentCloud() {
  const uid = await _getUID();
  if (!uid) return { save: null, loggedIn: false };

  const cached = localCache.get('tournament_saved');
  if (cached !== undefined) {
    return { save: cached, loggedIn: true };
  }

  try {
    const { data } = await supabase
      .from('user_stats')
      .select('tournament_saved')
      .eq('user_id', uid)
      .single();
    const save = data?.tournament_saved ?? null;
    localCache.set('tournament_saved', save);
    return { save, loggedIn: true };
  } catch {
    return { save: null, loggedIn: true };
  }
}

// ── Full sync (called at login to warm the cache) ─────────────────────────────

export async function syncCompetitionFromCloud() {
  const uid = await _getUID();
  if (!uid) return;
  try {
    const { data } = await supabase
      .from('user_stats')
      .select('league_saved, tournament_saved')
      .eq('user_id', uid)
      .single();
    if (!data) return;
    localCache.set('league_saved',     data.league_saved     ?? null);
    localCache.set('tournament_saved', data.tournament_saved ?? null);
  } catch {}
}
