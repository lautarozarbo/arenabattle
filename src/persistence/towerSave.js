/**
 * Tower run persistence — save/load/clear an in-progress run and best-run record.
 *
 * Saved run  (LS key: 'tower_saved_run'):
 *   { powerMetaId, category, floor, upgrades, playerMods, powerMods, savedAt }
 *
 * Best run   (LS key: 'tower_best_run'):
 *   { floor, powerMetaId, powerName, upgradeCount, date }
 */

const LS_SAVED = 'tower_saved_run';
const LS_BEST  = 'tower_best_run';

// ── In-progress run ──────────────────────────────────────────────────────────

export function saveTowerRun(run) {
  const payload = {
    powerMetaId: run.powerMeta.id,
    category:    run.category,
    floor:       run.floor,
    upgrades:    [...run.upgrades],
    playerMods:  { ...run.playerMods },
    powerMods:   { ...run.powerMods },
    savedAt:     Date.now(),
  };
  try { localStorage.setItem(LS_SAVED, JSON.stringify(payload)); } catch {}
}

export function loadTowerRun() {
  try {
    const raw = localStorage.getItem(LS_SAVED);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearTowerRun() {
  try { localStorage.removeItem(LS_SAVED); } catch {}
}

// ── Best run record ──────────────────────────────────────────────────────────

export function maybeSaveBestRun(run) {
  const best = getBestTowerRun();
  if (best && best.floor >= run.floor) return; // not better
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
