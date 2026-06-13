import { supabase } from './supabase.js';

export async function openLeaderboard() {
  const modal = document.getElementById('leaderboard-modal');
  const body  = document.getElementById('leaderboard-body');
  modal.classList.remove('hidden');
  body.innerHTML = '<tr><td colspan="5" class="lb-loading">Cargando...</td></tr>';

  const { data, error } = await supabase
    .from('leaderboard')
    .select('username, total_wins, total_losses, total_draws, total_championships')
    .limit(50);

  if (error || !data?.length) {
    body.innerHTML = '<tr><td colspan="5" class="lb-loading">Sin datos todavía.</td></tr>';
    return;
  }

  const { data: me } = await supabase.auth.getUser();
  const myId = me.user?.id ?? null;
  const { data: myProfile } = myId
    ? await supabase.from('profiles').select('username').eq('user_id', myId).single()
    : { data: null };

  body.innerHTML = data.map((row, i) => {
    const total   = row.total_wins + row.total_losses + row.total_draws;
    const winRate = total > 0 ? Math.round((row.total_wins / total) * 100) : 0;
    const isMe    = myProfile && row.username === myProfile.username;
    const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
    return `<tr class="${isMe ? 'lb-row--me' : ''}">
      <td class="lb-rank">${medal}</td>
      <td class="lb-name">${_esc(row.username)}</td>
      <td class="lb-wins">${row.total_wins}</td>
      <td class="lb-rate">${winRate}%</td>
    </tr>`;
  }).join('');
}

function _esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
