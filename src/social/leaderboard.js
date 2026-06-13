import { supabase } from '../supabase.js';
import { openUserProfile } from './userProfile.js';

export async function openLeaderboard() {
  const modal = document.getElementById('leaderboard-modal');
  const body  = document.getElementById('leaderboard-body');
  modal.classList.remove('hidden');
  body.innerHTML = '<tr><td colspan="4" class="lb-loading">Cargando...</td></tr>';

  let data, error;
  try {
    ({ data, error } = await supabase
      .from('leaderboard')
      .select('user_id, username, total_wins, total_losses, total_draws')
      .limit(50));
  } catch (e) {
    console.error('[leaderboard] fetch error:', e);
    body.innerHTML = `<tr><td colspan="4" class="lb-loading">Error: ${e.message}</td></tr>`;
    return;
  }

  if (error || !data?.length) {
    console.warn('[leaderboard] error or empty:', error);
    body.innerHTML = '<tr><td colspan="4" class="lb-loading">Sin datos todavía.</td></tr>';
    return;
  }

  const { data: me } = await supabase.auth.getUser();
  const myId = me.user?.id ?? null;

  body.innerHTML = data.map((row, i) => {
    const total   = row.total_wins + row.total_losses + row.total_draws;
    const winRate = total > 0 ? Math.round((row.total_wins / total) * 100) : 0;
    const isMe    = myId && row.user_id === myId;
    const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
    return `<tr class="lb-row${isMe ? ' lb-row--me' : ''}" data-userid="${row.user_id}">
      <td class="lb-rank">${medal}</td>
      <td class="lb-name lb-name--link">${_esc(row.username)}</td>
      <td class="lb-wins">${row.total_wins}</td>
      <td class="lb-rate">${winRate}%</td>
    </tr>`;
  }).join('');

  body.querySelectorAll('tr[data-userid]').forEach(row => {
    row.addEventListener('click', () => {
      openUserProfile(row.dataset.userid);
    });
  });
}

function _esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
