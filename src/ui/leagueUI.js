import { League } from '../modes/League.js';
import { getAllPowerMetas } from '../powers/registry.js';
import { sfx } from '../audio/index.js';
import { t } from '../i18n.js';
import { POINTS, addPoints, isArenaSkinUnlocked } from '../persistence/rewards.js';
import { saveLeagueCloud, clearLeagueCloud } from '../persistence/competitionSave.js';
import { recordChampionship } from '../persistence/stats.js';
import {
  ARENA_SKINS, getSelectedArenaSkinId, setSelectedArenaSkinId,
} from '../skins/arenaSkins.js';
import {
  ARENA_LAYOUTS,
  getPrematchSkinIdx, setPrematchSkinIdx,
  getPrematchLayoutIdx, setPrematchLayoutIdx,
  buildCompArenaOpts, syncPrematchSkinSelector,
} from './arenaConfig.js';
import { showScreen, showConfirm } from './screens.js';

const metas = getAllPowerMetas();

// ── Internal state ────────────────────────────────────────────────────────────
let league         = null;
let leagueCount    = 6;
let leagueFormat   = 'single';
let leagueArenaLayout = 'random';
let leagueRandomMode  = true;
let leagueAbilitiesEnabled = false;
let _leagueRewarded   = false;
let _prematchMatchKey = null;

const LS_LEAGUE   = 'arena_league';
const LS_P1CHOICE = 'arena_p1choice';

// ── Injected deps ─────────────────────────────────────────────────────────────
let _startFight, _launchConfetti, _stopConfetti, _showEventPoints, _updateXpBar;
let _getP1Choice, _setP1Choice, _setGameMode;

export function initLeagueUI(deps) {
  _startFight       = deps.startFight;
  _launchConfetti   = deps.launchConfetti;
  _stopConfetti     = deps.stopConfetti;
  _showEventPoints  = deps.showEventPoints;
  _updateXpBar      = deps.updateXpBar;
  _getP1Choice      = deps.getP1Choice;
  _setP1Choice      = deps.setP1Choice;
  _setGameMode      = deps.setGameMode;
}

// ── Persistence ───────────────────────────────────────────────────────────────
function _saveLeague() {
  if (!league) return;
  const payload = {
    format: league.format, participants: league.participants,
    playerIdx: league.playerIdx, matches: league.matches,
    currentMatchIdx: league.currentMatchIdx,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(LS_LEAGUE, JSON.stringify(payload));
    localStorage.setItem(LS_P1CHOICE, JSON.stringify(_getP1Choice()));
  } catch {}
  saveLeagueCloud(payload);
}

export function loadLeague() {
  const raw = localStorage.getItem(LS_LEAGUE);
  if (!raw) return false;
  try {
    const state = JSON.parse(raw);
    league = Object.create(League.prototype);
    Object.assign(league, state);
    const p1raw = localStorage.getItem(LS_P1CHOICE);
    _setP1Choice(p1raw ? JSON.parse(p1raw) : state.participants[state.playerIdx].meta);
    _setGameMode('league');
    return true;
  } catch { return false; }
}

function _resetLeague() {
  localStorage.removeItem(LS_LEAGUE);
  clearLeagueCloud();
  league = null;
  _setGameMode('league');
  updateLeagueInfo();
  showScreen("screen-league-setup");
}

// ── Queries ───────────────────────────────────────────────────────────────────
export function isLeagueFinished()  { return league?.isFinished() ?? false; }
export function getLeagueCount()    { return leagueCount; }
export function isLeagueRandomMode(){ return leagueRandomMode; }
export function resetPrematchKey()  { _prematchMatchKey = null; }

// ── Info display ──────────────────────────────────────────────────────────────
export function updateLeagueInfo() {
  const n = leagueCount;
  const playerMatches = leagueFormat === 'double' ? (n - 1) * 2 : n - 1;
  document.getElementById("league-info").textContent =
    t('league.info').replace('{n}', n).replace('{m}', playerMatches);
}

// ── League flow ───────────────────────────────────────────────────────────────
export function startLeague(opponentIds = null) {
  const count = opponentIds ? opponentIds.length + 1 : leagueCount;
  league = new League(metas, _getP1Choice().id, count, leagueFormat, opponentIds);
  _leagueRewarded   = false;
  _prematchMatchKey = null;
  _saveLeague();
  showLeagueStandings(false);
}

export function runNextLeagueMatch() {
  while (!league.isFinished()) {
    const match = league.getCurrentMatch();
    if (league.isPlayerMatch(match)) break;
    league.simulateCurrent();
  }

  if (league.isFinished()) {
    showLeagueChampion();
    return;
  }

  const match  = league.getCurrentMatch();
  const p1meta = league.participants[match.p1].meta;
  const p2meta = league.participants[match.p2].meta;
  const isP1   = match.p1 === league.playerIdx;
  const myMeta = isP1 ? p1meta : p2meta;
  const rival  = isP1 ? p2meta : p1meta;
  const pp     = league.getPlayerProgress();

  showLeaguePrematch(myMeta, rival, `${pp.current} / ${pp.total}`, () => {
    document.getElementById("fight-context-label").textContent = `${pp.current} / ${pp.total}`;
    document.getElementById("btn-restart").textContent = t('btn.see.standings');
    const arenaOpts = { ...buildCompArenaOpts(), activeAbilities: leagueAbilitiesEnabled, playerSide: isP1 ? 0 : 1 };

    _startFight(p1meta, p2meta, (winnerSide) => {
      const winnerIdx = winnerSide === 0 ? match.p1 : winnerSide === 1 ? match.p2 : null;
      league.recordResult(winnerIdx);
      _saveLeague();
      if (league.isFinished()) {
        const champIdx = league.getStandings()[0].idx;
        if (champIdx === league.playerIdx) recordChampionship('league');
        showLeagueChampion();
      } else showLeagueStandings(false);
    }, arenaOpts);
  }, () => showLeagueStandings(false), leagueArenaLayout);
}

export function showLeagueChampion() {
  const standings  = league.getStandings();
  const champEntry = standings[0];
  const isPlayer   = champEntry.idx === league.playerIdx;
  const meta       = champEntry.meta;

  document.getElementById('lchamp-title').textContent =
    isPlayer ? '¡Sos el campeón de la liga!' : 'Campeón de la liga';
  document.getElementById('lchamp-name').textContent  = meta.name;
  document.getElementById('lchamp-name').style.color  = meta.color;
  document.getElementById('lchamp-subtitle').textContent =
    isPlayer ? '¡Lo lograste!' : `${meta.name} dominó la liga`;

  const circle = document.getElementById('lchamp-circle');
  circle.textContent      = meta.icon;
  circle.style.background = meta.color;
  circle.style.setProperty('--champ-color', meta.color);
  document.getElementById('lchamp-ring').style.setProperty('--champ-color', meta.color);

  const statsEl = document.getElementById('lchamp-stats');
  statsEl.innerHTML = [
    { val: champEntry.wins,    lbl: 'Victorias' },
    { val: champEntry.points,  lbl: 'Puntos'    },
    { val: champEntry.dmgDone, lbl: 'Daño'      },
  ].map(({ val, lbl }) => `
    <div class="lchamp-stat">
      <span class="lchamp-stat-val" style="color:${meta.color}">${val}</span>
      <span class="lchamp-stat-lbl">${lbl}</span>
    </div>
  `).join('');

  showScreen('screen-league-champion');

  if (!_leagueRewarded) {
    _leagueRewarded = true;
    const count    = league.participants.length;
    const isDouble = league.format === 'double';
    const mult     = isDouble ? 2 : 1;
    const basePts  = POINTS.EVENT_PER_PARTICIPANT * count * mult;
    let pts = basePts;
    const ptLines = [
      `+${basePts} XP por completar la liga (${count} × ${POINTS.EVENT_PER_PARTICIPANT}${isDouble ? ' × 2 ida y vuelta' : ''})`,
    ];
    if (isPlayer) { pts += POINTS.EVENT_WIN; ptLines.push(`+${POINTS.EVENT_WIN} XP por ganar la liga`); }
    addPoints(pts);
    _showEventPoints('lchamp-points', ptLines);
    _updateXpBar();
  }

  const cvs = document.getElementById('confetti-canvas');
  cvs.width  = cvs.offsetWidth  || 390;
  cvs.height = cvs.offsetHeight || 844;
  _launchConfetti(cvs);

  if (isPlayer) sfx.gameOverWin();

  document.getElementById('btn-lchamp-standings').onclick = () => {
    _stopConfetti();
    showLeagueStandings(true);
  };
}

export function showLeaguePrematch(myMeta, rivalMeta, progressText, onFight, onBack, arenaLayout = 'random') {
  document.getElementById("prematch-progress").textContent = progressText;

  const youCircle = document.getElementById("prematch-you-circle");
  youCircle.style.background = myMeta.color;
  youCircle.textContent = myMeta.icon;

  const rivalCircle = document.getElementById("prematch-rival-circle");
  rivalCircle.style.background = rivalMeta.color;
  rivalCircle.textContent = rivalMeta.icon;

  document.getElementById("prematch-you-name").textContent   = myMeta.name;
  document.getElementById("prematch-rival-name").textContent = rivalMeta.name;
  document.getElementById("prematch-you-name").style.color   = myMeta.color;
  document.getElementById("prematch-rival-name").style.color = rivalMeta.color;

  document.getElementById("btn-prematch-fight").onclick = onFight;
  document.getElementById("btn-prematch-back").onclick  = onBack ?? (() => showLeagueStandings(false));

  const matchKey = `${myMeta.id}-${rivalMeta.id}-${progressText}`;
  if (matchKey !== _prematchMatchKey) {
    _prematchMatchKey = matchKey;
    setPrematchLayoutIdx(arenaLayout === 'fixed' ? 0 : Math.floor(Math.random() * ARENA_LAYOUTS.length));
    setPrematchSkinIdx(Math.max(0, ARENA_SKINS.findIndex(s => s.id === getSelectedArenaSkinId())));
  }
  syncPrematchSkinSelector();

  showScreen("screen-league-prematch");
}

export function showLeagueStandings(final) {
  const pp     = league.getPlayerProgress();
  const played = pp.current - 1;
  document.getElementById("league-progress-label").textContent =
    final ? t('standings.final') : `${played} / ${pp.total}`;

  const wrap    = document.getElementById("standings-wrap");
  const tabsEl  = document.getElementById("league-view-tabs");

  const activate = (view) => {
    tabsEl.querySelectorAll(".screen-tab").forEach(b =>
      b.classList.toggle("active", b.dataset.view === view));
    if (view === "tabla") _renderLeagueTable(wrap);
    else _renderLeagueFixtures(wrap);
  };

  tabsEl.innerHTML = "";
  ["tabla", "fechas"].forEach(v => {
    const btn = document.createElement("button");
    btn.className = "screen-tab" + (v === "tabla" ? " active" : "");
    btn.dataset.view = v;
    btn.textContent = v === "tabla" ? "Tabla" : "Fechas";
    btn.addEventListener("click", () => activate(v));
    tabsEl.appendChild(btn);
  });

  _renderLeagueTable(wrap);

  const btn       = document.getElementById("btn-standings-next");
  const headerBtn = document.getElementById("btn-league-reset");
  if (final) {
    btn.textContent = 'Nueva liga';
    btn.onclick = () => showConfirm(_resetLeague, "¿Nueva liga?", "Se perderá todo el progreso de la liga actual.", "Borrar");
    if (headerBtn) headerBtn.classList.add('hidden');
  } else {
    btn.textContent = t('btn.next.fight');
    btn.onclick = runNextLeagueMatch;
    if (headerBtn) headerBtn.classList.remove('hidden');
  }

  showScreen("screen-league-standings");
}

function _renderLeagueTable(wrap) {
  const standings = league.getStandings();
  wrap.innerHTML = "";
  const table = document.createElement("table");
  table.className = "standings-table";
  table.innerHTML = `<thead><tr>
    <th>#</th><th>${t('col.char')}</th><th>${t('col.p')}</th><th>${t('col.w')}</th><th>${t('col.l')}</th><th>${t('col.pts')}</th><th>DH</th><th>DR</th>
  </tr></thead>`;
  const tbody = document.createElement("tbody");
  standings.forEach((p, rank) => {
    const tr = document.createElement("tr");
    if (p.idx === league.playerIdx) tr.classList.add("row-player");
    tr.innerHTML = `
      <td class="rank">${rank + 1}</td>
      <td><div class="participant-cell">
        <span class="p-dot" style="background:${p.meta.color}"></span>
        <span>${p.meta.name}</span>
      </div></td>
      <td>${p.played}</td><td>${p.wins}</td><td>${p.losses}</td>
      <td class="pts">${p.points}</td>
      <td>${p.dmgDone}</td><td>${p.dmgTaken}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
}

function _renderLeagueFixtures(wrap) {
  wrap.innerHTML = "";
  league.getRounds().forEach((roundMatches, idx) => {
    wrap.appendChild(buildFixtureRound(`Fecha ${idx + 1}`, roundMatches, (m) => ({
      left:  league.participants[m.p1],
      right: league.participants[m.p2],
      winner: m.winner,
      isLeftPlayer:  m.p1 === league.playerIdx,
      isRightPlayer: m.p2 === league.playerIdx,
    })));
  });
}

export function buildFixtureRound(label, matches, getInfo) {
  const section = document.createElement("div");
  section.className = "fixture-round";
  const header = document.createElement("div");
  header.className = "fixture-round-header";
  header.textContent = label;
  section.appendChild(header);

  for (const m of matches) {
    const { left, right, winner, isLeftPlayer, isRightPlayer } = getInfo(m);
    const played   = winner !== null;
    const leftWin  = played && winner === m.p1;
    const rightWin = played && winner === m.p2;

    const row = document.createElement("div");
    row.className = "fixture-match" + (played ? " played" : "");
    row.innerHTML = `
      <div class="fixture-side${leftWin ? " win" : played ? " loss" : ""}${isLeftPlayer ? " fx-player" : ""}">
        <span class="p-dot" style="background:${left.meta.color}"></span>
        <span class="fixture-name">${left.meta.name}</span>
      </div>
      <div class="fixture-center">${played ? (leftWin ? "›" : "‹") : "vs"}</div>
      <div class="fixture-side fixture-side--right${rightWin ? " win" : played ? " loss" : ""}${isRightPlayer ? " fx-player" : ""}">
        <span class="fixture-name">${right.meta.name}</span>
        <span class="p-dot" style="background:${right.meta.color}"></span>
      </div>
    `;
    section.appendChild(row);
  }
  return section;
}

// ── Event listeners (module-level) ────────────────────────────────────────────
document.getElementById("league-dec").addEventListener("click", () => {
  sfx.uiClick();
  leagueCount = Math.max(2, leagueCount - 1);
  document.getElementById("league-count").textContent = leagueCount;
  updateLeagueInfo();
});
document.getElementById("league-inc").addEventListener("click", () => {
  sfx.uiClick();
  leagueCount = Math.min(metas.length, leagueCount + 1);
  document.getElementById("league-count").textContent = leagueCount;
  updateLeagueInfo();
});
document.getElementById("league-single").addEventListener("click", () => {
  sfx.uiClick();
  leagueFormat = 'single';
  document.getElementById("league-single").classList.add("active");
  document.getElementById("league-double").classList.remove("active");
  updateLeagueInfo();
});
document.getElementById("league-double").addEventListener("click", () => {
  sfx.uiClick();
  leagueFormat = 'double';
  document.getElementById("league-double").classList.add("active");
  document.getElementById("league-single").classList.remove("active");
  updateLeagueInfo();
});

document.getElementById("btn-standings-back")?.addEventListener("click", () => {
  showScreen("screen-main-menu");
});
document.getElementById("btn-league-back")?.addEventListener("click", () => {
  showScreen("screen-main-menu");
});
document.getElementById("btn-league-reset").addEventListener("click", () =>
  showConfirm(_resetLeague, "¿Borrar la liga?", "Se perderá todo el progreso de la liga actual.", "Borrar"));

['league-arena-random', 'league-arena-fixed'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', () => {
    sfx.uiClick();
    leagueArenaLayout = id === 'league-arena-random' ? 'random' : 'fixed';
    document.getElementById('league-arena-random').classList.toggle('active', leagueArenaLayout === 'random');
    document.getElementById('league-arena-fixed').classList.toggle('active', leagueArenaLayout === 'fixed');
  });
});

document.getElementById("league-random-btn").addEventListener("click", () => {
  sfx.uiClick();
  leagueRandomMode = true;
  document.getElementById("league-random-btn").classList.add("active");
  document.getElementById("league-pick-btn").classList.remove("active");
});
document.getElementById("league-pick-btn").addEventListener("click", () => {
  sfx.uiClick();
  leagueRandomMode = false;
  document.getElementById("league-pick-btn").classList.add("active");
  document.getElementById("league-random-btn").classList.remove("active");
});
document.getElementById("league-abilities-off").addEventListener("click", () => {
  sfx.uiClick();
  leagueAbilitiesEnabled = false;
  document.getElementById("league-abilities-off").classList.add("active");
  document.getElementById("league-abilities-on").classList.remove("active");
});
document.getElementById("league-abilities-on").addEventListener("click", () => {
  sfx.uiClick();
  leagueAbilitiesEnabled = true;
  document.getElementById("league-abilities-on").classList.add("active");
  document.getElementById("league-abilities-off").classList.remove("active");
});

document.getElementById('prematch-skin-prev').addEventListener('click', () => {
  setPrematchSkinIdx((getPrematchSkinIdx() - 1 + ARENA_SKINS.length) % ARENA_SKINS.length);
  const skin = ARENA_SKINS[getPrematchSkinIdx()];
  if (isArenaSkinUnlocked(skin.id)) setSelectedArenaSkinId(skin.id);
  syncPrematchSkinSelector();
});
document.getElementById('prematch-skin-next').addEventListener('click', () => {
  setPrematchSkinIdx((getPrematchSkinIdx() + 1) % ARENA_SKINS.length);
  const skin = ARENA_SKINS[getPrematchSkinIdx()];
  if (isArenaSkinUnlocked(skin.id)) setSelectedArenaSkinId(skin.id);
  syncPrematchSkinSelector();
});
