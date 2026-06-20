/**
 * InfiniteTower — orchestrator for the infinite tower roguelike mode.
 *
 * Responsibilities:
 *  - Manage the full lifecycle of a run (floor progression, win/lose)
 *  - Bridge between TowerRun state and the game engine via startFightFn
 *  - Drive TowerUI between fights (banner → fight → upgrade picker → next floor)
 *
 * Usage (from main.js):
 *   const tower = new InfiniteTower({ game, startFightFn, onRunEnd, getArenaOpts, applySkinnedMeta });
 *   tower.startRun(powerMeta, category);
 *   // In handleGameOver:
 *   tower.handleGameOver(winner, winnerSide);
 */

import { TowerRun }            from './tower/TowerRun.js';
import { getNormalEnemyConfig, isBossFloor } from './tower/TowerScaling.js';
import { generateBoss }        from './tower/TowerBoss.js';
import { getUpgradeChoices }   from './tower/TowerUpgrades.js';
import { TowerUI }             from './tower/TowerUI.js';

export class InfiniteTower {
  /**
   * @param {object} deps
   * @param {object}   deps.game            — Game instance (used for reference only)
   * @param {Function} deps.startFightFn    — (cfgs, null, arenaOpts) => void
   * @param {Function} deps.onRunEnd        — (floorReached: number) => void
   * @param {Function} deps.getArenaOpts    — () => arenaOpts object
   * @param {Function} deps.applySkinnedMeta — (meta) => skinned meta
   */
  constructor({ game, startFightFn, onRunEnd, getArenaOpts, applySkinnedMeta }) {
    this._game             = game;
    this._startFightFn     = startFightFn;
    this._onRunEnd         = onRunEnd;
    this._getArenaOpts     = getArenaOpts;
    this._applySkinnedMeta = applySkinnedMeta;

    this._run = null;
    this._ui  = new TowerUI({
      onUpgradeChosen: (upg) => this._onUpgradeChosen(upg),
      onRunOverClose:  ()    => this._onRunEnd(this._run?.floor ?? 0),
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Start a brand-new run with the given character. */
  startRun(powerMeta, category) {
    this._run = new TowerRun(powerMeta, category);
    this._ui.reset();
    this._advanceFloor();
  }

  /**
   * Must be called by main.js handleGameOver when gameMode === 'tower'.
   * winnerSide 0 = player, 1 = enemy.
   */
  handleGameOver(winner, winnerSide) {
    const playerWon = winnerSide === 0;
    if (playerWon) {
      this._onFloorWon();
    } else {
      this._onRunFailed();
    }
  }

  get currentFloor() { return this._run?.floor ?? 0; }

  // ── Private — floor lifecycle ─────────────────────────────────────────────

  _advanceFloor() {
    const floor = this._run.nextFloor();
    const boss  = isBossFloor(floor) ? generateBoss(floor) : null;
    const sub   = boss ? `¡JEFE: ${boss.label}!` : null;

    this._ui.showFloorBanner(floor, sub, () => {
      this._launchFight(floor, boss);
    });
  }

  _launchFight(floor, boss) {
    const playerCfg  = this._buildPlayerCfg();
    const arenaOpts  = {
      ...this._getArenaOpts(),
      fightContextLabel: boss
        ? `Piso ${floor} — JEFE: ${boss.label}`
        : `Piso ${floor}`,
    };

    let enemyCfgs;
    if (boss) {
      enemyCfgs = boss.fight.fighters.map(f => this._buildEnemyCfg(f));
      if (boss.fight.type === 'duo') {
        playerCfg.teamId  = 0;
        enemyCfgs = enemyCfgs.map(c => ({ ...c, teamId: 1 }));
      }
    } else {
      enemyCfgs = [this._buildEnemyCfg(getNormalEnemyConfig(floor))];
    }

    this._startFightFn([playerCfg, ...enemyCfgs], null, arenaOpts);
  }

  _onFloorWon() {
    const choices = getUpgradeChoices(this._run.category, this._run, 3);
    this._ui.showUpgradePicker(this._run.floor, choices);
  }

  _onUpgradeChosen(upgrade) {
    upgrade.apply(this._run);
    this._run.applyUpgrade(upgrade.id);
    this._ui.hideUpgradePicker();
    this._advanceFloor();
  }

  _onRunFailed() {
    this._ui.showRunOver(this._run.floor, this._run.upgrades);
    // onRunOverClose callback triggers this._onRunEnd via TowerUI button
  }

  // ── Private — config builders ─────────────────────────────────────────────

  _buildPlayerCfg() {
    const meta   = this._run.powerMeta;
    const mods   = this._run.playerMods;
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
    return {
      color:       color  ?? '#e74c3c',
      label:       label  ?? 'Enemigo',
      powerId:     powerId ?? 'none',
      hp:          hp      ?? 100,
      radius:      radius  ?? 28,
      enemySpeed:  speed   ?? 200,
    };
  }
}
