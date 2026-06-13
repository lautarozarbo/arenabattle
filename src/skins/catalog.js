const LS_SKINS = "arena_skins";

export const CHAR_SKINS = {
  mage: [
    { id: "default", name: "Default", color: null },
    { id: "wizard", name: "Sombrero de Mago", color: "#5a1d9a" },
  ],
  angel: [
    { id: "default", name: "Default", color: null },
    { id: "wings", name: "Alas de Ángel", color: "#fff3e0" },
  ],
  ninja: [
    { id: "default", name: "Default", color: null },
    { id: "mask", name: "Máscara Ninja", color: "#444444" },
  ],
  vampire: [
    { id: "default", name: "Default", color: null },
    { id: "cape", name: "Capa de Vampiro", color: "#6B0000" },
  ],
  alien: [
    { id: "default", name: "Default", color: null },
    { id: "antenna", name: "Antenas", color: null },
  ],
  tortuga: [
    { id: "default", name: "Default", color: null },
    { id: "shell", name: "Caparazón", color: "#1B5E20" },
  ],
  rocket: [
    { id: "default", name: "Default", color: null },
    { id: "rocket", name: "Nave", color: "#c0392b" },
  ],
  hotpotato: [
    { id: "default", name: "Default", color: null },
    { id: "potato", name: "Papa", color: "#8B6914" },
  ],
  saw: [
    { id: "default", name: "Default", color: null },
    { id: "metalica", name: "Metálica", color: null },
  ],
  spike: [
    { id: "default", name: "Default", color: null },
    { id: "espinas", name: "Espinas", color: "#27ae60" },
  ],
  volcano: [
    { id: "default", name: "Default", color: null },
    { id: "brasas", name: "Brasas", color: null },
  ],
  electric: [
    { id: "default", name: "Default", color: null },
    { id: "chispas", name: "Chispas", color: null },
  ],
  chess: [
    { id: "default", name: "Default", color: null },
    { id: "tablero", name: "Tablero", color: "#d4a84b" },
  ],
  fenix: [
    { id: "default", name: "Default", color: null },
    { id: "alas", name: "Ave Legendaria", color: null },
  ],
  toxictrail: [
    { id: "default", name: "Default", color: null },
    { id: "gasmask", name: "Tanques de Gas", color: null },
  ],
  glass: [
    { id: "default", name: "Default", color: null },
    { id: "liquidglass", name: "Liquid Glass", color: "rgba(176,224,255,0.16)" },
  ],
  chromatic: [
    { id: "default", name: "Default", color: null },
  ],
  apostador: [
    { id: "default", name: "Default", color: null },
    { id: "traje", name: "Traje", color: "#0d1428", labelColor: "#D4AF37" },
  ],
  spider: [
    { id: "default", name: "Default", color: null },
    { id: "viudanegra", name: "Viuda Negra", color: "#111111", labelColor: "#E53935" },
  ],
  laser: [
    { id: "default", name: "Default", color: null },
    { id: "neon", name: "Neón", color: null },
  ],
  momentum: [
    { id: "default", name: "Default", color: null },
    { id: "saiyan", name: "Aumento", color: null },
  ],
  cursedwall: [
    { id: "default", name: "Default", color: null },
    { id: "ladrillos", name: "Ladrillos", color: "#8B4513" },
  ],
};

// Skin IDs whose preview requires continuous animation (rAF loop)
export const ANIMATED_SKIN_IDS = new Set(['chispas', 'brasas', 'saiyan', 'alas', 'liquidglass', 'neon']);

// ── Storage ───────────────────────────────────────────────────────────────────

function _load() {
  try {
    const r = localStorage.getItem(LS_SKINS);
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}
function _save(s) {
  try {
    localStorage.setItem(LS_SKINS, JSON.stringify(s));
  } catch {}
}

export function getSkinsFor(charId) {
  return CHAR_SKINS[charId] ?? null;
}

export function getSelectedSkinIdx(charId) {
  const skins = getSkinsFor(charId);
  if (!skins) return 0;
  const saved = _load()[charId];
  // Stored value is a skin ID string; fall back to 0 for legacy numeric values
  if (typeof saved === "string") {
    const idx = skins.findIndex((s) => s.id === saved);
    return idx >= 0 ? idx : 0;
  }
  return 0;
}

export function setSelectedSkinIdx(charId, idx) {
  const skins = getSkinsFor(charId);
  const skinId = skins?.[idx]?.id ?? "default";
  const s = _load();
  s[charId] = skinId;
  _save(s);
}

export function applySkinnedMeta(meta) {
  const skins = getSkinsFor(meta.id);
  if (!skins) return meta;
  const skin = skins[getSelectedSkinIdx(meta.id)];
  return { ...meta, color: skin.color ?? meta.color, skinId: skin.id };
}
