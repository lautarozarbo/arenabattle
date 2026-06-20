import { supabase } from '../supabase.js';
import { getAllPowerMetas } from '../powers/registry.js';
import { refreshFriendsBadge } from './friends.js';
import { loadComments, renderCommentsSection, wireComments, clearProfileCommentsBadge } from './profileComments.js';
import { showConfirm } from '../ui/confirmDialog.js';

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

  const favHtml = mostUsed
    ? `<div class="up-fav-card">
        <div class="up-fav-circle" style="background:${mostUsed.color}">${mostUsed.icon}</div>
        <div class="up-fav-info">
          <span class="up-fav-name" style="color:${mostUsed.color}">${mostUsed.name}</span>
          <span class="up-fav-sub">${bestCount} partida${bestCount !== 1 ? 's' : ''}</span>
        </div>
      </div>`
    : `<div class="up-fav-empty">Sin partidas registradas</div>`;

  const comments = await loadComments(userId);

  const lastSeenHtml = _formatLastSeen(profile.last_seen);
  const friendBtnHtml = _renderFriendBtn(rel, myId, userId);

  content.innerHTML = `
    <div class="up-username">${_esc(profile.username)}</div>
    ${lastSeenHtml ? `<div class="up-last-seen">${lastSeenHtml}</div>` : ''}
    ${friendBtnHtml}

    <div class="up-section-label">Resumen</div>
    <div class="up-grid">
      <div class="up-card"><span class="up-val">${totalG}</span><span class="up-lbl">Jugadas</span></div>
      <div class="up-card"><span class="up-val up-val--win">${totalW}</span><span class="up-lbl">Victorias</span></div>
      <div class="up-card"><span class="up-val up-val--loss">${totalL}</span><span class="up-lbl">Derrotas</span></div>
      <div class="up-card"><span class="up-val">${winRate}%</span><span class="up-lbl">Win rate</span></div>
    </div>

    <div class="up-section-label">Victorias por modo</div>
    <div class="up-grid">
      <div class="up-card"><span class="up-val">${wins.quick1v1}</span><span class="up-lbl">1 vs 1</span></div>
      <div class="up-card"><span class="up-val">${wins.quick2v2}</span><span class="up-lbl">2 vs 2</span></div>
      <div class="up-card"><span class="up-val">${wins.league}</span><span class="up-lbl">Liga</span></div>
      <div class="up-card"><span class="up-val">${wins.tournament}</span><span class="up-lbl">Torneo</span></div>
    </div>

    <div class="up-section-label">Campeonatos</div>
    <div class="up-champ-row">
      <div class="up-champ-card">
        <span class="up-champ-trophy">🏆</span>
        <div class="up-champ-info">
          <span class="up-champ-val">${champs.league}</span>
          <span class="up-champ-lbl">Ligas ganadas</span>
        </div>
      </div>
      <div class="up-champ-card">
        <span class="up-champ-trophy">🏆</span>
        <div class="up-champ-info">
          <span class="up-champ-val">${champs.tournament}</span>
          <span class="up-champ-lbl">Torneos ganados</span>
        </div>
      </div>
    </div>

    <div class="up-section-label">Torre Infinita</div>
    <div class="up-grid up-grid--2">
      <div class="up-card">
        <span class="up-val">${towerFloor > 0 ? towerFloor : '—'}</span>
        <span class="up-lbl">Piso más alto</span>
      </div>
      <div class="up-card">
        <span class="up-val up-val--tower">${towerChar ?? '—'}</span>
        <span class="up-lbl">Mejor personaje</span>
      </div>
    </div>

    <div class="up-section-label">Personaje más usado</div>
    ${favHtml}

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
