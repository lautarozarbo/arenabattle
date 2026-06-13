import { CHAR_SKINS } from '../skins/index.js';
import { ARENA_SKINS } from '../skins/arenaSkins.js';
import { supabase } from '../supabase.js';

export const POINTS = {
  MATCH_COMPLETE:        5,
  MATCH_WIN:            10,
  EVENT_PER_PARTICIPANT: 3,
  EVENT_WIN:            20,
};

let _cache = { xp: 0, chests: 0, unlocked: {}, unlockedArena: {} };

async function _getUID() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function _persist(d) {
  _cache = d;
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

export async function syncRewardsFromCloud() {
  const uid = await _getUID();
  if (!uid) {
    _cache = { xp: 0, chests: 0, unlocked: {}, unlockedArena: {} };
    return;
  }
  const { data } = await supabase
    .from('user_rewards')
    .select('*')
    .eq('user_id', uid)
    .single();
  _cache = data ? {
    xp:            data.xp             ?? 0,
    chests:        data.chests         ?? 0,
    unlocked:      data.unlocked       ?? {},
    unlockedArena: data.unlocked_arena ?? {},
  } : { xp: 0, chests: 0, unlocked: {}, unlockedArena: {} };
}

export function getXP()     { return _cache.xp     ?? 0; }
export function getChests() { return _cache.chests  ?? 0; }

export function isSkinUnlocked(charId, skinId) {
  if (!skinId || skinId === 'default') return true;
  return !!(_cache.unlocked ?? {})[charId]?.[skinId];
}

export function isArenaSkinUnlocked(skinId) {
  if (!skinId || skinId === 'default') return true;
  return !!(_cache.unlockedArena ?? {})[skinId];
}

export function addPoints(amount) {
  if (amount <= 0) return { xp: getXP(), chests: getChests(), gained: 0 };
  const d = { ..._cache };
  d.xp     = (d.xp     ?? 0) + amount;
  d.chests = (d.chests ?? 0);
  while (d.xp >= 100) { d.xp -= 100; d.chests++; }
  _persist(d);
  return { xp: d.xp, chests: d.chests, gained: amount };
}

export function openChest() {
  const d = { ..._cache };
  if ((d.chests ?? 0) <= 0) return null;
  d.chests--;

  const unlocked      = { ...(d.unlocked      ?? {}) };
  const unlockedArena = { ...(d.unlockedArena ?? {}) };
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

  if (!locked.length) return { type: 'all_unlocked' };

  const pick = locked[Math.floor(Math.random() * locked.length)];
  if (pick.type === 'skin') {
    unlocked[pick.charId] = unlocked[pick.charId] ?? {};
    unlocked[pick.charId][pick.skinId] = true;
    d.unlocked = unlocked;
  } else {
    unlockedArena[pick.skinId] = true;
    d.unlockedArena = unlockedArena;
  }
  _persist(d);
  return pick;
}
