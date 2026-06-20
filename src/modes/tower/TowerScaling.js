/**
 * TowerScaling — pure functions for enemy difficulty per floor.
 * No side effects, no imports. Easy to tune.
 */

// ── Tuning knobs ────────────────────────────────────────────────────────────

const BASE_HP        = 100;
const HP_PER_FLOOR   = 5;     // +5 HP each floor (floor 20 = 200 HP)
const BASE_SPEED     = 290;
const SPEED_PER_10   = 0;     // speed stays flat; difficulty comes from HP scaling
const BASE_RADIUS    = 28;
const RADIUS_CAP     = 36;    // enemy never grows past this

const BOSS_FLOOR_INTERVAL = 10;

// All playable powers (excludes 'none' — no power is boring as enemy)
const NORMAL_ENEMY_POWERS = [
  'saw', 'assassin', 'momentum', 'electric', 'vampire', 'venom',
  'parasite', 'hotpotato', 'tortuga', 'reflectshield', 'karma', 'diminuto', 'caballero',
  'rocket', 'bloodshard', 'clusterbomb', 'fenix', 'crystalbeam', 'volcano',
  'ninja', 'angel', 'archer', 'boomerang', 'revolver',
  'spider', 'territory', 'spike', 'grid', 'chromatic', 'toxictrail',
  'glass', 'aura', 'earthquake', 'cursedwall', 'portal', 'domainexpansion', 'laser',
  'cactus', 'duo', 'chess', 'turret', 'alien', 'bomb', 'mage',
  'pulsar', 'apostador', 'clock', 'serpiente',
];

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the base enemy config for a normal floor.
 * @param {number} floor  1-indexed current floor
 * @returns {{ hp, speed, radius, powerId }}
 */
export { BASE_SPEED };

export function getNormalEnemyConfig(floor) {
  const hp     = BASE_HP + HP_PER_FLOOR * (floor - 1);
  const speed  = BASE_SPEED + SPEED_PER_10 * Math.floor((floor - 1) / 10);
  const radius = Math.min(BASE_RADIUS + Math.floor((floor - 1) / 15), RADIUS_CAP);
  const powerId = _pickEnemyPower();
  return { hp, speed, radius, powerId };
}

/**
 * Whether the given floor is a boss floor.
 * @param {number} floor
 */
export function isBossFloor(floor) {
  return floor % BOSS_FLOOR_INTERVAL === 0;
}

/**
 * Base HP for boss floors (extra on top of normal scaling).
 */
export function getBossBaseHp(floor) {
  return getNormalEnemyConfig(floor).hp * 2;
}

// ── Internals ────────────────────────────────────────────────────────────────

function _pickEnemyPower() {
  return NORMAL_ENEMY_POWERS[Math.floor(Math.random() * NORMAL_ENEMY_POWERS.length)];
}
