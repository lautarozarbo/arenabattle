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
  { id: 'regen_small', group: 'regen',   color: '#f472b6', label: 'Regen +0.5 HP/s',    description: 'Recuperás 0.5 HP por segundo durante la pelea.',  apply(r) { r.playerMods.regenPerSec   += 0.5; } },
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

const BLEED = [
  { id: 'bleed_unlock', group: 'bleed', color: '#ef4444', label: 'Sangrado al chocar',    description: 'Al chocar aplicás 0.5 HP/s de sangrado al enemigo (3s).', apply(r) { r.playerMods.bleedPerSec += 0.5; } },
  { id: 'bleed_up',     group: 'bleed', color: '#ef4444', label: '+0.5 daño de sangrado', description: 'El sangrado que aplicás aumenta en 0.5 HP/s.',            apply(r) { r.playerMods.bleedPerSec += 0.5; } },
];

const SLOW = [
  { id: 'slow_unlock', group: 'slow', color: '#818cf8', label: 'Ralentizar al chocar', description: 'Al chocar ralentizás al enemigo un 10% por 2s.',     apply(r) { r.playerMods.contactSlow += 0.10; } },
  { id: 'slow_up',     group: 'slow', color: '#818cf8', label: '+2% ralentización',    description: 'La ralentización al chocar aumenta un 2% más.',      apply(r) { r.playerMods.contactSlow += 0.02; } },
];

// ── Public API ────────────────────────────────────────────────────────────────

const _ALL = [...UNIVERSAL, ...DAMAGE, ...COOLDOWN, ...PROJECTILE, ...PLACEMENT, ...ZONE_DUR, ...BLEED, ...SLOW];
const _BY_ID = Object.fromEntries(_ALL.map(u => [u.id, u]));

export function getUpgradeLabel(id) {
  return _BY_ID[id]?.label ?? id;
}

export function getUpgradeColor(id) {
  return _BY_ID[id]?.color ?? '#fff';
}

/**
 * Aplica una lista de IDs de mejoras y devuelve chips de resumen acumulado,
 * igual que la barra in-fight pero como array de { label, color }.
 */
export function summarizeUpgrades(ids) {
  const pm = { hpBonus: 0, dmgAdd: 0, speedMult: 1, regenPerSec: 0, contactDmgAdd: 0 };
  const pw = { cdMult: 1, extraProjectile: 0, extraPlacement: 0, zoneDurationMult: 1 };
  const mockRun = { playerMods: pm, powerMods: pw };

  for (const id of ids) {
    _BY_ID[id]?.apply(mockRun);
  }

  const chips = [];
  if (pm.dmgAdd        > 0) chips.push({ label: `+${pm.dmgAdd} daño poder`,                color: '#a78bfa' });
  if (pm.hpBonus       > 0) chips.push({ label: `+${pm.hpBonus} HP`,                       color: '#f87171' });
  if (pm.regenPerSec   > 0) chips.push({ label: `Regen +${+pm.regenPerSec.toFixed(1)} HP/s`, color: '#f472b6' });
  if (pm.speedMult     > 1) chips.push({ label: `Vel +${Math.round((pm.speedMult-1)*100)}%`, color: '#22d3ee' });
  if (pm.contactDmgAdd > 0) chips.push({ label: `+${pm.contactDmgAdd} choque`,             color: '#fb923c' });
  if (pm.bleedPerSec   > 0) chips.push({ label: `Sangrado ${+pm.bleedPerSec.toFixed(1)}/s`, color: '#ef4444' });
  if (pm.contactSlow   > 0) chips.push({ label: `Lentitud ${Math.round(pm.contactSlow*100)}%`, color: '#818cf8' });
  if (pw.cdMult        < 1) chips.push({ label: `CD -${Math.round((1-pw.cdMult)*100)}%`,   color: '#60a5fa' });
  if (pw.extraProjectile>0) chips.push({ label: `+${pw.extraProjectile} proyectil`,        color: '#facc15' });
  if (pw.extraPlacement >0) chips.push({ label: `+${pw.extraPlacement} elemento`,          color: '#4ade80' });
  if (pw.zoneDurationMult>1)chips.push({ label: `Zona +${Math.round((pw.zoneDurationMult-1)*100)}%`, color: '#2dd4bf' });
  return chips;
}

// ── Probabilidades ────────────────────────────────────────────────────────────
//
// Peso de cada GRUPO (cuántas veces más probable que aparezca ese tipo):
//   damage   22  — mejora de poder, siempre relevante
//   hp       16  — vida extra, universal
//   cooldown 15  — recarga, muy útil cuando aplica
//   contact  12  — choque, buen complemento
//   proj     12  — proyectil extra, fuerte cuando aplica
//   speed    10  — velocidad, útil pero moderado
//   regen     9  — regen, más situacional
//   place     8  — placement, nicho
//   zone      7  — zona, el más nicho
//
// Peso dentro de cada grupo con 2 opciones (menor vs mayor):
//   hp:       +5 HP (55) vs +10 HP (45)
//   contact:  +1 (50) vs +2 (50)
//   damage:   +1 (50) vs +2 (50)
//   cooldown: -5% (55) vs -10% (45)

const GROUP_WEIGHTS = {
  damage:   22,
  hp:       16,
  cooldown: 15,
  contact:  12,
  proj:     12,
  bleed:    11,
  speed:    10,
  slow:     10,
  regen:     9,
  place:     8,
  zone:      7,
};

// Upgrades por grupo con sus pesos individuales
const GROUP_POOLS = {
  hp:       [{ u: _ALL.find(u => u.id === 'hp_up'),           w: 70 },
             { u: _ALL.find(u => u.id === 'hp_up_big'),        w: 30 }],
  regen:    [{ u: _ALL.find(u => u.id === 'regen_small'),      w: 100 }],
  speed:    [{ u: _ALL.find(u => u.id === 'speed_up'),         w: 100 }],
  contact:  [{ u: _ALL.find(u => u.id === 'contact_dmg'),      w: 70 },
             { u: _ALL.find(u => u.id === 'contact_dmg_big'),  w: 30 }],
  damage:   [{ u: _ALL.find(u => u.id === 'dmg_up'),           w: 70 },
             { u: _ALL.find(u => u.id === 'dmg_up_big'),       w: 30 }],
  cooldown: [{ u: _ALL.find(u => u.id === 'cd_reduce'),        w: 70 },
             { u: _ALL.find(u => u.id === 'cd_reduce_big'),    w: 30 }],
  proj:     [{ u: _ALL.find(u => u.id === 'extra_proj'),       w: 100 }],
  place:    [{ u: _ALL.find(u => u.id === 'extra_placement'),  w: 100 }],
  zone:     [{ u: _ALL.find(u => u.id === 'zone_duration'),    w: 100 }],
  // bleed y slow son dinámicos — se construyen en _getPool() según el estado del run
};

export function getUpgradeChoices(run, count = 3) {
  const powerId = run.powerMeta?.id ?? '';

  // Grupos disponibles para este poder
  const availableGroups = ['hp', 'regen', 'speed', 'contact', 'damage', 'bleed', 'slow'];
  if (POWERS_WITH_COOLDOWN.has(powerId))   availableGroups.push('cooldown');
  if (POWERS_WITH_PROJECTILE.has(powerId)) availableGroups.push('proj');
  const placeCap = powerId === 'turret' ? 2 : Infinity;
  if (POWERS_WITH_PLACEMENT.has(powerId) && (run.powerMods?.extraPlacement ?? 0) < placeCap) availableGroups.push('place');
  if (POWERS_WITH_ZONE_DUR.has(powerId))   availableGroups.push('zone');

  // Selección ponderada de grupos (sin repetir)
  const pickedGroups = [];
  const remaining = [...availableGroups];

  while (pickedGroups.length < count && remaining.length > 0) {
    const group = _weightedPick(remaining.map(g => ({ item: g, w: GROUP_WEIGHTS[g] ?? 1 })));
    pickedGroups.push(group);
    remaining.splice(remaining.indexOf(group), 1);
  }

  // Dentro de cada grupo, selección ponderada (bleed/slow son dinámicos)
  return pickedGroups.map(group => _weightedPick(_getPool(group, run)));
}

function _getPool(group, run) {
  if (group === 'bleed') {
    const unlocked = (run.playerMods?.bleedPerSec ?? 0) > 0;
    return [{ u: _BY_ID[unlocked ? 'bleed_up' : 'bleed_unlock'], w: 100 }];
  }
  if (group === 'slow') {
    const unlocked = (run.playerMods?.contactSlow ?? 0) > 0;
    return [{ u: _BY_ID[unlocked ? 'slow_up' : 'slow_unlock'], w: 100 }];
  }
  return GROUP_POOLS[group];
}

function _weightedPick(entries) {
  const total = entries.reduce((s, e) => s + (e.w ?? 1), 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.w ?? 1;
    if (r <= 0) return e.item ?? e.u;
  }
  return (entries[entries.length - 1].item ?? entries[entries.length - 1].u);
}

function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
