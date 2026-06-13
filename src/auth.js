import { supabase } from './supabase.js';
import { syncRewardsFromCloud } from './persistence/rewards.js';
import { syncStatsFromCloud } from './persistence/stats.js';

let _onLoginCallback = null;

export function onLogin(cb) { _onLoginCallback = cb; }

async function _syncAndNotify() {
  await Promise.all([syncRewardsFromCloud(), syncStatsFromCloud()]);
  if (_onLoginCallback) _onLoginCallback();
}

function _setLoggedIn(user) {
  document.getElementById('auth-logged-out').classList.add('hidden');
  const loggedIn = document.getElementById('auth-logged-in');
  loggedIn.classList.remove('hidden');
  document.getElementById('auth-user-email').textContent = user.email;
}

function _setLoggedOut() {
  document.getElementById('auth-logged-out').classList.remove('hidden');
  document.getElementById('auth-logged-in').classList.add('hidden');
  document.getElementById('auth-user-email').textContent = '';
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { _showError(_translateError(error.message)); }
      else {
        _closeModal();
        _setLoggedIn(data.user);
        await _syncAndNotify();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { _showError(_translateError(error.message)); }
      else if (data.user && !data.session) {
        _showError('Revisá tu email para confirmar la cuenta.');
      } else {
        _closeModal();
        _setLoggedIn(data.user);
        await _syncAndNotify();
      }
    }
    submitBtn.disabled = false;
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    _setLoggedOut();
  });

  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) {
      _setLoggedIn(data.session.user);
      _syncAndNotify();
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
