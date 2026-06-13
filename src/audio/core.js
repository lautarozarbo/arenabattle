// Procedural audio via Web Audio API — no external files needed.
// AudioContext is created lazily on first call (requires prior user gesture).

let _ctx = null;
let _master = null;

export function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

export function masterOut() {
  if (!_master) {
    _master = ac().createGain();
    _master.gain.value = 0.45;
    _master.connect(ac().destination);
  }
  return _master;
}

// Rate-limit helper — keyed sounds can't fire more than once per `ms`
const _last = {};
export function throttled(key, ms, fn) {
  const now = performance.now();
  if (!_last[key] || now - _last[key] >= ms) {
    _last[key] = now;
    fn();
  }
}

// White noise buffer source
export function mkNoise(dur) {
  const c = ac();
  const samples = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, samples, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

export function mkOsc(type, freq) {
  const o = ac().createOscillator();
  o.type = type;
  o.frequency.value = freq;
  return o;
}

export function mkGain(v) {
  const g = ac().createGain();
  g.gain.value = v;
  return g;
}

export function mkFilter(type, freq, q = 1) {
  const f = ac().createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

export function setMasterVolume(v) {
  if (_master) _master.gain.value = v;
}

// Chain nodes and connect the last one to master output
export function pipe(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  nodes[nodes.length - 1].connect(masterOut());
}
