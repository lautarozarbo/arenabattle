/**
 * TowerUpgrades — upgrade catalog for the infinite tower.
 *
 * Each upgrade:
 *   id          — unique string
 *   label       — short display name
 *   description — one-line description shown on the upgrade card
 *   categories  — array of category strings this upgrade applies to
 *                 (or ['*'] for universal)
 *   apply(run)  — mutates run.playerMods / run.powerMods
 *
 * Upgrades are stackable: apply() is called once per pick and accumulates.
 */

// ── Universal upgrades (all characters) ──────────────────────────────────────

const UNIVERSAL = [
  {
    id: 'hp_up',
    label: '+20 HP máx.',
    description: 'Tu HP máximo aumenta en 20.',
    categories: ['*'],
    apply(run) { run.playerMods.hpBonus += 20; },
  },
  {
    id: 'hp_up_big',
    label: '+35 HP máx.',
    description: 'Tu HP máximo aumenta en 35.',
    categories: ['*'],
    apply(run) { run.playerMods.hpBonus += 35; },
  },
  {
    id: 'speed_up',
    label: 'Velocidad +12%',
    description: 'Te movés un 12% más rápido.',
    categories: ['*'],
    apply(run) { run.playerMods.speedMult *= 1.12; },
  },
  {
    id: 'regen_small',
    label: 'Regeneración leve',
    description: 'Recuperás 1 HP por segundo durante la pelea.',
    categories: ['*'],
    apply(run) { run.playerMods.regenPerSec += 1; },
  },
  {
    id: 'regen_med',
    label: 'Regeneración moderada',
    description: 'Recuperás 2.5 HP por segundo durante la pelea.',
    categories: ['*'],
    apply(run) { run.playerMods.regenPerSec += 2.5; },
  },
];

// ── Cuerpo a cuerpo ───────────────────────────────────────────────────────────

const MELEE = [
  {
    id: 'melee_dmg',
    label: 'Daño de contacto +15%',
    description: 'Todos tus golpes de contacto hacen más daño.',
    categories: ['Cuerpo a cuerpo'],
    apply(run) { run.playerMods.dmgMult *= 1.15; },
  },
  {
    id: 'melee_dmg_big',
    label: 'Daño de contacto +25%',
    description: 'Golpes de contacto notablemente más fuertes.',
    categories: ['Cuerpo a cuerpo'],
    apply(run) { run.playerMods.dmgMult *= 1.25; },
  },
  {
    id: 'melee_contact_add',
    label: '+2 daño por choque',
    description: 'Cada choque de cuerpo hace 2 de daño extra.',
    categories: ['Cuerpo a cuerpo'],
    apply(run) { run.playerMods.contactDmgAdd += 2; },
  },
  {
    id: 'melee_speed',
    label: 'Velocidad de combate +18%',
    description: 'Te movés más rápido, dando más oportunidades de golpear.',
    categories: ['Cuerpo a cuerpo'],
    apply(run) { run.playerMods.speedMult *= 1.18; },
  },
  {
    id: 'melee_tank',
    label: 'Tanque (+30 HP, +1 regen)',
    description: 'Más aguante para pelear de cerca.',
    categories: ['Cuerpo a cuerpo'],
    apply(run) { run.playerMods.hpBonus += 30; run.playerMods.regenPerSec += 1; },
  },
];

// ── Proyectiles ───────────────────────────────────────────────────────────────

const PROJECTILE = [
  {
    id: 'proj_dmg',
    label: 'Daño de proyectil +15%',
    description: 'Tus proyectiles hacen un 15% más de daño.',
    categories: ['Proyectiles'],
    apply(run) { run.playerMods.dmgMult *= 1.15; },
  },
  {
    id: 'proj_dmg_big',
    label: 'Daño de proyectil +28%',
    description: 'Proyectiles notablemente más destructivos.',
    categories: ['Proyectiles'],
    apply(run) { run.playerMods.dmgMult *= 1.28; },
  },
  {
    id: 'proj_cd',
    label: 'Recarga -15%',
    description: 'Tu poder se recarga un 15% más rápido.',
    categories: ['Proyectiles'],
    apply(run) { run.powerMods.cdMult *= 0.85; },
  },
  {
    id: 'proj_cd_big',
    label: 'Recarga -25%',
    description: 'Disparás con mucha más frecuencia.',
    categories: ['Proyectiles'],
    apply(run) { run.powerMods.cdMult *= 0.75; },
  },
  {
    id: 'proj_extra',
    label: 'Proyectil extra',
    description: 'Cada vez que disparás, sale un proyectil adicional.',
    categories: ['Proyectiles'],
    apply(run) { run.powerMods.extraProjectile += 1; },
  },
  {
    id: 'proj_speed',
    label: 'Velocidad +10%, recarga -10%',
    description: 'Más movilidad y disparos más frecuentes.',
    categories: ['Proyectiles'],
    apply(run) { run.playerMods.speedMult *= 1.10; run.powerMods.cdMult *= 0.90; },
  },
];

// ── Control de zona ───────────────────────────────────────────────────────────

const ZONE = [
  {
    id: 'zone_dmg',
    label: 'Daño de zona +15%',
    description: 'Tu zona hace un 15% más de daño.',
    categories: ['Control de zona'],
    apply(run) { run.playerMods.dmgMult *= 1.15; },
  },
  {
    id: 'zone_dmg_big',
    label: 'Daño de zona +25%',
    description: 'Zona significativamente más peligrosa.',
    categories: ['Control de zona'],
    apply(run) { run.playerMods.dmgMult *= 1.25; },
  },
  {
    id: 'zone_cd',
    label: 'Recarga de zona -20%',
    description: 'Podés desplegar tu zona más seguido.',
    categories: ['Control de zona'],
    apply(run) { run.powerMods.cdMult *= 0.80; },
  },
  {
    id: 'zone_hp',
    label: '+25 HP, regeneración +1',
    description: 'Más resistencia para sostener la zona más tiempo.',
    categories: ['Control de zona'],
    apply(run) { run.playerMods.hpBonus += 25; run.playerMods.regenPerSec += 1; },
  },
  {
    id: 'zone_speed',
    label: 'Velocidad +15%',
    description: 'Te reposicionás más rápido para controlar el área.',
    categories: ['Control de zona'],
    apply(run) { run.playerMods.speedMult *= 1.15; },
  },
];

// ── Invocación ────────────────────────────────────────────────────────────────

const SUMMON = [
  {
    id: 'summon_dmg',
    label: 'Daño de invocados +20%',
    description: 'Tus invocados hacen más daño.',
    categories: ['Invocación'],
    apply(run) { run.playerMods.dmgMult *= 1.20; },
  },
  {
    id: 'summon_cd',
    label: 'Recarga de invocación -20%',
    description: 'Invocás más seguido.',
    categories: ['Invocación'],
    apply(run) { run.powerMods.cdMult *= 0.80; },
  },
  {
    id: 'summon_cd_big',
    label: 'Recarga de invocación -30%',
    description: 'Llená el campo de aliados mucho más rápido.',
    categories: ['Invocación'],
    apply(run) { run.powerMods.cdMult *= 0.70; },
  },
  {
    id: 'summon_cap',
    label: '+1 invocado simultáneo',
    description: 'Podés tener un aliado más en el campo a la vez.',
    categories: ['Invocación'],
    apply(run) { run.powerMods.invocationCap += 1; },
  },
  {
    id: 'summon_hp',
    label: '+30 HP máx.',
    description: 'Más vida para aguantar mientras tus invocados trabajan.',
    categories: ['Invocación'],
    apply(run) { run.playerMods.hpBonus += 30; },
  },
  {
    id: 'summon_regen',
    label: 'Regeneración +2',
    description: 'Recuperás 2 HP por segundo, te mantenés vivo más tiempo.',
    categories: ['Invocación'],
    apply(run) { run.playerMods.regenPerSec += 2; },
  },
];

// ── All upgrades combined ─────────────────────────────────────────────────────

const ALL_UPGRADES = [...UNIVERSAL, ...MELEE, ...PROJECTILE, ...ZONE, ...SUMMON];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get a random selection of `count` upgrades relevant to the given category.
 * Always mixes category-specific + universal upgrades so the player sees
 * a variety. No repeats within the same pick.
 *
 * @param {string}   category  — power category of the chosen character
 * @param {TowerRun} run       — current run (for future exclusion logic)
 * @param {number}   count     — how many options to show (default 3)
 * @returns {Upgrade[]}
 */
export function getUpgradeChoices(category, run, count = 3) {
  const categoryPool = ALL_UPGRADES.filter(u =>
    u.categories.includes('*') || u.categories.includes(category)
  );

  // Prefer category-specific first, pad with universals if needed
  const specific  = categoryPool.filter(u => !u.categories.includes('*'));
  const universal = categoryPool.filter(u =>  u.categories.includes('*'));

  // Shuffle each group
  _shuffle(specific);
  _shuffle(universal);

  // Build pool: up to 2 specific + fill rest with universal
  const pool = [...specific.slice(0, 2), ...universal].slice(0, count * 3);
  _shuffle(pool);

  // Deduplicate by id and take `count`
  const seen = new Set();
  const result = [];
  for (const u of pool) {
    if (!seen.has(u.id)) { seen.add(u.id); result.push(u); }
    if (result.length >= count) break;
  }

  // Safety: if we somehow don't have enough, fill from universal
  if (result.length < count) {
    for (const u of universal) {
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
