export class League {
  constructor(metas, playerMetaId, numParticipants, format, opponentIds = null) {
    this.format = format;

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
      meta, points: 0, wins: 0, losses: 0, played: 0, dmgDone: 0, dmgTaken: 0,
    }));
    this.playerIdx = 0;
    this.matches = this._buildSchedule();
    this.currentMatchIdx = 0;
  }

  _buildSchedule() {
    const n = this.participants.length;
    // Round-robin: fix slot[0], rotate the rest.
    // Within each round, AI matches come before the player match so the
    // natural "simulate until player match" flow keeps everyone in sync.
    const size = n % 2 === 0 ? n : n + 1; // add bye slot (-1) for odd n
    const slots = Array.from({ length: size }, (_, i) => i < n ? i : -1);
    const numRounds = size - 1;

    const buildLeg = (legIndex) => {
      const rotating = slots.slice(1); // fresh copy each leg
      const legMatches = [];
      for (let r = 0; r < numRounds; r++) {
        const current = [slots[0], ...rotating];
        const ai = [], player = [];
        for (let i = 0; i < size / 2; i++) {
          let p1 = current[i], p2 = current[size - 1 - i];
          if (legIndex % 2 === 1) [p1, p2] = [p2, p1]; // swap home/away for return leg
          if (p1 < 0 || p2 < 0) continue; // skip byes
          const m = { p1, p2, winner: null, round: legIndex * numRounds + r };
          if (p1 === this.playerIdx || p2 === this.playerIdx) player.push(m);
          else ai.push(m);
        }
        shuffle(ai);
        legMatches.push(...ai, ...player); // AI first → player last per round
        rotating.push(rotating.shift());
      }
      return legMatches;
    };

    const matches = buildLeg(0);
    if (this.format === 'double') matches.push(...buildLeg(1));
    return matches;
  }

  getCurrentMatch() {
    return this.matches[this.currentMatchIdx] ?? null;
  }

  isPlayerMatch(match) {
    return match && (match.p1 === this.playerIdx || match.p2 === this.playerIdx);
  }

  // winnerParticipantIdx: participant index, or null for draw
  // dmgTakenByWinner: damage winner received (null = estimate from meta)
  recordResult(winnerParticipantIdx, dmgTakenByWinner = null) {
    const match = this.getCurrentMatch();
    if (!match) return;
    const p1 = this.participants[match.p1];
    const p2 = this.participants[match.p2];
    p1.played++; p2.played++;
    if (winnerParticipantIdx === match.p1) {
      p1.points += 3; p1.wins++; p2.losses++;
    } else if (winnerParticipantIdx === match.p2) {
      p2.points += 3; p2.wins++; p1.losses++;
    } else {
      p1.points += 1; p2.points += 1;
    }
    // Track damage
    if (winnerParticipantIdx !== null) {
      const wi = winnerParticipantIdx === match.p1 ? match.p1 : match.p2;
      const li = wi === match.p1 ? match.p2 : match.p1;
      const loserMeta = this.participants[li].meta;
      const winnerMeta = this.participants[wi].meta;
      const taken = dmgTakenByWinner ?? _rollDmg(winnerMeta, loserMeta);
      this.participants[wi].dmgDone  += 100;
      this.participants[wi].dmgTaken += taken;
      this.participants[li].dmgDone  += taken;
      this.participants[li].dmgTaken += 100;
    }
    match.winner = winnerParticipantIdx ?? -1;
    this.currentMatchIdx++;
  }

  simulateCurrent() {
    const match = this.getCurrentMatch();
    if (!match) return;
    const r1 = roll(this.participants[match.p1].meta);
    const r2 = roll(this.participants[match.p2].meta);
    const winnerIdx = r1 >= r2 ? match.p1 : match.p2;
    const taken = Math.max(5, Math.min(95, Math.round(
      100 * (winnerIdx === match.p1 ? r2 : r1) / (r1 + r2)
    )));
    this.recordResult(winnerIdx, taken);
  }

  isFinished() {
    return this.currentMatchIdx >= this.matches.length;
  }

  getProgress() {
    return { current: this.currentMatchIdx, total: this.matches.length };
  }

  getPlayerProgress() {
    const pm = this.matches.filter(m => m.p1 === this.playerIdx || m.p2 === this.playerIdx);
    const played = pm.filter(m => m.winner !== null).length;
    return { current: played + 1, total: pm.length };
  }

  getRounds() {
    const map = new Map();
    for (const m of this.matches) {
      const r = m.round ?? 0;
      if (!map.has(r)) map.set(r, []);
      map.get(r).push(m);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, ms]) => ms);
  }

  getStandings() {
    return this.participants
      .map((p, idx) => ({ ...p, idx }))
      .sort((a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.dmgDone - a.dmgDone ||
        a.dmgTaken - b.dmgTaken ||
        a.losses - b.losses
      );
  }
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

// Estimate damage taken by winner based on meta dmgRatings (used for player fights)
function _rollDmg(winnerMeta, loserMeta) {
  const wr = roll(winnerMeta);
  const lr = roll(loserMeta);
  return Math.max(5, Math.min(95, Math.round(100 * lr / (wr + lr))));
}
