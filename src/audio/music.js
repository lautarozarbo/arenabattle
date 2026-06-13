import { ac } from './core.js';

// ── Background Music ──────────────────────────────────────────────────────────
// Procedural ambient loop: pad chords + soft bass + gentle rhythm
// Uses a separate gain node so volume is independent of SFX.

let _mg = null; // music gain node
let _mActive = false;
let _mTimer = null;
let _mNext = 0; // next beat start time (AudioContext seconds)
let _mBeat = 0; // global beat counter
let _noiseBuf = null; // cached noise buffer for hi-hats

const _TEMPO = 0.68; // seconds/beat (~88 BPM)
const _SCHED_AHEAD = 0.3;
const _SCHED_MS = 75;

// Am pentatonic chord sequence — 4 chords × 8 beats each
const _CHORDS = [
  { freqs: [110, 164.8, 220, 329.6], bass: 55 }, // Am
  { freqs: [130.8, 196, 261.6, 392], bass: 65.4 }, // C
  { freqs: [98, 164.8, 220, 293.7], bass: 49 }, // G
  { freqs: [110, 146.8, 220, 293.7], bass: 55 }, // Am7
];
const _CHORD_BEATS = 8;

function _mOut() {
  if (!_mg) {
    _mg = ac().createGain();
    _mg.gain.value = 0;
    _mg.connect(ac().destination);
  }
  return _mg;
}

function _noiseBuffer() {
  if (!_noiseBuf) {
    const c = ac();
    _noiseBuf = c.createBuffer(1, Math.ceil(c.sampleRate * 0.05), c.sampleRate);
    const d = _noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return _noiseBuf;
}

function _mPad(t, freqs, dur) {
  for (const freq of freqs) {
    for (const dt of [-1.5, 0, 1.5]) {
      const c = ac();
      const o = c.createOscillator(),
        lp = c.createBiquadFilter(),
        g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq * Math.pow(2, dt / 1200);
      lp.type = "lowpass";
      lp.frequency.value = 1100;
      lp.Q.value = 0.5;
      const vol = 0.022 / freqs.length;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 1.4);
      g.gain.setValueAtTime(vol, t + dur - 1.1);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(lp);
      lp.connect(g);
      g.connect(_mOut());
      o.start(t);
      o.stop(t + dur);
    }
  }
}

function _mBass(t, freq, dur) {
  const c = ac();
  const o = c.createOscillator(),
    lp = c.createBiquadFilter(),
    g = c.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  lp.type = "lowpass";
  lp.frequency.value = 180;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.25);
  g.gain.setValueAtTime(0.12, t + dur - 0.5);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(lp);
  lp.connect(g);
  g.connect(_mOut());
  o.start(t);
  o.stop(t + dur);
}

function _mKick(t) {
  const c = ac();
  const o = c.createOscillator(),
    g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(26, t + 0.11);
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  o.connect(g);
  g.connect(_mOut());
  o.start(t);
  o.stop(t + 0.14);
}

function _mHat(t, vol = 0.022) {
  const c = ac();
  const src = c.createBufferSource();
  src.buffer = _noiseBuffer();
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 6500;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  src.connect(hp);
  hp.connect(g);
  g.connect(_mOut());
  src.start(t);
  src.stop(t + 0.05);
}

function _mSchedule() {
  if (!_mActive) return;
  const c = ac(),
    until = c.currentTime + _SCHED_AHEAD;

  while (_mNext < until) {
    const t = _mNext;
    const bi = _mBeat % _CHORD_BEATS;
    const chord = _CHORDS[Math.floor(_mBeat / _CHORD_BEATS) % _CHORDS.length];
    const chordDur = _CHORD_BEATS * _TEMPO;

    if (bi === 0) {
      _mPad(t, chord.freqs, chordDur);
      _mBass(t, chord.bass, chordDur);
    }

    // Kick on beats 0 and 4 of the 8-beat cycle
    if (bi === 0 || bi === 4) _mKick(t);
    // Hi-hat every beat + off-beat
    _mHat(t, bi % 2 === 0 ? 0.026 : 0.014);
    _mHat(t + _TEMPO * 0.5, 0.01);

    _mNext += _TEMPO;
    _mBeat++;
  }

  _mTimer = setTimeout(_mSchedule, _SCHED_MS);
}

export const music = {
  enabled: true,
  _menuVol: 5,
  _gameVol: 2,

  start() {
    if (_mActive || !this.enabled) return;
    _mActive = true;
    const c = ac();
    _mNext = c.currentTime + 0.3;
    _mBeat = 0;
    const mg = _mOut();
    mg.gain.cancelScheduledValues(c.currentTime);
    mg.gain.setValueAtTime(0, c.currentTime);
    mg.gain.linearRampToValueAtTime(this._menuVol, c.currentTime + 2.5);
    _mSchedule();
  },

  stop(instant = false) {
    _mActive = false;
    clearTimeout(_mTimer);
    _mTimer = null;
    const c = ac(),
      mg = _mOut();
    mg.gain.cancelScheduledValues(c.currentTime);
    mg.gain.setValueAtTime(mg.gain.value, c.currentTime);
    if (instant) {
      mg.gain.setValueAtTime(0, c.currentTime);
    } else {
      mg.gain.linearRampToValueAtTime(0, c.currentTime + 1.8);
    }
  },

  // Call when entering / leaving gameplay
  setMode(mode) {
    if (!_mActive) return;
    const target = mode === "game" ? this._gameVol : this._menuVol;
    const c = ac(),
      mg = _mOut();
    mg.gain.cancelScheduledValues(c.currentTime);
    mg.gain.setValueAtTime(mg.gain.value, c.currentTime);
    mg.gain.linearRampToValueAtTime(target, c.currentTime + 1.2);
  },
};
