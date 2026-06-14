import { wsConnect, wsDisconnect, wsSend, wsOn, wsIsConnected } from './socket.js';
import { showScreen } from '../ui/screens.js';
import { sfx }        from '../audio/index.js';
import { getAllPowerMetas } from '../powers/registry.js';
import { ARENA_SKINS }     from '../skins/arenaSkins.js';
import { supabase }        from '../supabase.js';

const _metas = getAllPowerMetas();

let _room      = null;   // last room state from server
let _myUserId  = null;
let _myUsername = null;
let _onGameStart = null; // callback(config) when server fires game_start

// ── Public API ────────────────────────────────────────────────────────────────

export function initOnlineMode(deps) {
  _onGameStart = deps.onGameStart;
  _bindSetupButtons();
}

export function openOnlineSetup() {
  sfx.uiClick();
  showScreen('screen-online-setup');
}

// ── Setup screen buttons ──────────────────────────────────────────────────────

function _bindSetupButtons() {
  const modeRow = document.getElementById('online-mode-row');
  let selectedMode = '1v1';

  modeRow?.querySelectorAll('.toggle-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.uiClick();
      modeRow.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMode = btn.dataset.mode;
    });
  });

  document.getElementById('btn-create-room')?.addEventListener('click', async () => {
    sfx.uiClick();
    await _ensureConnected();
    const { userId, username } = await _getMyInfo();
    _myUserId   = userId;
    _myUsername = username;
    _registerHandlers();
    wsSend({ type: 'create_room', userId, username, mode: selectedMode });
  });

  document.getElementById('btn-join-room')?.addEventListener('click', async () => {
    sfx.uiClick();
    const code = document.getElementById('room-code-input')?.value.trim().toUpperCase();
    if (!code || code.length !== 6) return _showSetupError('Ingresá un código de 6 caracteres');
    await _ensureConnected();
    const { userId, username } = await _getMyInfo();
    _myUserId   = userId;
    _myUsername = username;
    _registerHandlers();
    wsSend({ type: 'join_room', userId, username, code });
  });
}

// ── Lobby screen ──────────────────────────────────────────────────────────────

function _openLobby(room) {
  _room = room;
  showScreen('screen-online-lobby');
  _renderLobby();
  _bindLobbyButtons();
}

function _renderLobby() {
  if (!_room) return;

  document.getElementById('room-code-display').textContent = _room.code;

  const isHost = _room.hostId === _myUserId;
  const myPlayer = _room.players.find(p => p.userId === _myUserId);

  // Players list
  const slots = document.getElementById('lobby-players');
  slots.innerHTML = '';
  const maxSlots = _room.mode === '2v2relay' ? 4 : 2;
  for (let i = 0; i < maxSlots; i++) {
    const p = _room.players[i];
    const div = document.createElement('div');
    div.className = 'lobby-player-slot' + (p ? '' : ' lobby-player-slot--empty');

    if (p) {
      const meta = p.powerId ? _metas.find(m => m.id === p.powerId) : null;
      const isMe = p.userId === _myUserId;
      div.innerHTML = `
        <div class="lobby-slot-info">
          <span class="lobby-slot-name">${p.username}${isMe ? ' (tú)' : ''}</span>
          ${_room.hostId === p.userId ? '<span class="lobby-host-badge">Host</span>' : ''}
        </div>
        <div class="lobby-slot-char">
          ${meta
            ? `<span class="lobby-char-icon" style="color:${meta.color}">${meta.icon}</span>
               <span class="lobby-char-name">${meta.name}</span>`
            : '<span class="lobby-char-empty">Sin personaje</span>'
          }
        </div>
        <div class="lobby-slot-status ${p.ready ? 'ready' : 'not-ready'}">
          ${p.ready ? '✓ Listo' : '—'}
        </div>
      `;
    } else {
      div.innerHTML = `<span class="lobby-empty-label">Esperando jugador${i + 1}...</span>`;
    }
    slots.appendChild(div);
  }

  // Config (host only)
  const cfgSection = document.getElementById('lobby-config');
  cfgSection.classList.toggle('hidden', !isHost);
  if (isHost) {
    const abOnBtn  = document.getElementById('lobby-abilities-on');
    const abOffBtn = document.getElementById('lobby-abilities-off');
    abOnBtn?.classList.toggle('active',  _room.config.abilitiesEnabled);
    abOffBtn?.classList.toggle('active', !_room.config.abilitiesEnabled);
  }

  // My char selection area
  const myMeta = myPlayer?.powerId ? _metas.find(m => m.id === myPlayer.powerId) : null;
  const charPreview = document.getElementById('lobby-char-preview');
  if (myMeta) {
    charPreview.innerHTML = `
      <div class="lobby-my-char">
        <span class="lobby-char-big-icon" style="color:${myMeta.color}">${myMeta.icon}</span>
        <span class="lobby-char-big-name">${myMeta.name}</span>
      </div>
      <button class="btn-secondary" id="btn-lobby-pick-char">Cambiar</button>
    `;
  } else {
    charPreview.innerHTML = `<button class="btn-primary" id="btn-lobby-pick-char">Elegir personaje</button>`;
  }
  document.getElementById('btn-lobby-pick-char')?.addEventListener('click', () => {
    sfx.uiClick();
    _openCharPicker();
  });

  // Ready / Start buttons
  const btnReady = document.getElementById('btn-lobby-ready');
  const myReady  = myPlayer?.ready ?? false;
  btnReady.textContent = myReady ? 'No estoy listo' : 'Listo';
  btnReady.classList.toggle('btn-secondary', myReady);
  btnReady.classList.toggle('btn-primary',   !myReady);

  // Status
  const allReady = _room.players.length >= 2 && _room.players.every(p => p.ready && p.powerId);
  const status   = document.getElementById('lobby-status');
  if (_room.players.length < 2) {
    status.textContent = 'Esperando que se una otro jugador...';
  } else if (!allReady) {
    const notReady = _room.players.filter(p => !p.ready || !p.powerId);
    status.textContent = `Esperando: ${notReady.map(p => p.username).join(', ')}`;
  } else {
    status.textContent = isHost ? 'Todos listos — podés iniciar la partida' : 'Todos listos — esperando al host...';
  }
}

function _bindLobbyButtons() {
  document.getElementById('btn-lobby-back')?.addEventListener('click', () => {
    sfx.uiClick();
    wsSend({ type: 'leave_room' });
    wsDisconnect();
    _room = null;
    showScreen('screen-online-setup');
  });

  document.getElementById('btn-lobby-ready')?.addEventListener('click', () => {
    sfx.uiClick();
    const myPlayer = _room?.players.find(p => p.userId === _myUserId);
    wsSend({ type: 'set_ready', ready: !myPlayer?.ready });
  });

  document.getElementById('lobby-abilities-on')?.addEventListener('click', () => {
    sfx.uiClick();
    wsSend({ type: 'update_config', abilitiesEnabled: true });
  });

  document.getElementById('lobby-abilities-off')?.addEventListener('click', () => {
    sfx.uiClick();
    wsSend({ type: 'update_config', abilitiesEnabled: false });
  });
}

// ── Char picker (overlay) ─────────────────────────────────────────────────────

function _openCharPicker() {
  const overlay = document.getElementById('online-char-picker');
  overlay.classList.remove('hidden');

  const list = document.getElementById('online-char-list');
  list.innerHTML = '';

  for (const meta of _metas) {
    if (meta.id === 'none') continue;
    const btn = document.createElement('button');
    btn.className = 'online-char-btn';
    btn.innerHTML = `
      <span class="online-char-icon" style="color:${meta.color}">${meta.icon}</span>
      <span class="online-char-name">${meta.name}</span>
    `;
    btn.addEventListener('click', () => {
      sfx.uiClick();
      wsSend({ type: 'select_char', powerId: meta.id, skinId: 'default' });
      overlay.classList.add('hidden');
    });
    list.appendChild(btn);
  }

  document.getElementById('btn-char-picker-close')?.addEventListener('click', () => {
    sfx.uiClick();
    overlay.classList.add('hidden');
  });
}

// ── WebSocket event handlers ──────────────────────────────────────────────────

function _registerHandlers() {
  wsOn('room_created', msg => {
    _openLobby(msg.room);
  });

  wsOn('room_joined', msg => {
    _openLobby(msg.room);
  });

  wsOn('room_updated', msg => {
    _room = msg.room;
    if (document.getElementById('screen-online-lobby')?.classList.contains('hidden') === false) {
      _renderLobby();
    }
  });

  wsOn('player_joined', msg => {
    _room = msg.room;
    _renderLobby();
  });

  wsOn('player_left', msg => {
    _room = msg.room;
    _renderLobby();
  });

  wsOn('game_start', msg => {
    _room.state = 'playing';
    // config.mySlot tells this client which slot it occupies (server-assigned)
    _onGameStart?.(msg.config);
  });

  wsOn('error', msg => {
    _showSetupError(msg.message);
  });

  wsOn('disconnected', () => {
    _room = null;
    showScreen('screen-online-setup');
    _showSetupError('Desconectado del servidor');
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

async function _ensureConnected() {
  if (!wsIsConnected()) {
    try {
      await wsConnect();
    } catch {
      _showSetupError('No se pudo conectar al servidor. ¿Está corriendo?');
      throw new Error('WS connection failed');
    }
  }
}

async function _getMyInfo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .single();
  return { userId: user.id, username: profile?.username ?? 'Jugador' };
}

function _showSetupError(msg) {
  const el = document.getElementById('online-setup-error');
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  }
}

// ── Exports for in-game use ───────────────────────────────────────────────────
export function getMyUserId()  { return _myUserId; }
export function getCurrentRoom() { return _room; }
