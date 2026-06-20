/**
 * TowerUI — manages all DOM elements specific to the infinite tower mode.
 *
 * Creates its own overlay elements dynamically on first use so the HTML
 * stays clean. All elements are appended to #screen-fight so they sit
 * on top of the game canvas.
 *
 * Provides:
 *  - Floor banner (brief overlay before each fight)
 *  - Upgrade picker (shown after winning a floor)
 *  - Run-over screen (shown when the player loses)
 */
export class TowerUI {
  /**
   * @param {object} callbacks
   * @param {Function} callbacks.onUpgradeChosen — (upgrade) => void
   * @param {Function} callbacks.onRunOverClose  — () => void  (return to menu)
   */
  constructor({ onUpgradeChosen, onRunOverClose }) {
    this._onUpgradeChosen = onUpgradeChosen;
    this._onRunOverClose  = onRunOverClose;
    this._banner    = null;
    this._picker    = null;
    this._runOver   = null;
    this._bannerTimer = null;
  }

  // ── Floor banner ─────────────────────────────────────────────────────────

  /**
   * Show a brief overlay banner announcing the next floor.
   * @param {number} floor
   * @param {string|null} bossLine — extra text for boss floors
   * @param {Function} onDone — called after banner hides
   */
  showFloorBanner(floor, bossLine, onDone) {
    this._ensureBanner();
    const isBoss = !!bossLine;

    this._banner.querySelector('.tower-banner-floor').textContent =
      floor === 0 ? 'Torre Infinita' : `Piso ${floor}`;
    this._banner.querySelector('.tower-banner-sub').textContent =
      bossLine ?? (floor === 0 ? 'Prepárate para el combate' : '');

    this._banner.classList.toggle('tower-banner--boss', isBoss);
    this._banner.classList.remove('tower-banner--hide');
    this._banner.classList.add('tower-banner--show');

    if (this._bannerTimer) clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      this._banner.classList.remove('tower-banner--show');
      this._banner.classList.add('tower-banner--hide');
      if (onDone) onDone();
    }, 1600);
  }

  hideBanner() {
    if (!this._banner) return;
    this._banner.classList.remove('tower-banner--show');
    this._banner.classList.add('tower-banner--hide');
  }

  // ── Upgrade picker ────────────────────────────────────────────────────────

  /**
   * Show the upgrade choice screen.
   * @param {number}    floor    — just beaten floor (for display)
   * @param {Upgrade[]} upgrades — array of 3 upgrade objects
   */
  showUpgradePicker(floor, upgrades) {
    this._ensurePicker();
    this._picker.querySelector('.tower-picker-title').textContent =
      `¡Piso ${floor} superado!`;
    this._picker.querySelector('.tower-picker-sub').textContent =
      'Elegí una mejora para continuar';

    const list = this._picker.querySelector('.tower-picker-cards');
    list.innerHTML = '';

    for (const upg of upgrades) {
      const card = document.createElement('button');
      card.className = 'tower-upgrade-card';
      card.innerHTML = `
        <span class="tower-card-label">${upg.label}</span>
        <span class="tower-card-desc">${upg.description}</span>
      `;
      card.addEventListener('click', () => {
        this._onUpgradeChosen(upg);
      });
      list.appendChild(card);
    }

    this._picker.classList.remove('hidden');
  }

  hideUpgradePicker() {
    this._picker?.classList.add('hidden');
  }

  // ── Run over ──────────────────────────────────────────────────────────────

  /**
   * Show the end-of-run summary.
   * @param {number}   floor       — floor the player reached
   * @param {string[]} upgradeIds  — list of picked upgrade ids
   */
  showRunOver(floor, upgradeIds) {
    this._ensureRunOver();
    this._runOver.querySelector('.tower-runover-floor').textContent =
      `Llegaste al piso ${floor}`;
    this._runOver.querySelector('.tower-runover-upgrades').textContent =
      upgradeIds.length > 0
        ? `Mejoras elegidas: ${upgradeIds.length}`
        : 'Sin mejoras aplicadas';

    this._runOver.classList.remove('hidden');
  }

  hideRunOver() {
    this._runOver?.classList.add('hidden');
  }

  // ── Teardown ──────────────────────────────────────────────────────────────

  /** Hide everything — call when the tower mode ends. */
  reset() {
    this.hideBanner();
    this.hideUpgradePicker();
    this.hideRunOver();
  }

  // ── Private: lazy DOM builders ────────────────────────────────────────────

  _ensureBanner() {
    if (this._banner) return;
    this._banner = document.createElement('div');
    this._banner.className = 'tower-banner';
    this._banner.innerHTML = `
      <div class="tower-banner-content">
        <div class="tower-banner-floor"></div>
        <div class="tower-banner-sub"></div>
      </div>
    `;
    document.getElementById('screen-fight').appendChild(this._banner);
  }

  _ensurePicker() {
    if (this._picker) return;
    this._picker = document.createElement('div');
    this._picker.className = 'tower-upgrade-picker hidden';
    this._picker.innerHTML = `
      <div class="tower-picker-box">
        <div class="tower-picker-title"></div>
        <div class="tower-picker-sub"></div>
        <div class="tower-picker-cards"></div>
      </div>
    `;
    document.getElementById('screen-fight').appendChild(this._picker);
  }

  _ensureRunOver() {
    if (this._runOver) return;
    this._runOver = document.createElement('div');
    this._runOver.className = 'tower-runover hidden';
    this._runOver.innerHTML = `
      <div class="tower-runover-box">
        <div class="tower-runover-title">Run terminado</div>
        <div class="tower-runover-floor"></div>
        <div class="tower-runover-upgrades"></div>
        <button class="btn-primary tower-runover-btn">Volver al menú</button>
      </div>
    `;
    this._runOver.querySelector('.tower-runover-btn').addEventListener('click', () => {
      this.hideRunOver();
      if (this._onRunOverClose) this._onRunOverClose();
    });
    document.getElementById('screen-fight').appendChild(this._runOver);
  }
}
