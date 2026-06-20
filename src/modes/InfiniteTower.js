/**
 * InfiniteTower — orchestrator for the infinite tower roguelike mode.
 *
 * Flow per floor:
 *   _advanceFloor  → generates enemy config ONCE (fixes preview/fight mismatch)
 *                  → shows floor transition with correct enemy info
 *   player taps    → _launchFight with the same pre-generated config
 *   win            → upgrade picker → pick → _advanceFloor
 *   lose           → run-over screen → onRunEnd
 */

import { TowerRun }          from './tower/TowerRun.js';
import { getNormalEnemyConfig, isBossFloor } from './tower/TowerScaling.js';
import { generateBoss }      from './tower/TowerBoss.js';
import { getUpgradeChoices } from './tower/TowerUpgrades.js';
import { TowerUI }           from './tower/TowerUI.js';

export class InfiniteTower {
  /**
   * @param {object} deps
   * @param {Function} deps.startFightFn    — (cfgs, null, arenaOpts) => void
   * @param {Function} deps.onRunEnd        — (floorReached: number) => void
   * @param {Function} deps.getArenaOpts    — () => arenaOpts
   * @param {Function} deps.applySkinnedMeta — (meta) => skinned meta
   * @param {Function} deps.getPowerName    — (powerId) => display name string
   * @param {Function} deps.getPowerMeta    — (powerId) => full meta object | null
   */
  constructor({ startFightFn, onRunEnd, getArenaOpts, applySkinnedMeta, getPowerName, getPowerMeta, onSave, onRunOver }) {
    this._startFightFn     = startFightFn;
    this._onRunEnd         = onRunEnd;
    this._getArenaOpts     = getArenaOpts;
    this._applySkinnedMeta = applySkinnedMeta;
    this._getPowerName     = getPowerName ?? (id => id);
    this._getPowerMeta     = getPowerMeta ?? (() => null);
    this._onSave           = onSave   ?? (() => {});
    this._onRunOver        = onRunOver ?? (() => {});

    this._run  = null;
    this._ui   = new TowerUI({
      onUpgradeChosen: (upg) => this._onUpgradeChosen(upg),
      onRunOverClose:  ()    => this._onRunEnd(this._run?.floor ?? 0),
    });
  }

  // ── Public ────────────────────────────────────────────────────────────────

  startRun(powerMeta, category, savedState = null) {
    if (savedState) {
      this._run = new TowerRun(powerMeta, savedState.category ?? category);
      this._run.floor       = savedState.floor       ?? 0;
      this._run.upgrades    = savedState.upgrades     ? [...savedState.upgrades] : [];
      this._run.playerMods  = savedState.playerMods   ? { ...savedState.playerMods } : this._run.playerMods;
      this._run.powerMods   = savedState.powerMods    ? { ...savedState.powerMods  } : this._run.powerMods;
    } else {
      this._run = new TowerRun(powerMeta, category);
    }
    this._ui.reset();
    this._advanceFloor();
  }

  handleGameOver(winner, winnerSide) {
    this._ui.hideInFightStats();
    if (winnerSide === 0) this._onFloorWon();
    else                  this._onRunFailed();
  }

  get currentFloor() { return this._run?.floor ?? 0; }

  // ── Private — floor lifecycle ─────────────────────────────────────────────

  _advanceFloor() {
    const fromFloor = this._run.floor;
    const toFloor   = fromFloor + 1;

    // Generate ONCE — reused for both preview and the actual fight
    const boss        = isBossFloor(toFloor) ? generateBoss(toFloor) : null;
    const enemyConfig = boss ? null : getNormalEnemyConfig(toFloor);
    const arenaOpts   = this._getArenaOpts(); // random skin + layout for this floor
    const enemyInfo   = this._buildEnemyInfo(toFloor, boss, enemyConfig, arenaOpts);

    this._ui.showFloorTransition(fromFloor, toFloor, enemyInfo, () => {
      this._run.nextFloor();
      this._launchFight(toFloor, boss, enemyConfig, arenaOpts);
    });
  }

  _launchFight(floor, boss, enemyConfig, arenaOpts) {
    const playerCfg = this._buildPlayerCfg();
    const opts = {
      ...arenaOpts,
      fightContextLabel: boss
        ? `Piso ${floor} — JEFE: ${boss.label}`
        : `Piso ${floor}`,
    };

    let enemyCfgs;
    if (boss) {
      enemyCfgs = boss.fight.fighters.map(f => this._buildEnemyCfg(f));
      if (boss.fight.type === 'duo') {
        playerCfg.teamId = 0;
        enemyCfgs = enemyCfgs.map(c => ({ ...c, teamId: 1 }));
      }
    } else {
      // Use the same pre-generated config — same power as preview
      enemyCfgs = [this._buildEnemyCfg(enemyConfig)];
    }

    this._startFightFn([playerCfg, ...enemyCfgs], null, opts);
    this._ui.showInFightStats(this._run);
  }

  _onFloorWon() {
    const choices = getUpgradeChoices(this._run, 3);
    this._ui.showUpgradePicker(this._run.floor, choices);
  }

  _onUpgradeChosen(upgrade) {
    upgrade.apply(this._run);
    this._run.applyUpgrade(upgrade.id);
    this._onSave(this._run); // persist after each upgrade
    this._ui.hideUpgradePicker();
    this._advanceFloor();
  }

  _onRunFailed() {
    this._onRunOver(this._run); // record best run
    this._ui.showRunOver(this._run.floor, this._run.upgrades);
  }

  // ── Private — config builders ─────────────────────────────────────────────

  _buildPlayerCfg() {
    const meta    = this._run.powerMeta;
    const mods    = this._run.playerMods;
    const skinned = this._applySkinnedMeta(meta);
    return {
      color:      skinned.color,
      labelColor: skinned.labelColor ?? skinned.color,
      label:      meta.name,
      powerId:    meta.id,
      hp:         100 + mods.hpBonus,
      skinId:     skinned.skinId,
      towerMods:  { ...mods, ...this._run.powerMods },
    };
  }

  _buildEnemyCfg({ hp, radius, speed, powerId, label, color }) {
    // Resolve name and color from power meta if not explicitly provided
    const meta = this._getPowerMeta(powerId ?? 'none');
    return {
      color:      color   ?? meta?.color ?? '#e74c3c',
      labelColor: color   ?? meta?.color ?? '#e74c3c',
      label:      label   ?? meta?.name  ?? powerId ?? 'Enemigo',
      powerId:    powerId ?? 'none',
      hp:         hp      ?? 100,
      radius:     radius  ?? 28,
      enemySpeed: speed   ?? 200,
    };
  }

  /** Build a plain-data summary for the UI floor-transition preview. */
  _buildEnemyInfo(floor, boss, enemyConfig, arenaOpts) {
    const arenaName      = arenaOpts?._layoutName ?? null;
    const arenaSkin      = arenaOpts?._skinName   ?? null;
    const arenaSkinId    = arenaOpts?.skinId       ?? 'default';
    const arenaObstacles = arenaOpts?.obstacles    ?? [];

    if (boss) {
      const fighters = boss.fight.fighters;
      const firstMeta = this._getPowerMeta(fighters[0]?.powerId);
      return {
        isBoss: true, label: boss.label, bossDesc: boss.description,
        count: fighters.length, hp: fighters[0]?.hp ?? 100,
        color: fighters[0]?.color ?? '#e74c3c',
        powerId: fighters[0]?.powerId ?? 'none',
        powerName: fighters[0]?.label ?? firstMeta?.name ?? 'Jefe',
        arenaName, arenaSkin, arenaSkinId, arenaObstacles,
      };
    }
    const meta = this._getPowerMeta(enemyConfig.powerId);
    return {
      isBoss: false,
      label:     meta?.name  ?? enemyConfig.powerId,
      color:     meta?.color ?? '#e74c3c',
      count: 1, hp: enemyConfig.hp,
      powerId: enemyConfig.powerId,
      powerName: meta?.name ?? enemyConfig.powerId,
      arenaName, arenaSkin, arenaSkinId, arenaObstacles,
    };
  }
}
