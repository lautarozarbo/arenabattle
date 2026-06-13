export class Tournament {
  constructor(metas, playerMetaId, numParticipants, opponentIds = null) {
    const playerMeta = metas.find(m => m.id === playerMetaId);
    let opponentMetas;
    if (opponentIds && opponentIds.length > 0) {
      opponentMetas = opponentIds.map(id => metas.find(m => m.id === id)).filter(Boolean);
    } else {
      const others = metas.filter(m => m.id !== playerMetaId);
      shuffle(others);
      opponentMetas = others.slice(0, numParticipants - 1);
    }

    this.participants = [playerMeta, ...opponentMetas].map(meta => ({
      meta,
    }));
    this.playerIdx = 0;

    this.groups = buildGroups(this.participants.length);
    this.groupStandings = this.groups.map(g =>
      g.map(idx => ({ idx, points: 0, wins: 0, played: 0, dmgDone: 0, dmgTaken: 0 }))
    );
    this.groupMatches = this._buildGroupMatches();
    this.currentGroupMatchIdx = 0;

    this.bracketRounds = [];
    this.currentBracketMatch = { round: 0, match: 0 };
    this.phase = 'groups';
    this.champion = null;
  }

  // ── Group stage ────────────────────────────────────────────────────────────

  _buildGroupMatches() {
    // Build round-robin rounds for each group, player match last per round.
    // Then interleave groups round-by-round so all players stay in sync.
    const groupRounds = this.groups.map((grp, g) => {
      const size = grp.length % 2 === 0 ? grp.length : grp.length + 1;
      const slots = Array.from({ length: size }, (_, i) => i < grp.length ? grp[i] : -1);
      const nRounds = size - 1;
      const rotating = slots.slice(1);
      const rounds = [];
      for (let r = 0; r < nRounds; r++) {
        const current = [slots[0], ...rotating];
        const ai = [], player = [];
        for (let i = 0; i < size / 2; i++) {
          const p1 = current[i], p2 = current[size - 1 - i];
          if (p1 < 0 || p2 < 0) continue;
          const m = { p1, p2, winner: null, groupIdx: g, round: r };
          if (p1 === this.playerIdx || p2 === this.playerIdx) player.push(m);
          else ai.push(m);
        }
        shuffle(ai);
        rounds.push([...ai, ...player]);
        rotating.push(rotating.shift());
      }
      return rounds;
    });

    // Interleave by round: all groups' round 0, then round 1, etc.
    const allMatches = [];
    const maxRounds = Math.max(...groupRounds.map(gr => gr.length));
    for (let r = 0; r < maxRounds; r++) {
      for (let g = 0; g < groupRounds.length; g++) {
        if (groupRounds[g][r]) allMatches.push(...groupRounds[g][r]);
      }
    }
    return allMatches;
  }

  getCurrentGroupMatch() {
    return this.groupMatches[this.currentGroupMatchIdx] ?? null;
  }

  isPlayerGroupMatch(m) {
    return m && (m.p1 === this.playerIdx || m.p2 === this.playerIdx);
  }

  // dmgTakenByWinner: damage winner received (null = estimate from meta)
  recordGroupResult(winnerIdx, dmgTakenByWinner = null) {
    const m = this.getCurrentGroupMatch();
    if (!m) return;
    m.winner = winnerIdx;
    const gs = this.groupStandings[m.groupIdx];
    const s1 = gs.find(s => s.idx === m.p1);
    const s2 = gs.find(s => s.idx === m.p2);
    s1.played++; s2.played++;
    if (winnerIdx === m.p1) { s1.points += 3; s1.wins++; }
    else if (winnerIdx === m.p2) { s2.points += 3; s2.wins++; }
    else { s1.points++; s2.points++; }
    // Track damage
    const ws = winnerIdx === m.p1 ? s1 : s2;
    const ls = winnerIdx === m.p1 ? s2 : s1;
    const taken = dmgTakenByWinner ?? _rollDmg(
      this.participants[ws.idx].meta, this.participants[ls.idx].meta
    );
    ws.dmgDone  += 100; ws.dmgTaken += taken;
    ls.dmgDone  += taken; ls.dmgTaken += 100;
    this.currentGroupMatchIdx++;
  }

  simulateCurrentGroupMatch() {
    const m = this.getCurrentGroupMatch();
    if (!m) return;
    const r1 = roll(this.participants[m.p1].meta);
    const r2 = roll(this.participants[m.p2].meta);
    const winnerIdx = r1 >= r2 ? m.p1 : m.p2;
    const taken = Math.max(5, Math.min(95, Math.round(
      100 * (winnerIdx === m.p1 ? r2 : r1) / (r1 + r2)
    )));
    this.recordGroupResult(winnerIdx, taken);
  }

  isGroupStageFinished() {
    return this.currentGroupMatchIdx >= this.groupMatches.length;
  }

  getGroupName(idx) { return String.fromCharCode(65 + idx); }

  getGroupMatchRounds(groupIdx) {
    const matches = this.groupMatches.filter(m => m.groupIdx === groupIdx);
    const map = new Map();
    for (const m of matches) {
      const r = m.round ?? 0;
      if (!map.has(r)) map.set(r, []);
      map.get(r).push(m);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, ms]) => ms);
  }

  // ── Build bracket from group results ──────────────────────────────────────

  buildBracket() {
    const qualifiers = [];
    for (let g = 0; g < this.groups.length; g++) {
      const sorted = [...this.groupStandings[g]].sort((a, b) =>
        b.points - a.points || b.wins - a.wins ||
        b.dmgDone - a.dmgDone || a.dmgTaken - b.dmgTaken
      );
      const advance = this.groups[g].length >= 3 ? 2 : 1;
      for (let i = 0; i < Math.min(advance, sorted.length); i++) {
        qualifiers.push(sorted[i].idx);
      }
    }

    let size = 1;
    while (size < qualifiers.length) size *= 2;
    const padded = [...qualifiers];
    while (padded.length < size) padded.push(null);
    shuffle(padded);

    const firstRound = [];
    for (let i = 0; i < padded.length; i += 2) {
      const m = { p1: padded[i], p2: padded[i + 1], winner: null };
      if (m.p1 === null) m.winner = m.p2;
      if (m.p2 === null) m.winner = m.p1;
      firstRound.push(m);
    }
    this.bracketRounds = [firstRound];
    this._totalBracketRounds = Math.max(1, Math.log2(size));
    this.currentBracketMatch = { round: 0, match: 0 };
    this._skipDecided();
    this.phase = 'bracket';
  }

  // ── Bracket stage ──────────────────────────────────────────────────────────

  getCurrentBracketMatch() {
    const { round, match } = this.currentBracketMatch;
    return this.bracketRounds[round]?.[match] ?? null;
  }

  isPlayerBracketMatch(m) {
    return m && (m.p1 === this.playerIdx || m.p2 === this.playerIdx);
  }

  recordBracketResult(winnerIdx) {
    const { round, match } = this.currentBracketMatch;
    const m = this.bracketRounds[round]?.[match];
    if (!m || m.winner !== null) return;
    m.winner = winnerIdx;

    // Advance match pointer
    this.currentBracketMatch.match++;

    // If the round is complete, build next round
    if (this._isRoundDone(round)) {
      this._buildNextRound(round);
    }

    // Skip any auto-decided matches (byes etc.)
    this._skipDecided();

    // Check for champion
    const last = this.bracketRounds[this.bracketRounds.length - 1];
    if (last && last.length === 1 && last[0].winner !== null) {
      this.champion = last[0].winner;
      this.phase = 'done';
    }
  }

  simulateCurrentBracketMatch() {
    const m = this.getCurrentBracketMatch();
    if (!m || m.winner !== null) return;
    const r1 = m.p1 !== null ? roll(this.participants[m.p1].meta) : -1;
    const r2 = m.p2 !== null ? roll(this.participants[m.p2].meta) : -1;
    this.recordBracketResult(r1 >= r2 ? m.p1 : m.p2);
  }

  isBracketFinished() { return this.phase === 'done'; }

  isPlayerEliminated() {
    if (this.phase !== 'bracket') return false;
    const { round, match } = this.currentBracketMatch;

    // Check built rounds from current pointer forward
    for (let r = round; r < this.bracketRounds.length; r++) {
      const start = r === round ? match : 0;
      for (let mi = start; mi < this.bracketRounds[r].length; mi++) {
        const m = this.bracketRounds[r][mi];
        if (m.p1 === this.playerIdx || m.p2 === this.playerIdx) return false;
      }
    }

    // Player not found ahead of pointer. But they may have won a BYE match
    // earlier in the current round (pointer already past it), meaning the next
    // round hasn't been built yet due to lazy construction.
    const curRound = this.bracketRounds[round];
    if (curRound) {
      for (let mi = 0; mi < match; mi++) {
        const m = curRound[mi];
        if ((m.p1 === this.playerIdx || m.p2 === this.playerIdx) &&
            m.winner === this.playerIdx) {
          return false; // player won a skipped BYE; next round not yet built
        }
      }
    }

    return true;
  }

  _isRoundDone(round) {
    return this.bracketRounds[round]?.every(m => m.winner !== null);
  }

  _buildNextRound(completedRound) {
    const prev = this.bracketRounds[completedRound];
    if (prev.length <= 1) return;
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const m = { p1: prev[i].winner, p2: prev[i + 1]?.winner ?? null, winner: null };
      if (m.p1 === null) m.winner = m.p2;
      if (m.p2 === null) m.winner = m.p1;
      next.push(m);
    }
    this.bracketRounds.push(next);
    this.currentBracketMatch = { round: completedRound + 1, match: 0 };
  }

  _skipDecided() {
    let safety = 0;
    while (safety++ < 100) {
      const { round, match } = this.currentBracketMatch;
      const r = this.bracketRounds[round];
      if (!r) break;
      if (match >= r.length) {
        // Round exhausted — if it's done and next round not built yet, build it
        if (this._isRoundDone(round) && round + 1 >= this.bracketRounds.length) {
          this._buildNextRound(round);
          continue;
        }
        break;
      }
      const m = r[match];
      if (!m || m.winner === null) break;
      this.currentBracketMatch.match++;
    }
  }
}

function buildGroups(n) {
  // n must be a valid tournament size (8, 16, 32 — multiple of 4 where n/4 is a power of 2)
  // Each group has exactly 4 members; 2 qualify per group → bracket is always a clean power of 2
  const numGroups = n / 4;
  const groups = Array.from({ length: numGroups }, () => []);
  for (let i = 0; i < n; i++) groups[i % numGroups].push(i);
  return groups;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function roll(meta) {
  return (meta.dmgRating || 1) * 0.6 + Math.random() * 2.5;
}

function _rollDmg(winnerMeta, loserMeta) {
  const wr = roll(winnerMeta);
  const lr = roll(loserMeta);
  return Math.max(5, Math.min(95, Math.round(100 * lr / (wr + lr))));
}
