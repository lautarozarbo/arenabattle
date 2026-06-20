/**
 * TowerUpgrades — upgrade catalog for the infinite tower.
 *
 * Each upgrade has a `group` (prevents two of the same type in one pick)
 * and a `color` (used to tint the card border).
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
  { id: 'hp_up',       group: 'hp',      color: '#f87171', label: '+5 HP máx.',         description: 'Tu HP máximo aumenta en 5.',                      apply(r) { r.playerMods.hpBonus       += 5;  } },
  { id: 'hp_up_big',   group: 'hp',      color: '#f87171', label: '+10 HP máx.',        description: 'Tu HP máximo aumenta en 10.',                     apply(r) { r.playerMods.hpBonus       += 10; } },
  { id: 'regen_small', group: 'regen',   color: '#f472b6', label: 'Regen +1 HP/s',      description: 'Recuperás 1 HP por segundo durante la pelea.',    apply(r) { r.playerMods.regenPerSec   += 1;  } },
  { id: 'speed_up',    group: 'speed',   color: '#22d3ee', label: 'Velocidad +5%',      description: 'Te movés un 5% más rápido.',                      apply(r) { r.playerMods.speedMult     *= 1.05; } },
  { id: 'contact_dmg', group: 'contact', color: '#fb923c', label: '+1 daño por choque', description: 'Cada choque de cuerpo hace 1 de daño extra.',     apply(r) { r.playerMods.contactDmgAdd += 1;  } },
  { id: 'contact_dmg_big', group: 'contact', color: '#fb923c', label: '+2 daño por choque', description: 'Cada choque de cuerpo hace 2 de daño extra.', apply(r) { r.playerMods.contactDmgAdd += 2;  } },
];

const DAMAGE = [
  { id: 'dmg_up',     group: 'damage', color: '#a78bfa', label: '+1 daño de poder', description: 'Tus habilidades hacen 1 de daño extra.',  apply(r) { r.playerMods.dmgAdd += 1; } },
  { id: 'dmg_up_big', group: 'damage', color: '#a78bfa', label: '+2 daño de poder', description: 'Tus habilidades hacen 2 de daño extra.', apply(r) { r.playerMods.dmgAdd += 2; } },
];

const COOLDOWN = [
  { id: 'cd_reduce',     group: 'cooldown', color: '#60a5fa', label: 'Recarga -5%',  description: 'Tu poder se recarga un 5% más rápido.',  apply(r) { r.powerMods.cdMult *= 0.95; } },
  { id: 'cd_reduce_big', group: 'cooldown', color: '#60a5fa', label: 'Recarga -10%', description: 'Tu poder se recarga un 10% más rápido.', apply(r) { r.powerMods.cdMult *= 0.90; } },
];

const PROJECTILE = [
  { id: 'extra_proj', group: 'proj', color: '#facc15', label: '+1 al disparar', description: 'Cada activación lanza un proyectil o rayo extra.', apply(r) { r.powerMods.extraProjectile += 1; } },
];

const PLACEMENT = [
  { id: 'extra_placement', group: 'place', color: '#4ade80', label: '+1 elemento en campo', description: 'Podés tener 1 elemento más activo en el mapa.', apply(r) { r.powerMods.extraPlacement += 1; } },
];

const ZONE_DUR = [
  { id: 'zone_duration', group: 'zone', color: '#2dd4bf', label: 'Zonas duran +10%', description: 'Tus zonas, trampas y efectos del mapa duran un 10% más.', apply(r) { r.powerMods.zoneDurationMult *= 1.10; } },
];

// ── Public API ────────────────────────────────────────────────────────────────

export function getUpgradeChoices(run, count = 3) {
  const powerId = run.powerMeta?.id ?? '';

  const specific = [...DAMAGE];
  if (POWERS_WITH_COOLDOWN.has(powerId))   specific.push(...COOLDOWN);
  if (POWERS_WITH_PROJECTILE.has(powerId)) specific.push(...PROJECTILE);
  if (POWERS_WITH_PLACEMENT.has(powerId))  specific.push(...PLACEMENT);
  if (POWERS_WITH_ZONE_DUR.has(powerId))   specific.push(...ZONE_DUR);

  _shuffle(specific);
  const univ = [...UNIVERSAL];
  _shuffle(univ);

  const pool = [...specific.slice(0, 2), ...univ];
  _shuffle(pool);

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
