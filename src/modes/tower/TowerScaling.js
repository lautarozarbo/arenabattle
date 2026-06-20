/**
 * TowerScaling — pure functions for enemy difficulty per floor.
 * No side effects, no imports. Easy to tune.
 */

// ── Tuning knobs ────────────────────────────────────────────────────────────

const BASE_HP        = 100;
const HP_PER_FLOOR   = 5;     // +5 HP each floor (floor 20 = 200 HP)
const BASE_SPEED     = 200;
const SPEED_PER_10   = 8;     // tiny speed increase every 10 floors
const BASE_RADIUS    = 28;
const RADIUS_CAP     = 36;    // enemy never grows past this

const BOSS_FLOOR_INTERVAL = 10;

// Pool of random powers the enemy can have, weighted by floor
const NORMAL_ENEMY_POWERS = [
  'rocket', 'saw', 'spider', 'electric', 'laser', 'archer',
  'vampire', 'venom', 'momentum', 'ninja', 'turret', 'assassin',
  'bloodshard', 'crystalbeam', 'reflectshield', 'caballero', 'revolver',
];

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the base enemy config for a normal floor.
 * @param {number} floor  1-indexed current floor
 * @returns {{ hp, speed, radius, powerId }}
 */
export function getNormalEnemyConfig(floor) {
  const hp     = BASE_HP + HP_PER_FLOOR * (floor - 1);
  const speed  = BASE_SPEED + SPEED_PER_10 * Math.floor((floor - 1) / 10);
  const radius = Math.min(BASE_RADIUS + Math.floor((floor - 1) / 15), RADIUS_CAP);
  const powerId = _pickEnemyPower(floor);
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
  return getNormalEnemyConfig(floor).hp * 1.6;
}

// ── Internals ────────────────────────────────────────────────────────────────

function _pickEnemyPower(floor) {
  // Unlock more powers as floors progress so early floors feel simpler
  const unlocked = Math.min(NORMAL_ENEMY_POWERS.length, 4 + Math.floor(floor / 3));
  const pool = NORMAL_ENEMY_POWERS.slice(0, unlocked);
  return pool[Math.floor(Math.random() * pool.length)];
}
