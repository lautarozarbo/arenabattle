import { supabase } from '../supabase.js';
import { showConfirm } from '../ui/confirmDialog.js';

const MAX_CHARS = 200;
const BADGE_KEY = 'my_profile_comments_seen_at';

export async function checkProfileCommentsBadge(myId) {
  const { data } = await supabase
    .from('profile_comments')
    .select('created_at')
    .eq('profile_id', myId)
    .order('created_at', { ascending: false })
    .limit(1);
  const newest = data?.[0]?.created_at;
  if (!newest) return;
  const seenAt = localStorage.getItem(BADGE_KEY);
  if (!seenAt || new Date(newest) > new Date(seenAt)) {
    document.getElementById('profile-notif-dot')?.classList.remove('hidden');
    document.getElementById('profile-own-notif-dot')?.classList.remove('hidden');
  }
}

export function clearProfileCommentsBadge() {
  localStorage.setItem(BADGE_KEY, new Date().toISOString());
  document.getElementById('profile-notif-dot')?.classList.add('hidden');
  document.getElementById('profile-own-notif-dot')?.classList.add('hidden');
}

export async function loadComments(profileUserId) {
  const { data: comments } = await supabase
    .from('profile_comments')
    .select('id, content, created_at, author_id')
    .eq('profile_id', profileUserId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (!comments?.length) return [];
  const authorIds = [...new Set(comments.map(c => c.author_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username')
    .in('user_id', authorIds);
  const nameMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.username]));
  return comments.map(c => ({ ...c, profiles: { username: nameMap[c.author_id] ?? 'Usuario' } }));
}

export async function postComment(profileUserId, authorId, content) {
  const trimmed = content.trim().slice(0, MAX_CHARS);
  if (!trimmed) return { error: 'Comentario vacío' };
  const { data, error } = await supabase
    .from('profile_comments')
    .insert({ profile_id: profileUserId, author_id: authorId, content: trimmed })
    .select('id, content, created_at, author_id')
    .single();
  if (error || !data) return { data: null, error };
  const { data: profile } = await supabase
    .from('profiles').select('username').eq('user_id', authorId).single();
  return { data: { ...data, profiles: { username: profile?.username ?? 'Usuario' } }, error: null };
}

export async function deleteComment(commentId) {
  const { error } = await supabase
    .from('profile_comments')
    .delete()
    .eq('id', commentId);
  return { error };
}

export function renderCommentsSection(comments, myId, profileUserId) {
  const canPost = !!myId;
  const inputHtml = canPost ? `
    <div class="up-comment-form">
      <textarea class="up-comment-textarea" id="up-comment-input"
        placeholder="Escribí un comentario..." maxlength="${MAX_CHARS}" rows="2"></textarea>
      <div class="up-comment-form-row">
        <span class="up-comment-chars" id="up-comment-chars">${MAX_CHARS}</span>
        <button class="up-comment-submit" id="up-comment-submit">Comentar</button>
      </div>
    </div>` : '';

  const listHtml = comments.length === 0
    ? `<div class="up-comment-empty">Sin comentarios todavía.</div>`
    : comments.map(c => _renderComment(c, myId, profileUserId)).join('');

  return `
    <div class="up-comments-section">
      <div class="up-comments-hd">Comentarios</div>
      ${inputHtml}
      <div class="up-comment-list" id="up-comment-list">${listHtml}</div>
    </div>
  `;
}

function _renderComment(c, myId, profileUserId) {
  const author = c.profiles?.username ?? 'Usuario';
  const canDelete = myId && (c.author_id === myId || myId === profileUserId);
  const timeStr = _formatTime(c.created_at);
  return `
    <div class="up-comment" data-id="${c.id}">
      <div class="up-comment-header">
        <span class="up-comment-author" data-author-id="${c.author_id}">${_esc(author)}</span>
        <span class="up-comment-time">${timeStr}</span>
        ${canDelete ? `<button class="up-comment-delete" data-id="${c.id}" title="Eliminar">✕</button>` : ''}
      </div>
      <div class="up-comment-body">${_esc(c.content)}</div>
    </div>`;
}

export function wireComments(container, profileUserId, myId) {
  const textarea  = container.querySelector('#up-comment-input');
  const submitBtn = container.querySelector('#up-comment-submit');
  const charCount = container.querySelector('#up-comment-chars');
  const list      = container.querySelector('#up-comment-list');

  if (textarea) {
    textarea.addEventListener('input', () => {
      const remaining = MAX_CHARS - textarea.value.length;
      charCount.textContent = remaining;
      charCount.classList.toggle('up-comment-chars--warn', remaining < 30);
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (!text) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
      const { data, error } = await postComment(profileUserId, myId, text);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Comentar';
      if (error) return;
      textarea.value = '';
      charCount.textContent = MAX_CHARS;
      charCount.classList.remove('up-comment-chars--warn');
      // Prepend new comment
      const empty = list.querySelector('.up-comment-empty');
      if (empty) empty.remove();
      list.insertAdjacentHTML('afterbegin', _renderComment(data, myId, profileUserId));
      _wireDeleteButtons(list, myId, profileUserId);
      _wireAuthorClicks(list);
    });
  }

  _wireDeleteButtons(list, myId, profileUserId);
  _wireAuthorClicks(list);
}

function _wireAuthorClicks(list) {
  list.querySelectorAll('.up-comment-author[data-author-id]').forEach(el => {
    el.onclick = () => {
      import('./userProfile.js').then(m => m.openUserProfile(el.dataset.authorId));
    };
  });
}

function _wireDeleteButtons(list, myId, profileUserId) {
  list.querySelectorAll('.up-comment-delete').forEach(btn => {
    btn.onclick = async () => {
      if (!await showConfirm('¿Eliminar este comentario?')) return;
      const id = btn.dataset.id;
      btn.disabled = true;
      const { error } = await deleteComment(id);
      if (!error) {
        const el = list.querySelector(`.up-comment[data-id="${id}"]`);
        el?.remove();
        if (!list.querySelector('.up-comment')) {
          list.innerHTML = `<div class="up-comment-empty">Sin comentarios todavía.</div>`;
        }
      } else {
        btn.disabled = false;
      }
    };
  });
}

function _formatTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
