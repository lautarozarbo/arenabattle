import { supabase } from './supabase.js';
import { syncRewardsFromCloud } from './persistence/rewards.js';
import { syncStatsFromCloud } from './persistence/stats.js';

let _onLoginCallback  = null;
let _onLogoutCallback = null;

export function onLogin(cb)  { _onLoginCallback  = cb; }
export function onLogout(cb) { _onLogoutCallback = cb; }

export async function getUsername() {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', me.user.id)
    .single();
  return data?.username ?? null;
}

export async function updateUsername(name) {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;
  await supabase.from('profiles').update({ username: name, updated_at: new Date().toISOString() })
    .eq('user_id', me.user.id);
}

let _heartbeatId = null;

async function _updateLastSeen() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('profiles')
    .update({ last_seen: new Date().toISOString() })
    .eq('user_id', data.user.id);
}

function _startHeartbeat() {
  if (_heartbeatId) clearInterval(_heartbeatId);
  _heartbeatId = setInterval(_updateLastSeen, 6 * 60 * 1000);
}

async function _syncAndNotify() {
  let username = null;
  try {
    await Promise.all([syncRewardsFromCloud(), syncStatsFromCloud()]);
    username = await getUsername();
    _updateLastSeen();
    _startHeartbeat();
  } catch (err) {
    console.warn('[auth] sync error:', err);
  }
  if (_onLoginCallback) _onLoginCallback(username);
}

function _setLoggedIn(user) {
  document.getElementById('auth-logged-out').classList.add('hidden');
  document.getElementById('auth-logged-in').classList.remove('hidden');
  document.getElementById('auth-user-email').textContent = user.email;
}

function _setLoggedOut() {
  document.getElementById('auth-logged-out').classList.remove('hidden');
  document.getElementById('auth-logged-in').classList.add('hidden');
  document.getElementById('auth-user-email').textContent = '';
  if (_heartbeatId) { clearInterval(_heartbeatId); _heartbeatId = null; }
}

function _openModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
}

function _closeModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
}

function _showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

export function initAuth() {
  let _mode = 'login';

  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const submitBtn   = document.getElementById('btn-auth-submit');

  function _setMode(mode) {
    _mode = mode;
    tabLogin.classList.toggle('auth-tab--active', mode === 'login');
    tabRegister.classList.toggle('auth-tab--active', mode === 'register');
    submitBtn.textContent = mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
    document.getElementById('auth-error').classList.add('hidden');
  }

  tabLogin.addEventListener('click', () => _setMode('login'));
  tabRegister.addEventListener('click', () => _setMode('register'));

  document.getElementById('btn-open-auth').addEventListener('click', _openModal);
  document.getElementById('btn-auth-modal-close').addEventListener('click', _closeModal);
  document.getElementById('auth-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('auth-modal')) _closeModal();
  });

  document.getElementById('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    submitBtn.disabled = true;

    if (_mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) _showError(_translateError(error.message));
      // success → onAuthStateChange fires SIGNED_IN and handles the rest
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        _showError(_translateError(error.message));
      } else if (data.user && !data.session) {
        _showError('Revisá tu email para confirmar la cuenta.');
      }
      // success with session → onAuthStateChange fires SIGNED_IN
    }
    submitBtn.disabled = false;
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    supabase.auth.signOut();
    // onAuthStateChange fires SIGNED_OUT and handles cleanup
  });

  // Single source of truth for auth state.
  // INITIAL_SESSION: fires on page load after SDK resolves/refreshes the stored token.
  // SIGNED_IN: fires on explicit login (form submit).
  // SIGNED_OUT: fires on explicit logout.
  // TOKEN_REFRESHED: fires every hour automatically — no action needed.
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION') {
      if (session?.user) {
        _setLoggedIn(session.user);
        await _syncAndNotify();
      }
    } else if (event === 'SIGNED_IN') {
      _closeModal();
      _setLoggedIn(session.user);
      await _syncAndNotify();
    } else if (event === 'SIGNED_OUT') {
      _setLoggedOut();
      if (_onLogoutCallback) _onLogoutCallback();
    }
  });
}

function _translateError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (msg.includes('Email not confirmed'))        return 'Confirmá tu email antes de iniciar sesión.';
  if (msg.includes('User already registered'))    return 'Ya existe una cuenta con ese email.';
  if (msg.includes('Password should be'))         return 'La contraseña debe tener al menos 6 caracteres.';
  return msg;
}
