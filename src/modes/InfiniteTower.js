/**
 * InfiniteTower — orchestrator for the infinite tower roguelike mode.
 *
 * Flow per floor:
 *   advanceFloor → floor transition animation (+ enemy preview)
 *   → player taps → launchFight (+ in-fight stats bar)
 *   → win  → upgrade picker → pick upgrade → advanceFloor
 *   → lose → run-over screen → onRunEnd
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
   * @param {Function} deps.getPowerName    — (powerId: string) => string  (display name)
   */
  constructor({ startFightFn, onRunEnd, getArenaOpts, applySkinnedMeta, getPowerName }) {
    this._startFightFn     = startFightFn;
    this._onRunEnd         = onRunEnd;
    this._getArenaOpts     = getArenaOpts;
    this._applySkinnedMeta = applySkinnedMeta;
    this._getPowerName     = getPowerName ?? (id => id);

    this._run  = null;
    this._ui   = new TowerUI({
      onUpgradeChosen: (upg) => this._onUpgradeChosen(upg),
      onRunOverClose:  ()    => this._onRunEnd(this._run?.floor ?? 0),
    });
  }

  // ── Public ────────────────────────────────────────────────────────────────

  startRun(powerMeta, category) {
    this._run = new TowerRun(powerMeta, category);
    this._ui.reset();
    this._advanceFloor();
  }

  /** Called by main.js handleGameOver when gameMode === 'tower'. */
  handleGameOver(winner, winnerSide) {
    this._ui.hideInFightStats();
    if (winnerSide === 0) this._onFloorWon();
    else                  this._onRunFailed();
  }

  get currentFloor() { return this._run?.floor ?? 0; }

  // ── Private — floor lifecycle ─────────────────────────────────────────────

  _advanceFloor() {
    const fromFloor = this._run.floor;
    const toFloor   = fromFloor + 1;           // peek ahead for the preview
    const boss      = isBossFloor(toFloor) ? generateBoss(toFloor) : null;
    const enemyInfo = this._buildEnemyInfo(toFloor, boss);

    this._ui.showFloorTransition(fromFloor, toFloor, enemyInfo, () => {
      // Commit the floor advance and launch the actual fight
      this._run.nextFloor();
      this._launchFight(toFloor, boss);
    });
  }

  _launchFight(floor, boss) {
    const playerCfg = this._buildPlayerCfg();
    const arenaOpts = {
      ...this._getArenaOpts(),
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
      enemyCfgs = [this._buildEnemyCfg(getNormalEnemyConfig(floor))];
    }

    this._startFightFn([playerCfg, ...enemyCfgs], null, arenaOpts);

    // Show accumulated buffs inside the fight
    this._ui.showInFightStats(this._run);
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
    return {
      color:      color   ?? '#e74c3c',
      label:      label   ?? 'Enemigo',
      powerId:    powerId ?? 'none',
      hp:         hp      ?? 100,
      radius:     radius  ?? 28,
      enemySpeed: speed   ?? 200,
    };
  }

  /** Build a plain-data summary of the upcoming enemy for the UI preview. */
  _buildEnemyInfo(floor, boss) {
    if (boss) {
      const fighters = boss.fight.fighters;
      // For display use the first fighter's HP as representative
      return {
        isBoss:    true,
        label:     boss.label,
        bossDesc:  boss.description,
        count:     fighters.length,
        hp:        fighters[0]?.hp ?? 100,
        powerId:   fighters[0]?.powerId ?? 'none',
        powerName: this._getPowerName(fighters[0]?.powerId ?? 'none'),
      };
    }
    const ec = getNormalEnemyConfig(floor);
    return {
      isBoss:    false,
      label:     'Enemigo',
      count:     1,
      hp:        ec.hp,
      powerId:   ec.powerId,
      powerName: this._getPowerName(ec.powerId),
    };
  }
}
