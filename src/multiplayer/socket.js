// En prod: definir window.__WS_URL__ antes de cargar este módulo.
// En dev: usa el mismo hostname que sirve el frontend (funciona desde celular en red local).
const WS_URL = window.__WS_URL__ ?? `ws://${window.location.hostname}:3001`;

let _ws       = null;
const _handlers = {};

export function wsConnect() {
  return new Promise((resolve, reject) => {
    _ws = new WebSocket(WS_URL);
    _ws.onopen    = () => resolve();
    _ws.onerror   = (e) => reject(new Error('No se pudo conectar al servidor'));
    _ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        _handlers[msg.type]?.(msg);
      } catch { /* ignore malformed */ }
    };
    _ws.onclose = () => {
      _ws = null;
      _handlers['disconnected']?.({ type: 'disconnected' });
    };
  });
}

export function wsDisconnect() {
  if (_ws) { _ws.close(); _ws = null; }
}

export function wsSend(msg) {
  if (_ws?.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify(msg));
  }
}

export function wsOn(type, fn)  { _handlers[type] = fn; }
export function wsOff(type)     { delete _handlers[type]; }
export function wsIsConnected() { return _ws?.readyState === WebSocket.OPEN; }
