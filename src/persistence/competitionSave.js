/**
 * Cloud sync for in-progress league and tournament saves.
 *
 * Mirrors the towerSave.js pattern:
 *   - localStorage (instant, offline fallback)
 *   - Supabase user_stats.league_saved / tournament_saved (cross-device)
 *
 * Requires these JSONB columns in user_stats:
 *   league_saved      jsonb default null
 *   tournament_saved  jsonb default null
 */

import { supabase } from '../supabase.js';

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
  _upsert({ league_saved: payload });
}

export async function loadLeagueCloud() {
  const uid = await _getUID();
  if (!uid) return { save: null, loggedIn: false };
  const { data } = await supabase
    .from('user_stats')
    .select('league_saved')
    .eq('user_id', uid)
    .single();
  return { save: data?.league_saved ?? null, loggedIn: true };
}

export function clearLeagueCloud() {
  _clear({ league_saved: null });
}

// ── Tournament ────────────────────────────────────────────────────────────────

export function saveTournamentCloud(payload) {
  _upsert({ tournament_saved: payload });
}

export async function loadTournamentCloud() {
  const uid = await _getUID();
  if (!uid) return { save: null, loggedIn: false };
  const { data } = await supabase
    .from('user_stats')
    .select('tournament_saved')
    .eq('user_id', uid)
    .single();
  return { save: data?.tournament_saved ?? null, loggedIn: true };
}

export function clearTournamentCloud() {
  _clear({ tournament_saved: null });
}
