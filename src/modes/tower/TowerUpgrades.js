/**
 * TowerUpgrades — upgrade catalog for the infinite tower.
 *
 * Upgrades are selected based on what the chosen power ACTUALLY DOES,
 * not its broad category label. Each upgrade set is only offered to powers
 * whose mechanics benefit from it.
 *
 * Each upgrade:
 *   id          — unique string
 *   label       — short display name
 *   description — one-line description shown on the upgrade card
 *   apply(run)  — mutates run.playerMods / run.powerMods (stackable)
 */

// ── Capability sets ─────────────────────────────────────────────────────────
// Determines which upgrade pools are offered, based on mechanics not category.

/** Powers that have a visible recharge circle — cdMult applies. */
const POWERS_WITH_COOLDOWN = new Set([
  'angel', 'apostador', 'bomb', 'boomerang', 'caballero', 'chess',
  'chromatic', 'clock', 'clusterbomb', 'crystalbeam', 'domainexpansion',
  'duo', 'electric', 'fenix', 'grid', 'karma', 'mage', 'ninja', 'portal',
  'pulsar', 'revolver', 'rocket', 'split', 'terremoto', 'turret',
  'vampire', 'venom', 'volcano', 'cursedwall', 'cactus',
  'archer', 'bloodshard', 'reflectshield',
]);

/** Powers where "more projectiles/rays/things per activation" is meaningful. */
const POWERS_WITH_PROJECTILE = new Set([
  'angel',        // +rays per wave
  'boomerang',    // +boomerangs per throw
  'ninja',        // +shurikens per throw
  'revolver',     // +bullets in cylinder dump
  'fenix',        // +fireballs per throw
  'volcano',      // +rays per charge
  'crystalbeam',  // +max fragments on map
  'turret',       // +shots per burst
  'clusterbomb',  // +spikes per explosion
  'archer',       // +arrows per shot
  'bloodshard',   // +shards per burst
  'cactus',       // +cacti per spawn
  'terremoto',    // +rings per earthquake
]);

/** Powers that place things on the map with a hard cap — extraPlacement raises it. */
const POWERS_WITH_PLACEMENT = new Set([
  'spider',    // max web threads
  'glass',     // max shards on map
  'laser',     // max laser lines
  'spike',     // max spike traps
  'territory', // max marked zones
]);

/** Powers that place timed zones/trails — zoneDurationMult extends lifetime. */
const POWERS_WITH_ZONE_DUR = new Set([
  'toxictrail', // trail segment lifetime
  'territory',  // zone duration
  'bomb',       // lingering zone after explosion
  'cactus',     // cactus lifetime
]);

// ── Universal upgrades (always in the pool) ─────────────────────────────────

const UNIVERSAL = [
  {
    id: 'hp_up',
    label: '+20 HP máx.',
    description: 'Tu HP máximo aumenta en 20.',
    apply(run) { run.playerMods.hpBonus += 20; },
  },
  {
    id: 'hp_up_big',
    label: '+35 HP máx.',
    description: 'Tu HP máximo aumenta en 35.',
    apply(run) { run.playerMods.hpBonus += 35; },
  },
  {
    id: 'regen_small',
    label: 'Regeneración +1 HP/s',
    description: 'Recuperás 1 HP por segundo durante la pelea.',
    apply(run) { run.playerMods.regenPerSec += 1; },
  },
  {
    id: 'regen_med',
    label: 'Regeneración +2.5 HP/s',
    description: 'Recuperás 2.5 HP por segundo durante la pelea.',
    apply(run) { run.playerMods.regenPerSec += 2.5; },
  },
  {
    id: 'speed_up',
    label: 'Velocidad +12%',
    description: 'Te movés un 12% más rápido.',
    apply(run) { run.playerMods.speedMult *= 1.12; },
  },
  {
    id: 'contact_dmg',
    label: '+2 daño por choque',
    description: 'Cada choque de cuerpo hace 2 de daño extra.',
    apply(run) { run.playerMods.contactDmgAdd += 2; },
  },
  {
    id: 'contact_dmg_big',
    label: '+4 daño por choque',
    description: 'Cada choque de cuerpo hace 4 de daño extra.',
    apply(run) { run.playerMods.contactDmgAdd += 4; },
  },
];

// ── Damage upgrades (compete with specific slots, offered to all) ────────────

const DAMAGE = [
  {
    id: 'dmg_up',
    label: 'Daño +15%',
    description: 'Todo el daño que hacés aumenta un 15%.',
    apply(run) { run.playerMods.dmgMult *= 1.15; },
  },
  {
    id: 'dmg_up_big',
    label: 'Daño +28%',
    description: 'Todo el daño que hacés aumenta un 28%.',
    apply(run) { run.playerMods.dmgMult *= 1.28; },
  },
];

// ── Cooldown upgrades (powers with a recharge circle) ───────────────────────

const COOLDOWN = [
  {
    id: 'cd_reduce',
    label: 'Recarga -20%',
    description: 'Tu poder se recarga un 20% más rápido.',
    apply(run) { run.powerMods.cdMult *= 0.80; },
  },
  {
    id: 'cd_reduce_big',
    label: 'Recarga -35%',
    description: 'Tu poder se recarga un 35% más rápido.',
    apply(run) { run.powerMods.cdMult *= 0.65; },
  },
];

// ── Projectile upgrades (powers that fire countable things) ─────────────────

const PROJECTILE = [
  {
    id: 'extra_proj',
    label: '+1 al disparar',
    description: 'Cada activación lanza un proyectil o rayo extra.',
    apply(run) { run.powerMods.extraProjectile += 1; },
  },
];

// ── Placement upgrades (powers that place things on the map) ────────────────

const PLACEMENT = [
  {
    id: 'extra_placement',
    label: '+2 elementos en campo',
    description: 'Podés tener 2 elementos más activos en el mapa a la vez.',
    apply(run) { run.powerMods.extraPlacement += 2; },
  },
];

// ── Zone duration upgrades (powers with timed zones or trails) ───────────────

const ZONE_DUR = [
  {
    id: 'zone_duration',
    label: 'Zonas duran +50%',
    description: 'Tus zonas, trampas y efectos del mapa duran un 50% más.',
    apply(run) { run.powerMods.zoneDurationMult *= 1.5; },
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get a random selection of `count` upgrades for this run.
 * Picks upgrades based on what the power ACTUALLY DOES, not its category.
 *
 * @param {TowerRun} run   — current run (has powerMeta.id)
 * @param {number}   count — how many options to show (default 3)
 * @returns {Upgrade[]}
 */
export function getUpgradeChoices(run, count = 3) {
  const powerId = run.powerMeta?.id ?? '';

  // Build specific pool for this power
  const specific = [...DAMAGE];
  if (POWERS_WITH_COOLDOWN.has(powerId))   specific.push(...COOLDOWN);
  if (POWERS_WITH_PROJECTILE.has(powerId)) specific.push(...PROJECTILE);
  if (POWERS_WITH_PLACEMENT.has(powerId))  specific.push(...PLACEMENT);
  if (POWERS_WITH_ZONE_DUR.has(powerId))   specific.push(...ZONE_DUR);

  _shuffle(specific);
  const univ = [...UNIVERSAL];
  _shuffle(univ);

  // Up to 2 specific, fill with universal
  const pool = [...specific.slice(0, 2), ...univ];
  _shuffle(pool);

  // Deduplicate and take count
  const seen = new Set();
  const result = [];
  for (const u of pool) {
    if (!seen.has(u.id)) { seen.add(u.id); result.push(u); }
    if (result.length >= count) break;
  }

  // Safety: fill remainder from universal
  if (result.length < count) {
    for (const u of univ) {
      if (!seen.has(u.id)) { seen.add(u.id); result.push(u); }
      if (result.length >= count) break;
    }
  }

  return result;
}

function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
