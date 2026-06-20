/**
 * TowerUpgrades — upgrade catalog for the infinite tower.
 *
 * Each upgrade has a `group` that prevents two upgrades of the same type
 * from appearing together (e.g. no hp_up + hp_up_big in the same pick).
 * Also has a `color` used to tint the card border.
 *
 * Group colors:
 *   hp       — red
 *   regen    — pink
 *   speed    — cyan
 *   contact  — orange
 *   damage   — purple
 *   cooldown — blue
 *   proj     — yellow
 *   place    — green
 *   zone     — teal
 */

// ── Capability sets ─────────────────────────────────────────────────────────

const POWERS_WITH_COOLDOWN = new Set([
  'angel', 'apostador', 'bomb', 'boomerang', 'caballero', 'chess',
  'chromatic', 'clock', 'clusterbomb', 'crystalbeam', 'domainexpansion',
  'duo', 'electric', 'fenix', 'grid', 'karma', 'mage', 'ninja', 'portal',
  'pulsar', 'revolver', 'rocket', 'split', 'terremoto', 'turret',
  'vampire', 'venom', 'volcano', 'cursedwall', 'cactus',
  'archer', 'bloodshard', 'reflectshield',
]);

const POWERS_WITH_PROJECTILE = new Set([
  'angel', 'boomerang', 'ninja', 'revolver', 'fenix', 'volcano',
  'crystalbeam', 'turret', 'clusterbomb', 'archer', 'bloodshard',
  'cactus', 'terremoto',
]);

const POWERS_WITH_PLACEMENT = new Set([
  'spider', 'glass', 'laser', 'spike', 'territory',
]);

const POWERS_WITH_ZONE_DUR = new Set([
  'toxictrail', 'territory', 'bomb', 'cactus',
]);

// ── Upgrade catalog ──────────────────────────────────────────────────────────

const UNIVERSAL = [
  { id: 'hp_up',          group: 'hp',      color: '#f87171', label: '+20 HP máx.',          description: 'Tu HP máximo aumenta en 20.',                             apply(r) { r.playerMods.hpBonus      += 20;   } },
  { id: 'hp_up_big',      group: 'hp',      color: '#f87171', label: '+35 HP máx.',          description: 'Tu HP máximo aumenta en 35.',                             apply(r) { r.playerMods.hpBonus      += 35;   } },
  { id: 'regen_small',    group: 'regen',   color: '#f472b6', label: 'Regen +1 HP/s',        description: 'Recuperás 1 HP por segundo durante la pelea.',            apply(r) { r.playerMods.regenPerSec  += 1;    } },
  { id: 'regen_med',      group: 'regen',   color: '#f472b6', label: 'Regen +2.5 HP/s',      description: 'Recuperás 2.5 HP por segundo durante la pelea.',          apply(r) { r.playerMods.regenPerSec  += 2.5;  } },
  { id: 'speed_up',       group: 'speed',   color: '#22d3ee', label: 'Velocidad +12%',       description: 'Te movés un 12% más rápido.',                             apply(r) { r.playerMods.speedMult    *= 1.12; } },
  { id: 'contact_dmg',    group: 'contact', color: '#fb923c', label: '+2 daño por choque',   description: 'Cada choque de cuerpo hace 2 de daño extra.',              apply(r) { r.playerMods.contactDmgAdd += 2;  } },
  { id: 'contact_dmg_big',group: 'contact', color: '#fb923c', label: '+4 daño por choque',   description: 'Cada choque de cuerpo hace 4 de daño extra.',              apply(r) { r.playerMods.contactDmgAdd += 4;  } },
];

const DAMAGE = [
  { id: 'dmg_up',     group: 'damage', color: '#a78bfa', label: 'Daño +15%', description: 'Todo el daño que hacés aumenta un 15%.',  apply(r) { r.playerMods.dmgMult *= 1.15; } },
  { id: 'dmg_up_big', group: 'damage', color: '#a78bfa', label: 'Daño +28%', description: 'Todo el daño que hacés aumenta un 28%.', apply(r) { r.playerMods.dmgMult *= 1.28; } },
];

const COOLDOWN = [
  { id: 'cd_reduce',     group: 'cooldown', color: '#60a5fa', label: 'Recarga -20%', description: 'Tu poder se recarga un 20% más rápido.', apply(r) { r.powerMods.cdMult *= 0.80; } },
  { id: 'cd_reduce_big', group: 'cooldown', color: '#60a5fa', label: 'Recarga -35%', description: 'Tu poder se recarga un 35% más rápido.', apply(r) { r.powerMods.cdMult *= 0.65; } },
];

const PROJECTILE = [
  { id: 'extra_proj', group: 'proj', color: '#facc15', label: '+1 al disparar', description: 'Cada activación lanza un proyectil o rayo extra.', apply(r) { r.powerMods.extraProjectile += 1; } },
];

const PLACEMENT = [
  { id: 'extra_placement', group: 'place', color: '#4ade80', label: '+2 elementos en campo', description: 'Podés tener 2 elementos más activos en el mapa.', apply(r) { r.powerMods.extraPlacement += 2; } },
];

const ZONE_DUR = [
  { id: 'zone_duration', group: 'zone', color: '#2dd4bf', label: 'Zonas duran +50%', description: 'Tus zonas, trampas y efectos del mapa duran un 50% más.', apply(r) { r.powerMods.zoneDurationMult *= 1.5; } },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get `count` upgrades ensuring no two share the same group.
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

  // Combine: up to 2 specific + universal, then reshuffle
  const pool = [...specific.slice(0, 2), ...univ];
  _shuffle(pool);

  // Pick count upgrades — no two from the same group
  const usedGroups = new Set();
  const usedIds    = new Set();
  const result     = [];

  for (const u of pool) {
    if (usedIds.has(u.id) || usedGroups.has(u.group)) continue;
    usedIds.add(u.id);
    usedGroups.add(u.group);
    result.push(u);
    if (result.length >= count) break;
  }

  // Safety fill: if still short, allow duplicate groups (but not duplicate ids)
  if (result.length < count) {
    const allPool = [...pool, ...univ];
    for (const u of allPool) {
      if (usedIds.has(u.id)) continue;
      usedIds.add(u.id);
      result.push(u);
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
