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

// Category WIN ladder — 5 levels, final level unlocks a profile skin
const WIN_TARGETS = [5, 20, 50, 100, 200];
const WIN_XP      = [30, 80, 150, 300, 600];
export const WIN_CAT_LEVELS_COUNT = WIN_TARGETS.length;

export function getCategoryWinMission(category, level) {
  if (level >= WIN_TARGETS.length) return null;
  return {
    id:     `catwin_${_catKey(category)}_${level}`,
    type:   'category_win',
    category,
    level,
    target: WIN_TARGETS[level],
    xp:     WIN_XP[level],
    label:  `Ganar ${WIN_TARGETS[level]} partidas con ${category}`,
  };
}

// Profile skins unlocked by completing all 5 win levels per category
export const PROFILE_SKINS = {
  skin_cuerpo:      { name: 'Sangre',   category: 'Cuerpo a cuerpo', cssTheme: 'skin_cuerpo',      color: '#8b0000' },
  skin_proyectiles: { name: 'Galaxia',  category: 'Proyectiles',     cssTheme: 'skin_proyectiles', color: '#0a1a4a' },
  skin_zona:        { name: 'Abismo',   category: 'Control de zona', cssTheme: 'skin_zona',        color: '#060608' },
  skin_invocacion:  { name: 'Raíces',   category: 'Invocación',      cssTheme: 'skin_invocacion',  color: '#1a2e0a' },
};

export const SKIN_REWARD_BY_CAT = {
  'Cuerpo a cuerpo': 'skin_cuerpo',
  'Proyectiles':     'skin_proyectiles',
  'Control de zona': 'skin_zona',
  'Invocación':      'skin_invocacion',
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
