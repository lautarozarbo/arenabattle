import { initAuth, onLogin, onLogout, updateUsername, getMyUserId } from "./auth.js";
import { checkProfileCommentsBadge } from "./social/profileComments.js";
import { openLeaderboard } from "./social/leaderboard.js";
import {
  initFriends,
  openFriendsPanel,
  refreshFriendsBadge,
  getMyFriendCode,
} from "./social/friends.js";
import { Game } from "./game/game.js";
import { getAllPowerMetas } from "./powers/registry.js";
import { TagTeamMatch } from "./modes/TagTeam.js";
import { InfiniteTower } from "./modes/InfiniteTower.js";
import { sfx, music } from "./audio/index.js";
import { t, getLang, setLang } from "./i18n.js";
import { NEWS } from "./news.js";
import {
  getStats,
  recordWin,
  recordLoss,
  recordDraw,
  recordCharUse,
  recordTowerRun,
  getMostUsedChar,
  syncStatsFromCloud,
} from "./persistence/stats.js";
import {
  ANIMATED_SKIN_IDS,
  CHAR_SKINS,
  applySkinnedMeta,
  drawCharPreview,
} from "./skins/index.js";
import {
  POINTS,
  getXP,
  getChests,
  isArenaSkinUnlocked,
  isSkinUnlocked,
  addPoints,
  openChest,
  syncRewardsFromCloud,
  getEffectActive,
} from "./persistence/rewards.js";
import {
  ARENA_SKINS,
  setSelectedArenaSkinId,
  drawArenaBg,
  isAnimatedArenaSkin,
} from "./skins/arenaSkins.js";
import {
  openWardrobe,
  closeWardrobe,
  switchWardrobeTab,
} from "./ui/wardrobe.js";
import {
  initHud,
  buildHud,
  startHudLoop,
  stopHudLoop,
  PLAYER_ICON,
} from "./ui/hud.js";
import { setHpVisible, getHpVisible } from "./game/circle.js";
import {
  ARENA_LAYOUTS,
  getQuickArenaSizeIdx,
  setQuickArenaSizeIdx,
  getQuickArenaLayoutIdx,
  setQuickArenaLayoutIdx,
  getQuickArenaSkinIdx,
  setQuickArenaSkinIdx,
  getQuickArenaOpts,
  drawArenaPreview,
} from "./ui/arenaConfig.js";
import { bgBattleResume, bgBattlePause } from "./ui/menuAnimation.js";
import {
  showScreen,
  showConfirm,
  currentScreen,
  initScreens,
} from "./ui/screens.js";
import {
  buildGrid,
  notifySkinChange,
  syncModalSkinIfOpen,
  refreshMasteryBadges,
} from "./ui/characterSelect.js";
import {
  initLeagueUI,
  startLeague,
  showLeagueStandings,
  updateLeagueInfo,
  loadLeague,
  isLeagueFinished,
  isLeagueRandomMode,
} from "./ui/leagueUI.js";
import {
  initTournamentUI,
  startTournament,
  showTournamentScreen,
  showParticipantPicker,
  updateTournamentInfo,
  loadTournament,
  isTournamentRandomMode,
} from "./ui/tournamentUI.js";
import {
  buildTagHud,
  showTagFlash,
  updateTagBtn,
  updateTagHudLive,
} from "./ui/tagHud.js";
import {
  saveTowerRun,
  loadTowerRun,
  loadTowerRunCloud,
  loadBestTowerRunCloud,
  clearTowerRun,
  maybeSaveBestRun,
  getBestTowerRun,
} from "./persistence/towerSave.js";
import { loadLeagueCloud, loadTournamentCloud } from "./persistence/competitionSave.js";
import { summarizeUpgrades } from "./modes/tower/TowerUpgrades.js";
import { recordMissionEvent, loadMissions, syncMissionsFromCloud } from "./persistence/missionsSave.js";
import { initMissionsUI } from "./ui/missionsUI.js";
import { applyBadgeToElement } from "./ui/badge.js";
import { POWER_CATEGORIES } from "./powers/registry.js";

const canvas = document.getElementById("game-canvas");
canvas.width = canvas.height = 420;

const metas = getAllPowerMetas();
const game = new Game(canvas, { onGameOver: handleGameOver });
initHud(game);

let p1Choice = metas[0];
let p2Choice = metas[0];

let _ttArenaOpts = {}; // persists through relay rounds

// ── Battle speed ──────────────────────────────────────────────────────────────
const SPEED_STEPS = [1, 1.5, 2, 3];
let _speedIdx = (() => {
  const saved = parseFloat(localStorage.getItem("battleSpeed") ?? "1");
  const idx = SPEED_STEPS.indexOf(saved);
  return idx >= 0 ? idx : 0;
})();

function _applyBattleSpeed() {
  const speed = SPEED_STEPS[_speedIdx];
  game.timeScale = speed;
  const btn = document.getElementById("btn-speed");
  btn.textContent = `${speed}×`;
  btn.classList.toggle("speed-fast", speed > 1);
}

function resetBattleSpeed() {
  _applyBattleSpeed();
}

document.getElementById("btn-speed").addEventListener("click", () => {
  _speedIdx = (_speedIdx + 1) % SPEED_STEPS.length;
  localStorage.setItem("battleSpeed", SPEED_STEPS[_speedIdx]);
  _applyBattleSpeed();
});

// ── Mode state ────────────────────────────────────────────────────────────────
let gameMode = "quickmatch"; // 'quickmatch' | 'league' | 'tournament' | 'custom' | 'tag2v2' | 'sim2v2' | 'tower'
let matchResultCallback = null; // (winnerSide: 0|1|-1) => void
let _pendingCharUseId = null; // charId to record when match actually ends

// ── Infinite Tower ────────────────────────────────────────────────────────────
let _tower = null; // InfiniteTower instance, live during a tower run
let _confettiRaf = null;

// ── Active abilities ──────────────────────────────────────────────────────────
let _abilitiesEnabled = localStorage.getItem("abilitiesEnabled") === "true";
const _ABILITY_CD     = { speed: 18, heal: 20, damage: 18 };
const _BUFF_DURATION  = { speed: 5,  heal: 4,  damage: 5  };
const _abilityCd      = { speed: 0, heal: 0, damage: 0 };
const _buffRemaining  = { speed: 0, heal: 0, damage: 0 };
let   _abilitiesRaf   = null;

const _abilityBtns = {
  speed:  document.getElementById("ability-speed"),
  heal:   document.getElementById("ability-heal"),
  damage: document.getElementById("ability-damage"),
};

function _startAbilitiesLoop() {
  if (_abilitiesRaf) { cancelAnimationFrame(_abilitiesRaf); _abilitiesRaf = null; }
  // Reset all cooldowns and buff timers
  for (const type of Object.keys(_abilityCd)) {
    _abilityCd[type] = 0;
    _buffRemaining[type] = 0;
    _abilityBtns[type].disabled = false;
    _abilityBtns[type].querySelector(".ability-cd-fill").style.height = "0%";
  }
  document.getElementById("active-abilities-bar").classList.remove("hidden");
  let last = null;
  function tick(ts) {
    if (last === null) last = ts;
    const dt = (ts - last) / 1000;
    last = ts;
    for (const type of Object.keys(_abilityCd)) {
      if (_buffRemaining[type] > 0) {
        _buffRemaining[type] = Math.max(0, _buffRemaining[type] - dt);
        if (_buffRemaining[type] <= 0) {
          _abilityCd[type] = _ABILITY_CD[type];
          _abilityBtns[type].querySelector(".ability-cd-fill").style.height = "100%";
        }
      } else if (_abilityCd[type] > 0) {
        _abilityCd[type] = Math.max(0, _abilityCd[type] - dt);
        const fill = _abilityBtns[type].querySelector(".ability-cd-fill");
        fill.style.height = (_abilityCd[type] / _ABILITY_CD[type] * 100) + "%";
        _abilityBtns[type].disabled = _abilityCd[type] > 0;
      }
    }
    _abilitiesRaf = requestAnimationFrame(tick);
  }
  _abilitiesRaf = requestAnimationFrame(tick);
}

function _resumeAbilitiesLoop() {
  if (_abilitiesRaf) { cancelAnimationFrame(_abilitiesRaf); _abilitiesRaf = null; }
  document.getElementById("active-abilities-bar").classList.remove("hidden");
  let last = null;
  function tick(ts) {
    if (last === null) last = ts;
    const dt = (ts - last) / 1000;
    last = ts;
    for (const type of Object.keys(_abilityCd)) {
      if (_buffRemaining[type] > 0) {
        _buffRemaining[type] = Math.max(0, _buffRemaining[type] - dt);
        if (_buffRemaining[type] <= 0) {
          _abilityCd[type] = _ABILITY_CD[type];
          _abilityBtns[type].querySelector(".ability-cd-fill").style.height = "100%";
        }
      } else if (_abilityCd[type] > 0) {
        _abilityCd[type] = Math.max(0, _abilityCd[type] - dt);
        const fill = _abilityBtns[type].querySelector(".ability-cd-fill");
        fill.style.height = (_abilityCd[type] / _ABILITY_CD[type] * 100) + "%";
        _abilityBtns[type].disabled = _abilityCd[type] > 0;
      }
    }
    _abilitiesRaf = requestAnimationFrame(tick);
  }
  _abilitiesRaf = requestAnimationFrame(tick);
}

function _stopAbilitiesLoop() {
  if (_abilitiesRaf) { cancelAnimationFrame(_abilitiesRaf); _abilitiesRaf = null; }
  document.getElementById("active-abilities-bar").classList.add("hidden");
}

for (const [type, btn] of Object.entries(_abilityBtns)) {
  btn.addEventListener("click", () => {
    if (game.state !== "playing" || _abilityCd[type] > 0 || _buffRemaining[type] > 0) return;
    game.applyActiveBuff(type);
    _buffRemaining[type] = _BUFF_DURATION[type];
    btn.disabled = true;
    btn.querySelector(".ability-cd-fill").style.height = "100%";
  });
}

// Toggle buttons
document.getElementById("quick-abilities-off").addEventListener("click", () => {
  sfx.uiClick();
  _abilitiesEnabled = false;
  localStorage.setItem("abilitiesEnabled", "false");
  document.getElementById("quick-abilities-off").classList.add("active");
  document.getElementById("quick-abilities-on").classList.remove("active");
});
document.getElementById("quick-abilities-on").addEventListener("click", () => {
  sfx.uiClick();
  _abilitiesEnabled = true;
  localStorage.setItem("abilitiesEnabled", "true");
  document.getElementById("quick-abilities-on").classList.add("active");
  document.getElementById("quick-abilities-off").classList.remove("active");
});

// Restore persisted state on load (default: enabled)
if (_abilitiesEnabled) {
  document.getElementById("quick-abilities-on").classList.add("active");
  document.getElementById("quick-abilities-off").classList.remove("active");
} else {
  document.getElementById("quick-abilities-off").classList.add("active");
  document.getElementById("quick-abilities-on").classList.remove("active");
}

// ── Quick-match / Tag Team state ──────────────────────────────────────────────
let quickMatchMode = "1v1"; // '1v1' | 'tag2v2' | 'sim2v2' | 'battle'
let quickMatchEnemyMode = "random"; // 'random' | 'pick'
let _ttSlot = 0; // current char-select slot (0-3) in tag2v2
let _ttCfg = {}; // {my, partner, e1, e2} metas
let _s2vSlot = 0; // current char-select slot (0-3) in sim2v2
let _s2vCfg = {}; // {my, partner, e1, e2} metas
let _battleSlot = 0; // current char-select slot in battle (FFA 4-player)
let _battlePicks = []; // array of metas [p0, p1, p2, p3]
let _ttMatch = null; // active TagTeamMatch instance
let _ttPrevHp = [100, 100]; // previous HP snapshot for damage detection
let _ttHudRaf = null;

// ── Custom battle state ───────────────────────────────────────────────────────
let customArenaSize = 420;
let customFighters = 2;
let customHp = 100;
let customTeams = "none"; // 'none' | '2v1' | '2v2'
let customCfgs = [];
let customSlot = 0;

// ── Character grids → ui/characterSelect.js ───────────────────────────────────
const carousels = {};
carousels.p1 = buildGrid("p1", "btn-confirm-p1");
carousels.p2 = buildGrid("p2", "btn-confirm-p2");

// ── Rewards helpers ───────────────────────────────────────────────────────────
function _updateXpBar() {
  const xp = getXP(),
    chests = getChests();
  document.getElementById("xp-bar-fill").style.width = `${xp}%`;
  document.getElementById("xp-label").textContent = `${xp} / 100 XP`;
  document.getElementById("xp-chest-count").textContent = chests;
  document
    .getElementById("xp-chest-btn")
    .classList.toggle("hidden", chests <= 0);
}

document.addEventListener("mastery:claimed", () => _updateXpBar());

function _showGameoverPoints(lines) {
  const el = document.getElementById("gameover-points");
  if (!el) return;
  el.innerHTML = lines
    .map((l) => `<span class="gameover-pts-line">${l}</span>`)
    .join("");
  el.classList.remove("hidden");
}

function _showEventPoints(elId, lines) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = lines.map((l) => `<span>${l}</span>`).join("");
  el.classList.remove("hidden");
}

let _chestPreviewAnimId = null;
function _stopChestPreviewAnim() {
  if (_chestPreviewAnimId !== null) {
    cancelAnimationFrame(_chestPreviewAnimId);
    _chestPreviewAnimId = null;
  }
}

function _showChestModal(result) {
  const modal = document.getElementById("chest-modal");
  const animEl = document.getElementById("chest-anim");
  const titleEl = document.getElementById("chest-title");
  const rewardEl = document.getElementById("chest-reward");
  const previewEl = document.getElementById("chest-preview-canvas");

  _stopChestPreviewAnim();
  animEl.textContent = "📦";
  animEl.classList.remove("chest-open", "hidden");
  titleEl.textContent = "¡Cofre!";
  rewardEl.innerHTML = "";
  previewEl.classList.add("hidden");
  previewEl.classList.remove("chest-preview-arena");
  modal.classList.remove("hidden");

  const closeBtn = document.getElementById("btn-chest-close");
  closeBtn.disabled = true;

  setTimeout(() => {
    animEl.classList.add("chest-open");
    if (result.type === "skin") {
      animEl.classList.add("hidden");
      titleEl.textContent = "¡Skin desbloqueada!";
      const charMeta = metas.find((m) => m.id === result.charId);
      rewardEl.innerHTML = `<span class="chest-char">${charMeta?.name ?? result.charId}</span>
        <span class="chest-skin-name">${result.skinName}</span>`;

      previewEl.classList.remove("hidden");
      previewEl.classList.remove("chest-preview-arena");
      const _chestOpts = { rScale: 0.28, yScale: 0.5 };
      drawCharPreview(previewEl, charMeta, result.skinId, _chestOpts);
      if (ANIMATED_SKIN_IDS.has(result.skinId)) {
        const loop = () => {
          drawCharPreview(previewEl, charMeta, result.skinId, _chestOpts);
          _chestPreviewAnimId = requestAnimationFrame(loop);
        };
        _chestPreviewAnimId = requestAnimationFrame(loop);
      }

      notifySkinChange(result.charId);
      syncModalSkinIfOpen(result.charId);
    } else if (result.type === "arena_skin") {
      animEl.classList.add("hidden");
      titleEl.textContent = "¡Skin de Arena desbloqueada!";
      rewardEl.innerHTML = `<span class="chest-char">Arena</span>
        <span class="chest-skin-name">${result.skinName}</span>`;

      previewEl.classList.remove("hidden");
      previewEl.classList.add("chest-preview-arena");
      const pCtx = previewEl.getContext("2d");
      const pW = previewEl.width, pH = previewEl.height;
      if (isAnimatedArenaSkin(result.skinId)) {
        const loop = () => {
          drawArenaBg(pCtx, 0, 0, pW, pH, result.skinId, performance.now() / 1000);
          _chestPreviewAnimId = requestAnimationFrame(loop);
        };
        _chestPreviewAnimId = requestAnimationFrame(loop);
      } else {
        drawArenaBg(pCtx, 0, 0, pW, pH, result.skinId);
      }

      if (document.getElementById("arena-skin-name")) _syncArenaSkinSelector();
    } else {
      titleEl.textContent = "¡Ya tienes todo!";
      rewardEl.innerHTML =
        '<span class="chest-char">Todas las skins están desbloqueadas</span>';
    }
    closeBtn.disabled = false;
  }, 700);
}

document.getElementById("xp-chest-btn").addEventListener("click", () => {
  const result = openChest();
  if (!result) return;
  _updateXpBar();
  _showChestModal(result);
});
document.getElementById("btn-chest-close").addEventListener("click", () => {
  _stopChestPreviewAnim();
  document.getElementById("chest-modal").classList.add("hidden");
});

_updateXpBar();

// ── Auth ──────────────────────────────────────────────────────────────────────
initAuth();
try {
  initFriends();
} catch (e) {
  console.error("[friends] init failed:", e);
}
onLogin((username) => {
  const localName = localStorage.getItem("playerName");
  if (localName && localName !== "Invitado") {
    _savePlayerName(localName);
  } else if (username) {
    _savePlayerName(username);
  }
  _updateXpBar();
  refreshFriendsBadge();
  refreshMasteryBadges();
  document.getElementById("btn-view-own-profile").classList.remove("hidden");
  if (!_profilePanel.classList.contains("hidden")) _refreshProfilePanel();
  getMyUserId().then(uid => { if (uid) checkProfileCommentsBadge(uid); });
});
onLogout(() => {
  localStorage.removeItem("playerName");
  _savePlayerName("Invitado");
  refreshFriendsBadge();
  document.getElementById("btn-view-own-profile").classList.add("hidden");
  if (!_profilePanel.classList.contains("hidden")) _refreshProfilePanel();
});

document.getElementById("btn-open-friends").addEventListener("click", () => {
  sfx.uiClick();
  openFriendsPanel();
});

document
  .getElementById("btn-open-leaderboard")
  .addEventListener("click", () => {
    sfx.uiClick();
    openLeaderboard();
  });
document
  .getElementById("btn-leaderboard-close")
  .addEventListener("click", () => {
    sfx.uiClick();
    document.getElementById("leaderboard-modal").classList.add("hidden");
  });
document.getElementById("leaderboard-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("leaderboard-modal")) {
    document.getElementById("leaderboard-modal").classList.add("hidden");
  }
});

document.getElementById("btn-view-own-profile").addEventListener("click", async () => {
  const uid = await getMyUserId();
  if (!uid) return;
  const { openUserProfile } = await import("./social/userProfile.js");
  openUserProfile(uid);
});

document
  .getElementById("btn-user-profile-close")
  .addEventListener("click", () => {
    document.getElementById("user-profile-modal").classList.add("hidden");
  });
document.getElementById("user-profile-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("user-profile-modal")) {
    document.getElementById("user-profile-modal").classList.add("hidden");
  }
});

// ── Screen management → ui/screens.js ────────────────────────────────────────

// ── Toggle pill (sliding indicator for segmented controls) ───────────────────
function _initTogglePill(rowEl) {
  if (rowEl.querySelector(".toggle-pill")) return;
  const pill = document.createElement("div");
  pill.className = "toggle-pill";
  rowEl.appendChild(pill);

  function _move() {
    const btns = [...rowEl.querySelectorAll(".toggle-opt:not(.hidden)")];
    const active = rowEl.querySelector(".toggle-opt.active:not(.hidden)");
    if (!btns.length || !active) return;
    const idx = btns.indexOf(active);
    const n = btns.length;
    pill.style.width = `calc((100% - ${(n + 1) * 3}px) / ${n})`;
    pill.style.transform = `translateX(calc(${idx} * (100% + 3px)))`;
  }

  _move();
  rowEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("toggle-opt")) _move();
  });
}

document.querySelectorAll(".toggle-row").forEach((row) => _initTogglePill(row));

showScreen("screen-main-menu");

document
  .getElementById("btn-hp-toggle")
  ?.classList.toggle("btn-util--active", getHpVisible());
_applyBattleSpeed();

{
  const _startMusic = () => {
    music.start();
    document.removeEventListener("pointerdown", _startMusic);
    document.removeEventListener("keydown", _startMusic);
  };
  document.addEventListener("pointerdown", _startMusic, { once: true });
  document.addEventListener("keydown", _startMusic, { once: true });
}

// ── Menu animation → ui/menuAnimation.js ─────────────────────────────────────

// ── Player name & profile panel ──────────────────────────────────────────────
const _chipName = document.getElementById("player-name-display");
const _profileName = document.getElementById("profile-name-display");
const _profileInput = document.getElementById("profile-name-input");
const _profileAvatar = document.getElementById("profile-avatar-circle");
const _profileStatsEl = document.getElementById("profile-stats");
const _profilePanel = document.getElementById("profile-panel");
const _profileEditRow = document.getElementById("profile-name-edit-row");

function _loadPlayerName() {
  const name = localStorage.getItem("playerName") || "Invitado";
  _chipName.dataset.rawName = name;
  _profileName.dataset.rawName = name;
  _chipName.textContent = name;
  _profileName.textContent = name;
  _profileInput.value = name;
}
_loadPlayerName();

function _savePlayerName(val) {
  val = val.trim() || "Invitado";
  localStorage.setItem("playerName", val);
  _chipName.dataset.rawName = val;
  _profileName.dataset.rawName = val;
  _profileInput.value = val;
  updateUsername(val);
  _applyPlayerBadge(loadMissions().activeBadge);
}

function _confirmProfileName() {
  _savePlayerName(_profileInput.value);
  _profileName.classList.remove("hidden");
  document.getElementById("btn-profile-edit-name").classList.remove("hidden");
  _profileEditRow.classList.add("hidden");
}

function _buildProfileStats() {
  const s = getStats();
  const bestTower = getBestTowerRun();
  const favResult = getMostUsedChar(metas);
  const mostUsed = favResult?.meta ?? null;
  const favCount = favResult?.count ?? 0;

  if (mostUsed) {
    _profileAvatar.style.background = mostUsed.color + "28";
    _profileAvatar.style.borderColor = mostUsed.color + "66";
    _profileAvatar.style.color = mostUsed.color;
    _profileAvatar.innerHTML = `<span style="font-size:2rem">${mostUsed.icon}</span>`;
  } else {
    _profileAvatar.style.background = "";
    _profileAvatar.style.borderColor = "";
    _profileAvatar.style.color = "";
    _profileAvatar.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.35"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  const totalW = Object.values(s.wins).reduce((a, b) => a + b, 0);
  const totalL = Object.values(s.losses).reduce((a, b) => a + b, 0);
  const totalD = Object.values(s.draws).reduce((a, b) => a + b, 0);
  const totalG = totalW + totalL + totalD;
  const winRate = totalG > 0 ? Math.round((totalW / totalG) * 100) : 0;

  const modeWins = [
    { lbl: '1 vs 1',  val: s.wins.quick1v1    },
    { lbl: '2 vs 2',  val: s.wins.quick2v2    },
    { lbl: 'Liga',    val: s.wins.league      },
    { lbl: 'Torneo',  val: s.wins.tournament  },
  ];
  const maxMW = Math.max(...modeWins.map(m => m.val), 1);
  const modeBarsHtml = modeWins.map(m => {
    const pct = Math.round((m.val / maxMW) * 100);
    return `<div class="pstat-mode-row">
      <span class="pstat-mode-lbl">${m.lbl}</span>
      <div class="pstat-mode-track"><div class="pstat-mode-fill" style="width:${pct}%"></div></div>
      <span class="pstat-mode-num">${m.val}</span>
    </div>`;
  }).join('');

  const charHtml = mostUsed
    ? `<div class="pstat-char-card">
        <div class="pstat-char-circle" style="background:${mostUsed.color}28">${mostUsed.icon}</div>
        <div class="pstat-char-info">
          <span class="pstat-char-name" style="color:${mostUsed.color}">${mostUsed.name}</span>
          <span class="pstat-char-sub">${favCount} partida${favCount !== 1 ? 's' : ''} · Favorito</span>
        </div>
      </div>`
    : `<div class="pstat-char-card"><span class="pstat-char-empty">Sin partidas registradas</span></div>`;

  const floor  = s.towerMaxFloor > 0 ? s.towerMaxFloor : (bestTower?.floor ?? 0);
  const charId = s.towerBestChar ?? bestTower?.powerMetaId ?? null;
  const tMeta  = charId ? (metas.find(m => m.id === charId) ?? metas.find(m => m.name === charId) ?? null) : null;

  const towerCardHtml = `<div class="pstat-tower-card">
    <span class="pstat-tower-hd">Torre Infinita</span>
    <span class="pstat-tower-floor">${floor > 0 ? floor : '—'}</span>
    ${tMeta ? `<div class="pstat-tower-char-row">
      <div class="pstat-tower-dot" style="background:${tMeta.color}28;color:${tMeta.color}">${tMeta.icon}</div>
      <span class="pstat-tower-char-name" style="color:${tMeta.color}">${tMeta.name}</span>
    </div>` : ''}
  </div>`;

  const champsCardHtml = `<div class="pstat-champs-card">
    <div class="pstat-champ-item">
      <span class="pstat-champ-icon">🏆</span>
      <div>
        <span class="pstat-champ-n">${s.championships.league}</span>
        <span class="pstat-champ-lbl">Ligas ganadas</span>
      </div>
    </div>
    <div class="pstat-champ-item">
      <span class="pstat-champ-icon">🥇</span>
      <div>
        <span class="pstat-champ-n">${s.championships.tournament}</span>
        <span class="pstat-champ-lbl">Torneos ganados</span>
      </div>
    </div>
  </div>`;

  _profileStatsEl.innerHTML = `
    <div class="pstat-stat-row">
      <div class="pstat-pill">
        <span class="pstat-pill-val">${totalG}</span>
        <span class="pstat-pill-lbl">Partidas</span>
      </div>
      <div class="pstat-pill pstat-pill--win">
        <span class="pstat-pill-val">${totalW}</span>
        <span class="pstat-pill-lbl">Victorias</span>
      </div>
      <div class="pstat-pill pstat-pill--loss">
        <span class="pstat-pill-val">${totalL}</span>
        <span class="pstat-pill-lbl">Derrotas</span>
      </div>
    </div>
    <div class="pstat-winrate-wrap">
      <div class="pstat-winrate-track">
        <div class="pstat-winrate-fill" style="width:${winRate}%"></div>
      </div>
      <span class="pstat-winrate-label">${winRate}% win rate · ${totalD} empate${totalD !== 1 ? 's' : ''}</span>
    </div>
    <div class="pstat-section">
      <div class="pstat-section-hd">Victorias por modo</div>
      <div class="pstat-mode-bars">${modeBarsHtml}</div>
    </div>
    ${charHtml}
    <div class="pstat-bottom-row">${towerCardHtml}${champsCardHtml}</div>
  `;
}

function _closeProfile() {
  const sheet = _profilePanel.querySelector(".profile-sheet");
  sheet.classList.add("profile-sheet--closing");
  sheet.addEventListener(
    "animationend",
    () => {
      sheet.classList.remove("profile-sheet--closing");
      _profilePanel.classList.add("hidden");
      _profileEditRow.classList.add("hidden");
      _profileName.classList.remove("hidden");
      document
        .getElementById("btn-profile-edit-name")
        .classList.remove("hidden");
    },
    { once: true },
  );
}

async function _refreshProfilePanel() {
  _profileStatsEl.innerHTML = '<div class="pstat-loading">Cargando...</div>';
  let friendCode = null;
  try {
    [, , friendCode] = await Promise.all([
      syncStatsFromCloud(),
      syncRewardsFromCloud(),
      getMyFriendCode(),
    ]);
  } catch (err) {
    console.warn("[profile] sync error:", err);
  }
  _buildProfileStats();
  _updateXpBar();
  const fcEl = document.getElementById("profile-friend-code");
  if (fcEl) {
    if (friendCode) {
      fcEl.dataset.code = friendCode;
      fcEl.innerHTML = `<span class="pfc-label">Tu código</span><span class="pfc-code">${friendCode}</span><span class="pfc-icon" id="pfc-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span>`;
      fcEl.classList.remove("hidden");
    } else {
      fcEl.classList.add("hidden");
    }
  }
}

document
  .getElementById("btn-open-profile")
  .addEventListener("click", async () => {
    sfx.uiClick();
    _profilePanel.classList.remove("hidden");
    await _refreshProfilePanel();
  });

document
  .getElementById("profile-friend-code")
  .addEventListener("click", async function () {
    const code = this.dataset.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    const icon = this.querySelector(".pfc-icon");
    if (icon) {
      icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => {
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      }, 2000);
    }
  });

document.getElementById("btn-profile-close").addEventListener("click", () => {
  sfx.uiClick();
  _closeProfile();
});

_profilePanel.addEventListener("click", (e) => {
  if (e.target === _profilePanel) {
    sfx.uiClick();
    _closeProfile();
  }
});

document
  .getElementById("btn-profile-edit-name")
  .addEventListener("click", () => {
    _profileName.classList.add("hidden");
    document.getElementById("btn-profile-edit-name").classList.add("hidden");
    _profileEditRow.classList.remove("hidden");
    _profileInput.focus();
    _profileInput.select();
  });

document
  .getElementById("btn-profile-confirm")
  .addEventListener("click", _confirmProfileName);
_profileInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") _confirmProfileName();
  if (e.key === "Escape") {
    _profileInput.value = localStorage.getItem("playerName") || "Invitado";
    _confirmProfileName();
  }
});

// ── Novedades ─────────────────────────────────────────────────────────────────
{
  const list = document.getElementById("menu-news-list");
  if (list) {
    list.innerHTML = NEWS.map(({ badge, text }) => {
      const cls = `news-badge news-badge--${badge.toLowerCase().replace(/[^a-z]/g, "")}`;
      return `<li><span class="${cls}">${badge}</span>${text}</li>`;
    }).join("");
  }
  document.getElementById("menu-news")?.addEventListener("click", () => {
    document.getElementById("menu-news").classList.toggle("expanded");
  });
}

// ── Main menu ─────────────────────────────────────────────────────────────────
document.getElementById("btn-quickmatch")?.addEventListener("click", () => {
  sfx.uiClick();
  goToQuickSetup();
});

document.getElementById("btn-league").addEventListener("click", async () => {
  sfx.uiClick();
  await _syncCompetitionFromCloud('league_saved', 'arena_league');
  if (loadLeague()) {
    showLeagueStandings(isLeagueFinished());
  } else {
    gameMode = "league";
    updateLeagueInfo();
    showScreen("screen-league-setup");
  }
});

document.getElementById("btn-tournament").addEventListener("click", async () => {
  sfx.uiClick();
  await _syncCompetitionFromCloud('tournament_saved', 'arena_tournament');
  if (loadTournament()) {
    showTournamentScreen();
  } else {
    gameMode = "tournament";
    updateTournamentInfo();
    showScreen("screen-tournament-setup");
  }
});

document.getElementById("btn-tower").addEventListener("click", () => {
  sfx.uiClick();
  gameMode = "tower";
  _refreshTowerSetupScreen();
  showScreen("screen-tower-setup");
});

document.getElementById("btn-tower-go").addEventListener("click", () => {
  sfx.uiClick();
  gameMode = "tower";
  document.querySelector("#screen-select-p1 h2").textContent = "Elegí tu personaje";
  showScreen("screen-select-p1");
  carousels.p1.reset();
});

document.getElementById("btn-tower-continue")?.addEventListener("click", () => {
  sfx.uiClick();
  const saved = loadTowerRun();
  if (!saved) return;
  const allMetas = getAllPowerMetas();
  const meta = allMetas.find(m => m.id === saved.powerMetaId);
  if (!meta) return;
  gameMode = "tower";
  _startTowerRun(meta, saved);
});

document.getElementById("nav-tab-inicio").addEventListener("click", () => {
  sfx.uiClick();
  if (currentScreen !== "screen-main-menu") showScreen("screen-main-menu");
});

document.getElementById("nav-tab-play").addEventListener("click", () => {
  sfx.uiClick();
  goToQuickSetup();
});

document.getElementById("btn-custom")?.addEventListener("click", () => {
  sfx.uiClick();
  gameMode = "custom";
  _updateCustomTeamsUI();
  _updateCustomInfo();
  showScreen("screen-custom-setup");
});

// ── Back buttons ──────────────────────────────────────────────────────────────
document.getElementById("btn-p1-back").addEventListener("click", () => {
  if (gameMode === "quickmatch") showScreen("screen-quick-setup");
  else if (gameMode === "league") showScreen("screen-league-setup");
  else if (gameMode === "tournament") showScreen("screen-tournament-setup");
  else if (gameMode === "tag2v2") {
    if (_ttSlot === 0) showScreen("screen-quick-setup");
    else _goToTagSlot(_ttSlot - 1);
  } else if (gameMode === "sim2v2") {
    if (_s2vSlot === 0) showScreen("screen-quick-setup");
    else _goToSim2v2Slot(_s2vSlot - 1);
  } else if (gameMode === "battle") {
    if (_battleSlot === 0) showScreen("screen-quick-setup");
    else _goToBattleSlot(_battleSlot - 1);
  } else if (gameMode === "custom") {
    if (customSlot === 0) showScreen("screen-custom-setup");
    else _goToCustomSlot(customSlot - 1);
  }
});

document.getElementById("btn-custom-back").addEventListener("click", () => {
  showScreen("screen-main-menu");
});

document.getElementById("btn-custom-go").addEventListener("click", () => {
  sfx.uiClick();
  customCfgs = new Array(customFighters).fill(null);
  customSlot = 0;
  _goToCustomSlot(0);
});

document.getElementById("btn-p2-back").addEventListener("click", () => {
  showScreen("screen-select-p1");
});

document.getElementById("btn-fight-back").addEventListener("click", () => {
  if (gameMode === "tower") {
    showConfirm(() => {
      game.stop();
      stopHudLoop();
      _stopAbilitiesLoop();
      document.getElementById("gameover-bar").classList.add("hidden");
      document.getElementById("fight-tag-area").classList.add("hidden");
      _tower = null;
      gameMode = "quickmatch";
      _refreshTowerSetupScreen();
      showScreen("screen-tower-setup");
    }, "¿Volver al menú?", " ", "Volver");
    return;
  }
  showConfirm(() => {
    game.stop();
    stopHudLoop();
    _stopAbilitiesLoop();
    matchResultCallback = null;
    _ttMatch = null;
    document.getElementById("gameover-bar").classList.add("hidden");
    document.getElementById("fight-tag-area").classList.add("hidden");
    showScreen("screen-main-menu");
  });
});

document.getElementById("btn-tag-switch").addEventListener("click", () => {
  if (!_ttMatch || !_ttMatch.canTag(0) || game.state !== "playing") return;
  sfx.uiClick();
  const snap = game.getHpSnapshot();
  const outgoing = _ttMatch.getActive(0);
  const outPower = game.circles[0]?.power;
  let rawHp0 = snap[0]?.isAlive ? snap[0].hp : outgoing.hp;
  let saveHp0 = rawHp0;
  if (outPower?._comp !== undefined) {
    outgoing._duoCompHp = outPower._comp.isAlive ? outPower._comp.hp : 0;
    outgoing._duoOwnerHp = rawHp0;
    saveHp0 = snap[0]._hudHp ?? rawHp0;
  }
  _ttMatch.doTag(0, saveHp0);
  const incoming = _ttMatch.getActive(0);
  const inHp0 = incoming._duoOwnerHp ?? incoming.hp;
  const inSkin0 = _fighterSkin(incoming);
  game.swapFighter(0, {
    color: inSkin0.color,
    label: incoming.meta.name,
    powerId: incoming.meta.id,
    hp: inHp0,
    skinId: inSkin0.skinId,
    _duoCompHp: incoming._duoCompHp,
  });
  _ttPrevHp[0] = inHp0;
  showTagFlash(0, _ttMatch);
  buildTagHud(_ttMatch);
});

// ── Mute / Lang helpers ───────────────────────────────────────────────────────
function _syncMuteButtons() {
  const icon = sfx.enabled ? "🔊" : "🔇";
  ["btn-mute", "btn-mute-fight"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = icon;
  });
}
function _syncLangButtons() {
  const label = getLang().toUpperCase();
  const el = document.getElementById("btn-lang");
  if (el) el.textContent = label;
}

["btn-mute", "btn-mute-fight"].forEach((id) => {
  document.getElementById(id)?.addEventListener("click", () => {
    sfx.enabled = !sfx.enabled;
    if (sfx.enabled) {
      music.enabled = true;
      music.start();
      if (currentScreen === "screen-fight") music.setMode("game");
    } else {
      music.enabled = false;
      music.stop(true);
    }
    _syncMuteButtons();
    sfx.uiClick();
  });
});

document.getElementById("btn-lang")?.addEventListener("click", () => {
  const newLang = getLang() === "es" ? "en" : "es";
  setLang(newLang);
  _syncLangButtons();
  updateLeagueInfo();
  updateTournamentInfo();
  sfx.uiClick();
});

document.getElementById("btn-hp-toggle")?.addEventListener("click", () => {
  const next = !getHpVisible();
  setHpVisible(next);
  const btn = document.getElementById("btn-hp-toggle");
  btn.classList.toggle("btn-util--active", next);
  sfx.uiClick();
});

// ── Confirm modal → ui/screens.js ────────────────────────────────────────────

// ── P1 / P2 select ────────────────────────────────────────────────────────────
function goToP1Select() {
  const playerName = localStorage.getItem("playerName") || "Invitado";
  document.getElementById("tag-p1").textContent = playerName.toUpperCase();
  document.querySelector("#screen-select-p1 h2").textContent =
    t("select.p1.h2");
  document.getElementById("btn-confirm-p1").textContent = t("btn.confirm");
  document.getElementById("btn-p1-back").classList.remove("hidden");
  showScreen("screen-select-p1");
  carousels.p1.reset();
}

// ── Quick match setup screen ──────────────────────────────────────────────────
function goToQuickSetup() {
  const modeBtn =
    quickMatchMode === "tag2v2"
      ? "quick-2v2-btn"
      : quickMatchMode === "sim2v2"
        ? "quick-sim2v2-btn"
        : quickMatchMode === "battle"
          ? "quick-battle-btn"
          : "quick-1v1-btn";
  const enemyBtn =
    quickMatchEnemyMode === "pick" ? "quick-pick-btn" : "quick-random-btn";
  document
    .getElementById(modeBtn)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  document
    .getElementById(enemyBtn)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  if (quickMatchMode !== "sim2v2" && quickMatchMode !== "battle") {
    document
      .querySelectorAll("#quick-size-row .toggle-opt")
      .forEach((b, i) =>
        b.classList.toggle("active", i === getQuickArenaSizeIdx()),
      );
  }
  _syncArenaSkinSelector();
  showScreen("screen-quick-setup");
}

// ── Arena size/layout event listeners ────────────────────────────────────────
["quick-size-sm", "quick-size-md", "quick-size-lg"].forEach((id, i) => {
  document.getElementById(id).addEventListener("click", () => {
    if (_largeArenaLocked) return;
    sfx.uiClick();
    setQuickArenaSizeIdx(i);
    document
      .querySelectorAll("#quick-size-row .toggle-opt")
      .forEach((b, j) => b.classList.toggle("active", j === i));
    drawArenaPreview();
  });
});

document.getElementById("arena-prev").addEventListener("click", () => {
  sfx.uiClick();
  setQuickArenaLayoutIdx(
    (getQuickArenaLayoutIdx() - 1 + ARENA_LAYOUTS.length) %
      ARENA_LAYOUTS.length,
  );
  drawArenaPreview();
});
document.getElementById("arena-next").addEventListener("click", () => {
  sfx.uiClick();
  setQuickArenaLayoutIdx((getQuickArenaLayoutIdx() + 1) % ARENA_LAYOUTS.length);
  drawArenaPreview();
});

function _syncArenaSkinSelector() {
  const skin = ARENA_SKINS[getQuickArenaSkinIdx()];
  const locked = !isArenaSkinUnlocked(skin.id);
  const nameEl = document.getElementById("arena-skin-name");
  const lockEl = document.getElementById("arena-skin-lock");
  const goBtn = document.getElementById("btn-quick-go");
  if (nameEl) nameEl.textContent = skin.name;
  if (lockEl) lockEl.classList.toggle("lock-invisible", !locked);
  if (goBtn) {
    goBtn.disabled = locked;
  }
  drawArenaPreview();
}

document.getElementById("arena-skin-prev").addEventListener("click", () => {
  sfx.uiClick();
  setQuickArenaSkinIdx(
    (getQuickArenaSkinIdx() - 1 + ARENA_SKINS.length) % ARENA_SKINS.length,
  );
  const skin = ARENA_SKINS[getQuickArenaSkinIdx()];
  if (isArenaSkinUnlocked(skin.id)) setSelectedArenaSkinId(skin.id);
  _syncArenaSkinSelector();
});
document.getElementById("arena-skin-next").addEventListener("click", () => {
  sfx.uiClick();
  setQuickArenaSkinIdx((getQuickArenaSkinIdx() + 1) % ARENA_SKINS.length);
  const skin = ARENA_SKINS[getQuickArenaSkinIdx()];
  if (isArenaSkinUnlocked(skin.id)) setSelectedArenaSkinId(skin.id);
  _syncArenaSkinSelector();
});

function _updateQuickSetupInfo() {
  const el = document.getElementById("quick-setup-info");
  if (!el) return;
  const map = {
    "1v1_random": "Elige tu personaje y pelea contra un rival al azar",
    "1v1_pick": "Elige tu personaje y el del rival",
    tag2v2_random:
      "Elige tu luchador y tu compañero — los rivales serán al azar",
    tag2v2_pick: "Elige los 4 luchadores: tu equipo y ambos rivales",
    sim2v2_random: "2v2: elige tu dúo — rivales al azar. Arena siempre grande.",
    sim2v2_pick: "2v2: elige los 4 luchadores. Arena siempre grande.",
    battle_random:
      "Batalla 4 jugadores: elige tu luchador — 3 rivales al azar. Arena siempre grande.",
    battle_pick:
      "Batalla 4 jugadores: elige los 4 luchadores. Arena siempre grande.",
  };
  el.textContent = map[`${quickMatchMode}_${quickMatchEnemyMode}`] || "";
}

document
  .getElementById("btn-quick-setup-back")
  .addEventListener("click", () => {
    showScreen("screen-main-menu");
  });

let _largeArenaLocked = false;

function _setLargeArenaLock(locked) {
  const row = document.getElementById("quick-size-row");
  if (locked) {
    _largeArenaLocked = false;
    document.getElementById("quick-size-lg").click(); // animate pill to Grande
    _largeArenaLocked = true;
    row.classList.add("locked");
  } else {
    _largeArenaLocked = false;
    row.classList.remove("locked");
  }
}

document.getElementById("quick-1v1-btn").addEventListener("click", () => {
  sfx.uiClick();
  quickMatchMode = "1v1";
  document
    .querySelectorAll("#quick-mode-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-1v1-btn").classList.add("active");
  _setLargeArenaLock(false);
  _updateQuickSetupInfo();
});

document.getElementById("quick-2v2-btn").addEventListener("click", () => {
  sfx.uiClick();
  quickMatchMode = "tag2v2";
  document
    .querySelectorAll("#quick-mode-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-2v2-btn").classList.add("active");
  _setLargeArenaLock(false);
  _updateQuickSetupInfo();
});

document.getElementById("quick-sim2v2-btn").addEventListener("click", () => {
  sfx.uiClick();
  quickMatchMode = "sim2v2";
  document
    .querySelectorAll("#quick-mode-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-sim2v2-btn").classList.add("active");
  _setLargeArenaLock(true);
  _updateQuickSetupInfo();
});

document.getElementById("quick-battle-btn").addEventListener("click", () => {
  sfx.uiClick();
  quickMatchMode = "battle";
  document
    .querySelectorAll("#quick-mode-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-battle-btn").classList.add("active");
  _setLargeArenaLock(true);
  _updateQuickSetupInfo();
});

document.getElementById("quick-random-btn").addEventListener("click", () => {
  sfx.uiClick();
  quickMatchEnemyMode = "random";
  document
    .querySelectorAll("#quick-enemy-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-random-btn").classList.add("active");
  _updateQuickSetupInfo();
});

document.getElementById("quick-pick-btn").addEventListener("click", () => {
  sfx.uiClick();
  quickMatchEnemyMode = "pick";
  document
    .querySelectorAll("#quick-enemy-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-pick-btn").classList.add("active");
  _updateQuickSetupInfo();
});

document.getElementById("btn-quick-go").addEventListener("click", () => {
  sfx.uiClick();
  if (quickMatchMode === "1v1") {
    gameMode = "quickmatch";
    goToP1Select();
  } else if (quickMatchMode === "sim2v2") {
    gameMode = "sim2v2";
    _s2vCfg = {};
    _s2vSlot = 0;
    _goToSim2v2Slot(0);
  } else if (quickMatchMode === "battle") {
    gameMode = "battle";
    _battlePicks = [];
    _battleSlot = 0;
    _goToBattleSlot(0);
  } else {
    gameMode = "tag2v2";
    _ttCfg = {};
    _ttSlot = 0;
    _goToTagSlot(0);
  }
});

// ── League/tournament P1 select buttons ──────────────────────────────────────
document
  .getElementById("btn-league-go")
  .addEventListener("click", goToP1Select);
document
  .getElementById("btn-tournament-go")
  .addEventListener("click", goToP1Select);

// ── Tag team slot navigation ──────────────────────────────────────────────────
function _goToTagSlot(slot) {
  _ttSlot = slot;
  const labels = ["Tu luchador", "Tu compañero", "Rival 1", "Rival 2"];
  const tagLabels = ["TÚ", "COMPAÑERO", "RIVAL 1", "RIVAL 2"];
  const lastSlot = quickMatchEnemyMode === "random" ? 1 : 3;
  const isLast = slot === lastSlot;

  const playerName = localStorage.getItem("playerName") || "Invitado";
  document.getElementById("tag-p1").textContent =
    slot === 0 ? playerName.toUpperCase() : tagLabels[slot];
  document.querySelector("#screen-select-p1 h2").textContent = labels[slot];
  document.getElementById("btn-confirm-p1").textContent = isLast
    ? "Listo"
    : "Siguiente";
  document.getElementById("btn-p1-back").classList.remove("hidden");
  showScreen("screen-select-p1");
  carousels.p1.reset();
}

// ── Sim 2v2 slot navigation ───────────────────────────────────────────────────
function _goToSim2v2Slot(slot) {
  _s2vSlot = slot;
  const labels = ["Tu luchador", "Tu compañero", "Rival 1", "Rival 2"];
  const tagLabels = ["TÚ", "COMPAÑERO", "RIVAL 1", "RIVAL 2"];
  const lastSlot = quickMatchEnemyMode === "random" ? 1 : 3;
  const isLast = slot === lastSlot;

  const playerName = localStorage.getItem("playerName") || "Invitado";
  document.getElementById("tag-p1").textContent =
    slot === 0 ? playerName.toUpperCase() : tagLabels[slot];
  document.querySelector("#screen-select-p1 h2").textContent = labels[slot];
  document.getElementById("btn-confirm-p1").textContent = isLast
    ? "Listo"
    : "Siguiente";
  document.getElementById("btn-p1-back").classList.remove("hidden");
  showScreen("screen-select-p1");
  carousels.p1.reset();
}

function _goToBattleSlot(slot) {
  _battleSlot = slot;
  const labels = ["Tu luchador", "Rival 1", "Rival 2", "Rival 3"];
  const tagLabels = ["TÚ", "RIVAL 1", "RIVAL 2", "RIVAL 3"];
  const lastSlot = quickMatchEnemyMode === "random" ? 0 : 3;
  const isLast = slot === lastSlot;

  const playerName = localStorage.getItem("playerName") || "Invitado";
  document.getElementById("tag-p1").textContent =
    slot === 0 ? playerName.toUpperCase() : tagLabels[slot];
  document.querySelector("#screen-select-p1 h2").textContent = labels[slot];
  document.getElementById("btn-confirm-p1").textContent = isLast
    ? "Listo"
    : "Siguiente";
  document.getElementById("btn-p1-back").classList.remove("hidden");
  showScreen("screen-select-p1");
  carousels.p1.reset();
}

function _goToCustomSlot(slot) {
  customSlot = slot;
  const total = customFighters;
  const isLast = slot === total - 1;

  const slotLabel = () => {
    if (slot === 0) return "Tu personaje";
    if (customTeams === "2v1") {
      if (slot === 1) return "Tu compañero (Equipo 1)";
      return "El rival (Equipo 2)";
    }
    if (customTeams === "2v2") {
      if (slot === 1) return "Tu compañero (Equipo 1)";
      if (slot === 2) return "Rival 1 (Equipo 2)";
      return "Rival 2 (Equipo 2)";
    }
    return `Luchador ${slot + 1}`;
  };

  const tagEl = document.getElementById("tag-p1");
  const h2El = document.querySelector("#screen-select-p1 h2");
  const confirmEl = document.getElementById("btn-confirm-p1");

  const _pname = localStorage.getItem("playerName") || "Invitado";
  tagEl.textContent =
    slot === 0 ? _pname.toUpperCase() : `${slot + 1} / ${total}`;
  h2El.textContent = slotLabel();
  confirmEl.textContent = isLast ? "Listo" : "Siguiente";

  document.getElementById("btn-p1-back").classList.remove("hidden");
  showScreen("screen-select-p1");
  carousels.p1.reset();
}

document.getElementById("btn-confirm-p1").addEventListener("click", () => {
  const selected = carousels.p1.getSelected();
  p1Choice = selected;
  if (gameMode === "quickmatch") {
    if (quickMatchEnemyMode === "random") {
      const available = metas.filter((m) => m.id !== selected.id);
      const p2rnd = available[Math.floor(Math.random() * available.length)];
      startFight(selected, p2rnd, null, getQuickArenaOpts());
    } else {
      showScreen("screen-select-p2");
      carousels.p2.reset();
    }
  } else if (gameMode === "tag2v2") {
    const slotKeys = ["my", "partner", "e1", "e2"];
    _ttCfg[slotKeys[_ttSlot]] = selected;
    const lastPickSlot = quickMatchEnemyMode === "random" ? 1 : 3;
    if (_ttSlot === lastPickSlot) {
      if (quickMatchEnemyMode === "random") {
        const used = [_ttCfg.my?.id, _ttCfg.partner?.id].filter(Boolean);
        const avail = metas.filter((m) => !used.includes(m.id));
        const shuffled = [...avail].sort(() => Math.random() - 0.5);
        _ttCfg.e1 = shuffled[0];
        _ttCfg.e2 = shuffled[1] ?? shuffled[0];
      }
      startTagTeamFight();
    } else {
      _goToTagSlot(_ttSlot + 1);
    }
  } else if (gameMode === "sim2v2") {
    const slotKeys = ["my", "partner", "e1", "e2"];
    _s2vCfg[slotKeys[_s2vSlot]] = selected;
    const lastPickSlot = quickMatchEnemyMode === "random" ? 1 : 3;
    if (_s2vSlot === lastPickSlot) {
      if (quickMatchEnemyMode === "random") {
        const used = [_s2vCfg.my?.id, _s2vCfg.partner?.id].filter(Boolean);
        const avail = metas.filter((m) => !used.includes(m.id));
        const shuffled = [...avail].sort(() => Math.random() - 0.5);
        _s2vCfg.e1 = shuffled[0];
        _s2vCfg.e2 = shuffled[1] ?? shuffled[0];
      }
      startSim2v2Fight();
    } else {
      _goToSim2v2Slot(_s2vSlot + 1);
    }
  } else if (gameMode === "battle") {
    _battlePicks[_battleSlot] = selected;
    const lastPickSlot = quickMatchEnemyMode === "random" ? 0 : 3;
    if (_battleSlot === lastPickSlot) {
      if (quickMatchEnemyMode === "random") {
        const avail = metas.filter((m) => m.id !== selected.id);
        const shuffled = [...avail].sort(() => Math.random() - 0.5);
        _battlePicks[1] = shuffled[0];
        _battlePicks[2] = shuffled[1] ?? shuffled[0];
        _battlePicks[3] = shuffled[2] ?? shuffled[0];
      }
      startBattleFight();
    } else {
      _goToBattleSlot(_battleSlot + 1);
    }
  } else if (gameMode === "tower") {
    _startTowerRun(selected);
  } else if (gameMode === "league") {
    if (isLeagueRandomMode()) startLeague();
    else showParticipantPicker("league");
  } else if (gameMode === "tournament") {
    if (isTournamentRandomMode()) startTournament();
    else showParticipantPicker("tournament");
  } else if (gameMode === "custom") {
    customCfgs[customSlot] = {
      color: selected.color,
      label: selected.name,
      powerId: selected.id,
      hp: customHp,
      teamId: null,
    };
    if (customSlot < customFighters - 1) _goToCustomSlot(customSlot + 1);
    else _launchCustomBattle();
  }
});

document.getElementById("btn-confirm-p2").addEventListener("click", () => {
  p2Choice = carousels.p2.getSelected();
  startFight(p1Choice, p2Choice, null, getQuickArenaOpts());
});

// ── Custom battle setup ───────────────────────────────────────────────────────
document
  .getElementById("custom-arena-sm")
  .addEventListener("click", () => _setCustomArena(320));
document
  .getElementById("custom-arena-md")
  .addEventListener("click", () => _setCustomArena(420));
document
  .getElementById("custom-arena-lg")
  .addEventListener("click", () => _setCustomArena(540));

function _setCustomArena(size) {
  customArenaSize = size;
  const ids = {
    320: "custom-arena-sm",
    420: "custom-arena-md",
    540: "custom-arena-lg",
  };
  Object.values(ids).forEach((id) =>
    document.getElementById(id).classList.remove("active"),
  );
  document.getElementById(ids[size]).classList.add("active");
  _updateCustomInfo();
}

document.getElementById("custom-fighters-dec").addEventListener("click", () => {
  if (customFighters <= 2) return;
  customFighters--;
  document.getElementById("custom-fighters-val").textContent = customFighters;
  _updateCustomTeamsUI();
  _updateCustomInfo();
});
document.getElementById("custom-fighters-inc").addEventListener("click", () => {
  if (customFighters >= 4) return;
  customFighters++;
  document.getElementById("custom-fighters-val").textContent = customFighters;
  _updateCustomTeamsUI();
  _updateCustomInfo();
});

[50, 100, 150, 200].forEach((hp) => {
  document.getElementById(`custom-hp-${hp}`).addEventListener("click", () => {
    customHp = hp;
    document
      .querySelectorAll(".custom-hp-btn")
      .forEach((b) => b.classList.remove("active"));
    document.getElementById(`custom-hp-${hp}`).classList.add("active");
    _updateCustomInfo();
  });
});

function _updateCustomTeamsUI() {
  const section = document.getElementById("custom-teams-section");
  const row = document.getElementById("custom-teams-row");
  if (customFighters <= 2) {
    section.classList.add("hidden");
    customTeams = "none";
    return;
  }
  section.classList.remove("hidden");
  const opts = [{ id: "none", label: "Sin equipos" }];
  if (customFighters === 3)
    opts.push({ id: "2v1", label: "Con compañero (2 vs 1)" });
  if (customFighters === 4) opts.push({ id: "2v2", label: "2 vs 2" });
  if (!opts.some((o) => o.id === customTeams)) customTeams = "none";
  row.innerHTML = "";
  opts.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "toggle-opt" + (opt.id === customTeams ? " active" : "");
    btn.textContent = opt.label;
    btn.addEventListener("click", () => {
      customTeams = opt.id;
      row
        .querySelectorAll(".toggle-opt")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      _updateCustomInfo();
    });
    row.appendChild(btn);
  });
  _initTogglePill(row);
}

function _updateCustomInfo() {
  const arenaLabel = {
    320: "arena pequeña",
    420: "arena normal",
    540: "arena grande",
  };
  const teamLabel = {
    none: "todos contra todos",
    "2v1": "2 vs 1",
    "2v2": "2 vs 2",
  };
  const parts = [
    `${customFighters} luchadores`,
    arenaLabel[customArenaSize],
    `${customHp} HP`,
    customFighters > 2 ? teamLabel[customTeams] : "",
  ].filter(Boolean);
  document.getElementById("custom-info").textContent = parts.join(" · ");
}

function _launchCustomBattle() {
  const cfgs = customCfgs.slice(0, customFighters);
  if (customTeams === "2v1" && customFighters === 3) {
    cfgs[0].teamId = 0;
    cfgs[1].teamId = 0;
    cfgs[2].teamId = 1;
  } else if (customTeams === "2v2" && customFighters === 4) {
    cfgs[0].teamId = 0;
    cfgs[1].teamId = 0;
    cfgs[2].teamId = 1;
    cfgs[3].teamId = 1;
  }
  canvas.width = canvas.height = customArenaSize;
  document.getElementById("fight-context-label").textContent = "";
  document.getElementById("btn-restart").textContent = "Nueva batalla";
  _startFightWithCfgs(cfgs, () => showScreen("screen-custom-setup"));
}

// ── League/tournament → ui/leagueUI.js, ui/tournamentUI.js ───────────────────

// ── Confetti + init injections ─────────────────────────────────────────────────
function _stopConfetti() {
  if (_confettiRaf) {
    cancelAnimationFrame(_confettiRaf);
    _confettiRaf = null;
  }
}

initScreens({ getGameMode: () => gameMode, stopConfetti: _stopConfetti });

function _launchConfetti(cvs) {
  _stopConfetti();
  const ctx = cvs.getContext("2d");
  cvs.width = cvs.offsetWidth || 390;
  cvs.height = cvs.offsetHeight || 844;
  const W = cvs.width,
    H = cvs.height;

  const COLORS = [
    "#ffd740",
    "#ff6b6b",
    "#69db7c",
    "#74c0fc",
    "#da77f2",
    "#ffa94d",
    "#ffffff",
  ];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: Math.random() * -H,
    w: 5 + Math.random() * 7,
    h: 10 + Math.random() * 10,
    r: Math.random() * Math.PI * 2,
    dr: (Math.random() - 0.5) * 0.18,
    vx: (Math.random() - 0.5) * 2.2,
    vy: 2.2 + Math.random() * 3.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 0.75 + Math.random() * 0.25,
  }));

  function tick() {
    ctx.clearRect(0, 0, W, H);
    let allDone = true;
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.dr;
      p.vy += 0.04;
      if (p.y < H + 20) allDone = false;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (!allDone) _confettiRaf = requestAnimationFrame(tick);
  }
  _confettiRaf = requestAnimationFrame(tick);
}

const _sharedDeps = {
  startFight,
  launchConfetti: _launchConfetti,
  stopConfetti: _stopConfetti,
  showEventPoints: _showEventPoints,
  updateXpBar: _updateXpBar,
  getP1Choice: () => p1Choice,
  setP1Choice: (v) => {
    p1Choice = v;
  },
  setGameMode: (v) => {
    gameMode = v;
  },
};
initLeagueUI(_sharedDeps);
initTournamentUI(_sharedDeps);

// ── Missions ──────────────────────────────────────────────────────────────────
initMissionsUI({ onBadgeChange: _applyPlayerBadge });
syncMissionsFromCloud().then(() => _applyPlayerBadge(loadMissions().activeBadge));

function _applyPlayerBadge(badgeId) {
  applyBadgeToElement(_chipName, badgeId);
  applyBadgeToElement(_profileName, badgeId);
}

// ── Skin helpers ──────────────────────────────────────────────────────────────
// Picks a random unlocked skin for an AI character (equal chance per option incl. default).
function _randomAiSkinMeta(meta) {
  const skins = CHAR_SKINS[meta.id];
  if (!skins) return { ...meta, skinId: 'default' };
  const available = skins.filter(s => s.id === 'default' || isSkinUnlocked(meta.id, s.id));
  const pick = available[Math.floor(Math.random() * available.length)];
  return { ...meta, color: pick.color ?? meta.color, labelColor: pick.labelColor ?? null, skinId: pick.id };
}

// Returns skin info for a tag-team fighter; falls back to applySkinnedMeta if no skin stored yet.
function _fighterSkin(fighter) {
  if (fighter.skinId !== undefined) {
    return { color: fighter.skinColor ?? fighter.meta.color, labelColor: null, skinId: fighter.skinId };
  }
  return applySkinnedMeta(fighter.meta);
}

// ── Fight ─────────────────────────────────────────────────────────────────────
function startFight(p1meta, p2meta, onResult, arenaOpts = {}) {
  const { canvasSize = 420 } = arenaOpts;
  canvas.width = canvas.height = canvasSize;
  if (!onResult) {
    document.getElementById("fight-context-label").textContent = "";
    document.getElementById("btn-restart").textContent = t("btn.pick.again");
  }
  _pendingCharUseId = p1meta.id;
  const sp1 = applySkinnedMeta(p1meta);
  const sp2 = _randomAiSkinMeta(p2meta);
  _startFightWithCfgs(
    [
      {
        color: sp1.color,
        labelColor: sp1.labelColor ?? sp1.color,
        label: p1meta.name,
        powerId: p1meta.id,
        hp: 100,
        skinId: sp1.skinId,
        activeEffect: getEffectActive(p1meta.id) ? "golden_sparkles" : null,
      },
      {
        color: sp2.color,
        labelColor: sp2.labelColor ?? sp2.color,
        label: p2meta.name,
        powerId: p2meta.id,
        hp: 100,
        skinId: sp2.skinId,
      },
    ],
    onResult,
    arenaOpts,
  );
}

function _startFightWithCfgs(cfgs, onResult, arenaOpts = {}) {
  matchResultCallback = onResult;
  resetBattleSpeed();
  sfx.fightStart();
  music.setMode("game");
  document.getElementById("gameover-bar").classList.add("hidden");
  document.getElementById("fight-tag-area").classList.add("hidden");
  document.getElementById("tag-flash").classList.remove("tag-flash-in");
  buildHud(cfgs);
  const _abilities = arenaOpts.activeAbilities ?? _abilitiesEnabled;
  game.start(cfgs, { ...arenaOpts, activeAbilities: _abilities });
  startHudLoop();
  if (_abilities) _startAbilitiesLoop();
  else _stopAbilitiesLoop();
  showScreen("screen-fight");
}

// ── HUD → ui/hud.js ──────────────────────────────────────────────────────────

// ── Tag Team Fight ────────────────────────────────────────────────────────────
function startTagTeamFight() {
  const { my, partner, e1, e2 } = _ttCfg;
  _pendingCharUseId = my?.meta?.id;
  _ttMatch = new TagTeamMatch([my, partner], [e1, e2]);
  // Assign skins up-front so swaps preserve them across the whole match.
  const _assignSkin = (fighter, fn) => {
    const s = fn(fighter.meta);
    fighter.skinId    = s.skinId;
    fighter.skinColor = s.color;
  };
  _assignSkin(_ttMatch.teams[0][0], applySkinnedMeta);
  _assignSkin(_ttMatch.teams[0][1], applySkinnedMeta);
  _assignSkin(_ttMatch.teams[1][0], _randomAiSkinMeta);
  _assignSkin(_ttMatch.teams[1][1], _randomAiSkinMeta);
  _ttArenaOpts = getQuickArenaOpts();
  canvas.width = canvas.height = _ttArenaOpts.canvasSize;
  document.getElementById("fight-context-label").textContent = "2 vs 2";
  document.getElementById("btn-restart").textContent = "Volver al inicio";
  document.getElementById("fight-tag-area").classList.remove("hidden");
  _ttRunRound();
}

function _ttRunRound() {
  const a0 = _ttMatch.getActive(0);
  const a1 = _ttMatch.getActive(1);
  const sm0 = _fighterSkin(a0);
  const sm1 = _fighterSkin(a1);
  const cfgs = [
    {
      color: sm0.color,
      labelColor: sm0.labelColor ?? sm0.color,
      label: a0.meta.name,
      powerId: a0.meta.id,
      hp: a0.hp,
      skinId: sm0.skinId,
      activeEffect: getEffectActive(a0.meta.id) ? "golden_sparkles" : null,
    },
    {
      color: sm1.color,
      labelColor: sm1.labelColor ?? sm1.color,
      label: a1.meta.name,
      powerId: a1.meta.id,
      hp: a1.hp,
      skinId: sm1.skinId,
    },
  ];
  _ttPrevHp = [a0.hp, a1.hp];
  matchResultCallback = null;
  resetBattleSpeed();
  sfx.fightStart();
  music.setMode("game");
  document.getElementById("gameover-bar").classList.add("hidden");
  document.getElementById("tag-flash").classList.remove("tag-flash-in");
  buildTagHud(_ttMatch);
  updateTagBtn(_ttMatch);
  game.start(cfgs, { ..._ttArenaOpts, activeAbilities: _abilitiesEnabled });
  _ttStartHudLoop();
  if (_abilitiesEnabled) _startAbilitiesLoop();
  else _stopAbilitiesLoop();
  showScreen("screen-fight");
}

// ── Tag HUD rendering → ui/tagHud.js ─────────────────────────────────────────

function _ttStartHudLoop() {
  stopHudLoop();
  function loop() {
    updateTagHudLive(game, _ttMatch, _ttPrevHp);
    updateTagBtn(_ttMatch);
    if (game.state === "playing" && _ttMatch?.shouldAiTag()) {
      const snap = game.getHpSnapshot();
      const aiOutgoing = _ttMatch.getActive(1);
      const aiPower = game.circles[1]?.power;
      let rawHp1 = snap[1]?.isAlive ? snap[1].hp : aiOutgoing.hp;
      let saveHp1 = rawHp1;
      if (aiPower?._comp !== undefined) {
        aiOutgoing._duoCompHp = aiPower._comp.isAlive ? aiPower._comp.hp : 0;
        aiOutgoing._duoOwnerHp = rawHp1;
        saveHp1 = snap[1]._hudHp ?? rawHp1;
      }
      _ttMatch.doTag(1, saveHp1);
      const incoming = _ttMatch.getActive(1);
      const inHp1 = incoming._duoOwnerHp ?? incoming.hp;
      const inSkin1 = _fighterSkin(incoming);
      game.swapFighter(1, {
        color: inSkin1.color,
        label: incoming.meta.name,
        powerId: incoming.meta.id,
        hp: inHp1,
        skinId: inSkin1.skinId,
        _duoCompHp: incoming._duoCompHp,
      });
      _ttPrevHp[1] = inHp1;
      showTagFlash(1, _ttMatch);
      buildTagHud(_ttMatch);
    }
    _ttHudRaf = requestAnimationFrame(loop);
  }
  _ttHudRaf = requestAnimationFrame(loop);
}

function _ttHandleKnockout(winnerSide) {
  const snap = game.getHpSnapshot();

  const wc = game.circles[winnerSide];
  const savedPos = wc ? { x: wc.x, y: wc.y, vx: wc.vx, vy: wc.vy } : null;

  if (snap[winnerSide]?.isAlive) {
    _ttMatch.getActive(winnerSide).hp = snap[winnerSide].hp;
  }

  _ttMatch.onFighterDown(1 - winnerSide);

  if (_ttMatch.isOver()) {
    const winner = _ttMatch.winnerTeam();
    const bar = document.getElementById("gameover-bar");
    const text = document.getElementById("gameover-winner");
    bar.classList.remove("hidden");
    text.textContent =
      winner === 0 ? "¡Tu equipo ganó!" : "Ganó el equipo rival";
    text.style.color = winner === 0 ? "#7ec8f7" : "#f77e7e";
    if (winner === 0) {
      sfx.gameOverWin();
      recordWin("tag2v2");
      _recordMissions(true);
    } else {
      sfx.gameOverLose();
      recordLoss("tag2v2");
      _recordMissions(false);
    }
    document.getElementById("fight-tag-area").classList.add("hidden");
    _ttMatch = null;
  } else {
    const a0 = _ttMatch.getActive(0);
    const a1 = _ttMatch.getActive(1);
    const sk0 = _fighterSkin(a0);
    const sk1 = _fighterSkin(a1);
    const cfgs = [
      {
        color: sk0.color,
        labelColor: sk0.labelColor ?? sk0.color,
        label: a0.meta.name,
        powerId: a0.meta.id,
        hp: a0.hp,
        skinId: sk0.skinId,
      },
      {
        color: sk1.color,
        labelColor: sk1.labelColor ?? sk1.color,
        label: a1.meta.name,
        powerId: a1.meta.id,
        hp: a1.hp,
        skinId: sk1.skinId,
      },
    ];
    _ttPrevHp = [a0.hp, a1.hp];
    document.getElementById("gameover-bar").classList.add("hidden");
    game.start(cfgs, { ..._ttArenaOpts, activeAbilities: _abilitiesEnabled });
    if (savedPos && game.circles[winnerSide]) {
      const c = game.circles[winnerSide];
      c.x = savedPos.x;
      c.y = savedPos.y;
      c.vx = savedPos.vx;
      c.vy = savedPos.vy;
    }
    buildTagHud(_ttMatch);
    _ttStartHudLoop();
    if (_abilitiesEnabled) _resumeAbilitiesLoop();
    else _stopAbilitiesLoop();
  }
}

// ── Sim 2v2 Fight ─────────────────────────────────────────────────────────────
function startSim2v2Fight() {
  const { my, partner, e1, e2 } = _s2vCfg;
  _pendingCharUseId = my?.id;

  const sm0 = applySkinnedMeta(my);
  const sm1 = applySkinnedMeta(partner);
  const sm2 = applySkinnedMeta(e1);
  const sm3 = applySkinnedMeta(e2);

  const arenaOpts = {
    ...getQuickArenaOpts(),
    canvasSize: 540, // always large for 2v2
    hideDeadCircles: true,
  };

  canvas.width = canvas.height = 540;
  document.getElementById("fight-context-label").textContent = "2 vs 2";
  document.getElementById("btn-restart").textContent = "Volver al inicio";
  document.getElementById("fight-tag-area").classList.add("hidden");

  const cfgs = [
    {
      color: sm0.color,
      labelColor: sm0.labelColor ?? sm0.color,
      label: my.name,
      powerId: my.id,
      hp: 100,
      skinId: sm0.skinId,
      teamId: 0,
      activeEffect: getEffectActive(my.id) ? "golden_sparkles" : null,
    },
    {
      color: sm1.color,
      labelColor: sm1.labelColor ?? sm1.color,
      label: partner.name,
      powerId: partner.id,
      hp: 100,
      skinId: sm1.skinId,
      teamId: 0,
    },
    {
      color: sm2.color,
      labelColor: sm2.labelColor ?? sm2.color,
      label: e1.name,
      powerId: e1.id,
      hp: 100,
      skinId: sm2.skinId,
      teamId: 1,
    },
    {
      color: sm3.color,
      labelColor: sm3.labelColor ?? sm3.color,
      label: e2.name,
      powerId: e2.id,
      hp: 100,
      skinId: sm3.skinId,
      teamId: 1,
    },
  ];
  _s2vCfgActive = cfgs;
  matchResultCallback = null;
  resetBattleSpeed();
  sfx.fightStart();
  music.setMode("game");
  document.getElementById("gameover-bar").classList.add("hidden");
  _buildSim2v2Hud(cfgs);
  game.start(cfgs, arenaOpts);
  _startSim2v2HudLoop();
  showScreen("screen-fight");
}

let _s2vCfgActive = [];
let _s2vHudRaf = null;

function _buildSim2v2Hud(cfgs) {
  const hud = document.getElementById("hud");
  const renderFighter = (cfg, pfx, isPlayer) => `
    <div class="tt-fighter tt-active">
      <div class="tt-dot" style="background:${cfg.color}"></div>
      <span class="tt-name" style="color:${cfg.labelColor ?? cfg.color}">${isPlayer ? PLAYER_ICON : ""}<span class="tt-name-text">${cfg.label}</span></span>
      <div class="tt-track"><div class="tt-fill" id="${pfx}-hp" style="width:100%;background:var(--hp-green)"></div></div>
      <span class="tt-hp-text" id="${pfx}-txt">${cfg.hp ?? 100}</span>
    </div>`;
  hud.innerHTML = `
    <div class="tt-hud">
      <div class="tt-team left">
        ${renderFighter(cfgs[0], "s2v-0", true)}
        ${renderFighter(cfgs[1], "s2v-1", false)}
      </div>
      <span class="tt-vs">VS</span>
      <div class="tt-team right">
        ${renderFighter(cfgs[2], "s2v-2", false)}
        ${renderFighter(cfgs[3], "s2v-3", false)}
      </div>
    </div>`;
}

function _startSim2v2HudLoop() {
  stopHudLoop();
  if (_s2vHudRaf) cancelAnimationFrame(_s2vHudRaf);
  function loop() {
    const snap = game.getHpSnapshot();
    snap.forEach((s, i) => {
      const fill = document.getElementById(`s2v-${i}-hp`);
      const text = document.getElementById(`s2v-${i}-txt`);
      if (!fill || !text) return;
      const hp = s._hudHp ?? s.hp;
      const max = s._hudMaxHp ?? 100;
      const pct = s.isAlive ? Math.max(0, hp / max) : 0;
      fill.style.width = `${pct * 100}%`;
      fill.style.background = !s.isAlive
        ? "#333"
        : pct > 0.5
          ? "var(--hp-green)"
          : pct > 0.25
            ? "var(--hp-orange)"
            : "var(--hp-red)";
      text.textContent = s.isAlive ? Math.ceil(Math.max(0, hp)) : "✗";
    });
    _s2vHudRaf = requestAnimationFrame(loop);
  }
  _s2vHudRaf = requestAnimationFrame(loop);
}

// ── Battle (FFA 4-player) ─────────────────────────────────────────────────────
let _battleHudRaf = null;

function startBattleFight() {
  const picks = _battlePicks;
  _pendingCharUseId = picks[0]?.id;
  const arenaOpts = { ...getQuickArenaOpts(), canvasSize: 540, hideDeadCircles: true };
  canvas.width = canvas.height = 540;
  document.getElementById("fight-context-label").textContent = "Batalla";
  document.getElementById("btn-restart").textContent = "Volver al inicio";
  document.getElementById("fight-tag-area").classList.add("hidden");
  const cfgs = picks.map((m, i) => {
    const sm = applySkinnedMeta(m);
    return {
      color: sm.color, labelColor: sm.labelColor ?? sm.color,
      label: m.name, powerId: m.id, hp: 100, skinId: sm.skinId,
      activeEffect: i === 0 && getEffectActive(m.id) ? "golden_sparkles" : null,
    };
  });
  matchResultCallback = null;
  resetBattleSpeed();
  sfx.fightStart();
  music.setMode("game");
  document.getElementById("gameover-bar").classList.add("hidden");
  _buildBattleHud(cfgs);
  game.start(cfgs, arenaOpts);
  _startBattleHudLoop();
  showScreen("screen-fight");
}

function _buildBattleHud(cfgs) {
  const hud = document.getElementById("hud");
  const renderFighter = (cfg, pfx, isPlayer) => `
    <div class="tt-fighter tt-active">
      <div class="tt-dot" style="background:${cfg.color}"></div>
      <span class="tt-name" style="color:${cfg.labelColor ?? cfg.color}">${isPlayer ? PLAYER_ICON : ""}<span class="tt-name-text">${cfg.label}</span></span>
      <div class="tt-track"><div class="tt-fill" id="${pfx}-hp" style="width:100%;background:var(--hp-green)"></div></div>
      <span class="tt-hp-text" id="${pfx}-txt">${cfg.hp ?? 100}</span>
    </div>`;
  hud.innerHTML = `
    <div class="tt-hud">
      <div class="tt-team left">
        ${renderFighter(cfgs[0], "btl-0", true)}
        ${renderFighter(cfgs[1], "btl-1", false)}
      </div>
      <div class="tt-team right">
        ${renderFighter(cfgs[2], "btl-2", false)}
        ${renderFighter(cfgs[3], "btl-3", false)}
      </div>
    </div>`;
}

function _startBattleHudLoop() {
  stopHudLoop();
  if (_battleHudRaf) cancelAnimationFrame(_battleHudRaf);
  function loop() {
    const snap = game.getHpSnapshot();
    snap.forEach((s, i) => {
      const fill = document.getElementById(`btl-${i}-hp`);
      const text = document.getElementById(`btl-${i}-txt`);
      if (!fill || !text) return;
      const hp  = s._hudHp    ?? s.hp;
      const max = s._hudMaxHp ?? 100;
      const pct = s.isAlive ? Math.max(0, hp / max) : 0;
      fill.style.width      = `${pct * 100}%`;
      fill.style.background = !s.isAlive ? "#333"
        : pct > 0.5  ? "var(--hp-green)"
        : pct > 0.25 ? "var(--hp-orange)"
        : "var(--hp-red)";
      text.textContent = s.isAlive ? Math.ceil(Math.max(0, hp)) : "✗";
    });
    _battleHudRaf = requestAnimationFrame(loop);
  }
  _battleHudRaf = requestAnimationFrame(loop);
}

// ── Game over ─────────────────────────────────────────────────────────────────
let _pendingWinnerSide = -1;

// ── Competition cloud sync ────────────────────────────────────────────────────
async function _syncCompetitionFromCloud(cloudField, lsKey) {
  try {
    const loadFn = cloudField === 'league_saved' ? loadLeagueCloud : loadTournamentCloud;
    const { save: cloudSave, loggedIn } = await loadFn();
    if (!loggedIn) return;
    if (!cloudSave) {
      try { localStorage.removeItem(lsKey); } catch {}
      return;
    }
    const localRaw  = localStorage.getItem(lsKey);
    const localSave = localRaw ? JSON.parse(localRaw) : null;
    if (!localSave || (cloudSave.savedAt ?? 0) > (localSave.savedAt ?? 0)) {
      try { localStorage.setItem(lsKey, JSON.stringify(cloudSave)); } catch {}
    }
  } catch {}
}

// ── Infinite Tower ────────────────────────────────────────────────────────────

async function _refreshTowerSetupScreen() {
  const allMetas = getAllPowerMetas();

  // Best run: always prefer cloud if it has a higher floor (source of truth)
  const cloudStats = getStats();
  const localBest  = getBestTowerRun();
  const cloudBest  = await loadBestTowerRunCloud();
  let bestRecord;
  if (cloudBest && (!localBest || (cloudBest.floor ?? 0) >= (localBest.floor ?? 0))) {
    bestRecord = cloudBest;
    try { localStorage.setItem('tower_best_run', JSON.stringify(cloudBest)); } catch {}
  } else {
    bestRecord = localBest;
  }
  let bestFloor    = cloudStats.towerMaxFloor ?? bestRecord?.floor ?? 0;
  let bestCharId   = cloudStats.towerBestChar ?? bestRecord?.powerMetaId ?? null;
  let bestUpgrades = bestRecord?.upgrades ?? [];

  const bestEl = document.getElementById("tower-best-run");
  if (bestEl) {
    if (bestFloor > 0) {
      const meta = bestCharId
        ? (allMetas.find(m => m.id === bestCharId) ?? allMetas.find(m => m.name === bestCharId) ?? null)
        : null;

      const charHtml = meta
        ? `<div class="tbr-char">
            <div class="tbr-char-circle" style="background:${meta.color}">${meta.icon}</div>
            <span class="tbr-char-name" style="color:${meta.color}">${meta.name}</span>
          </div>`
        : '';

      const summary = summarizeUpgrades(bestUpgrades);
      const upgsHtml = summary.length > 0
        ? `<div class="tbr-upgrades">${summary.map(c =>
            `<span class="tbr-upg-chip" style="border-color:${c.color}40;color:${c.color}">${c.label}</span>`
          ).join('')}</div>`
        : '';

      bestEl.innerHTML = `
        <div class="tbr-top">
          <div class="tbr-label">Mejor run</div>
          <div class="tbr-floor">Piso ${bestFloor}</div>
        </div>
        ${charHtml}
        ${upgsHtml}
      `;
      bestEl.classList.remove("hidden");
    } else {
      bestEl.classList.add("hidden");
    }
  }

  // Continue button: sync local with cloud (cloud is source of truth when logged in)
  const localSaved = loadTowerRun();
  const { save: cloudSaved, loggedIn } = await loadTowerRunCloud();
  let saved;
  if (loggedIn && !cloudSaved) {
    // Run was cleared on another device — discard stale local save
    try { localStorage.removeItem('tower_saved_run'); } catch {}
    saved = null;
  } else if (cloudSaved && (!localSaved || (cloudSaved.savedAt ?? 0) > (localSaved.savedAt ?? 0))) {
    saved = cloudSaved;
    try { localStorage.setItem('tower_saved_run', JSON.stringify(cloudSaved)); } catch {}
  } else {
    saved = localSaved;
  }

  const contBtn = document.getElementById("btn-tower-continue");
  if (contBtn) {
    if (saved) {
      const meta = allMetas.find(m => m.id === saved.powerMetaId);
      contBtn.textContent = `Continuar — Piso ${saved.floor + 1} (${meta?.name ?? saved.powerMetaId})`;
      contBtn.classList.remove("hidden");
    } else {
      contBtn.classList.add("hidden");
    }
  }
}

function _startTowerRun(powerMeta, savedState = null) {
  const allMetas = getAllPowerMetas();
  const charMeta = allMetas.find(m => m.id === powerMeta.id);
  const category = charMeta?.category ?? "Cuerpo a cuerpo";
  const nameMap  = Object.fromEntries(allMetas.map(m => [m.id, m.name]));

  // Compute unlocked arena skins once for the whole run
  const _unlockedArenaSkins = ARENA_SKINS.filter(s => isArenaSkinUnlocked(s.id));

  _tower = new InfiniteTower({
    startFightFn: (cfgs, _ignored, arenaOpts) => {
      document.getElementById("fight-context-label").textContent =
        arenaOpts?.fightContextLabel ?? "";
      document.getElementById("btn-restart").textContent = "Abandonar run";
      _startFightWithCfgs(cfgs, null, { ...arenaOpts, activeAbilities: false });
    },
    onRunEnd: (_floor) => {
      clearTowerRun();
      _tower   = null;
      gameMode = "quickmatch";
      game.stop();
      stopHudLoop();
      _refreshTowerSetupScreen();
      showScreen("screen-tower-setup");
    },
    onSave:    (run, pendingFloor) => saveTowerRun(run, pendingFloor),
    onRunOver: (run, xpGained) => { maybeSaveBestRun(run); recordTowerRun(run); clearTowerRun(); if (xpGained > 0) { addPoints(xpGained); _updateXpBar(); } },
    getArenaOpts: () => {
      const layout = ARENA_LAYOUTS[Math.floor(Math.random() * ARENA_LAYOUTS.length)];
      const skin   = _unlockedArenaSkins[Math.floor(Math.random() * _unlockedArenaSkins.length)] ?? ARENA_SKINS[0];
      return { canvasSize: 420, obstacles: layout.obstacles, skinId: skin.id, _layoutName: layout.name, _skinName: skin.name };
    },
    applySkinnedMeta,
    aiSkinFn: _randomAiSkinMeta,
    getPowerName: (id) => nameMap[id] ?? id,
    getPowerMeta: (id) => allMetas.find(m => m.id === id) ?? null,
  });

  document.getElementById("gameover-bar").classList.add("hidden");
  document.getElementById("fight-tag-area").classList.add("hidden");
  document.getElementById("fight-context-label").textContent = "";
  document.getElementById("btn-restart").textContent = "Abandonar run";
  showScreen("screen-fight");

  _pendingCharUseId = powerMeta.id;
  _tower.startRun(powerMeta, category, savedState);
}

function _recordMissions(won) {
  const allMetas  = getAllPowerMetas();
  const charMeta  = allMetas.find(m => m.id === _pendingCharUseId);
  const category  = charMeta?.category ?? null;
  const rewards   = recordMissionEvent(category, won);
  for (const r of rewards) {
    addPoints(r.xp);
    _updateXpBar();
    _showMissionToast(r);
    if (r.badge) _applyPlayerBadge(loadMissions().activeBadge);
  }
}

function _showMissionToast(reward) {
  const toast = document.createElement('div');
  toast.className = 'mission-toast';
  toast.innerHTML = `<span class="mission-toast-icon">🎯</span>
    <div>
      <div class="mission-toast-title">¡Misión completada!</div>
      <div class="mission-toast-label">${reward.label}</div>
      <div class="mission-toast-xp">+${reward.xp} XP${reward.badge ? ` · Marco desbloqueado` : ''}</div>
    </div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('mission-toast--show'), 50);
  setTimeout(() => { toast.classList.remove('mission-toast--show'); setTimeout(() => toast.remove(), 400); }, 3500);
}

function handleGameOver(winner, winnerSide) {
  stopHudLoop();
  _stopAbilitiesLoop();
  music.setMode("menu");

  if (gameMode === "tower" && _tower) {
    const playerWon = winnerSide === 0;
    if (playerWon) recordWin("tower");
    else           recordLoss("tower");
    _recordMissions(playerWon);
    if (_pendingCharUseId) {
      recordCharUse(_pendingCharUseId);
      refreshMasteryBadges();
    }
    _tower.handleGameOver(winner, winnerSide);
    return;
  }

  if (gameMode === "tag2v2") {
    if (_ttMatch) {
      _ttHandleKnockout(winnerSide != null ? winnerSide : 0);
    } else {
      const playerWon = winnerSide === 0;
      const bar = document.getElementById("gameover-bar");
      const text = document.getElementById("gameover-winner");
      document.getElementById("gameover-points").classList.add("hidden");
      bar.classList.remove("hidden");
      text.textContent = playerWon
        ? "¡Tu equipo ganó!"
        : "Ganó el equipo rival";
      text.style.color = playerWon ? "#7ec8f7" : "#f77e7e";
      if (playerWon) sfx.gameOverWin();
      else sfx.gameOverLose();
      const ptLines = [`+${POINTS.MATCH_COMPLETE} por terminar la partida`];
      if (playerWon) ptLines.push(`+${POINTS.MATCH_WIN} por ganar`);
      addPoints(POINTS.MATCH_COMPLETE + (playerWon ? POINTS.MATCH_WIN : 0));
      _showGameoverPoints(ptLines);
      _updateXpBar();
    }
    return;
  }

  if (gameMode === "sim2v2") {
    if (_s2vHudRaf) { cancelAnimationFrame(_s2vHudRaf); _s2vHudRaf = null; }
    const bar = document.getElementById("gameover-bar");
    const text = document.getElementById("gameover-winner");
    document.getElementById("gameover-points").classList.add("hidden");
    bar.classList.remove("hidden");
    if (!winner) {
      text.textContent = t("draw"); text.style.color = "#aaa";
      sfx.gameOverLose();
      addPoints(POINTS.MATCH_COMPLETE);
      _showGameoverPoints([`+${POINTS.MATCH_COMPLETE} por terminar la partida`]);
      _updateXpBar(); return;
    }
    const playerWon = winner.teamId === 0;
    text.textContent = playerWon ? "¡Tu equipo ganó!" : "Ganó el equipo rival";
    text.style.color = playerWon ? "#7ec8f7" : "#f77e7e";
    if (playerWon) { sfx.gameOverWin(); recordWin("sim2v2"); }
    else           { sfx.gameOverLose(); recordLoss("sim2v2"); }
    _recordMissions(playerWon);
    const ptLines = [`+${POINTS.MATCH_COMPLETE} por terminar la partida`];
    if (playerWon) ptLines.push(`+${POINTS.MATCH_WIN} por ganar`);
    addPoints(POINTS.MATCH_COMPLETE + (playerWon ? POINTS.MATCH_WIN : 0));
    _showGameoverPoints(ptLines); _updateXpBar(); return;
  }

  if (gameMode === "battle") {
    if (_battleHudRaf) { cancelAnimationFrame(_battleHudRaf); _battleHudRaf = null; }
    const bar  = document.getElementById("gameover-bar");
    const text = document.getElementById("gameover-winner");
    document.getElementById("gameover-points").classList.add("hidden");
    bar.classList.remove("hidden");
    if (!winner) {
      text.textContent = t("draw"); text.style.color = "#aaa";
      sfx.gameOverLose();
      addPoints(POINTS.MATCH_COMPLETE);
      _showGameoverPoints([`+${POINTS.MATCH_COMPLETE} por terminar la partida`]);
      _updateXpBar(); return;
    }
    const playerWon = winnerSide === 0;
    text.textContent = playerWon ? `¡Ganó ${winner.label}!` : `Ganó ${winner.label}`;
    text.style.color  = playerWon ? "#7ec8f7" : "#f77e7e";
    if (playerWon) { sfx.gameOverWin(); recordWin("battle"); }
    else           { sfx.gameOverLose(); recordLoss("battle"); }
    _recordMissions(playerWon);
    const ptLines = [`+${POINTS.MATCH_COMPLETE} por terminar la partida`];
    if (playerWon) ptLines.push(`+${POINTS.MATCH_WIN} por ganar`);
    addPoints(POINTS.MATCH_COMPLETE + (playerWon ? POINTS.MATCH_WIN : 0));
    _showGameoverPoints(ptLines); _updateXpBar(); return;
  }

  _pendingWinnerSide = winnerSide;
  const playerCircle = game.circles[0];
  const playerWon =
    playerCircle?.isAlive ||
    (winner?.teamId != null && winner.teamId === playerCircle?.teamId);
  if (playerWon) sfx.gameOverWin();
  else sfx.gameOverLose();

  if (
    gameMode === "quickmatch" ||
    gameMode === "league" ||
    gameMode === "tournament"
  ) {
    if (!winner) { recordDraw(gameMode); _recordMissions(null); }
    else if (playerWon) { recordWin(gameMode); _recordMissions(true); }
    else { recordLoss(gameMode); _recordMissions(false); }
  }

  const bar = document.getElementById("gameover-bar");
  const text = document.getElementById("gameover-winner");
  document.getElementById("gameover-points").classList.add("hidden");
  bar.classList.remove("hidden");

  if (winner) {
    if (winner.teamId != null) {
      const isPlayerTeam = winner.teamId === game.circles[0]?.teamId;
      text.textContent = isPlayerTeam
        ? "¡Ganó tu equipo!"
        : `Ganó Equipo ${winner.teamId + 1}`;
    } else {
      text.textContent = `${t("won")} ${winner.label}`;
    }
    text.style.color = winner.color;
  } else {
    text.textContent = t("draw");
    text.style.color = "#aaa";
  }

  if (gameMode === "quickmatch" || gameMode === "custom") {
    const ptLines = [`+${POINTS.MATCH_COMPLETE} por terminar la partida`];
    let pts = POINTS.MATCH_COMPLETE;
    if (playerWon && winner) {
      pts += POINTS.MATCH_WIN;
      ptLines.push(`+${POINTS.MATCH_WIN} por ganar`);
    }
    addPoints(pts);
    _showGameoverPoints(ptLines);
    _updateXpBar();
  }
}

document.getElementById("btn-restart").addEventListener("click", () => {
  const winnerSide = _pendingWinnerSide;
  _pendingWinnerSide = -1;

  document.getElementById("gameover-bar").classList.add("hidden");
  game.stop();
  stopHudLoop();

  if (_pendingCharUseId) {
    recordCharUse(_pendingCharUseId);
    refreshMasteryBadges();
    _pendingCharUseId = null;
  }

  if (gameMode === "tower") {
    _tower = null;
    gameMode = "quickmatch";
    _refreshTowerSetupScreen();
    showScreen("screen-tower-setup");
    return;
  }

  if (gameMode === "tag2v2") {
    _ttMatch = null;
    document.getElementById("fight-tag-area").classList.add("hidden");
    gameMode = "quickmatch";
    goToQuickSetup();
    return;
  }

  if (gameMode === "sim2v2") {
    if (_s2vHudRaf) { cancelAnimationFrame(_s2vHudRaf); _s2vHudRaf = null; }
    _s2vCfg = {}; _s2vCfgActive = [];
    gameMode = "quickmatch";
    goToQuickSetup();
    return;
  }

  if (gameMode === "battle") {
    if (_battleHudRaf) { cancelAnimationFrame(_battleHudRaf); _battleHudRaf = null; }
    _battlePicks = [];
    gameMode = "quickmatch";
    goToQuickSetup();
    return;
  }

  const cb = matchResultCallback;
  matchResultCallback = null;

  if (cb) {
    cb(winnerSide);
  } else {
    showScreen("screen-select-p1");
    carousels.p1.reset();
    carousels.p2.reset();
  }
});

// ── Wardrobe modal → ui/wardrobe.js ──────────────────────────────────────────
document
  .getElementById("btn-open-wardrobe")
  .addEventListener("click", openWardrobe);
document
  .getElementById("btn-wardrobe-close")
  .addEventListener("click", closeWardrobe);
document.getElementById("wardrobe-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("wardrobe-modal")) closeWardrobe();
});
document
  .getElementById("wardrobe-tab-chars")
  .addEventListener("click", () => switchWardrobeTab("chars"));
document
  .getElementById("wardrobe-tab-arena")
  .addEventListener("click", () => switchWardrobeTab("arena"));
