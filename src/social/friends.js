import { supabase } from '../supabase.js';

let _currentTab  = 'friends';
let _friendCode  = null;
let _friendCodeUid = null;

export function initFriends() {
  document.querySelectorAll('.friends-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _currentTab = tab.dataset.tab;
      document.querySelectorAll('.friends-tab').forEach(t => t.classList.remove('friends-tab--active'));
      tab.classList.add('friends-tab--active');
      _loadTab();
    });
  });

  document.getElementById('btn-friends-close').addEventListener('click', _closePanel);
  document.getElementById('friends-panel').addEventListener('click', e => {
    if (e.target === document.getElementById('friends-panel')) _closePanel();
  });
}

function _closePanel() {
  const sheet = document.querySelector('.friends-sheet');
  sheet.classList.add('friends-sheet--closing');
  sheet.addEventListener('animationend', () => {
    sheet.classList.remove('friends-sheet--closing');
    document.getElementById('friends-panel').classList.add('hidden');
  }, { once: true });
}

export async function openFriendsPanel() {
  _currentTab = 'friends';
  document.querySelectorAll('.friends-tab').forEach(t => {
    t.classList.toggle('friends-tab--active', t.dataset.tab === 'friends');
  });
  document.getElementById('friends-panel').classList.remove('hidden');
  await _loadTab();
}

export async function refreshFriendsBadge() {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) { _setBadge(0); return; }

  const { count } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('addressee_id', me.user.id)
    .eq('status', 'pending');

  _setBadge(count ?? 0);
}

export async function getMyFriendCode() {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) { _friendCode = null; _friendCodeUid = null; return null; }
  if (_friendCode && _friendCodeUid === me.user.id) return _friendCode;
  const { data } = await supabase
    .from('profiles')
    .select('friend_code')
    .eq('user_id', me.user.id)
    .single();
  _friendCode    = data?.friend_code ?? null;
  _friendCodeUid = me.user.id;
  return _friendCode;
}

function _setBadge(n) {
  const badge = document.getElementById('friends-badge');
  if (badge) {
    badge.textContent = n;
    badge.classList.toggle('hidden', n === 0);
  }
  const tabBadge = document.getElementById('friends-tab-badge');
  if (tabBadge) {
    tabBadge.textContent = n;
    tabBadge.classList.toggle('hidden', n === 0);
  }
}

async function _loadTab() {
  const content = document.getElementById('friends-content');
  content.innerHTML = '<div class="fr-empty">Cargando...</div>';

  const { data: me } = await supabase.auth.getUser();
  if (!me.user) {
    content.innerHTML = '<div class="fr-empty">Iniciá sesión para ver tus amigos.</div>';
    return;
  }

  const uid = me.user.id;
  if (_currentTab === 'friends')  await _renderFriends(uid, content);
  else if (_currentTab === 'received') await _renderReceived(uid, content);
  else await _renderSent(uid, content);
}

async function _renderFriends(uid, content) {
  const { data: friendships } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id')
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
    .eq('status', 'accepted');

  if (!friendships?.length) {
    content.innerHTML = '<div class="fr-empty">Todavía no tenés amigos agregados.</div>';
    return;
  }

  const friendIds = friendships.map(f => f.requester_id === uid ? f.addressee_id : f.requester_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username, last_seen')
    .in('user_id', friendIds);

  content.innerHTML = friendships.map(f => {
    const friendId = f.requester_id === uid ? f.addressee_id : f.requester_id;
    const profile  = profiles?.find(p => p.user_id === friendId);
    const status   = _formatLastSeen(profile?.last_seen);
    const isOnline = status.startsWith('🟢');
    return `<div class="fr-item" data-userid="${friendId}" data-fid="${f.id}">
      <div class="fr-item-left">
        <span class="fr-item-dot ${isOnline ? 'fr-item-dot--online' : ''}"></span>
        <div class="fr-item-info">
          <span class="fr-item-name">${_esc(profile?.username ?? 'Usuario')}</span>
          ${status ? `<span class="fr-item-status">${status}</span>` : ''}
        </div>
      </div>
      <button class="fr-btn fr-btn--ghost fr-btn--remove" data-fid="${f.id}">Eliminar</button>
    </div>`;
  }).join('');

  content.querySelectorAll('.fr-item-left').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const userId = el.closest('.fr-item').dataset.userid;
      import('./userProfile.js').then(m => m.openUserProfile(userId));
    });
  });

  content.querySelectorAll('.fr-btn--remove').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      btn.disabled = true;
      await supabase.from('friendships').delete().eq('id', btn.dataset.fid);
      await _loadTab();
      await refreshFriendsBadge();
    });
  });
}

async function _renderReceived(uid, content) {
  const { data: requests } = await supabase
    .from('friendships')
    .select('id, requester_id')
    .eq('addressee_id', uid)
    .eq('status', 'pending');

  if (!requests?.length) {
    content.innerHTML = '<div class="fr-empty">No tenés solicitudes recibidas.</div>';
    return;
  }

  const requesterIds = requests.map(r => r.requester_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('user_id', requesterIds);

  content.innerHTML = requests.map(r => {
    const profile = profiles?.find(p => p.user_id === r.requester_id);
    return `<div class="fr-item" data-userid="${r.requester_id}">
      <div class="fr-item-left" style="cursor:pointer">
        <div class="fr-item-info">
          <span class="fr-item-name">${_esc(profile?.username ?? 'Usuario')}</span>
          <span class="fr-item-status">Quiere ser tu amigo</span>
        </div>
      </div>
      <div class="fr-item-actions">
        <button class="fr-btn fr-btn--accept" data-fid="${r.id}">Aceptar</button>
        <button class="fr-btn fr-btn--ghost" data-fid="${r.id}" data-action="reject">Rechazar</button>
      </div>
    </div>`;
  }).join('');

  content.querySelectorAll('.fr-item-left').forEach(el => {
    el.addEventListener('click', () => {
      const userId = el.closest('.fr-item').dataset.userid;
      import('./userProfile.js').then(m => m.openUserProfile(userId));
    });
  });

  content.querySelectorAll('.fr-btn--accept').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      btn.disabled = true;
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', btn.dataset.fid);
      await _loadTab();
      await refreshFriendsBadge();
    });
  });

  content.querySelectorAll('[data-action="reject"]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      btn.disabled = true;
      await supabase.from('friendships').delete().eq('id', btn.dataset.fid);
      await _loadTab();
      await refreshFriendsBadge();
    });
  });
}

async function _renderSent(uid, content) {
  const { data: requests } = await supabase
    .from('friendships')
    .select('id, addressee_id')
    .eq('requester_id', uid)
    .eq('status', 'pending');

  if (!requests?.length) {
    content.innerHTML = '<div class="fr-empty">No tenés solicitudes enviadas.</div>';
    return;
  }

  const addresseeIds = requests.map(r => r.addressee_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('user_id', addresseeIds);

  content.innerHTML = requests.map(r => {
    const profile = profiles?.find(p => p.user_id === r.addressee_id);
    return `<div class="fr-item" data-userid="${r.addressee_id}">
      <div class="fr-item-left" style="cursor:pointer">
        <div class="fr-item-info">
          <span class="fr-item-name">${_esc(profile?.username ?? 'Usuario')}</span>
          <span class="fr-item-status">Pendiente</span>
        </div>
      </div>
      <button class="fr-btn fr-btn--ghost fr-btn--cancel" data-fid="${r.id}">Cancelar</button>
    </div>`;
  }).join('');

  content.querySelectorAll('.fr-item-left').forEach(el => {
    el.addEventListener('click', () => {
      const userId = el.closest('.fr-item').dataset.userid;
      import('./userProfile.js').then(m => m.openUserProfile(userId));
    });
  });

  content.querySelectorAll('.fr-btn--cancel').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      btn.disabled = true;
      await supabase.from('friendships').delete().eq('id', btn.dataset.fid);
      await _loadTab();
    });
  });
}

export function formatLastSeen(lastSeenStr) {
  return _formatLastSeen(lastSeenStr);
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
