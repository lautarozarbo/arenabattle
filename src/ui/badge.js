import { BADGES } from '../missions/definitions.js';

/**
 * Wraps an element's text in a badge span if badgeId is set.
 * el: the element whose textContent / innerHTML to wrap
 * badgeId: e.g. 'badge_oro' or null for no badge
 */
export function applyBadgeToElement(el, badgeId) {
  if (!el) return;
  const text = el.dataset.rawName ?? el.textContent;
  el.dataset.rawName = text;
  if (!badgeId || !BADGES[badgeId]) {
    el.innerHTML = _esc(text);
    el.className = el.className.replace(/\bbadge-wrap\b/g, '').trim();
    return;
  }
  const cls = BADGES[badgeId].cssClass;
  el.classList.add('badge-wrap');
  el.innerHTML = `<span class="badge-name ${cls}">${_esc(text)}</span>`;
}

/**
 * Returns HTML string for a username with optional badge.
 * Used in leaderboard and public profile where we render HTML directly.
 */
export function badgeNameHtml(username, badgeId) {
  const escaped = _esc(username);
  if (!badgeId || !BADGES[badgeId]) return escaped;
  const cls = BADGES[badgeId].cssClass;
  return `<span class="badge-wrap"><span class="badge-name ${cls}">${escaped}</span></span>`;
}

function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
