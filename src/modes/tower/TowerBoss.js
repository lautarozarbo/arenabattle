/**
 * TowerBoss — boss floors use a regular power with boosted HP and size.
 * No special names or scripts — just a harder version of a normal enemy.
 */

import { getNormalEnemyConfig, getBossBaseHp } from './TowerScaling.js';

export function generateBoss(floor) {
  const base = getNormalEnemyConfig(floor);
  return {
    powerId:      base.powerId,
    hp:           Math.round(getBossBaseHp(floor)),
    speed:        base.speed,
    radius:       38,
    contactDmgAdd: base.contactDmgAdd,
  };
}
