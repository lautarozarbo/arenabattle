import { drawArenaBg, drawArenaObstacle } from '../../skins/arenaSkins.js';

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

    const isBoss = enemyInfo?.isBoss ?? false;
    plateNew.innerHTML = _plateContent(toFloor, enemyInfo, isBoss);

    const cvs = plateNew.querySelector('.tt-arena-cvs');
    if (cvs && enemyInfo) _renderArenaPreview(cvs, enemyInfo.arenaSkinId ?? 'default', enemyInfo.arenaObstacles ?? []);

    el.classList.remove('tt--hidden');
    el.querySelector('.tt-tap-hint').classList.add('tt-tap-hint--hidden');
    _spawnParticles(el, enemyInfo?.color ?? '#ffffff');

    let autoTimer;
    const advance = () => {
      el.removeEventListener('click', advance);
      clearTimeout(autoTimer);
      el.classList.add('tt--hidden');
      onComplete();
    };

    if (fromFloor === 0) {
      plateOld.innerHTML = '';
      shaft.classList.remove('tt-animate');
      shaft.style.transform = 'translateY(0)'; // show new plate directly, no animation
      el.addEventListener('click', advance, { once: true });
      autoTimer = setTimeout(advance, 3000);
      setTimeout(() => el.querySelector('.tt-tap-hint').classList.remove('tt-tap-hint--hidden'), 400);
      return;
    }

    plateOld.innerHTML = _plateContent(fromFloor, null, false);
    shaft.style.transform = ''; // restore CSS default -50% (shows old plate first)
    shaft.classList.remove('tt-animate');
    void shaft.offsetWidth;
    setTimeout(() => shaft.classList.add('tt-animate'), 180);

    const ANIM_MS = 1100;
    setTimeout(() => {
      el.querySelector('.tt-tap-hint').classList.remove('tt-tap-hint--hidden');
    }, ANIM_MS + 200);

    el.addEventListener('click', advance, { once: true });
    autoTimer = setTimeout(advance, ANIM_MS + 2400);
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
      if (upg.color) {
        card.style.borderColor = upg.color + '55';
        card.style.setProperty('--upg-color', upg.color);
      }
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
    this._picker.querySelectorAll('.tp-card').forEach(c => {
      c.disabled = true;
      if (c !== cardEl) c.classList.add('tp-card--dim');
    });
    cardEl.classList.add('tp-card--chosen');

    setTimeout(() => {
      this._picker.classList.add('tt--hidden');
      this._onUpgradeChosen(upg);
    }, 120);
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
    if (mods.dmgAdd        > 0)  chips.push({ label: `+${mods.dmgAdd} daño poder`,                              color: '#a78bfa' });
    if (mods.speedMult     > 1)  chips.push({ label: `Vel +${Math.round((mods.speedMult - 1) * 100)}%`,         color: '#22d3ee' });
    if (mods.regenPerSec   > 0)  chips.push({ label: `Regen +${mods.regenPerSec} HP/s`,                        color: '#f472b6' });
    if (mods.contactDmgAdd > 0)  chips.push({ label: `+${mods.contactDmgAdd} choque`,                          color: '#fb923c' });
    if (mods.bleedPerSec   > 0)  chips.push({ label: `Sangrado ${+mods.bleedPerSec.toFixed(1)}/s`,             color: '#ef4444' });
    if (mods.contactSlow   > 0)  chips.push({ label: `Lentitud ${Math.round(mods.contactSlow * 100)}%`,        color: '#818cf8' });
    if (mods.hpBonus       > 0)  chips.push({ label: `+${mods.hpBonus} HP`,                                    color: '#f87171' });
    if (pmods.cdMult       < 1)  chips.push({ label: `CD -${Math.round((1 - pmods.cdMult) * 100)}%`,           color: '#60a5fa' });
    if (pmods.extraProjectile > 0) chips.push({ label: `+${pmods.extraProjectile} proyectil`,                  color: '#facc15' });
    if (pmods.extraPlacement  > 0) chips.push({ label: `+${pmods.extraPlacement} elemento`,                    color: '#4ade80' });
    if (pmods.zoneDurationMult > 1) chips.push({ label: `Zona +${Math.round((pmods.zoneDurationMult - 1) * 100)}%`, color: '#2dd4bf' });

    if (chips.length === 0) {
      bar.classList.add('tt--hidden');
      return;
    }

    bar.innerHTML = chips.map(c =>
      `<span class="tsb-chip" style="color:${c.color};border-color:${c.color}33;background:${c.color}18">${c.label}</span>`
    ).join('');
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
    this._transition = document.querySelector('#screen-fight .tower-transition');
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
    this._picker = document.querySelector('#screen-fight .tower-picker');
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
    // Reuse existing element but replace button to rebind handler for this instance
    const existing = document.querySelector('#screen-fight .tower-runover');
    if (existing) {
      const oldBtn = existing.querySelector('.tro-btn');
      const newBtn = oldBtn.cloneNode(true);
      oldBtn.replaceWith(newBtn);
      newBtn.addEventListener('click', () => { this.hideRunOver(); this._onRunOverClose?.(); });
      this._runOver = existing;
      return;
    }
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
    this._statsBar = document.querySelector('.tower-stats-bar');
    if (this._statsBar) return;
    const el = document.createElement('div');
    el.className = 'tower-stats-bar tt--hidden';
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

  return `
    <div class="tt-plate-header">
      <div class="tt-floor-label">PISO</div>
      <div class="tt-floor-num">${floor}</div>
      ${bossTag}
    </div>

    <canvas class="tt-arena-cvs" width="140" height="140"></canvas>

    <div class="tt-arena-label">
      ${enemyInfo.arenaName ?? ''}${enemyInfo.arenaSkin ? ` · ${enemyInfo.arenaSkin}` : ''}
    </div>

    <div class="tt-divider"></div>

    <div class="tt-enemy-card">
      <div class="tt-char-header">
        <span class="tt-char-dot" style="background:${color};box-shadow:0 0 10px ${color}bb"></span>
        <span class="tt-char-name" style="color:${color};text-shadow:0 0 20px ${color}66">${enemyInfo.label}</span>
      </div>
      <div class="tt-stat-row">
        <span class="tt-stat-label">HP</span>
        <span class="tt-stat-val tt-val--hp">${Math.round(enemyInfo.hp)}</span>
      </div>
    </div>
  `;
}

function _spawnParticles(container, color) {
  container.querySelectorAll('.tt-spark').forEach(p => p.remove());
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'tt-spark';
    const size  = (2 + Math.random() * 3).toFixed(1);
    const op    = (0.25 + Math.random() * 0.55).toFixed(2);
    const drift = ((Math.random() - 0.5) * 70).toFixed(1);
    p.style.cssText = [
      `left:${(Math.random() * 100).toFixed(1)}%`,
      `width:${size}px`, `height:${size}px`,
      `background:${Math.random() > 0.4 ? color : '#ffffff'}`,
      `animation-delay:${(Math.random() * 4).toFixed(2)}s`,
      `animation-duration:${(3 + Math.random() * 4).toFixed(2)}s`,
    ].join(';');
    p.style.setProperty('--start-op', op);
    p.style.setProperty('--drift', `${drift}px`);
    container.appendChild(p);
  }
}

function _renderArenaPreview(cvs, skinId, obstacles) {
  const ctx = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;
  const pad = 5;
  ctx.clearRect(0, 0, W, H);
  drawArenaBg(ctx, pad, pad, W - pad * 2, H - pad * 2, skinId);
  for (const o of obstacles) {
    drawArenaObstacle(
      ctx,
      pad + o.x * (W - pad * 2),
      pad + o.y * (H - pad * 2),
      o.r * Math.min(W - pad * 2, H - pad * 2),
      skinId,
    );
  }
}
