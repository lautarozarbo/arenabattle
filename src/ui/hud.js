let _game = null;

export function initHud(gameInstance) {
  _game = gameInstance;
}

export const PLAYER_ICON = `<svg class="hud-player-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

export function buildHud(cfgs) {
  const hud = document.getElementById("hud");
  const N   = cfgs.length;
  if (N === 2) {
    hud.innerHTML = `
      <div class="fighter-hud">
        <span class="hud-name" style="color:${cfgs[0].color}">${PLAYER_ICON}${cfgs[0].label}</span>
        <div class="hp-track"><div class="hp-fill" id="hf-0-hp"></div></div>
        <span class="hp-text" id="hf-0-text">${cfgs[0].hp ?? 100}</span>
      </div>
      <span class="hud-vs">VS</span>
      <div class="fighter-hud right">
        <span class="hud-name" style="color:${cfgs[1].color}">${cfgs[1].label}</span>
        <div class="hp-track"><div class="hp-fill" id="hf-1-hp"></div></div>
        <span class="hp-text" id="hf-1-text">${cfgs[1].hp ?? 100}</span>
      </div>
    `;
  } else {
    const TEAM_COLORS = ["#7ec8f7", "#f77e7e"];
    const rows = cfgs.map((cfg, i) => {
      const badge = cfg.teamId != null
        ? `<span class="hud-team-badge" style="background:${TEAM_COLORS[cfg.teamId] ?? '#aaa'}">${cfg.teamId + 1}</span>`
        : "";
      const playerIcon = i === 0 ? PLAYER_ICON : "";
      return `<div class="hud-row">
        <span class="hud-dot-sm" style="background:${cfg.color}"></span>
        ${badge}
        <span class="hud-name--sm" id="hf-${i}-name">${playerIcon}${cfg.label}</span>
        <div class="hp-track--sm"><div class="hp-fill" id="hf-${i}-hp"></div></div>
        <span class="hp-text" id="hf-${i}-text">${cfg.hp ?? 100}</span>
      </div>`;
    }).join("");
    hud.innerHTML = `<div class="hud-multi">${rows}</div>`;
  }
}

let _hudRaf = null;

export function startHudLoop() {
  stopHudLoop();
  function loop() {
    const snap = _game.getHpSnapshot();
    snap.forEach((s, i) => {
      const fill = document.getElementById(`hf-${i}-hp`);
      const text = document.getElementById(`hf-${i}-text`);
      if (!fill || !text) return;
      const dispHp  = s._hudHp    ?? s.hp;
      const dispMax = s._hudMaxHp ?? s.maxHp;
      const pct = s.isAlive ? dispHp / dispMax : 0;
      fill.style.width = `${pct * 100}%`;
      fill.style.background = pct > 0.5 ? "var(--hp-green)" : pct > 0.25 ? "var(--hp-orange)" : "var(--hp-red)";
      text.textContent = s.isAlive ? Math.ceil(dispHp) : "✗";
    });
    _hudRaf = requestAnimationFrame(loop);
  }
  _hudRaf = requestAnimationFrame(loop);
}

export function stopHudLoop() {
  if (_hudRaf) cancelAnimationFrame(_hudRaf);
  _hudRaf = null;
}
