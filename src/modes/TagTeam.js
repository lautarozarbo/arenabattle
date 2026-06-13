export class TagTeamMatch {
  constructor(team0, team1) {
    // team0 = [myMeta, partnerMeta], team1 = [e1Meta, e2Meta]
    this.teams = [
      team0.map(m => ({ meta: m, hp: 100, eliminated: false })),
      team1.map(m => ({ meta: m, hp: 100, eliminated: false })),
    ];
    this.active       = [0, 0];   // active fighter index per team
    this._tagCd       = [0, 0];   // timestamp of last tag per team
    this._lastHitTime = [0, 0];   // timestamp of last hit per team
    this._lastHitAmt  = [0, 0];   // damage amount of last hit per team
    this.TAG_CD       = 8000;
    this._aiNext      = Date.now() + this._aiInterval();
  }

  _aiInterval() { return 10000 + Math.random() * 10000; }

  getActive(team) { return this.teams[team][this.active[team]]; }
  getBench(team)  { return this.teams[team][1 - this.active[team]]; }

  canTag(team) {
    return !this.getBench(team).eliminated
      && (Date.now() - this._tagCd[team]) >= this.TAG_CD;
  }

  tagCdLeft(team) {
    return Math.max(0, this.TAG_CD - (Date.now() - this._tagCd[team]));
  }

  doTag(team, currentHp) {
    const active = this.getActive(team);
    active.hp = Math.max(0, currentHp);
    // Damage transfer: if hit within 1.2s, apply 40% to incoming fighter
    const recentHit = (Date.now() - this._lastHitTime[team]) < 1200;
    const transfer  = recentHit ? this._lastHitAmt[team] * 0.4 : 0;
    this.active[team]  = 1 - this.active[team];
    this._tagCd[team]  = Date.now();
    if (transfer > 0) {
      const incoming = this.getActive(team);
      incoming.hp = Math.max(1, incoming.hp - transfer);
    }
    if (team === 1) this._aiNext = Date.now() + this._aiInterval();
  }

  recordHit(team, amount) {
    this._lastHitTime[team] = Date.now();
    this._lastHitAmt[team]  = amount;
  }

  onFighterDown(team) {
    const active = this.getActive(team);
    active.hp = 0;
    active.eliminated = true;
    if (!this.getBench(team).eliminated) {
      this.active[team] = 1 - this.active[team];
      this._tagCd[team] = Date.now();
    }
  }

  isOver()      { return this.teams.some(t => t.every(f => f.eliminated)); }
  winnerTeam()  {
    if (this.teams[1].every(f => f.eliminated)) return 0;
    if (this.teams[0].every(f => f.eliminated)) return 1;
    return -1;
  }

  shouldAiTag() {
    if (!this.canTag(1))            return false;
    if (Date.now() < this._aiNext)  return false;
    const hp     = this.getActive(1).hp;
    const chance = hp < 30 ? 0.85 : 0.6;
    return Math.random() < chance;
  }
}
