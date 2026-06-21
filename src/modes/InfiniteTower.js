import { TowerRun }          from './tower/TowerRun.js';
import { getNormalEnemyConfig, isBossFloor, BASE_SPEED } from './tower/TowerScaling.js';
import { generateBoss }      from './tower/TowerBoss.js';
import { getUpgradeChoices } from './tower/TowerUpgrades.js';
import { TowerUI }           from './tower/TowerUI.js';

export class InfiniteTower {
  constructor({ startFightFn, onRunEnd, getArenaOpts, applySkinnedMeta, getPowerName, getPowerMeta, onSave, onRunOver }) {
    this._startFightFn     = startFightFn;
    this._onRunEnd         = onRunEnd;
    this._getArenaOpts     = getArenaOpts;
    this._applySkinnedMeta = applySkinnedMeta;
    this._getPowerName     = getPowerName ?? (id => id);
    this._getPowerMeta     = getPowerMeta ?? (() => null);
    this._onSave           = onSave   ?? (() => {});
    this._onRunOver        = onRunOver ?? (() => {});

    this._run = null;
    this._ui  = new TowerUI({
      onUpgradeChosen: (upg) => this._onUpgradeChosen(upg),
      onRunOverClose:  ()    => this._onRunEnd(this._run?.floor ?? 0),
    });
  }

  startRun(powerMeta, category, savedState = null) {
    if (savedState) {
      this._run = new TowerRun(powerMeta, savedState.category ?? category);
      this._run.floor      = savedState.floor      ?? 0;
      this._run.upgrades   = savedState.upgrades   ? [...savedState.upgrades]    : [];
      // Merge onto constructor defaults so missing fields in old saves don't produce NaN/undefined
      if (savedState.playerMods) this._run.playerMods = { ...this._run.playerMods, ...savedState.playerMods };
      if (savedState.powerMods)  this._run.powerMods  = { ...this._run.powerMods,  ...savedState.powerMods  };
    } else {
      this._run = new TowerRun(powerMeta, category);
    }
    this._ui.reset();

    const pf = savedState?.pendingFloor;
    if (pf) {
      const toFloor   = this._run.floor + 1;
      const enemyInfo = this._buildEnemyInfo(toFloor, pf.isBoss, pf.enemyConfig, pf.arenaOpts);
      this._ui.showFloorTransition(this._run.floor, toFloor, enemyInfo, () => {
        this._run.nextFloor();
        this._launchFight(toFloor, pf.isBoss, pf.enemyConfig, pf.arenaOpts);
      });
    } else {
      this._advanceFloor();
    }
  }

  handleGameOver(winner, winnerSide) {
    this._ui.hideInFightStats();
    if (winnerSide === 0) this._onFloorWon();
    else                  this._onRunFailed();
  }

  get currentFloor() { return this._run?.floor ?? 0; }

  _advanceFloor() {
    const fromFloor = this._run.floor;
    const toFloor   = fromFloor + 1;
    const isBoss    = isBossFloor(toFloor);
    const enemyConfig = isBoss ? generateBoss(toFloor) : getNormalEnemyConfig(toFloor);
    const arenaOpts   = this._getArenaOpts();

    this._onSave(this._run, { isBoss, enemyConfig, arenaOpts });

    const enemyInfo = this._buildEnemyInfo(toFloor, isBoss, enemyConfig, arenaOpts);
    this._ui.showFloorTransition(fromFloor, toFloor, enemyInfo, () => {
      this._run.nextFloor();
      this._launchFight(toFloor, isBoss, enemyConfig, arenaOpts);
    });
  }

  _launchFight(floor, isBoss, enemyConfig, arenaOpts) {
    const playerCfg  = this._buildPlayerCfg();
    const tier       = Math.floor(floor / 10);
    const enemyCfg   = this._buildEnemyCfg({ ...enemyConfig, contactDmgAdd: tier * (tier + 1) / 2 });
    const opts = {
      ...arenaOpts,
      fightContextLabel: `Piso ${floor}${isBoss ? ' — JEFE' : ''}`,
    };
    this._startFightFn([playerCfg, enemyCfg], null, opts);
    this._ui.showInFightStats(this._run);
  }

  _onFloorWon() {
    const choices = getUpgradeChoices(this._run, 3);
    this._ui.showUpgradePicker(this._run.floor, choices);
  }

  _onUpgradeChosen(upgrade) {
    upgrade.apply(this._run);
    this._run.applyUpgrade(upgrade.id);
    this._ui.hideUpgradePicker();
    this._advanceFloor();
  }

  _onRunFailed() {
    const xpGained = this._run.floor * 2;
    this._onRunOver(this._run, xpGained);
    this._ui.showRunOver(this._run.floor, this._run.upgrades, xpGained);
  }

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
      enemySpeed: BASE_SPEED, // player moves at same base speed as enemies
      towerMods:  { ...mods, ...this._run.powerMods },
    };
  }

  _buildEnemyCfg({ hp, radius, speed, powerId, contactDmgAdd }) {
    const meta = this._getPowerMeta(powerId ?? 'none');
    return {
      color:         meta?.color ?? '#e74c3c',
      labelColor:    meta?.color ?? '#e74c3c',
      label:         meta?.name  ?? powerId ?? 'Enemigo',
      powerId:       powerId ?? 'none',
      hp:            hp      ?? 100,
      radius:        radius  ?? 28,
      enemySpeed:    speed   ?? 200,
      contactDmgAdd: contactDmgAdd ?? 0,
    };
  }

  _buildEnemyInfo(floor, isBoss, enemyConfig, arenaOpts) {
    const meta = this._getPowerMeta(enemyConfig?.powerId);
    return {
      isBoss,
      label:         meta?.name  ?? enemyConfig?.powerId ?? 'Enemigo',
      color:         meta?.color ?? '#e74c3c',
      hp:            enemyConfig?.hp ?? 100,
      count:         1,
      arenaName:     arenaOpts?._layoutName ?? null,
      arenaSkin:     arenaOpts?._skinName   ?? null,
      arenaSkinId:   arenaOpts?.skinId       ?? 'default',
      arenaObstacles: arenaOpts?.obstacles   ?? [],
    };
  }
}
