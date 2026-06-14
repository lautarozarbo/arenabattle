import { initAuth, onLogin, onLogout, updateUsername } from "./auth.js";
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
import { sfx, music } from "./audio/index.js";
import { t, getLang, setLang } from "./i18n.js";
import { NEWS } from "./news.js";
import {
  getStats,
  recordWin,
  recordLoss,
  recordDraw,
  recordCharUse,
  getMostUsedChar,
  syncStatsFromCloud,
} from "./persistence/stats.js";
import {
  ANIMATED_SKIN_IDS,
  applySkinnedMeta,
  drawCharPreview,
} from "./skins/index.js";
import {
  POINTS,
  getXP,
  getChests,
  isArenaSkinUnlocked,
  addPoints,
  openChest,
  syncRewardsFromCloud,
  getEffectActive,
} from "./persistence/rewards.js";
import {
  ARENA_SKINS,
  setSelectedArenaSkinId,
  drawArenaBg,
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
let gameMode = "quickmatch"; // 'quickmatch' | 'league' | 'tournament' | 'custom' | 'tag2v2' | 'sim2v2'
let matchResultCallback = null; // (winnerSide: 0|1|-1) => void
let _pendingCharUseId = null; // charId to record when match actually ends
let _confettiRaf = null;

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
      const pW = previewEl.width,
        pH = previewEl.height;
      drawArenaBg(pCtx, 0, 0, pW, pH, result.skinId);

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
  if (!_profilePanel.classList.contains("hidden")) _refreshProfilePanel();
});
onLogout(() => {
  localStorage.removeItem("playerName");
  _savePlayerName("Invitado");
  refreshFriendsBadge();
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
  _chipName.textContent = "Invitado";
  _profileName.textContent = "Invitado";
  _profileInput.value = "Invitado";
}
_loadPlayerName();

function _savePlayerName(val) {
  val = val.trim() || "Invitado";
  localStorage.setItem("playerName", val);
  _chipName.textContent = val;
  _profileName.textContent = val;
  _profileInput.value = val;
  updateUsername(val);
}

function _confirmProfileName() {
  _savePlayerName(_profileInput.value);
  _profileName.classList.remove("hidden");
  document.getElementById("btn-profile-edit-name").classList.remove("hidden");
  _profileEditRow.classList.add("hidden");
}

function _buildProfileStats() {
  const s = getStats();
  const favResult = getMostUsedChar(metas);
  const mostUsed = favResult?.meta ?? null;
  const favCount = favResult?.count ?? 0;

  if (mostUsed) {
    _profileAvatar.style.background = mostUsed.color;
    _profileAvatar.style.borderColor = mostUsed.color + "55";
    _profileAvatar.innerHTML = mostUsed.icon;
  } else {
    _profileAvatar.style.background = "";
    _profileAvatar.style.borderColor = "";
    _profileAvatar.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.35"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  const totalW = Object.values(s.wins).reduce((a, b) => a + b, 0);
  const totalL = Object.values(s.losses).reduce((a, b) => a + b, 0);
  const totalD = Object.values(s.draws).reduce((a, b) => a + b, 0);
  const totalG = totalW + totalL + totalD;

  const favHtml = mostUsed
    ? `<div class="pstat-fav-card">
        <div class="pstat-fav-circle" style="background:${mostUsed.color}">${mostUsed.icon}</div>
        <div class="pstat-fav-info">
          <span class="pstat-fav-name" style="color:${mostUsed.color}">${mostUsed.name}</span>
          <span class="pstat-fav-sublabel">${favCount} partida${favCount !== 1 ? "s" : ""} jugadas</span>
        </div>
      </div>`
    : `<div class="pstat-fav-card">
        <span class="pstat-fav-empty">Aún no hay partidas registradas</span>
      </div>`;

  _profileStatsEl.innerHTML = `
    <div class="pstat-section-label">Resumen</div>
    <div class="pstat-grid">
      <div class="pstat-card">
        <span class="pstat-val">${totalG}</span>
        <span class="pstat-lbl">Jugadas</span>
      </div>
      <div class="pstat-card">
        <span class="pstat-val pstat-val--win">${totalW}</span>
        <span class="pstat-lbl">Victorias</span>
      </div>
      <div class="pstat-card">
        <span class="pstat-val pstat-val--loss">${totalL}</span>
        <span class="pstat-lbl">Derrotas</span>
      </div>
      <div class="pstat-card">
        <span class="pstat-val pstat-val--draw">${totalD}</span>
        <span class="pstat-lbl">Empates</span>
      </div>
    </div>
    <div class="pstat-section-label">Victorias por modo</div>
    <div class="pstat-grid">
      <div class="pstat-card">
        <span class="pstat-val">${s.wins.quick1v1}</span>
        <span class="pstat-lbl">1 vs 1</span>
      </div>
      <div class="pstat-card">
        <span class="pstat-val">${s.wins.quick2v2}</span>
        <span class="pstat-lbl">2 vs 2</span>
      </div>
      <div class="pstat-card">
        <span class="pstat-val">${s.wins.league}</span>
        <span class="pstat-lbl">Partidas liga</span>
      </div>
      <div class="pstat-card">
        <span class="pstat-val">${s.wins.tournament}</span>
        <span class="pstat-lbl">Partidas torneo</span>
      </div>
    </div>
    <div class="pstat-section-label">Campeonatos</div>
    <div class="pstat-champ-row">
      <div class="pstat-champ-card">
        <span class="pstat-champ-trophy">🏆</span>
        <div class="pstat-champ-info">
          <span class="pstat-champ-val">${s.championships.league}</span>
          <span class="pstat-champ-lbl">Ligas ganadas</span>
        </div>
      </div>
      <div class="pstat-champ-card">
        <span class="pstat-champ-trophy">🏆</span>
        <div class="pstat-champ-info">
          <span class="pstat-champ-val">${s.championships.tournament}</span>
          <span class="pstat-champ-lbl">Torneos ganados</span>
        </div>
      </div>
    </div>
    <div class="pstat-section-label">Personaje favorito</div>
    ${favHtml}
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
      fcEl.innerHTML = `<span class="pfc-label">Tu código</span><span class="pfc-code">${friendCode}</span><span class="pfc-hint">Toca para copiar</span>`;
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
    const hint = this.querySelector(".pfc-hint");
    if (hint) {
      hint.textContent = "¡Copiado!";
      setTimeout(() => {
        hint.textContent = "Toca para copiar";
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

document.getElementById("btn-league").addEventListener("click", () => {
  sfx.uiClick();
  if (loadLeague()) {
    showLeagueStandings(isLeagueFinished());
  } else {
    gameMode = "league";
    updateLeagueInfo();
    showScreen("screen-league-setup");
  }
});

document.getElementById("btn-tournament").addEventListener("click", () => {
  sfx.uiClick();
  if (loadTournament()) {
    showTournamentScreen();
  } else {
    gameMode = "tournament";
    updateTournamentInfo();
    showScreen("screen-tournament-setup");
  }
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
  showConfirm(() => {
    game.stop();
    stopHudLoop();
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
  game.swapFighter(0, {
    color: incoming.meta.color,
    label: incoming.meta.name,
    powerId: incoming.meta.id,
    hp: inHp0,
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
    setQuickArenaSizeIdx(i);
    document
      .querySelectorAll("#quick-size-row .toggle-opt")
      .forEach((b, j) => b.classList.toggle("active", j === i));
    drawArenaPreview();
  });
});

document.getElementById("arena-prev").addEventListener("click", () => {
  setQuickArenaLayoutIdx(
    (getQuickArenaLayoutIdx() - 1 + ARENA_LAYOUTS.length) %
      ARENA_LAYOUTS.length,
  );
  drawArenaPreview();
});
document.getElementById("arena-next").addEventListener("click", () => {
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
  setQuickArenaSkinIdx(
    (getQuickArenaSkinIdx() - 1 + ARENA_SKINS.length) % ARENA_SKINS.length,
  );
  const skin = ARENA_SKINS[getQuickArenaSkinIdx()];
  if (isArenaSkinUnlocked(skin.id)) setSelectedArenaSkinId(skin.id);
  _syncArenaSkinSelector();
});
document.getElementById("arena-skin-next").addEventListener("click", () => {
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
  quickMatchMode = "1v1";
  document
    .querySelectorAll("#quick-mode-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-1v1-btn").classList.add("active");
  _setLargeArenaLock(false);
  _updateQuickSetupInfo();
});

document.getElementById("quick-2v2-btn").addEventListener("click", () => {
  quickMatchMode = "tag2v2";
  document
    .querySelectorAll("#quick-mode-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-2v2-btn").classList.add("active");
  _setLargeArenaLock(false);
  _updateQuickSetupInfo();
});

document.getElementById("quick-sim2v2-btn").addEventListener("click", () => {
  quickMatchMode = "sim2v2";
  document
    .querySelectorAll("#quick-mode-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-sim2v2-btn").classList.add("active");
  _setLargeArenaLock(true);
  _updateQuickSetupInfo();
});

document.getElementById("quick-battle-btn").addEventListener("click", () => {
  quickMatchMode = "battle";
  document
    .querySelectorAll("#quick-mode-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-battle-btn").classList.add("active");
  _setLargeArenaLock(true);
  _updateQuickSetupInfo();
});

document.getElementById("quick-random-btn").addEventListener("click", () => {
  quickMatchEnemyMode = "random";
  document
    .querySelectorAll("#quick-enemy-row .toggle-opt")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("quick-random-btn").classList.add("active");
  _updateQuickSetupInfo();
});

document.getElementById("quick-pick-btn").addEventListener("click", () => {
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
  const sp2 = applySkinnedMeta(p2meta);
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
  buildHud(cfgs);
  game.start(cfgs, arenaOpts);
  startHudLoop();
  showScreen("screen-fight");
}

// ── HUD → ui/hud.js ──────────────────────────────────────────────────────────

// ── Tag Team Fight ────────────────────────────────────────────────────────────
function startTagTeamFight() {
  const { my, partner, e1, e2 } = _ttCfg;
  _pendingCharUseId = my?.meta?.id;
  _ttMatch = new TagTeamMatch([my, partner], [e1, e2]);
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
  const sm0 = applySkinnedMeta(a0.meta);
  const sm1 = applySkinnedMeta(a1.meta);
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
  buildTagHud(_ttMatch);
  updateTagBtn(_ttMatch);
  game.start(cfgs, _ttArenaOpts);
  _ttStartHudLoop();
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
      game.swapFighter(1, {
        color: incoming.meta.color,
        label: incoming.meta.name,
        powerId: incoming.meta.id,
        hp: inHp1,
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
    } else {
      sfx.gameOverLose();
      recordLoss("tag2v2");
    }
    document.getElementById("fight-tag-area").classList.add("hidden");
    _ttMatch = null;
  } else {
    const a0 = _ttMatch.getActive(0);
    const a1 = _ttMatch.getActive(1);
    const sk0 = applySkinnedMeta(a0.meta);
    const sk1 = applySkinnedMeta(a1.meta);
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
    game.start(cfgs, _ttArenaOpts);
    if (savedPos && game.circles[winnerSide]) {
      const c = game.circles[winnerSide];
      c.x = savedPos.x;
      c.y = savedPos.y;
      c.vx = savedPos.vx;
      c.vy = savedPos.vy;
    }
    buildTagHud(_ttMatch);
    _ttStartHudLoop();
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

function handleGameOver(winner, winnerSide) {
  stopHudLoop();
  music.setMode("menu");

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
    if (!winner) recordDraw(gameMode);
    else if (playerWon) recordWin(gameMode);
    else recordLoss(gameMode);
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
