import { CHAR_SKINS } from '../skins/index.js';
import { ARENA_SKINS } from '../skins/arenaSkins.js';

const LS_REWARDS = 'arena_rewards';

export const POINTS = {
  MATCH_COMPLETE:        5,
  MATCH_WIN:            10,
  EVENT_PER_PARTICIPANT: 3,
  EVENT_WIN:            20,
};

function _load() {
  try { const r = localStorage.getItem(LS_REWARDS); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function _save(d) {
  try { localStorage.setItem(LS_REWARDS, JSON.stringify(d)); } catch {}
}

export function getXP()     { return _load().xp     ?? 0; }
export function getChests() { return _load().chests  ?? 0; }

export function isSkinUnlocked(charId, skinId) {
  if (!skinId || skinId === 'default') return true;
  return !!(_load().unlocked ?? {})[charId]?.[skinId];
}

export function isArenaSkinUnlocked(skinId) {
  if (!skinId || skinId === 'default') return true;
  return !!(_load().unlockedArena ?? {})[skinId];
}

// Returns { xp, chests, gained }
export function addPoints(amount) {
  if (amount <= 0) return { xp: getXP(), chests: getChests(), gained: 0 };
  const d = _load();
  d.xp     = (d.xp     ?? 0) + amount;
  d.chests = (d.chests ?? 0);
  while (d.xp >= 100) { d.xp -= 100; d.chests++; }
  _save(d);
  return { xp: d.xp, chests: d.chests, gained: amount };
}

// Returns { type:'skin', charId, skinId, skinName }
//       | { type:'arena_skin', skinId, skinName }
//       | { type:'all_unlocked' }
//       | null
export function openChest() {
  const d = _load();
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
    // Don't consume the chest — player already has everything
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
  _save(d);
  return pick;
}
