import { Tournament } from '../modes/Tournament.js';
import { getAllPowerMetas } from '../powers/registry.js';
import { sfx } from '../audio/index.js';
import { t } from '../i18n.js';
import { POINTS, addPoints } from '../persistence/rewards.js';
import { recordChampionship } from '../persistence/stats.js';
import { buildCompArenaOpts } from './arenaConfig.js';
import { showScreen, showConfirm } from './screens.js';
import { showLeaguePrematch, buildFixtureRound, startLeague, getLeagueCount } from './leagueUI.js';

const metas = getAllPowerMetas();

// ── Internal state ────────────────────────────────────────────────────────────
let tournament        = null;
let tournamentCount   = null; // initialized below after metas load
let tournamentArenaLayout  = 'random';
let tournamentRandomMode   = true;
let _tournamentRewarded    = false;
let _pickedOpponentIds     = [];

const VALID_TOURNAMENT_COUNTS = [8, 16, 32].filter(n => n <= metas.length);
tournamentCount = VALID_TOURNAMENT_COUNTS[0];

const LS_TOURNAMENT = 'arena_tournament';
const LS_P1CHOICE   = 'arena_p1choice';

// ── Injected deps ─────────────────────────────────────────────────────────────
let _startFight, _launchConfetti, _stopConfetti, _showEventPoints, _updateXpBar;
let _getP1Choice, _setP1Choice, _setGameMode;

export function initTournamentUI(deps) {
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
function _saveTournament() {
  if (!tournament) return;
  try {
    localStorage.setItem(LS_TOURNAMENT, JSON.stringify({
      participants: tournament.participants, playerIdx: tournament.playerIdx,
      groups: tournament.groups, groupStandings: tournament.groupStandings,
      groupMatches: tournament.groupMatches,
      currentGroupMatchIdx: tournament.currentGroupMatchIdx,
      bracketRounds: tournament.bracketRounds,
      currentBracketMatch: tournament.currentBracketMatch,
      phase: tournament.phase, champion: tournament.champion,
      _totalBracketRounds: tournament._totalBracketRounds,
    }));
    localStorage.setItem(LS_P1CHOICE, JSON.stringify(_getP1Choice()));
  } catch {}
}

export function loadTournament() {
  const raw = localStorage.getItem(LS_TOURNAMENT);
  if (!raw) return false;
  try {
    const state = JSON.parse(raw);
    tournament = Object.create(Tournament.prototype);
    Object.assign(tournament, state);
    const p1raw = localStorage.getItem(LS_P1CHOICE);
    _setP1Choice(p1raw ? JSON.parse(p1raw) : state.participants[state.playerIdx].meta);
    _setGameMode('tournament');
    return true;
  } catch { return false; }
}

function _resetTournament() {
  localStorage.removeItem(LS_TOURNAMENT);
  tournament = null;
  _setGameMode('tournament');
  updateTournamentInfo();
  showScreen("screen-tournament-setup");
}

// ── Queries ───────────────────────────────────────────────────────────────────
export function isTournamentRandomMode() { return tournamentRandomMode; }

// ── Info display ──────────────────────────────────────────────────────────────
export function updateTournamentInfo() {
  document.getElementById("tournament-info").textContent =
    t('tournament.info').replace('{n}', tournamentCount);
}

// ── Tournament flow ───────────────────────────────────────────────────────────
export function startTournament(opponentIds = null) {
  tournament = new Tournament(metas, _getP1Choice().id, tournamentCount, opponentIds);
  _tournamentRewarded = false;
  _saveTournament();
  showTournamentScreen();
}

export function showTournamentScreen() {
  if (tournament.phase === 'groups') renderGroupsScreen();
  else if (tournament.phase === 'bracket') renderBracketScreen();
  else { showTournamentChampion(); return; }
  showScreen("screen-tournament-bracket");
}

// ── Groups phase ──────────────────────────────────────────────────────────────
function renderGroupsScreen() {
  document.getElementById("bracket-phase-title").textContent = t('phase.groups');
  const pgm       = tournament.groupMatches.filter(m => m.p1 === tournament.playerIdx || m.p2 === tournament.playerIdx);
  const pgmPlayed = pgm.filter(m => m.winner !== null).length;
  const groupBadge = document.getElementById("bracket-badge");
  groupBadge.style.display = "";
  groupBadge.textContent = `${pgmPlayed} / ${pgm.length}`;

  const wrap   = document.getElementById("bracket-wrap");
  const tabsEl = document.getElementById("bracket-view-tabs");

  const activate = (view) => {
    tabsEl.querySelectorAll(".screen-tab").forEach(b =>
      b.classList.toggle("active", b.dataset.view === view));
    if (view === "tabla") _renderGroupTables(wrap);
    else _renderGroupFixtures(wrap);
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

  _renderGroupTables(wrap);

  const btn       = document.getElementById("btn-bracket-action");
  const headerBtn = document.getElementById("btn-tournament-reset");
  if (headerBtn) headerBtn.classList.remove('hidden');
  if (tournament.isGroupStageFinished()) {
    btn.textContent = t('btn.see.elim');
    btn.onclick = () => {
      tournament.buildBracket();
      _saveTournament();
      showTournamentScreen();
    };
  } else {
    btn.textContent = t('btn.next.fight');
    btn.onclick = runNextGroupMatch;
  }
}

function _renderGroupTables(wrap) {
  wrap.innerHTML = "";
  for (let g = 0; g < tournament.groups.length; g++) {
    const gs = tournament.groupStandings[g];
    const sorted = [...gs].sort((a, b) =>
      b.points - a.points || b.wins - a.wins ||
      b.dmgDone - a.dmgDone || a.dmgTaken - b.dmgTaken
    );
    const div = document.createElement("div");
    div.className = "group-block";
    div.innerHTML = `<div class="group-title">${t('group.prefix')} ${tournament.getGroupName(g)}</div>`;
    const tbl = document.createElement("table");
    tbl.className = "standings-table";
    tbl.innerHTML = `<thead><tr><th>${t('col.char')}</th><th>${t('col.p')}</th><th>${t('col.w')}</th><th>${t('col.pts')}</th><th>DH</th><th>DR</th></tr></thead>`;
    const tbody = document.createElement("tbody");
    sorted.forEach(s => {
      const p  = tournament.participants[s.idx];
      const tr = document.createElement("tr");
      if (s.idx === tournament.playerIdx) tr.classList.add("row-player");
      tr.innerHTML = `
        <td><div class="participant-cell">
          <span class="p-dot" style="background:${p.meta.color}"></span>
          <span>${p.meta.name}</span>
        </div></td>
        <td>${s.played}</td><td>${s.wins}</td>
        <td class="pts">${s.points}</td>
        <td>${s.dmgDone}</td><td>${s.dmgTaken}</td>
      `;
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    div.appendChild(tbl);
    wrap.appendChild(div);
  }
}

function _renderGroupFixtures(wrap) {
  wrap.innerHTML = "";
  for (let g = 0; g < tournament.groups.length; g++) {
    const gName   = tournament.getGroupName(g);
    const rounds  = tournament.getGroupMatchRounds(g);
    const groupEl = document.createElement("div");
    groupEl.className = "group-block";
    groupEl.innerHTML = `<div class="group-title">${t('group.prefix')} ${gName}</div>`;
    rounds.forEach((roundMatches, idx) => {
      groupEl.appendChild(buildFixtureRound(`Fecha ${idx + 1}`, roundMatches, (m) => ({
        left:  tournament.participants[m.p1],
        right: tournament.participants[m.p2],
        winner: m.winner,
        isLeftPlayer:  m.p1 === tournament.playerIdx,
        isRightPlayer: m.p2 === tournament.playerIdx,
      })));
    });
    wrap.appendChild(groupEl);
  }
}

function runNextGroupMatch() {
  while (!tournament.isGroupStageFinished()) {
    const match = tournament.getCurrentGroupMatch();
    if (tournament.isPlayerGroupMatch(match)) break;
    tournament.simulateCurrentGroupMatch();
  }

  if (tournament.isGroupStageFinished()) {
    tournament.buildBracket();
    _saveTournament();
    showTournamentScreen();
    return;
  }

  const match     = tournament.getCurrentGroupMatch();
  const p1meta    = tournament.participants[match.p1].meta;
  const p2meta    = tournament.participants[match.p2].meta;
  const isP1      = match.p1 === tournament.playerIdx;
  const myMeta    = isP1 ? p1meta : p2meta;
  const rival     = isP1 ? p2meta : p1meta;
  const gName     = tournament.getGroupName(match.groupIdx);
  const pgm       = tournament.groupMatches.filter(m => m.p1 === tournament.playerIdx || m.p2 === tournament.playerIdx);
  const pgmPlayed = pgm.filter(m => m.winner !== null).length;

  showLeaguePrematch(myMeta, rival, `${t('group.prefix')} ${gName} · ${pgmPlayed + 1} / ${pgm.length}`, () => {
    document.getElementById("fight-context-label").textContent = `${pgmPlayed + 1} / ${pgm.length}`;
    document.getElementById("btn-restart").textContent = t('btn.see.groups');
    const arenaOpts = buildCompArenaOpts();

    _startFight(p1meta, p2meta, (winnerSide) => {
      const winnerIdx = winnerSide === 0 ? match.p1 : winnerSide === 1 ? match.p2 : match.p1;
      tournament.recordGroupResult(winnerIdx);
      _saveTournament();
      showTournamentScreen();
    }, arenaOpts);
  }, () => showTournamentScreen(), tournamentArenaLayout);
}

// ── Bracket phase ─────────────────────────────────────────────────────────────
function getRoundName(roundIdx, totalRounds) {
  const fromEnd = totalRounds - 1 - roundIdx;
  if (fromEnd === 0) return t('round.final');
  if (fromEnd === 1) return t('round.semi');
  if (fromEnd === 2) return t('round.quarter');
  if (fromEnd === 3) return t('round.r8');
  return `${t('round.prefix')} ${roundIdx + 1}`;
}

function renderBracketScreen() {
  document.getElementById("bracket-phase-title").textContent = t('phase.elimination');
  document.getElementById("bracket-view-tabs").innerHTML = "";

  let pbPlayed = 0, pbTotal = 0;
  for (const round of tournament.bracketRounds) {
    for (const m of round) {
      if (m.p1 === tournament.playerIdx || m.p2 === tournament.playerIdx) {
        pbTotal++;
        if (m.winner !== null) pbPlayed++;
      }
    }
  }
  const bracketBadge = document.getElementById("bracket-badge");
  bracketBadge.style.display = "";
  bracketBadge.textContent = pbTotal > 0 ? `${pbPlayed} / ${pbTotal}` : "Eliminado";

  const wrap       = document.getElementById("bracket-wrap");
  wrap.innerHTML   = "";
  const rounds      = tournament.bracketRounds;
  const totalRounds = tournament._totalBracketRounds || 1;
  const matchCountR0 = Math.pow(2, totalRounds - 1);
  const SLOT_H       = 82;

  const tree = document.createElement("div");
  tree.className = "bracket-tree";

  for (let r = 0; r < totalRounds; r++) {
    const matchCount = Math.pow(2, totalRounds - 1 - r);
    const slotH      = SLOT_H * Math.pow(2, r);
    const builtRound = rounds[r] ?? [];

    const col = document.createElement("div");
    col.className = "bracket-col";

    const label = document.createElement("div");
    label.className = "bracket-col-label";
    label.textContent = getRoundName(r, totalRounds);
    col.appendChild(label);

    const slotsDiv = document.createElement("div");
    slotsDiv.className = "bracket-slots";
    slotsDiv.style.height = (matchCountR0 * SLOT_H) + "px";

    for (let mi = 0; mi < matchCount; mi++) {
      const m         = builtRound[mi] ?? null;
      const isTopSlot = mi % 2 === 0;

      const slot = document.createElement("div");
      slot.className = "bracket-slot " + (isTopSlot ? "slot-top" : "slot-bot");
      slot.style.height = slotH + "px";

      if (m) {
        const p1meta = m.p1 !== null ? tournament.participants[m.p1]?.meta : null;
        const p2meta = m.p2 !== null ? tournament.participants[m.p2]?.meta : null;
        const isPlayerMatch = m.p1 === tournament.playerIdx || m.p2 === tournament.playerIdx;

        const card = document.createElement("div");
        card.className = "bracket-card" + (isPlayerMatch ? " player-match" : "");

        const makeEntry = (meta, pIdx) => {
          const d = document.createElement("div");
          const hasResult = m.winner !== null;
          const isWinner  = m.winner === pIdx && pIdx !== null;
          const isLoser   = hasResult && !isWinner && pIdx !== null;
          d.className = "bracket-entry" +
            (isWinner ? " winner" : "") +
            (isLoser  ? " loser"  : "") +
            (!meta    ? " bye"    : "");
          if (!meta) {
            d.textContent = "BYE";
          } else {
            d.innerHTML = `<span class="p-dot" style="background:${meta.color}"></span>${meta.name}`;
          }
          return d;
        };

        card.appendChild(makeEntry(p1meta, m.p1));
        card.appendChild(makeEntry(p2meta, m.p2));
        slot.appendChild(card);
      } else {
        const card = document.createElement("div");
        card.className = "bracket-card tbd";
        card.innerHTML = `<div class="bracket-entry tbd-entry">...</div><div class="bracket-entry tbd-entry">...</div>`;
        slot.appendChild(card);
      }

      slotsDiv.appendChild(slot);
    }

    col.appendChild(slotsDiv);
    tree.appendChild(col);
  }

  wrap.appendChild(tree);

  const btn       = document.getElementById("btn-bracket-action");
  const headerBtn = document.getElementById("btn-tournament-reset");
  if (tournament.isBracketFinished()) {
    btn.textContent = 'Nuevo torneo';
    btn.onclick = () => showConfirm(_resetTournament, "¿Nuevo torneo?", "Se perderá todo el progreso del torneo actual.", "Borrar");
    if (headerBtn) headerBtn.classList.add('hidden');
  } else if (tournament.isPlayerEliminated()) {
    btn.textContent = t('btn.sim.final');
    btn.onclick = () => {
      while (!tournament.isBracketFinished()) tournament.simulateCurrentBracketMatch();
      _saveTournament();
      showTournamentScreen();
    };
    if (headerBtn) headerBtn.classList.remove('hidden');
  } else {
    btn.textContent = t('btn.next.fight');
    btn.onclick = runNextBracketMatch;
    if (headerBtn) headerBtn.classList.remove('hidden');
  }
}

function runNextBracketMatch() {
  while (!tournament.isBracketFinished()) {
    const match = tournament.getCurrentBracketMatch();
    if (!match) break;
    if (tournament.isPlayerBracketMatch(match)) break;
    tournament.simulateCurrentBracketMatch();
  }

  if (tournament.isBracketFinished()) {
    showTournamentScreen();
    return;
  }

  const match = tournament.getCurrentBracketMatch();
  if (!match) { showTournamentScreen(); return; }

  const p1meta = tournament.participants[match.p1]?.meta;
  const p2meta = tournament.participants[match.p2]?.meta;
  if (!p1meta || !p2meta) {
    tournament.simulateCurrentBracketMatch();
    showTournamentScreen();
    return;
  }

  const totalRounds = tournament._totalBracketRounds;
  const roundName   = getRoundName(tournament.currentBracketMatch.round, totalRounds);
  const isP1        = match.p1 === tournament.playerIdx;
  const myMeta      = isP1 ? p1meta : p2meta;
  const rival       = isP1 ? p2meta : p1meta;

  showLeaguePrematch(myMeta, rival, roundName, () => {
    document.getElementById("fight-context-label").textContent = roundName;
    document.getElementById("btn-restart").textContent = t('btn.see.bracket');
    const arenaOpts = buildCompArenaOpts();

    _startFight(p1meta, p2meta, (winnerSide) => {
      const winnerIdx = winnerSide === 0 ? match.p1 : winnerSide === 1 ? match.p2 : match.p1;
      tournament.recordBracketResult(winnerIdx);
      _saveTournament();
      if (tournament.isBracketFinished() && winnerIdx === tournament.playerIdx) {
        recordChampionship('tournament');
      }
      showTournamentScreen();
    }, arenaOpts);
  }, () => showTournamentScreen(), tournamentArenaLayout);
}

export function showTournamentChampion() {
  const champPart = tournament.participants[tournament.champion];
  const isPlayer  = tournament.champion === tournament.playerIdx;
  const meta      = champPart?.meta;
  if (!meta) return;

  document.getElementById('tchamp-title').textContent =
    isPlayer ? '¡Sos el campeón del torneo!' : 'Campeón del torneo';
  document.getElementById('tchamp-name').textContent  = meta.name;
  document.getElementById('tchamp-name').style.color  = meta.color;
  document.getElementById('tchamp-subtitle').textContent =
    isPlayer ? '¡Lo lograste!' : `${meta.name} dominó el torneo`;

  const circle = document.getElementById('tchamp-circle');
  circle.textContent      = meta.icon;
  circle.style.background = meta.color;
  circle.style.setProperty('--champ-color', meta.color);
  document.getElementById('tchamp-ring').style.setProperty('--champ-color', meta.color);

  showScreen('screen-tournament-champion');

  if (!_tournamentRewarded) {
    _tournamentRewarded = true;
    const count   = tournament.participants.length;
    const basePts = POINTS.EVENT_PER_PARTICIPANT * count;
    let pts = basePts;
    const ptLines = [`+${basePts} pts por completar el torneo (${count} × ${POINTS.EVENT_PER_PARTICIPANT})`];
    if (isPlayer) { pts += POINTS.EVENT_WIN; ptLines.push(`+${POINTS.EVENT_WIN} pts por ganar el torneo`); }
    addPoints(pts);
    _showEventPoints('tchamp-points', ptLines);
    document.getElementById('tchamp-points').classList.remove('hidden');
    _updateXpBar();
  }

  const cvs = document.getElementById('tchamp-confetti-canvas');
  cvs.width  = cvs.offsetWidth  || 390;
  cvs.height = cvs.offsetHeight || 844;
  _launchConfetti(cvs);

  if (isPlayer) sfx.gameOverWin();

  document.getElementById('btn-tchamp-bracket').onclick = () => {
    _stopConfetti();
    renderBracketScreen();
    showScreen('screen-tournament-bracket');
  };
}

export function showParticipantPicker(mode) {
  const required = mode === 'tournament' ? tournamentCount - 1 : getLeagueCount() - 1;
  _pickedOpponentIds = [];

  const p1Id     = _getP1Choice().id;
  const available = metas.filter(m => m.id !== p1Id);

  document.getElementById("pick-title").textContent = "Elegí los rivales";
  document.getElementById("pick-hint").textContent  = `Elegí exactamente ${required} rivales`;

  const updateBadge = () => {
    const n = _pickedOpponentIds.length;
    document.getElementById("pick-badge").textContent = `${n} / ${required}`;
    document.getElementById("btn-pick-confirm").disabled = n !== required;
  };

  const grid = document.getElementById("pick-grid");
  grid.innerHTML = "";

  for (const meta of available) {
    const tile = document.createElement("div");
    tile.className = "pick-tile";
    tile.innerHTML = `
      <div class="pick-tile-circle" style="background:${meta.color}">${meta.icon}</div>
      <div class="pick-tile-name">${meta.name}</div>
    `;
    tile.addEventListener("click", () => {
      const idx = _pickedOpponentIds.indexOf(meta.id);
      if (idx >= 0) {
        _pickedOpponentIds.splice(idx, 1);
        tile.classList.remove("selected");
        tile.style.borderColor = "";
      } else {
        if (required > 0 && _pickedOpponentIds.length >= required) return;
        _pickedOpponentIds.push(meta.id);
        tile.classList.add("selected");
        tile.style.borderColor = meta.color;
      }
      updateBadge();
    });
    grid.appendChild(tile);
  }

  updateBadge();

  document.getElementById("btn-pick-back").onclick = () =>
    showScreen(mode === 'tournament' ? "screen-tournament-setup" : "screen-league-setup");

  document.getElementById("btn-pick-confirm").onclick = () => {
    if (mode === 'tournament') startTournament([..._pickedOpponentIds]);
    else startLeague([..._pickedOpponentIds]);
  };

  showScreen("screen-participant-pick");
}

// ── Event listeners (module-level) ────────────────────────────────────────────
document.getElementById("tournament-count").textContent = tournamentCount;

document.getElementById("tournament-dec").addEventListener("click", () => {
  const idx = VALID_TOURNAMENT_COUNTS.indexOf(tournamentCount);
  if (idx > 0) {
    tournamentCount = VALID_TOURNAMENT_COUNTS[idx - 1];
    document.getElementById("tournament-count").textContent = tournamentCount;
    updateTournamentInfo();
  }
});
document.getElementById("tournament-inc").addEventListener("click", () => {
  const idx = VALID_TOURNAMENT_COUNTS.indexOf(tournamentCount);
  if (idx < VALID_TOURNAMENT_COUNTS.length - 1) {
    tournamentCount = VALID_TOURNAMENT_COUNTS[idx + 1];
    document.getElementById("tournament-count").textContent = tournamentCount;
    updateTournamentInfo();
  }
});

document.getElementById("tournament-random-btn").addEventListener("click", () => {
  tournamentRandomMode = true;
  document.getElementById("tournament-random-btn").classList.add("active");
  document.getElementById("tournament-pick-btn").classList.remove("active");
});
document.getElementById("tournament-pick-btn").addEventListener("click", () => {
  tournamentRandomMode = false;
  document.getElementById("tournament-pick-btn").classList.add("active");
  document.getElementById("tournament-random-btn").classList.remove("active");
});

document.getElementById("btn-tournament-reset").addEventListener("click", () =>
  showConfirm(_resetTournament, "¿Borrar el torneo?", "Se perderá todo el progreso del torneo actual.", "Borrar"));

['tournament-arena-random', 'tournament-arena-fixed'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', () => {
    tournamentArenaLayout = id === 'tournament-arena-random' ? 'random' : 'fixed';
    document.getElementById('tournament-arena-random').classList.toggle('active', tournamentArenaLayout === 'random');
    document.getElementById('tournament-arena-fixed').classList.toggle('active', tournamentArenaLayout === 'fixed');
  });
});

document.getElementById("btn-tournament-back")?.addEventListener("click", () => {
  showScreen("screen-main-menu");
});
document.getElementById("btn-tournament-exit")?.addEventListener("click", () => {
  showConfirm(() => showScreen("screen-main-menu"));
});
