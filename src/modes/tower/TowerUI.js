/**
 * TowerUI — all DOM for the infinite tower mode.
 *
 * Screens / overlays:
 *  1. Floor transition  — animated tower shaft + enemy preview (shown before each fight)
 *  2. Upgrade picker    — 3 cards after winning a floor, with selection animation
 *  3. Run-over screen   — summary when player dies
 *  4. In-fight stats bar — compact strip showing accumulated buffs during fight
 */
export class TowerUI {
  constructor({ onUpgradeChosen, onRunOverClose }) {
    this._onUpgradeChosen = onUpgradeChosen;
    this._onRunOverClose  = onRunOverClose;

    this._transition = null;  // floor-transition overlay
    this._picker     = null;  // upgrade picker overlay
    this._runOver    = null;  // run-over overlay
    this._statsBar   = null;  // in-fight stats strip
  }

  // ── 1. Floor transition ───────────────────────────────────────────────────

  /**
   * Show the animated tower ascension + enemy preview.
   * @param {number}  fromFloor  — floor just beaten (0 = start of run)
   * @param {number}  toFloor    — floor about to fight
   * @param {object}  enemyInfo  — { label, hp, count, powerId, powerName, isBoss, bossDesc }
   * @param {Function} onComplete — called when animation finishes and player taps/waits
   */
  showFloorTransition(fromFloor, toFloor, enemyInfo, onComplete) {
    this._ensureTransition();

    const el       = this._transition;
    const shaft    = el.querySelector('.tt-shaft');
    const plateOld = el.querySelector('.tt-plate-old');
    const plateNew = el.querySelector('.tt-plate-new');

    // Fill floor plates
    plateOld.innerHTML = _plateContent(fromFloor, null, false);
    plateNew.innerHTML = _plateContent(toFloor, enemyInfo, enemyInfo?.isBoss ?? false);

    // Reset animation state
    el.classList.remove('tt--hidden');
    shaft.classList.remove('tt-animate');
    void shaft.offsetWidth; // reflow to restart animation

    // Start ascent after a tiny delay so the user sees "piso X" before moving
    setTimeout(() => shaft.classList.add('tt-animate'), 180);

    // After animation settles, show the "tap to fight" hint
    const ANIM_MS = 1100;
    setTimeout(() => {
      el.querySelector('.tt-tap-hint').classList.remove('tt-tap-hint--hidden');
    }, ANIM_MS + 200);

    // Auto-advance or tap to continue
    const advance = () => {
      el.removeEventListener('click', advance);
      clearTimeout(autoTimer);
      el.classList.add('tt--hidden');
      onComplete();
    };

    el.addEventListener('click', advance, { once: true });
    const autoTimer = setTimeout(advance, ANIM_MS + 2400);
  }

  hideTransition() {
    this._transition?.classList.add('tt--hidden');
  }

  // ── 2. Upgrade picker ─────────────────────────────────────────────────────

  /**
   * @param {number}    floor    — just-won floor
   * @param {Upgrade[]} upgrades — array of 3 upgrade objects
   */
  showUpgradePicker(floor, upgrades) {
    this._ensurePicker();
    const el = this._picker;

    el.querySelector('.tp-title').textContent = `¡Piso ${floor} superado!`;
    el.querySelector('.tp-sub').textContent   = 'Elegí una mejora para continuar';

    const list = el.querySelector('.tp-cards');
    list.innerHTML = '';

    for (const upg of upgrades) {
      const card = document.createElement('button');
      card.className = 'tp-card';
      card.dataset.id = upg.id;
      card.innerHTML = `
        <span class="tp-card-label">${upg.label}</span>
        <span class="tp-card-desc">${upg.description}</span>
      `;
      card.addEventListener('click', () => this._selectUpgrade(upg, card));
      list.appendChild(card);
    }

    el.classList.remove('tt--hidden');
    // Staggered card entrance
    requestAnimationFrame(() => {
      list.querySelectorAll('.tp-card').forEach((c, i) => {
        c.style.animationDelay = `${i * 90}ms`;
        c.classList.add('tp-card--enter');
      });
    });
  }

  _selectUpgrade(upg, cardEl) {
    // Disable all cards immediately
    this._picker.querySelectorAll('.tp-card').forEach(c => {
      c.disabled = true;
      if (c !== cardEl) c.classList.add('tp-card--dim');
    });
    cardEl.classList.add('tp-card--chosen');

    setTimeout(() => {
      this._picker.classList.add('tt--hidden');
      this._onUpgradeChosen(upg);
    }, 620);
  }

  hideUpgradePicker() {
    this._picker?.classList.add('tt--hidden');
  }

  // ── 3. Run-over screen ────────────────────────────────────────────────────

  showRunOver(floor, upgradeIds) {
    this._ensureRunOver();
    const el = this._runOver;
    el.querySelector('.tro-floor').textContent   = `Llegaste al piso ${floor}`;
    el.querySelector('.tro-upgrades').textContent =
      upgradeIds.length > 0
        ? `${upgradeIds.length} mejora${upgradeIds.length > 1 ? 's' : ''} aplicada${upgradeIds.length > 1 ? 's' : ''}`
        : 'Sin mejoras aplicadas';
    el.classList.remove('tt--hidden');
  }

  hideRunOver() {
    this._runOver?.classList.add('tt--hidden');
  }

  // ── 4. In-fight stats bar ─────────────────────────────────────────────────

  /**
   * Inject a compact strip below the fight topbar showing active tower buffs.
   * @param {TowerRun} run
   */
  showInFightStats(run) {
    this._ensureStatsBar();
    const bar  = this._statsBar;
    const mods = run.playerMods;
    const pmods = run.powerMods;

    const chips = [];
    if (mods.dmgMult      > 1)   chips.push(`⚔ Daño ×${mods.dmgMult.toFixed(2)}`);
    if (mods.speedMult    > 1)   chips.push(`⚡ Vel ×${mods.speedMult.toFixed(2)}`);
    if (mods.regenPerSec  > 0)   chips.push(`❤ ${mods.regenPerSec.toFixed(1)}/s`);
    if (mods.contactDmgAdd > 0)  chips.push(`+${mods.contactDmgAdd} choque`);
    if (mods.hpBonus      > 0)   chips.push(`+${mods.hpBonus} HP`);
    if (pmods.cdMult      < 1)   chips.push(`⏱ CD ×${pmods.cdMult.toFixed(2)}`);
    if (pmods.extraProjectile > 0) chips.push(`+${pmods.extraProjectile} proyectil`);
    if (pmods.extraPlacement  > 0) chips.push(`+${pmods.extraPlacement} elem.`);
    if (pmods.zoneDurationMult > 1) chips.push(`⧖ Zona ×${pmods.zoneDurationMult.toFixed(1)}`);

    if (chips.length === 0) {
      bar.classList.add('tt--hidden');
      return;
    }

    bar.innerHTML = chips.map(c => `<span class="tsb-chip">${c}</span>`).join('');
    bar.classList.remove('tt--hidden');
  }

  hideInFightStats() {
    this._statsBar?.classList.add('tt--hidden');
  }

  // ── Teardown ──────────────────────────────────────────────────────────────

  reset() {
    this.hideTransition();
    this.hideUpgradePicker();
    this.hideRunOver();
    this.hideInFightStats();
  }

  // ── Private: lazy DOM builders ────────────────────────────────────────────

  _ensureTransition() {
    if (this._transition) return;
    const el = document.createElement('div');
    el.className = 'tower-transition tt--hidden';
    el.innerHTML = `
      <div class="tt-tracks">
        <div class="tt-track tt-track--left"></div>
        <div class="tt-track tt-track--right"></div>
      </div>
      <div class="tt-shaft-wrap">
        <div class="tt-shaft">
          <div class="tt-plate tt-plate-new"></div>
          <div class="tt-plate tt-plate-old"></div>
        </div>
      </div>
      <div class="tt-tap-hint tt-tap-hint--hidden">Toca para continuar</div>
    `;
    document.getElementById('screen-fight').appendChild(el);
    this._transition = el;
  }

  _ensurePicker() {
    if (this._picker) return;
    const el = document.createElement('div');
    el.className = 'tower-picker tt--hidden';
    el.innerHTML = `
      <div class="tp-box">
        <div class="tp-title"></div>
        <div class="tp-sub"></div>
        <div class="tp-cards"></div>
      </div>
    `;
    document.getElementById('screen-fight').appendChild(el);
    this._picker = el;
  }

  _ensureRunOver() {
    if (this._runOver) return;
    const el = document.createElement('div');
    el.className = 'tower-runover tt--hidden';
    el.innerHTML = `
      <div class="tro-box">
        <div class="tro-title">RUN TERMINADO</div>
        <div class="tro-floor"></div>
        <div class="tro-upgrades"></div>
        <button class="btn-primary tro-btn">Volver al menú</button>
      </div>
    `;
    el.querySelector('.tro-btn').addEventListener('click', () => {
      this.hideRunOver();
      this._onRunOverClose?.();
    });
    document.getElementById('screen-fight').appendChild(el);
    this._runOver = el;
  }

  _ensureStatsBar() {
    if (this._statsBar) return;
    const el = document.createElement('div');
    el.className = 'tower-stats-bar tt--hidden';
    // Insert after arena-container so it appears below the canvas
    const arena = document.getElementById('arena-container');
    arena.insertAdjacentElement('afterend', el);
    this._statsBar = el;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _plateContent(floor, enemyInfo, isBoss) {
  if (!enemyInfo) {
    return `
      <div class="tt-plate-floor">${floor === 0 ? 'Inicio' : `Piso ${floor}`}</div>
      <div class="tt-plate-status">${floor === 0 ? 'Torre Infinita' : '✓ Superado'}</div>
    `;
  }

  const color   = enemyInfo.color ?? '#e74c3c';
  const bossTag = isBoss ? `<span class="tt-boss-badge">JEFE</span>` : '';

  const countLine = enemyInfo.count > 1
    ? `<div class="tt-enemy-row"><span class="tt-label">Enemigos</span><span class="tt-val">${enemyInfo.count}</span></div>`
    : '';

  const descLine = isBoss && enemyInfo.bossDesc
    ? `<div class="tt-boss-desc">${enemyInfo.bossDesc}</div>`
    : '';

  // For normal floors, label and powerName are the same character name — show once
  const showPowerRow = isBoss && enemyInfo.powerName && enemyInfo.powerName !== enemyInfo.label;
  const powerRow = showPowerRow
    ? `<div class="tt-enemy-row"><span class="tt-label">Poder</span><span class="tt-val">${enemyInfo.powerName}</span></div>`
    : '';

  return `
    <div class="tt-plate-floor">${bossTag} Piso ${floor}</div>
    <div class="tt-enemy-card">
      <div class="tt-char-header">
        <span class="tt-char-dot" style="background:${color}"></span>
        <span class="tt-char-name" style="color:${color}">${enemyInfo.label}</span>
      </div>
      ${powerRow}
      ${countLine}
      <div class="tt-enemy-row">
        <span class="tt-label">HP</span>
        <span class="tt-val tt-val--hp">${Math.round(enemyInfo.hp)}${enemyInfo.count > 1 ? ' c/u' : ''}</span>
      </div>
      ${descLine}
    </div>
  `;
}
