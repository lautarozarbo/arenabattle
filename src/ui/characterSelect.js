import { getAllPowerMetas, POWER_CATEGORIES } from '../powers/registry.js';
import {
  ANIMATED_SKIN_IDS, getSkinsFor, getSelectedSkinIdx, setSelectedSkinIdx, drawCharPreview,
} from '../skins/index.js';
import { isSkinUnlocked } from '../persistence/rewards.js';
import { getFavorites, isFavorite, toggleFavorite, getStats } from '../persistence/stats.js';
import { getMasteryClaimedFor, getClaimableCount, claimMasteryMilestone, isEffectUnlocked, getEffectActive, setEffectActive } from '../persistence/rewards.js';
import { MASTERY_MILESTONES } from '../mastery/milestones.js';

const metas = getAllPowerMetas();

const _favRebuildHooks = [];
const _skinChangeHooks = [];

// ── Character grid ────────────────────────────────────────────────────────────
export function buildGrid(player, confirmBtnId) {
  const gridEl   = document.getElementById(`grid-${player}`);
  const searchEl = document.getElementById(`search-${player}`);
  let selectedId = metas[0]?.id ?? null;

  gridEl.innerHTML = "";

  const favHeader = document.createElement("div");
  favHeader.className = "grid-category grid-category--fav hidden";
  favHeader.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:-1px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Favoritos`;
  gridEl.appendChild(favHeader);

  const favSectionEl = document.createElement("div");
  favSectionEl.className = "grid-section hidden";
  gridEl.appendChild(favSectionEl);

  const categoryEls = {};
  const cellMap = {};

  function makeCell(meta) {
    const cell = document.createElement("div");
    cell.className = "grid-cell";
    cell.dataset.id = meta.id;
    cell.style.setProperty("--char-color", meta.color);
    if (isFavorite(meta.id)) cell.classList.add("fav");
    if (meta.id === selectedId) cell.classList.add("active");
    cell.innerHTML = `
      <span class="mastery-badge hidden" data-char="${meta.id}"></span>
      <div class="grid-peek">
        <div class="grid-circle" style="background:${meta.color}">${meta.icon}</div>
      </div>
      <div class="grid-name">${meta.name}</div>
    `;
    cell.addEventListener("click", () => {
      selectedId = meta.id;
      syncGrid();
      openCharModal(meta, () => {
        selectedId = meta.id;
        syncGrid();
        closeCharModal();
        document.getElementById(confirmBtnId)?.click();
      });
    });
    return cell;
  }

  for (const cat of POWER_CATEGORIES) {
    const catMetas = metas.filter(m => m.category === cat);
    if (!catMetas.length) continue;

    const header = document.createElement("div");
    header.className = "grid-category";
    header.dataset.category = cat;
    header.textContent = cat;
    gridEl.appendChild(header);
    categoryEls[cat] = header;

    const section = document.createElement("div");
    section.className = "grid-section";
    section.dataset.category = cat;
    gridEl.appendChild(section);

    for (const meta of catMetas) {
      const cell = makeCell(meta);
      section.appendChild(cell);
      cellMap[meta.id] = cell;
    }
  }

  let favCellMap = {};

  function rebuildFavSection() {
    const favIds = getFavorites();
    const hasFavs = favIds.length > 0;
    favHeader.classList.toggle("hidden", !hasFavs);
    favSectionEl.classList.toggle("hidden", !hasFavs);

    favSectionEl.innerHTML = "";
    favCellMap = {};
    for (const id of favIds) {
      const meta = metas.find(m => m.id === id);
      if (!meta) continue;
      const cell = makeCell(meta);
      favSectionEl.appendChild(cell);
      favCellMap[id] = cell;
    }

    for (const [id, cell] of Object.entries(cellMap)) {
      cell.classList.toggle("fav", favIds.includes(id));
    }
    syncGrid();
  }

  _favRebuildHooks.push(rebuildFavSection);
  rebuildFavSection();

  _skinChangeHooks.push(() => rebuildFavSection());

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      const q = searchEl.value.toLowerCase().trim();

      let anyFavVisible = false;
      for (const [id, cell] of Object.entries(favCellMap)) {
        const meta = metas.find(m => m.id === id);
        const hit = !q || !meta || meta.name.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q);
        cell.classList.toggle("hidden", !hit);
        if (hit) anyFavVisible = true;
      }
      const hasFavs = Object.keys(favCellMap).length > 0;
      favHeader.classList.toggle("hidden", !hasFavs || !anyFavVisible);
      favSectionEl.classList.toggle("hidden", !hasFavs || !anyFavVisible);

      for (const cat of POWER_CATEGORIES) {
        const catMetas = metas.filter(m => m.category === cat);
        let anyVisible = false;
        for (const meta of catMetas) {
          const cell = cellMap[meta.id];
          if (!cell) continue;
          const hit = !q || meta.name.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q);
          cell.classList.toggle("hidden", !hit);
          if (hit) anyVisible = true;
        }
        const header = categoryEls[cat];
        const section = gridEl.querySelector(`.grid-section[data-category="${cat}"]`);
        if (header) header.classList.toggle("hidden", !anyVisible);
        if (section) section.classList.toggle("hidden", !anyVisible);
      }
    });
  }

  function syncGrid() {
    for (const [id, cell] of Object.entries(cellMap)) {
      cell.classList.toggle("active", id === selectedId);
    }
    for (const [id, cell] of Object.entries(favCellMap)) {
      cell.classList.toggle("active", id === selectedId);
    }
  }

  function reset() {
    selectedId = metas[0]?.id ?? null;
    syncGrid();
    if (searchEl) {
      searchEl.value = "";
      for (const cell of Object.values(cellMap)) cell.classList.remove("hidden");
      for (const header of Object.values(categoryEls)) header.classList.remove("hidden");
      gridEl.querySelectorAll(".grid-section[data-category]").forEach(s => s.classList.remove("hidden"));
      gridEl.querySelectorAll(".grid-category[data-category]").forEach(s => s.classList.remove("hidden"));
      rebuildFavSection();
    }
    gridEl.scrollTop = 0;
  }

  syncGrid();
  return { getSelected: () => metas.find(m => m.id === selectedId) ?? metas[0], reset };
}

export function refreshMasteryBadges() {
  const stats = getStats();
  document.querySelectorAll('.mastery-badge[data-char]').forEach(badge => {
    const charId = badge.dataset.char;
    const games  = stats.charUses[charId] ?? 0;
    const count  = getClaimableCount(charId, games);
    badge.classList.toggle('hidden', count === 0);
  });
}

// ── Character info modal ──────────────────────────────────────────────────────
let _modalSelectCb = null;
let _modalMeta     = null;
let _modalSkinIdx  = 0;
let _previewAnimId = null;
let _modalTab      = 'info';

function _stopPreviewAnim() {
  if (_previewAnimId !== null) {
    cancelAnimationFrame(_previewAnimId);
    _previewAnimId = null;
  }
}

function _startPreviewAnim(canvas, meta, skinId) {
  _stopPreviewAnim();
  function loop() {
    drawCharPreview(canvas, meta, skinId);
    _previewAnimId = requestAnimationFrame(loop);
  }
  _previewAnimId = requestAnimationFrame(loop);
}

function _syncModalFavBtn() {
  if (!_modalMeta) return;
  const fav = isFavorite(_modalMeta.id);
  const btn = document.getElementById("char-modal-fav");
  if (!btn) return;
  btn.classList.toggle("fav-active", fav);
  btn.querySelector('svg')?.setAttribute('fill', fav ? 'currentColor' : 'none');
}

function _renderModalCircle() {
  if (!_modalMeta) return;
  const skins      = getSkinsFor(_modalMeta.id);
  const skin       = skins ? skins[_modalSkinIdx] : null;
  const skinId     = skin?.id ?? 'default';
  const color      = skin?.color ?? _modalMeta.color;
  const labelColor = skin?.labelColor ?? color;
  const canvas     = document.getElementById("char-modal-circle");
  _stopPreviewAnim();
  if (ANIMATED_SKIN_IDS.has(skinId)) {
    _startPreviewAnim(canvas, _modalMeta, skinId);
  } else {
    drawCharPreview(canvas, _modalMeta, skinId);
  }
  document.getElementById("char-modal").style.setProperty("--modal-color", labelColor);
  document.getElementById("char-modal-stats").innerHTML = _modalMeta.category
    ? `<span class="char-modal-category" style="color:${labelColor}">${_modalMeta.category}</span>`
    : "";
}

function _syncModalSkin() {
  if (!_modalMeta) return;
  const skins   = getSkinsFor(_modalMeta.id);
  if (!skins) return;
  const skin      = skins[_modalSkinIdx];
  const nameEl    = document.getElementById("char-modal-skin-name");
  const lockEl    = document.getElementById("char-modal-skin-lock");
  const selectBtn = document.getElementById("char-modal-select");
  _renderModalCircle();
  nameEl.textContent = skin.name;
  document.getElementById("char-modal-skin-prev").disabled = false;
  document.getElementById("char-modal-skin-next").disabled = false;
  const locked = !isSkinUnlocked(_modalMeta.id, skin.id);
  lockEl.classList.toggle('lock-invisible', !locked);
  selectBtn.disabled = locked;
}

function _switchModalTab(tab) {
  _modalTab = tab;
  document.querySelectorAll('.char-modal-tab').forEach(btn => {
    btn.classList.toggle('char-modal-tab--active', btn.dataset.tab === tab);
  });
  document.getElementById('char-modal-panel-info').classList.toggle('hidden', tab !== 'info');
  const masteryPanel = document.getElementById('char-modal-panel-mastery');
  masteryPanel.classList.toggle('hidden', tab !== 'mastery');
  if (tab === 'mastery' && _modalMeta) {
    _renderMasteryContent(_modalMeta);
    masteryPanel.scrollTop = 0;
  }
}

function _updateCharStats(meta) {
  const el = document.getElementById('char-modal-char-stats');
  if (!el) return;
  const stats   = getStats();
  const games   = stats.charUses[meta.id] ?? 0;
  const claimed = getMasteryClaimedFor(meta.id);
  const next    = MASTERY_MILESTONES.find(m => !claimed.has(m.games));
  const pct     = next ? Math.min(100, Math.round((games / next.games) * 100)) : 100;

  el.innerHTML = next
    ? `<div class="cmc-row">
         <span class="cmc-label">Partidas con ${meta.name}</span>
         <span class="cmc-val">${games}</span>
       </div>
       <div class="cmc-bar"><div class="cmc-bar-fill" style="width:${pct}%"></div></div>
       <div class="cmc-next">Próxima recompensa: <b>${next.games}</b> partidas</div>`
    : `<div class="cmc-done-block">
         <div class="cmc-next cmc-next--done">Maestría completada</div>
         <div class="cmc-label">${games} partidas con ${meta.name}</div>
       </div>`;
}

function _updateEffectRow(meta) {
  const row = document.getElementById('char-modal-effect-row');
  const btn = document.getElementById('char-modal-effect-toggle');
  if (!row || !btn) return;
  const unlocked = isEffectUnlocked(meta.id);
  row.classList.toggle('hidden', !unlocked);
  if (!unlocked) return;
  const active = getEffectActive(meta.id);
  btn.textContent = active ? 'ON' : 'OFF';
  btn.classList.toggle('mastery-effect-toggle--on', active);
}

function _updateMasteryDot(meta) {
  const dot   = document.getElementById('char-modal-mastery-dot');
  if (!dot) return;
  const stats = getStats();
  const games = stats.charUses[meta.id] ?? 0;
  const count = getClaimableCount(meta.id, games);
  dot.classList.toggle('hidden', count === 0);
}

function _renderMasteryContent(meta) {
  const content = document.getElementById('char-modal-mastery-content');
  if (!content) return;
  const stats   = getStats();
  const games   = stats.charUses[meta.id] ?? 0;
  const claimed = getMasteryClaimedFor(meta.id);

  const milestonesHtml = MASTERY_MILESTONES.map(m => {
    const isClaimed = claimed.has(m.games);
    const isReady   = !isClaimed && games >= m.games;
    const pct       = Math.min(100, Math.round((games / m.games) * 100));
    const rewardTxt = m.effect
      ? 'Efecto especial'
      : `${m.xp} XP${m.chests ? ` · ${m.chests} cofre${m.chests > 1 ? 's' : ''}` : ''}`;
    const stateClass = isClaimed ? 'mastery-ms--claimed' : isReady ? 'mastery-ms--ready' : 'mastery-ms--locked';
    const iconHtml   = isClaimed ? '<span class="mastery-ms-check">✓</span>' : isReady ? '🎁' : `${m.games}`;
    const actionHtml = isClaimed
      ? `<span class="mastery-ms-done">Reclamado</span>`
      : isReady
        ? `<button class="mastery-claim-btn" data-games="${m.games}">Reclamar</button>`
        : `<span class="mastery-ms-frac">${games}/${m.games}</span>`;

    return `<div class="mastery-ms ${stateClass}">
      <div class="mastery-ms-icon">${iconHtml}</div>
      <div class="mastery-ms-body">
        <div class="mastery-ms-title">${m.games} partidas</div>
        <div class="mastery-ms-reward">${rewardTxt}</div>
        ${!isClaimed && !isReady ? `<div class="mastery-ms-bar"><div class="mastery-ms-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>
      <div class="mastery-ms-action">${actionHtml}</div>
    </div>`;
  }).join('');


  content.innerHTML = `
    <div class="mastery-header">
      <span class="mastery-games-val">${games}</span>
      <span class="mastery-games-lbl">partidas</span>
    </div>
    <div class="mastery-path">${milestonesHtml}</div>
  `;

  content.querySelectorAll('.mastery-claim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const g = parseInt(btn.dataset.games);
      const result = claimMasteryMilestone(meta.id, g);
      if (!result) return;
      document.dispatchEvent(new CustomEvent('mastery:claimed', { detail: result }));
      _renderMasteryContent(meta);
      _updateMasteryDot(meta);
      _updateEffectRow(meta);
      refreshMasteryBadges();
    });
  });

}

export function openCharModal(meta, onSelect) {
  _modalMeta     = meta;
  _modalSelectCb = onSelect;
  const overlay = document.getElementById("char-modal");
  overlay.classList.remove("modal-closing", "hidden");

  _switchModalTab('info');

  const skins = getSkinsFor(meta.id);
  _modalSkinIdx = getSelectedSkinIdx(meta.id);
  document.getElementById("char-modal-skin-selector")
    .classList.toggle("hidden", !skins || skins.length <= 1);

  document.getElementById("char-modal-name").textContent = meta.name;
  document.getElementById("char-modal-desc").textContent = meta.description;
  document.getElementById("char-modal-select").disabled  = false;
  _renderModalCircle();
  if (skins) _syncModalSkin();
  _syncModalFavBtn();
  _updateMasteryDot(meta);
  _updateEffectRow(meta);
  _updateCharStats(meta);
}

export function closeCharModal() {
  _stopPreviewAnim();
  _modalSelectCb = null;
  _modalMeta     = null;
  const overlay = document.getElementById("char-modal");
  const box     = document.getElementById("char-modal-box");
  overlay.classList.add("modal-closing");
  box.addEventListener("animationend", () => {
    overlay.classList.remove("modal-closing");
    overlay.classList.add("hidden");
  }, { once: true });
}

export function notifySkinChange(charId) {
  _skinChangeHooks.forEach(fn => fn(charId));
}

export function syncModalSkinIfOpen(charId) {
  if (_modalMeta?.id === charId) _syncModalSkin();
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.querySelectorAll('.char-modal-tab').forEach(btn => {
  btn.addEventListener('click', () => _switchModalTab(btn.dataset.tab));
});

document.getElementById('char-modal-effect-toggle')?.addEventListener('click', () => {
  if (!_modalMeta) return;
  setEffectActive(_modalMeta.id, !getEffectActive(_modalMeta.id));
  _updateEffectRow(_modalMeta);
});

document.getElementById("char-modal-fav")?.addEventListener("click", () => {
  if (!_modalMeta) return;
  toggleFavorite(_modalMeta.id);
  _syncModalFavBtn();
  _favRebuildHooks.forEach(fn => fn());
});

document.getElementById("char-modal-close").addEventListener("click", closeCharModal);
document.getElementById("char-modal").addEventListener("click", e => {
  if (e.target === e.currentTarget) closeCharModal();
});
document.getElementById("char-modal-skin-prev").addEventListener("click", () => {
  if (!_modalMeta) return;
  const skins = getSkinsFor(_modalMeta.id);
  if (!skins) return;
  _modalSkinIdx = (_modalSkinIdx - 1 + skins.length) % skins.length;
  _syncModalSkin();
});
document.getElementById("char-modal-skin-next").addEventListener("click", () => {
  if (!_modalMeta) return;
  const skins = getSkinsFor(_modalMeta.id);
  if (!skins) return;
  _modalSkinIdx = (_modalSkinIdx + 1) % skins.length;
  _syncModalSkin();
});
document.getElementById("char-modal-select").addEventListener("click", () => {
  if (_modalMeta && getSkinsFor(_modalMeta.id)) {
    setSelectedSkinIdx(_modalMeta.id, _modalSkinIdx);
    _skinChangeHooks.forEach(fn => fn(_modalMeta.id));
  }
  if (_modalSelectCb) _modalSelectCb();
});
