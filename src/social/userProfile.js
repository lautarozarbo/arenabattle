import { supabase } from '../supabase.js';
import { getAllPowerMetas } from '../powers/registry.js';
import { refreshFriendsBadge } from './friends.js';
import { loadComments, renderCommentsSection, wireComments, clearProfileCommentsBadge } from './profileComments.js';
import { showConfirm } from '../ui/confirmDialog.js';
import { badgeNameHtml } from '../ui/badge.js';

export async function openUserProfile(userId) {
  const modal   = document.getElementById('user-profile-modal');
  const content = document.getElementById('user-profile-content');
  modal.classList.remove('hidden');
  content.innerHTML = '<div class="up-loading">Cargando...</div>';

  const [{ data: profile }, { data: stats }, { data: sessionData }] = await Promise.all([
    supabase.from('profiles').select('username, last_seen').eq('user_id', userId).single(),
    supabase.from('user_stats').select('*').eq('user_id', userId).single(),
    supabase.auth.getSession(),
  ]);

  const myId = sessionData.session?.user?.id ?? null;

  if (!profile) {
    content.innerHTML = '<div class="up-loading">Perfil no encontrado.</div>';
    return;
  }

  const rel  = myId && myId !== userId ? await _getRelationship(myId, userId) : null;

  const s    = stats ?? {};
  const wins   = s.wins          ?? { quick1v1: 0, quick2v2: 0, league: 0, tournament: 0 };
  const losses = s.losses        ?? { quick1v1: 0, quick2v2: 0, league: 0, tournament: 0 };
  const draws  = s.draws         ?? { quick1v1: 0, quick2v2: 0, league: 0, tournament: 0 };
  const champs = s.championships ?? { league: 0, tournament: 0 };
  const charUses = s.char_uses   ?? {};
  const towerFloor = s.tower_max_floor ?? 0;
  const towerChar  = s.tower_best_char ?? null;

  const totalW = Object.values(wins).reduce((a, b) => a + b, 0);
  const totalL = Object.values(losses).reduce((a, b) => a + b, 0);
  const totalD = Object.values(draws).reduce((a, b) => a + b, 0);
  const totalG = totalW + totalL + totalD;
  const winRate = totalG > 0 ? Math.round((totalW / totalG) * 100) : 0;

  const metas = getAllPowerMetas();
  let bestId = null, bestCount = 0;
  for (const [id, count] of Object.entries(charUses)) {
    if (count > bestCount) { bestCount = count; bestId = id; }
  }
  const mostUsed = bestId ? metas.find(m => m.id === bestId) ?? null : null;

  const avatarColor = mostUsed?.color ?? _usernameColor(profile.username);
  const avatarIcon  = mostUsed ? mostUsed.icon : (profile.username[0]?.toUpperCase() ?? '?');

  const modeList = [
    { lbl: '1 vs 1',  val: wins.quick1v1    },
    { lbl: '2 vs 2',  val: wins.quick2v2    },
    { lbl: 'Liga',    val: wins.league      },
    { lbl: 'Torneo',  val: wins.tournament  },
  ];
  const maxMW = Math.max(...modeList.map(m => m.val), 1);
  const modeBarsHtml = modeList.map(m => {
    const pct = Math.round((m.val / maxMW) * 100);
    return `<div class="up-mode-row">
      <span class="up-mode-lbl">${m.lbl}</span>
      <div class="up-mode-track"><div class="up-mode-fill" style="width:${pct}%"></div></div>
      <span class="up-mode-num">${m.val}</span>
    </div>`;
  }).join('');

  const charCardHtml = mostUsed
    ? `<div class="up-char-card">
        <div class="up-char-circle" style="background:${mostUsed.color}28">${mostUsed.icon}</div>
        <div class="up-char-info">
          <span class="up-char-name" style="color:${mostUsed.color}">${mostUsed.name}</span>
          <span class="up-char-sub">${bestCount} partida${bestCount !== 1 ? 's' : ''}</span>
        </div>
      </div>`
    : `<div class="up-char-card"><span class="up-char-empty">Sin partidas registradas</span></div>`;

  const tMeta = towerChar
    ? (metas.find(m => m.id === towerChar) ?? metas.find(m => m.name === towerChar) ?? null)
    : null;
  const towerCardHtml = `<div class="up-tower-card">
    <span class="up-tower-hd">Torre Infinita</span>
    <span class="up-tower-floor">${towerFloor > 0 ? towerFloor : '—'}</span>
    ${tMeta ? `<div class="up-tower-char-row">
      <div class="up-tower-dot" style="background:${tMeta.color}28;color:${tMeta.color}">${tMeta.icon}</div>
      <span class="up-tower-char-name" style="color:${tMeta.color}">${tMeta.name}</span>
    </div>` : ''}
  </div>`;

  const comments = await loadComments(userId);
  const lastSeenHtml = _formatLastSeen(profile.last_seen);
  const friendBtnHtml = _renderFriendBtn(rel, myId, userId);

  content.innerHTML = `
    <div class="up-hero">
      <div class="up-avatar" style="background:${avatarColor}22;border-color:${avatarColor}55;color:${avatarColor}">${avatarIcon}</div>
      <div class="up-username">${badgeNameHtml(profile.username, stats?.missions_progress?.activeBadge ?? null)}</div>
      ${lastSeenHtml ? `<div class="up-last-seen">${lastSeenHtml}</div>` : ''}
    </div>
    ${friendBtnHtml}

    <div class="up-stat-row">
      <div class="up-pill"><span class="up-pill-val">${totalG}</span><span class="up-pill-lbl">Partidas</span></div>
      <div class="up-pill up-pill--win"><span class="up-pill-val">${totalW}</span><span class="up-pill-lbl">Victorias</span></div>
      <div class="up-pill up-pill--loss"><span class="up-pill-val">${totalL}</span><span class="up-pill-lbl">Derrotas</span></div>
    </div>
    <div class="up-winrate-wrap">
      <div class="up-winrate-track"><div class="up-winrate-fill" style="width:${winRate}%"></div></div>
      <span class="up-winrate-label">${winRate}% win rate · ${totalD} empate${totalD !== 1 ? 's' : ''}</span>
    </div>

    <div class="up-section">
      <div class="up-section-hd">Victorias por modo</div>
      <div class="up-mode-bars">${modeBarsHtml}</div>
    </div>

    <div class="up-section">
      <div class="up-section-hd">Personaje favorito</div>
      ${charCardHtml}
    </div>

    <div class="up-bottom-row">
      ${towerCardHtml}
      <div class="up-champs-card">
        <div class="up-champ-item up-champ-item--liga">
          <span class="up-champ-n">${champs.league}</span>
          <span class="up-champ-lbl">Ligas ganadas</span>
        </div>
        <div class="up-champ-item up-champ-item--torneo">
          <span class="up-champ-n">${champs.tournament}</span>
          <span class="up-champ-lbl">Torneos ganados</span>
        </div>
      </div>
    </div>

    ${renderCommentsSection(comments, myId, userId)}
  `;

  _wireFriendButtons(rel, myId, userId, content);
  wireComments(content, userId, myId);
  if (myId && userId === myId) clearProfileCommentsBadge();
}

async function _getRelationship(myId, theirId) {
  const { data } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(requester_id.eq.${myId},addressee_id.eq.${theirId}),and(requester_id.eq.${theirId},addressee_id.eq.${myId})`)
    .maybeSingle();
  return data ?? null;
}

function _renderFriendBtn(rel, myId, theirId) {
  if (!myId || myId === theirId) return '';
  if (!rel) {
    return `<button class="up-friend-btn up-friend-btn--add" id="up-friend-add">+ Agregar amigo</button>`;
  }
  if (rel.status === 'accepted') {
    return `<div class="up-friend-status-bar">
      <span class="up-friend-status-label">✓ Amigos</span>
      <button class="up-friend-remove-link" id="up-friend-remove">Eliminar</button>
    </div>`;
  }
  if (rel.status === 'pending' && rel.requester_id === myId) {
    return `<button class="up-friend-btn up-friend-btn--pending" id="up-friend-cancel">Solicitud enviada · Cancelar</button>`;
  }
  if (rel.status === 'pending' && rel.addressee_id === myId) {
    return `<div class="up-friend-row">
      <button class="up-friend-btn up-friend-btn--add" id="up-friend-accept">Aceptar solicitud</button>
      <button class="up-friend-btn up-friend-btn--ghost" id="up-friend-reject">Rechazar</button>
    </div>`;
  }
  return '';
}

function _wireFriendButtons(rel, myId, theirId, content) {
  const add     = content.querySelector('#up-friend-add');
  const remove  = content.querySelector('#up-friend-remove');
  const cancel  = content.querySelector('#up-friend-cancel');
  const accept  = content.querySelector('#up-friend-accept');
  const reject  = content.querySelector('#up-friend-reject');

  if (add) {
    add.addEventListener('click', async () => {
      add.disabled = true;
      add.textContent = 'Enviando...';
      const { error } = await supabase.from('friendships').insert({
        requester_id: myId,
        addressee_id: theirId,
        status: 'pending',
      });
      if (error) { add.textContent = 'Error'; add.disabled = false; return; }
      add.textContent = 'Solicitud enviada';
      add.classList.remove('up-friend-btn--add');
      add.classList.add('up-friend-btn--pending');
    });
  }

  if (remove) {
    remove.addEventListener('click', async () => {
      if (!await showConfirm('¿Eliminar a este amigo?')) return;
      remove.disabled = true;
      remove.textContent = '...';
      await supabase.from('friendships').delete().eq('id', rel.id);
      remove.closest('.up-friend-status-bar').outerHTML =
        `<button class="up-friend-btn up-friend-btn--add" id="up-friend-add">+ Agregar amigo</button>`;
      _wireFriendButtons(null, myId, theirId, content);
      await refreshFriendsBadge();
    });
  }

  if (cancel) {
    cancel.addEventListener('click', async () => {
      cancel.disabled = true;
      cancel.textContent = 'Cancelando...';
      await supabase.from('friendships').delete().eq('id', rel.id);
      cancel.textContent = '+ Agregar amigo';
      cancel.classList.remove('up-friend-btn--pending');
      cancel.classList.add('up-friend-btn--add');
      cancel.disabled = false;
      cancel.id = 'up-friend-add';
      _wireFriendButtons(null, myId, theirId, content);
    });
  }

  if (accept) {
    accept.addEventListener('click', async () => {
      accept.disabled = true;
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', rel.id);
      accept.closest('.up-friend-row').outerHTML =
        `<button class="up-friend-btn up-friend-btn--friends" disabled>✓ Amigos</button>`;
      await refreshFriendsBadge();
    });
  }

  if (reject) {
    reject.addEventListener('click', async () => {
      reject.disabled = true;
      await supabase.from('friendships').delete().eq('id', rel.id);
      reject.closest('.up-friend-row').outerHTML =
        `<button class="up-friend-btn up-friend-btn--add" disabled>+ Agregar amigo</button>`;
      await refreshFriendsBadge();
    });
  }
}

function _formatLastSeen(lastSeenStr) {
  if (!lastSeenStr) return '';
  const diff = Date.now() - new Date(lastSeenStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 10) return '🟢 En línea';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} día${days !== 1 ? 's' : ''}`;
}

function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _usernameColor(name) {
  const palette = ['#7c9dff','#c084fc','#4ade80','#fb923c','#f472b6','#34d399','#a78bfa','#60a5fa'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}
