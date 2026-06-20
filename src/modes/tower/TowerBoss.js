/**
 * TowerBoss — generates random boss configurations for boss floors.
 * A boss type describes what the game engine should set up.
 * The orchestrator (InfiniteTower.js) reads this and calls game.start() accordingly.
 *
 * BossFight = {
 *   type: 'single' | 'duo',
 *   fighters: [EnemyCfg, ...]   — 1 or 2 entries
 * }
 * EnemyCfg = { hp, radius, speed, powerId, label, color }
 */

import { getBossBaseHp } from './TowerScaling.js';

// ── Boss type registry ────────────────────────────────────────────────────────

const BOSS_TYPES = [
  {
    id: 'titan',
    label: 'Titán',
    description: 'Un coloso con el doble de vida y tamaño',
    minFloor: 1,
    build(floor) {
      return {
        type: 'single',
        fighters: [_cfg(floor, {
          hp: getBossBaseHp(floor) * 1.4, radius: 44,
          label: 'Titán', color: '#c0392b', powerId: 'electric',
        })],
      };
    },
  },

  {
    id: 'berserker',
    label: 'Berserker',
    description: 'Velocidad extrema y mucho daño',
    minFloor: 1,
    build(floor) {
      return {
        type: 'single',
        fighters: [_cfg(floor, {
          hp: getBossBaseHp(floor) * 0.85, speed: 380,
          label: 'Berserker', color: '#e67e22', powerId: 'saw',
        })],
      };
    },
  },

  {
    id: 'summoner',
    label: 'Invocador',
    description: 'Un jefe que convoca aliados constantemente',
    minFloor: 1,
    build(floor) {
      return {
        type: 'single',
        fighters: [_cfg(floor, {
          hp: getBossBaseHp(floor),
          label: 'Invocador', color: '#7d6608', powerId: 'chess',
        })],
      };
    },
  },

  {
    id: 'gunslinger',
    label: 'Pistolero',
    description: 'Un experto en armas de fuego con balas rebotantes',
    minFloor: 1,
    build(floor) {
      return {
        type: 'single',
        fighters: [_cfg(floor, {
          hp: getBossBaseHp(floor) * 1.1,
          label: 'Pistolero', color: '#1a5276', powerId: 'revolver',
        })],
      };
    },
  },

  // ── Duo bosses (unlock at floor 20) ─────────────────────────────────────

  {
    id: 'duo_assault',
    label: 'Asalto en dúo',
    description: 'Dos enemigos que atacan juntos',
    minFloor: 20,
    build(floor) {
      const hp = getBossBaseHp(floor) * 0.72;
      return {
        type: 'duo',
        fighters: [
          _cfg(floor, { hp, label: 'Asaltante A', color: '#8e44ad', powerId: 'ninja'    }),
          _cfg(floor, { hp, label: 'Asaltante B', color: '#6c3483', powerId: 'assassin' }),
        ],
      };
    },
  },

  {
    id: 'duo_heavy',
    label: 'Dúo pesado',
    description: 'Un tanque y un artillero',
    minFloor: 20,
    build(floor) {
      return {
        type: 'duo',
        fighters: [
          _cfg(floor, { hp: getBossBaseHp(floor) * 1.1, radius: 40, label: 'Tanque',    color: '#1a5276', powerId: 'electric' }),
          _cfg(floor, { hp: getBossBaseHp(floor) * 0.7, speed: 300, label: 'Artillero', color: '#154360', powerId: 'rocket'   }),
        ],
      };
    },
  },

  {
    id: 'duo_snipers',
    label: 'Francotiradores',
    description: 'Dos atacantes a distancia que disparan sin parar',
    minFloor: 20,
    build(floor) {
      const hp = getBossBaseHp(floor) * 0.78;
      return {
        type: 'duo',
        fighters: [
          _cfg(floor, { hp, label: 'Tirador I',  color: '#1e8449', powerId: 'archer'   }),
          _cfg(floor, { hp, label: 'Tirador II', color: '#196f3d', powerId: 'revolver' }),
        ],
      };
    },
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pick a random boss for the given floor.
 * @param {number} floor
 * @returns {{ id, label, description, fight: BossFight }}
 */
export function generateBoss(floor) {
  const pool = BOSS_TYPES.filter(b => floor >= b.minFloor);
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const fight = chosen.build(floor);
  return { id: chosen.id, label: chosen.label, description: chosen.description, fight };
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _cfg(floor, overrides) {
  return {
    hp:      getBossBaseHp(floor),
    radius:  32,
    speed:   220,
    powerId: 'electric',
    label:   'Jefe',
    color:   '#c0392b',
    ...overrides,
  };
}
