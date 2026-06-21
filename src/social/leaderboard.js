import { supabase } from '../supabase.js';
import { openUserProfile } from './userProfile.js';
import { badgeNameHtml } from '../ui/badge.js';

export async function openLeaderboard() {
  const modal = document.getElementById('leaderboard-modal');
  const body  = document.getElementById('leaderboard-body');
  modal.classList.remove('hidden');
  body.innerHTML = '<tr><td colspan="4" class="lb-loading">Cargando...</td></tr>';

  try {
    const [{ data: statsData, error: statsErr }, { data: profilesData, error: profErr }] = await Promise.all([
      supabase.from('user_stats').select('user_id, wins, losses, draws, missions_progress'),
      supabase.from('profiles').select('user_id, username'),
    ]);

    if (statsErr || profErr || !statsData?.length) {
      body.innerHTML = '<tr><td colspan="4" class="lb-loading">Sin datos todavía.</td></tr>';
      return;
    }

    const usernameMap = Object.fromEntries((profilesData ?? []).map(p => [p.user_id, p.username]));

    const rows = statsData
      .map(s => {
        const total_wins   = Object.values(s.wins   ?? {}).reduce((a, b) => a + b, 0);
        const total_losses = Object.values(s.losses ?? {}).reduce((a, b) => a + b, 0);
        const total_draws  = Object.values(s.draws  ?? {}).reduce((a, b) => a + b, 0);
        return { user_id: s.user_id, username: usernameMap[s.user_id] ?? 'Usuario', total_wins, total_losses, total_draws, activeBadge: s.missions_progress?.activeBadge ?? null };
      })
      .filter(r => r.total_wins + r.total_losses + r.total_draws > 0)
      .sort((a, b) => b.total_wins - a.total_wins)
      .slice(0, 50);

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4" class="lb-loading">Sin datos todavía.</td></tr>';
      return;
    }

    const { data: me } = await supabase.auth.getUser();
    const myId = me.user?.id ?? null;

    body.innerHTML = rows.map((row, i) => {
      const total   = row.total_wins + row.total_losses + row.total_draws;
      const winRate = total > 0 ? Math.round((row.total_wins / total) * 100) : 0;
      const isMe    = myId && row.user_id === myId;
      const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      return `<tr class="lb-row${isMe ? ' lb-row--me' : ''}" data-userid="${row.user_id}">
        <td class="lb-rank">${medal}</td>
        <td class="lb-name lb-name--link">${badgeNameHtml(row.username, row.activeBadge)}</td>
        <td class="lb-wins">${row.total_wins}</td>
        <td class="lb-rate">${winRate}%</td>
      </tr>`;
    }).join('');

    body.querySelectorAll('tr[data-userid]').forEach(row => {
      row.addEventListener('click', () => openUserProfile(row.dataset.userid));
    });

  } catch (e) {
    console.error('[leaderboard] fetch error:', e);
    body.innerHTML = `<tr><td colspan="4" class="lb-loading">Error al cargar.</td></tr>`;
  }
}

function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
