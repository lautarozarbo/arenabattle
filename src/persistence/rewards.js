import { CHAR_SKINS } from '../skins/index.js';
import { ARENA_SKINS } from '../skins/arenaSkins.js';
import { supabase } from '../supabase.js';
import { MASTERY_MILESTONES } from '../mastery/milestones.js';

export const POINTS = {
  MATCH_COMPLETE:        5,
  MATCH_WIN:            10,
  EVENT_PER_PARTICIPANT: 3,
  EVENT_WIN:            20,
};

let _cache = { xp: 0, chests: 0, unlocked: {}, unlockedArena: {}, masteryClaimedFor: {} };

async function _getUID() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function _persist(d) {
  _cache = d;
  const uid = await _getUID();
  if (!uid) return;
  supabase.from('user_rewards').upsert({
    user_id:         uid,
    xp:              d.xp               ?? 0,
    chests:          d.chests           ?? 0,
    unlocked:        d.unlocked         ?? {},
    unlocked_arena:  d.unlockedArena    ?? {},
    mastery_claimed: d.masteryClaimedFor ?? {},
    updated_at:      new Date().toISOString(),
  }).then(() => {});
}

export async function syncRewardsFromCloud() {
  const uid = await _getUID();
  if (!uid) {
    _cache = { xp: 0, chests: 0, unlocked: {}, unlockedArena: {}, masteryClaimedFor: {} };
    return;
  }
  const { data } = await supabase
    .from('user_rewards')
    .select('*')
    .eq('user_id', uid)
    .single();
  _cache = data ? {
    xp:               data.xp              ?? 0,
    chests:           data.chests          ?? 0,
    unlocked:         data.unlocked        ?? {},
    unlockedArena:    data.unlocked_arena  ?? {},
    masteryClaimedFor: data.mastery_claimed ?? {},
  } : { xp: 0, chests: 0, unlocked: {}, unlockedArena: {}, masteryClaimedFor: {} };
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

export function getMasteryClaimedFor(charId) {
  return new Set(_cache.masteryClaimedFor?.[charId] ?? []);
}

export function isEffectUnlocked(charId) {
  return getMasteryClaimedFor(charId).has(100);
}

function _loadEffectsActive() {
  try { return JSON.parse(localStorage.getItem('mastery_effects') ?? '{}'); } catch { return {}; }
}

export function getEffectActive(charId) {
  if (!isEffectUnlocked(charId)) return false;
  return _loadEffectsActive()[charId] ?? false;
}

export function setEffectActive(charId, active) {
  const d = _loadEffectsActive();
  d[charId] = active;
  localStorage.setItem('mastery_effects', JSON.stringify(d));
}

export function getClaimableCount(charId, gamesPlayed) {
  const claimed = getMasteryClaimedFor(charId);
  return MASTERY_MILESTONES.filter(m => gamesPlayed >= m.games && !claimed.has(m.games)).length;
}

export function claimMasteryMilestone(charId, games) {
  const milestone = MASTERY_MILESTONES.find(m => m.games === games);
  if (!milestone) return null;
  const claimed = _cache.masteryClaimedFor?.[charId] ?? [];
  if (claimed.includes(games)) return null;

  const d = { ..._cache };
  d.masteryClaimedFor = { ...(d.masteryClaimedFor ?? {}) };
  d.masteryClaimedFor[charId] = [...claimed, games];
  d.xp     = (d.xp     ?? 0) + milestone.xp;
  d.chests = (d.chests ?? 0) + milestone.chests;
  while (d.xp >= 100) { d.xp -= 100; d.chests++; }
  _persist(d);
  if (milestone.effect) setEffectActive(charId, true);
  return { xp: milestone.xp, chests: milestone.chests, effect: milestone.effect };
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
