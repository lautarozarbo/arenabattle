import { PLAYER_ICON } from './hud.js';

// ── Tag Team HUD rendering ────────────────────────────────────────────────────
// Pure rendering functions — take current state as parameters, update the DOM.

export function buildTagHud(match) {
  const hud = document.getElementById("hud");

  const renderFighter = (f, idPfx) => {
    const pct = Math.max(0, f.hp / 100);
    const fillColor = f.eliminated ? "#333"
      : pct > 0.5  ? "var(--hp-green)"
      : pct > 0.25 ? "var(--hp-orange)"
      : "var(--hp-red)";
    const cls = f.eliminated ? "tt-eliminated" : "tt-active";
    const isPlayer = idPfx === 'tta0';
    return `
      <div class="tt-fighter ${cls}" data-pfx="${idPfx}">
        <div class="tt-dot" style="background:${f.meta.color}"></div>
        <span class="tt-name" style="color:${f.meta.color}">${isPlayer ? PLAYER_ICON : ''}<span class="tt-name-text">${f.meta.name}</span></span>
        <div class="tt-track"><div class="tt-fill" id="${idPfx}-hp"
          style="width:${pct*100}%;background:${fillColor}"></div></div>
        <span class="tt-hp-text" id="${idPfx}-txt">
          ${f.eliminated ? '✗' : Math.ceil(f.hp)}
        </span>
      </div>`;
  };

  const renderBench = (f, idPfx) => {
    const pct = Math.max(0, f.hp / 100);
    const fillColor = f.eliminated ? "#333"
      : pct > 0.5  ? "var(--hp-green)"
      : pct > 0.25 ? "var(--hp-orange)"
      : "var(--hp-red)";
    const cls = f.eliminated ? "tt-eliminated" : "tt-bench";
    return `
      <div class="tt-fighter ${cls}" data-pfx="${idPfx}">
        <div class="tt-dot" style="background:${f.meta.color}"></div>
        <span class="tt-name" style="color:${f.meta.color}"><span class="tt-name-text">${f.meta.name}</span></span>
        <div class="tt-track"><div class="tt-fill" id="${idPfx}-hp"
          style="width:${pct*100}%;background:${fillColor}"></div></div>
        <span class="tt-hp-text" id="${idPfx}-txt">
          ${f.eliminated ? '✗' : Math.ceil(f.hp)}
        </span>
      </div>`;
  };

  hud.innerHTML = `
    <div class="tt-hud">
      <div class="tt-team left">
        ${renderFighter(match.getActive(0), 'tta0')}
        ${renderBench(match.getBench(0),  'ttb0')}
      </div>
      <span class="tt-vs">VS</span>
      <div class="tt-team right">
        ${renderFighter(match.getActive(1), 'tta1')}
        ${renderBench(match.getBench(1),  'ttb1')}
      </div>
    </div>`;
}

export function showTagFlash(team, match) {
  const el = document.getElementById("tag-flash");
  if (!el) return;
  const incoming = match?.getActive(team);
  const color    = incoming?.meta?.color ?? (team === 0 ? "#7ec8f7" : "#f77e7e");
  el.textContent = "⇄ RELEVO";
  el.style.color = color;
  el.classList.remove("tag-flash-in");
  void el.offsetWidth;
  el.classList.add("tag-flash-in");
}

// Updates HP bars and tracks damage for the transfer mechanic.
// Mutates prevHp array in place.
export function updateTagHudLive(game, match, prevHp) {
  if (!match) return;
  const snap = game.getHpSnapshot();

  for (let i = 0; i < 2; i++) {
    const curr = snap[i]?.isAlive ? snap[i].hp : 0;
    if (curr < prevHp[i] - 0.5) {
      match.recordHit(i, prevHp[i] - curr);
    }
    prevHp[i] = curr;
  }

  const updateBar = (f, idPfx, snapEntry) => {
    const fill = document.getElementById(`${idPfx}-hp`);
    const text = document.getElementById(`${idPfx}-txt`);
    if (!fill || !text) return;
    const rawHp = snapEntry ? (snapEntry.isAlive ? snapEntry.hp : 0) : f.hp;
    const hp    = snapEntry?._hudHp    ?? rawHp;
    const maxHp = snapEntry?._hudMaxHp ?? 100;
    const pct   = Math.max(0, hp / maxHp);
    fill.style.width = `${pct * 100}%`;
    fill.style.background = f.eliminated ? "#333"
      : pct > 0.5  ? "var(--hp-green)"
      : pct > 0.25 ? "var(--hp-orange)"
      : "var(--hp-red)";
    text.textContent = f.eliminated ? "✗" : Math.ceil(Math.max(0, hp));
  };

  updateBar(match.getActive(0), 'tta0', snap[0]);
  updateBar(match.getBench(0),  'ttb0', null);
  updateBar(match.getActive(1), 'tta1', snap[1]);
  updateBar(match.getBench(1),  'ttb1', null);
}

export function updateTagBtn(match) {
  if (!match) return;
  const btn   = document.getElementById("btn-tag-switch");
  const label = document.getElementById("tag-btn-label");
  if (!btn) return;
  const can  = match.canTag(0);
  const left = match.tagCdLeft(0);
  const pct  = 1 - left / match.TAG_CD;
  btn.disabled = !can;
  btn.classList.toggle("ready", can);
  btn.style.setProperty('--cd-pct', pct.toFixed(3));
  if (label) label.textContent = can ? "RELEVO" : `${Math.ceil(left / 1000)}s`;
}
