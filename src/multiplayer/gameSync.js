import { wsOn, wsOff, wsSend } from './socket.js';

const BROADCAST_MS = 50; // 20 Hz

let _game      = null;
let _mySlot    = 0;
let _isHost    = false;
let _rafId     = null;
let _onGameOver = null;

// ── Public API ────────────────────────────────────────────────────────────────

export function initGameSync(game, mySlot, isHost, onGameOver) {
  stopGameSync();
  _game       = game;
  _mySlot     = mySlot;
  _isHost     = isHost;
  _onGameOver = onGameOver;

  game.networkRole = isHost ? 'host' : 'client';

  if (isHost) _startHost();
  else        _startClient();
}

export function stopGameSync() {
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  wsOff('game_state');
  wsOff('apply_ability');
  wsOff('net_game_over');
  if (_game) _game.networkRole = null;
  _game = null;
}

// Called by main.js ability buttons when non-host
export function sendAbility(ability) {
  wsSend({ type: 'ability', ability, fromSlot: _mySlot });
}

export function isOnlineHost() { return _isHost; }
export function getMySlot()    { return _mySlot; }

// ── Host logic ────────────────────────────────────────────────────────────────

function _startHost() {
  let lastBroadcast = 0;

  // Receive ability requests from non-host via server
  wsOn('apply_ability', msg => {
    if (_game) _game.applyActiveBuff(msg.ability, msg.fromSlot);
  });

  // Broadcast state loop (piggybacks on rAF to stay in sync with render)
  function tick(ts) {
    if (!_game) return;
    if (ts - lastBroadcast >= BROADCAST_MS) {
      lastBroadcast = ts;
      if (_game.state === 'playing' || _game.state === 'gameover') {
        wsSend({ type: 'game_state', state: _game.getNetworkState() });
      }
      if (_game.state === 'gameover') {
        // Let the normal onGameOver handle it; server will get game_over from us
        return;
      }
    }
    if (_game.state !== 'idle') _rafId = requestAnimationFrame(tick);
  }
  _rafId = requestAnimationFrame(tick);
}

// Called by main.js when host's game ends
export function sendGameOver(winnerSlot) {
  wsSend({ type: 'game_over', winnerSlot });
  stopGameSync();
}

// ── Client (non-host) logic ───────────────────────────────────────────────────

function _startClient() {
  wsOn('game_state', msg => {
    if (_game?.state === 'playing') {
      _game.applyNetworkState(msg.state);
    }
  });

  wsOn('net_game_over', msg => {
    stopGameSync();
    _onGameOver?.(msg.winnerSlot);
  });
}
