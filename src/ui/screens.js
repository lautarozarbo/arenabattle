import { bgBattleResume, bgBattlePause } from './menuAnimation.js';
import { t } from '../i18n.js';

export let currentScreen = "screen-main-menu";

// Injected by main.js after init: returns current game mode string
let _getGameMode = () => 'quickmatch';
let _stopConfetti = () => {};

export function initScreens(deps) {
  _getGameMode  = deps.getGameMode;
  _stopConfetti = deps.stopConfetti;
}

const _NAV_TAB_IDS = ["nav-tab-inicio", "nav-tab-play", "btn-league", "btn-tournament", "btn-tower"];

function _setNavTab(activeId) {
  const nav  = document.getElementById("main-nav");
  const pill = document.getElementById("nav-pill");
  const show = activeId !== null;
  nav.classList.toggle("hidden", !show);
  document.getElementById("app").classList.toggle("app--has-nav", show);
  _NAV_TAB_IDS.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isActive = id === activeId;
    el.classList.toggle("nav-tab--active", isActive);
    if (isActive && pill) {
      pill.style.transform = idx === 0 ? "" : `translateX(${idx * 100}%)`;
    }
  });
}

export function showScreen(id) {
  if (id !== 'screen-league-champion' && id !== 'screen-tournament-champion') _stopConfetti();
  document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  currentScreen = id;
  const gameMode = _getGameMode();
  const selectTab = gameMode === 'league'      ? "btn-league"
                  : gameMode === 'tournament'  ? "btn-tournament"
                  : "nav-tab-play";
  const navMap = {
    "screen-main-menu":           ["nav-tab-inicio", true],
    "screen-quick-setup":         ["nav-tab-play",   false],
    "screen-select-p1":           [selectTab,        false],
    "screen-select-p2":           [selectTab,        false],
    "screen-league-setup":        ["btn-league",     false],
    "screen-league-prematch":     [selectTab,        false],
    "screen-league-standings":    ["btn-league",     false],
    "screen-league-champion":     ["btn-league",     false],
    "screen-tournament-setup":    ["btn-tournament", false],
    "screen-tournament-bracket":  ["btn-tournament", false],
    "screen-participant-pick":    ["btn-tournament", false],
    "screen-tournament-champion": ["btn-tournament", false],
    "screen-tower-setup":         ["btn-tower",      false],
  };
  const mapped = navMap[id];
  if (mapped) {
    _setNavTab(mapped[0]);
    if (mapped[1]) bgBattleResume();
    else bgBattlePause();
  } else {
    _setNavTab(null);
    bgBattlePause();
  }
}

// ── Confirm modal ──────────────────────────────────────────────────────────────
let _confirmOkFn = null;

export function showConfirm(onOk, title, sub, okLabel) {
  _confirmOkFn = onOk;
  if (title)   document.querySelector("#confirm-modal .confirm-title").textContent = title;
  if (sub)     document.querySelector("#confirm-modal .confirm-sub").textContent   = sub;
  if (okLabel) document.getElementById("btn-confirm-ok").textContent              = okLabel;
  document.getElementById("confirm-modal").classList.remove("hidden");
}

function _restoreConfirmDefaults() {
  document.querySelector("#confirm-modal .confirm-title").textContent = t('confirm.title');
  document.querySelector("#confirm-modal .confirm-sub").textContent   = t('confirm.sub');
  document.getElementById("btn-confirm-ok").textContent              = t('btn.exit.menu');
}

document.getElementById("btn-confirm-ok").addEventListener("click", () => {
  document.getElementById("confirm-modal").classList.add("hidden");
  _restoreConfirmDefaults();
  if (_confirmOkFn) { _confirmOkFn(); _confirmOkFn = null; }
});

document.getElementById("btn-confirm-cancel").addEventListener("click", () => {
  document.getElementById("confirm-modal").classList.add("hidden");
  _restoreConfirmDefaults();
  _confirmOkFn = null;
});
