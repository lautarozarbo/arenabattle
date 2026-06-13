import { CHAR_SKINS } from '../skins/index.js';
import { ARENA_SKINS } from '../skins/arenaSkins.js';
import { supabase } from '../supabase.js';

const LS_REWARDS = 'arena_rewards';

export const POINTS = {
  MATCH_COMPLETE:        5,
  MATCH_WIN:            10,
  EVENT_PER_PARTICIPANT: 3,
  EVENT_WIN:            20,
};

let _cache = null;

function _loadLocal() {
  try { const r = localStorage.getItem(LS_REWARDS); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}

function _getCache() {
  if (!_cache) _cache = _loadLocal();
  return _cache;
}

function _saveLocal(d) {
  try { localStorage.setItem(LS_REWARDS, JSON.stringify(d)); } catch {}
}

async function _getUID() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function _persist(d) {
  _cache = d;
  _saveLocal(d);
  const uid = await _getUID();
  if (!uid) return;
  supabase.from('user_rewards').upsert({
    user_id:        uid,
    xp:             d.xp             ?? 0,
    chests:         d.chests         ?? 0,
    unlocked:       d.unlocked       ?? {},
    unlocked_arena: d.unlockedArena  ?? {},
    updated_at:     new Date().toISOString(),
  }).then(() => {});
}

export async function syncRewardsFromCloud(migrateLocal = false) {
  const uid = await _getUID();
  if (!uid) return;
  const { data } = await supabase
    .from('user_rewards')
    .select('*')
    .eq('user_id', uid)
    .single();
  if (data) {
    _cache = {
      xp:            data.xp             ?? 0,
      chests:        data.chests         ?? 0,
      unlocked:      data.unlocked       ?? {},
      unlockedArena: data.unlocked_arena ?? {},
    };
    _saveLocal(_cache);
  } else if (migrateLocal) {
    const local = _loadLocal();
    const hasLocal = (local.xp ?? 0) > 0 || (local.chests ?? 0) > 0
      || Object.keys(local.unlocked ?? {}).length > 0
      || Object.keys(local.unlockedArena ?? {}).length > 0;
    if (hasLocal) {
      _cache = local;
      await supabase.from('user_rewards').upsert({
        user_id:        uid,
        xp:             local.xp             ?? 0,
        chests:         local.chests         ?? 0,
        unlocked:       local.unlocked       ?? {},
        unlocked_arena: local.unlockedArena  ?? {},
        updated_at:     new Date().toISOString(),
      });
    }
  }
}

export function getXP()     { return _getCache().xp     ?? 0; }
export function getChests() { return _getCache().chests  ?? 0; }

export function isSkinUnlocked(charId, skinId) {
  if (!skinId || skinId === 'default') return true;
  return !!(_getCache().unlocked ?? {})[charId]?.[skinId];
}

export function isArenaSkinUnlocked(skinId) {
  if (!skinId || skinId === 'default') return true;
  return !!(_getCache().unlockedArena ?? {})[skinId];
}

export function addPoints(amount) {
  if (amount <= 0) return { xp: getXP(), chests: getChests(), gained: 0 };
  const d = _getCache();
  d.xp     = (d.xp     ?? 0) + amount;
  d.chests = (d.chests ?? 0);
  while (d.xp >= 100) { d.xp -= 100; d.chests++; }
  _persist(d);
  return { xp: d.xp, chests: d.chests, gained: amount };
}

export function openChest() {
  const d = _getCache();
  if ((d.chests ?? 0) <= 0) return null;
  d.chests--;

  const unlocked      = d.unlocked      ?? {};
  const unlockedArena = d.unlockedArena ?? {};
  const locked = [];

  for (const [charId, skins] of Object.entries(CHAR_SKINS)) {
    for (const skin of skins) {
      if (skin.id !== 'default' && !unlocked[charId]?.[skin.id]) {
        locked.push({ type: 'skin', charId, skinId: skin.id, skinName: skin.name });
      }
    }
  }
  for (const skin of ARENA_SKINS) {
    if (skin.id !== 'default' && !unlockedArena[skin.id]) {
      locked.push({ type: 'arena_skin', skinId: skin.id, skinName: skin.name });
    }
  }

  if (!locked.length) {
    return { type: 'all_unlocked' };
  }

  const pick = locked[Math.floor(Math.random() * locked.length)];
  if (pick.type === 'skin') {
    d.unlocked = unlocked;
    d.unlocked[pick.charId] = d.unlocked[pick.charId] ?? {};
    d.unlocked[pick.charId][pick.skinId] = true;
  } else {
    d.unlockedArena = unlockedArena;
    d.unlockedArena[pick.skinId] = true;
  }
  _persist(d);
  return pick;
}
