export const MISSION_CATEGORIES = [
  'Cuerpo a cuerpo',
  'Proyectiles',
  'Control de zona',
  'Invocación',
];

// Category play ladder — same targets/XP for every category
const CAT_TARGETS = [5, 10, 25, 50, 100, 200, 350, 500, 750, 1000];
const CAT_XP      = [15, 25, 50, 100, 200, 350, 500, 750, 1000, 1500];

export function getCategoryMission(category, level) {
  if (level >= CAT_TARGETS.length) return null;
  return {
    id:       `cat_${_catKey(category)}_${level}`,
    type:     'category_play',
    category,
    level,
    target:   CAT_TARGETS[level],
    xp:       CAT_XP[level],
    label:    `Jugar ${CAT_TARGETS[level]} partidas con ${category}`,
  };
}

export const CAT_LEVELS_COUNT = CAT_TARGETS.length;

// Category WIN ladder — 5 levels with explicit reward per level:
//   L1(idx0): XP       L2(idx1): profile skin A
//   L3(idx2): XP       L4(idx3): profile skin B
//   L5(idx4): unique epic character skin
const WIN_LEVELS = [
  { target:   5, xp: 50,  rewardType: 'xp' },
  { target:  20, xp: 25,  rewardType: 'profile_skin_a' },
  { target:  50, xp: 150, rewardType: 'xp' },
  { target: 100, xp: 25,  rewardType: 'profile_skin_b' },
  { target: 200, xp: 100, rewardType: 'char_skin' },
];
export const WIN_CAT_LEVELS_COUNT = WIN_LEVELS.length;

export function getCategoryWinMission(category, level) {
  const lv = WIN_LEVELS[level];
  if (!lv) return null;
  const labels = {
    xp:              `Ganar ${lv.target} partidas con ${category}`,
    profile_skin_a:  `Ganar ${lv.target} partidas con ${category}`,
    profile_skin_b:  `Ganar ${lv.target} partidas con ${category}`,
    char_skin:       `Ganar ${lv.target} partidas con ${category}`,
  };
  return {
    id:          `catwin_${_catKey(category)}_${level}`,
    type:        'category_win',
    category,
    level,
    target:      lv.target,
    xp:          lv.xp,
    rewardType:  lv.rewardType,
    label:       labels[lv.rewardType],
  };
}

// ── Profile skins (8 total, 2 per category) ──────────────────────────────────
// Level 2 (skinA) and Level 4 (skinB) rewards
export const PROFILE_SKINS = {
  // Cuerpo a cuerpo
  skin_cuerpo:   { name: 'Sangre',   category: 'Cuerpo a cuerpo', cssTheme: 'skin_cuerpo',   color: '#8b0000', level: 2 },
  skin_cc_acero: { name: 'Acero',    category: 'Cuerpo a cuerpo', cssTheme: 'skin_cc_acero', color: '#1c2030', level: 4 },
  // Proyectiles
  skin_proyectiles: { name: 'Galaxia', category: 'Proyectiles', cssTheme: 'skin_proyectiles', color: '#0a1a4a', level: 2 },
  skin_pr_plasma:   { name: 'Plasma',  category: 'Proyectiles', cssTheme: 'skin_pr_plasma',   color: '#1e0830', level: 4 },
  // Control de zona
  skin_zona:      { name: 'Abismo',  category: 'Control de zona', cssTheme: 'skin_zona',      color: '#060608', level: 2 },
  skin_cz_toxico: { name: 'Tóxico',  category: 'Control de zona', cssTheme: 'skin_cz_toxico', color: '#001800', level: 4 },
  // Invocación
  skin_invocacion: { name: 'Raíces', category: 'Invocación', cssTheme: 'skin_invocacion',  color: '#1a2e0a', level: 2 },
  skin_in_arcano:  { name: 'Arcano', category: 'Invocación', cssTheme: 'skin_in_arcano',   color: '#100820', level: 4 },
};

// Maps category → { skinA, skinB } profile skin IDs
// charSkin will be set once the 4 exclusive mission skins are decided
export const CATEGORY_WIN_REWARDS = {
  'Cuerpo a cuerpo': { skinA: 'skin_cuerpo',      skinB: 'skin_cc_acero',  charSkin: { charId: 'assassin',  skinId: 'sombra',   name: 'Sombra'        } },
  'Proyectiles':     { skinA: 'skin_proyectiles',  skinB: 'skin_pr_plasma', charSkin: { charId: 'bloodshard', skinId: 'crista',  name: 'Cristal Rojo'  } },
  'Control de zona': { skinA: 'skin_zona',         skinB: 'skin_cz_toxico', charSkin: { charId: 'cursedwall', skinId: 'maldito', name: 'Maldito'       } },
  'Invocación':      { skinA: 'skin_invocacion',   skinB: 'skin_in_arcano', charSkin: { charId: 'angel',      skinId: 'serafin', name: 'Serafín'       } },
};

// Win streak milestones
export const STREAK_MILESTONES = [
  { target:  5, xp:   50, badge: 'badge_bronce'     },
  { target: 10, xp:  100, badge: 'badge_plata'      },
  { target: 15, xp:  175, badge: 'badge_esmeralda'  },
  { target: 20, xp:  250, badge: 'badge_oro'        },
  { target: 25, xp:  350, badge: 'badge_zafiro'     },
  { target: 30, xp:  500, badge: 'badge_diamante'   },
  { target: 40, xp:  700, badge: 'badge_amatista'   },
  { target: 50, xp: 1000, badge: 'badge_legendario' },
];

// Badge metadata
export const BADGES = {
  badge_bronce:     { name: 'Bronce',     cssClass: 'badge--bronce',     streakRequired:  5 },
  badge_plata:      { name: 'Plata',      cssClass: 'badge--plata',      streakRequired: 10 },
  badge_esmeralda:  { name: 'Esmeralda',  cssClass: 'badge--esmeralda',  streakRequired: 15 },
  badge_oro:        { name: 'Oro',        cssClass: 'badge--oro',        streakRequired: 20 },
  badge_zafiro:     { name: 'Zafiro',     cssClass: 'badge--zafiro',     streakRequired: 25 },
  badge_diamante:   { name: 'Diamante',   cssClass: 'badge--diamante',   streakRequired: 30 },
  badge_amatista:   { name: 'Amatista',   cssClass: 'badge--amatista',   streakRequired: 40 },
  badge_legendario: { name: 'Legendario', cssClass: 'badge--legendario', streakRequired: 50 },
};

function _catKey(cat) {
  return cat.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
}
