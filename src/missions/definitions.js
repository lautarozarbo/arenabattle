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

// Win streak milestones
export const STREAK_MILESTONES = [
  { target:  5, xp:   50, badge: 'badge_bronce' },
  { target: 10, xp:  100, badge: 'badge_plata'  },
  { target: 15, xp:  175, badge: null            },
  { target: 20, xp:  250, badge: 'badge_oro'     },
  { target: 25, xp:  350, badge: null            },
  { target: 30, xp:  500, badge: 'badge_diamante'},
  { target: 40, xp:  700, badge: null            },
  { target: 50, xp: 1000, badge: 'badge_legendario' },
];

// Badge metadata
export const BADGES = {
  badge_bronce:     { name: 'Bronce',     cssClass: 'badge--bronce',     streakRequired:  5 },
  badge_plata:      { name: 'Plata',      cssClass: 'badge--plata',      streakRequired: 10 },
  badge_oro:        { name: 'Oro',        cssClass: 'badge--oro',        streakRequired: 20 },
  badge_diamante:   { name: 'Diamante',   cssClass: 'badge--diamante',   streakRequired: 30 },
  badge_legendario: { name: 'Legendario', cssClass: 'badge--legendario', streakRequired: 50 },
};

function _catKey(cat) {
  return cat.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
}
