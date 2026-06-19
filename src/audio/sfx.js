import { ac, masterOut, pipe, mkNoise, mkOsc, mkGain, mkFilter, throttled, setMasterVolume } from './core.js';

// ── Public API ────────────────────────────────────────────────────────────────

export const sfx = {
  volume: 0.45,
  enabled: true,

  setVolume(v) {
    sfx.volume = Math.max(0, Math.min(1, v));
    setMasterVolume(sfx.volume);
  },

  // ── Core ────────────────────────────────────────────────────────────────────

  collide() {
    if (!sfx.enabled) return;
    throttled("col", 80, () => {
      const c = ac(),
        t = c.currentTime;
      // Low thump
      const o = mkOsc("sine", 90),
        g = mkGain(0);
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 0.12);
      g.gain.linearRampToValueAtTime(0.55, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.14);
      // Noise burst
      const n = mkNoise(0.07),
        nf = mkFilter("bandpass", 280, 1.5),
        ng = mkGain(0);
      ng.gain.linearRampToValueAtTime(0.22, t + 0.003);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      pipe(n, nf, ng);
      n.start(t);
      n.stop(t + 0.07);
    });
  },

  wallBounce() {
    if (!sfx.enabled) return;
    throttled("wall", 55, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sine", 130),
        g = mkGain(0);
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.07);
      g.gain.linearRampToValueAtTime(0.2, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.09);
    });
  },

  uiClick() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const o = mkOsc("sine", 700),
      g = mkGain(0);
    g.gain.linearRampToValueAtTime(0.12, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.06);
  },

  fightStart() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    [0, 0.11, 0.22].forEach((delay, i) => {
      const o = mkOsc("sine", [440, 554, 660][i]),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.28, t + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.2);
      pipe(o, g);
      o.start(t + delay);
      o.stop(t + delay + 0.2);
    });
  },

  gameOverWin() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = mkOsc("sine", f),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.32, t + i * 0.13 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.13 + 0.28);
      pipe(o, g);
      o.start(t + i * 0.13);
      o.stop(t + i * 0.13 + 0.28);
    });
  },

  gameOverLose() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    [440, 370, 294, 220].forEach((f, i) => {
      const o = mkOsc("sine", f),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.28, t + i * 0.15 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.32);
      pipe(o, g);
      o.start(t + i * 0.15);
      o.stop(t + i * 0.15 + 0.32);
    });
  },

  // ── Laser ───────────────────────────────────────────────────────────────────

  laserPlace() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const o = mkOsc("sawtooth", 200),
      g = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(850, t + 0.22);
    g.gain.linearRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.26);
  },

  laserHit() {
    if (!sfx.enabled) return;
    throttled("laserHit", 180, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sawtooth", 750),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.16, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.1);
    });
  },

  // ── Rocket ──────────────────────────────────────────────────────────────────

  rocketCharge() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const o = mkOsc("sawtooth", 140),
      g = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.9);
    g.gain.linearRampToValueAtTime(0.09, t + 0.1);
    g.gain.linearRampToValueAtTime(0.14, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    pipe(o, g);
    o.start(t);
    o.stop(t + 1.0);
  },

  rocketDash() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const n = mkNoise(0.22),
      f = mkFilter("bandpass", 1400, 0.7),
      g = mkGain(0);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.2);
    g.gain.linearRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.22);
  },

  rocketExplode() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Low boom
    const o = mkOsc("sine", 80),
      og = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(22, t + 0.35);
    og.gain.linearRampToValueAtTime(0.55, t + 0.005);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    pipe(o, og);
    o.start(t);
    o.stop(t + 0.38);
    // Noise crack
    const n = mkNoise(0.18),
      nf = mkFilter("bandpass", 500, 0.6),
      ng = mkGain(0);
    ng.gain.linearRampToValueAtTime(0.42, t + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    pipe(n, nf, ng);
    n.start(t);
    n.stop(t + 0.18);
  },

  // ── Chess ───────────────────────────────────────────────────────────────────

  chessAnnounce() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    [523, 659].forEach((f, i) => {
      const o = mkOsc("sine", f),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.22, t + i * 0.1 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.14);
      pipe(o, g);
      o.start(t + i * 0.1);
      o.stop(t + i * 0.1 + 0.14);
    });
  },

  chessMove() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const n = mkNoise(0.035),
      f = mkFilter("highpass", 900, 2),
      g = mkGain(0);
    g.gain.linearRampToValueAtTime(0.2, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.035);
  },

  // ── Spider ──────────────────────────────────────────────────────────────────

  spiderWeb() {
    if (!sfx.enabled) return;
    throttled("spiderWeb", 120, () => {
      const c = ac(),
        t = c.currentTime;
      const n = mkNoise(0.09),
        f = mkFilter("bandpass", 2200, 3.5),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.13, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.09);
    });
  },

  spiderHit() {
    if (!sfx.enabled) return;
    throttled("spiderHit", 180, () => {
      const c = ac(),
        t = c.currentTime;
      const n = mkNoise(0.09),
        f = mkFilter("bandpass", 900, 2),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.2, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.09);
    });
  },

  // ── Territory ───────────────────────────────────────────────────────────────

  territoryPlace() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const o = mkOsc("sine", 200),
      g = mkGain(0);
    o.frequency.linearRampToValueAtTime(420, t + 0.18);
    g.gain.linearRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.22);
  },

  // ── Spike ───────────────────────────────────────────────────────────────────

  spikePlace() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const o = mkOsc("sawtooth", 900),
      g = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(280, t + 0.09);
    g.gain.linearRampToValueAtTime(0.14, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.11);
  },

  spikeHit() {
    if (!sfx.enabled) return;
    throttled("spikeHit", 180, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sawtooth", 420),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.23, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.13);
    });
  },

  // ── Electric ────────────────────────────────────────────────────────────────

  electricShock() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Crackling noise
    const n = mkNoise(0.38),
      nf = mkFilter("highpass", 700, 0.8),
      ng = mkGain(0);
    ng.gain.linearRampToValueAtTime(0.45, t + 0.015);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    pipe(n, nf, ng);
    n.start(t);
    n.stop(t + 0.38);
    // High tone
    const o = mkOsc("sawtooth", 1100),
      g = mkGain(0);
    o.frequency.linearRampToValueAtTime(600, t + 0.22);
    g.gain.linearRampToValueAtTime(0.14, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.22);
  },

  electricZap() {
    if (!sfx.enabled) return;
    throttled("eZap", 280, () => {
      const c = ac(),
        t = c.currentTime;
      const n = mkNoise(0.06),
        f = mkFilter("bandpass", 1600, 2.5),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.2, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.06);
    });
  },

  // ── Venom ───────────────────────────────────────────────────────────────────

  venomApply() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const o = mkOsc("sine", 300),
      g = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.22);
    g.gain.linearRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.24);
    const n = mkNoise(0.14),
      nf = mkFilter("lowpass", 380, 1.5),
      ng = mkGain(0);
    ng.gain.linearRampToValueAtTime(0.1, t + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    pipe(n, nf, ng);
    n.start(t);
    n.stop(t + 0.14);
  },

  venomTick() {
    if (!sfx.enabled) return;
    throttled("vTick", 850, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sine", 140),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(75, t + 0.1);
      g.gain.linearRampToValueAtTime(0.07, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.12);
    });
  },

  // ── Grid ────────────────────────────────────────────────────────────────────

  gridSpawn() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    for (let i = 0; i < 6; i++) {
      const o = mkOsc("sine", 380 + i * 70),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.14, t + i * 0.04 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.14);
      pipe(o, g);
      o.start(t + i * 0.04);
      o.stop(t + i * 0.04 + 0.14);
    }
  },

  gridHit(dmg = 5) {
    if (!sfx.enabled) return;
    const freq = 160 + Math.min(dmg, 20) * 24;
    const c = ac(),
      t = c.currentTime;
    const o = mkOsc("sine", freq),
      g = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.16);
    g.gain.linearRampToValueAtTime(0.38, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.18);
    const n = mkNoise(0.1),
      nf = mkFilter("bandpass", 380, 1.5),
      ng = mkGain(0);
    ng.gain.linearRampToValueAtTime(0.2, t + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    pipe(n, nf, ng);
    n.start(t);
    n.stop(t + 0.1);
  },

  // ── Duo ─────────────────────────────────────────────────────────────────────

  duoBeamFire() {
    if (!sfx.enabled) return;
    throttled("duoBeam", 2800, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sine", 880),
        g = mkGain(0);
      o.frequency.linearRampToValueAtTime(1240, t + 0.18);
      g.gain.linearRampToValueAtTime(0.14, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.42);
    });
  },

  duoBeamTick() {
    if (!sfx.enabled) return;
    throttled("duoTick", 380, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sine", 680),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.08, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.06);
    });
  },

  // ── Vampire ─────────────────────────────────────────────────────────────────

  vampireLatch() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Low wet thud
    const o = mkOsc("sine", 55),
      g = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.22);
    g.gain.linearRampToValueAtTime(0.48, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.3);
    // Sinister high squeal
    const o2 = mkOsc("sawtooth", 420),
      g2 = mkGain(0),
      f2 = mkFilter("lowpass", 600, 2);
    o2.frequency.exponentialRampToValueAtTime(180, t + 0.18);
    g2.gain.linearRampToValueAtTime(0.12, t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    pipe(o2, f2, g2);
    o2.start(t);
    o2.stop(t + 0.22);
  },

  vampireDrain() {
    if (!sfx.enabled) return;
    throttled("vDrain", 420, () => {
      const c = ac(),
        t = c.currentTime;
      // Heartbeat pulse
      const o = mkOsc("sine", 80),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.28, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.14);
    });
  },

  // ── Glass ───────────────────────────────────────────────────────────────────

  glassPlace() {
    if (!sfx.enabled) return;
    throttled("glassPlace", 90, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sine", 1800),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(2600, t + 0.03);
      g.gain.linearRampToValueAtTime(0.1, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.09);
    });
  },

  glassBreak() {
    if (!sfx.enabled) return;
    throttled("glassBreak", 140, () => {
      const c = ac(),
        t = c.currentTime;
      // Noise burst through highpass = shatter crunch
      const n = mkNoise(0.12),
        f = mkFilter("highpass", 1800, 1.2),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.35, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.12);
      // Sparkle tone
      const o = mkOsc("sine", 2200),
        g2 = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(800, t + 0.08);
      g2.gain.linearRampToValueAtTime(0.09, t + 0.003);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      pipe(o, g2);
      o.start(t);
      o.stop(t + 0.1);
    });
  },

  // ── Bomb ────────────────────────────────────────────────────────────────────

  bombThrow() {
    if (!sfx.enabled) return;
    throttled("bombThrow", 350, () => {
      const c = ac(),
        t = c.currentTime;
      const n = mkNoise(0.14),
        f = mkFilter("bandpass", 900, 0.8),
        g = mkGain(0);
      f.frequency.exponentialRampToValueAtTime(200, t + 0.12);
      g.gain.linearRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.14);
    });
  },

  bombLand() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Deep explosion boom
    const o = mkOsc("sine", 100),
      g = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(25, t + 0.28);
    g.gain.linearRampToValueAtTime(0.6, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.35);
    // Crack
    const n = mkNoise(0.14),
      nf = mkFilter("bandpass", 600, 0.7),
      ng = mkGain(0);
    ng.gain.linearRampToValueAtTime(0.38, t + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    pipe(n, nf, ng);
    n.start(t);
    n.stop(t + 0.14);
  },

  bombTrap() {
    if (!sfx.enabled) return;
    throttled("bombTrap", 300, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sine", 320),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.15);
      g.gain.linearRampToValueAtTime(0.32, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.18);
    });
  },

  // ── Assassin ────────────────────────────────────────────────────────────────

  assassinHit() {
    if (!sfx.enabled) return;
    throttled("assHit", 200, () => {
      const c = ac(),
        t = c.currentTime;
      // Sharp metallic slice
      const n = mkNoise(0.07),
        f = mkFilter("highpass", 2500, 2.5),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.3, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.07);
      const o = mkOsc("sine", 1400),
        g2 = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(400, t + 0.06);
      g2.gain.linearRampToValueAtTime(0.12, t + 0.003);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      pipe(o, g2);
      o.start(t);
      o.stop(t + 0.08);
    });
  },

  clockFreeze() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    [880, 1100, 1320].forEach((f, i) => {
      const o = mkOsc("sine", f),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.13, t + i * 0.05 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.18);
      pipe(o, g);
      o.start(t + i * 0.05);
      o.stop(t + i * 0.05 + 0.18);
    });
    const n = mkNoise(0.2),
      f = mkFilter("highpass", 3000, 2),
      g = mkGain(0);
    g.gain.linearRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.2);
  },

  angelStrike() {
    if (!sfx.enabled) return;
    throttled("angelStrike", 200, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sine", 2400),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.14);
      g.gain.linearRampToValueAtTime(0.25, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.18);
      const o2 = mkOsc("triangle", 1100),
        g2 = mkGain(0);
      g2.gain.linearRampToValueAtTime(0.1, t + 0.003);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      pipe(o2, g2);
      o2.start(t);
      o2.stop(t + 0.1);
    });
  },

  angelRevive() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = mkOsc("sine", f),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.2, t + i * 0.09 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.22);
      pipe(o, g);
      o.start(t + i * 0.09);
      o.stop(t + i * 0.09 + 0.22);
    });
  },

  quake() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const boom = mkOsc("sine", 70),
      bg = mkGain(0);
    boom.frequency.exponentialRampToValueAtTime(20, t + 0.55);
    bg.gain.linearRampToValueAtTime(0.5, t + 0.01);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    pipe(boom, bg);
    boom.start(t);
    boom.stop(t + 0.6);
    const n = mkNoise(0.4),
      f = mkFilter("bandpass", 400, 0.6),
      g = mkGain(0);
    g.gain.linearRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.42);
  },

  parasiteKill() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    [220, 165, 110, 80].forEach((f, i) => {
      const o = mkOsc("sawtooth", f),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.2, t + i * 0.06 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.18);
      pipe(o, g);
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.18);
    });
    const n = mkNoise(0.3),
      f = mkFilter("lowpass", 600, 2),
      g = mkGain(0);
    g.gain.linearRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.3);
  },

  bleedTick() {
    if (!sfx.enabled) return;
    throttled("bleedTick", 800, () => {
      const c = ac(),
        t = c.currentTime;
      // Wet, low thud — like a heartbeat pulse
      const o = mkOsc("sine", 80),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.linearRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.18);
    });
  },

  // ── WallCurse ─────────────────────────────────────────────────────────────

  wallCurse() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Mystical ascending sweep
    const o = mkOsc("sine", 160),
      g = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(720, t + 0.35);
    g.gain.linearRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.4);
    const o2 = mkOsc("triangle", 320),
      g2 = mkGain(0);
    o2.frequency.exponentialRampToValueAtTime(1100, t + 0.3);
    g2.gain.linearRampToValueAtTime(0.08, t + 0.04);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    pipe(o2, g2);
    o2.start(t);
    o2.stop(t + 0.35);
  },

  wallCurseHeal() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Soft healing chime: two rising tones
    [660, 880].forEach((f, i) => {
      const o = mkOsc("sine", f),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.13, t + i * 0.06 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.18);
      pipe(o, g);
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.18);
    });
  },

  wallCurseDamage() {
    if (!sfx.enabled) return;
    throttled("wallCurseDmg", 150, () => {
      const c = ac(),
        t = c.currentTime;
      // Harsh crack with low thump
      const n = mkNoise(0.08),
        f = mkFilter("highpass", 1400, 2),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.28, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.08);
      const o = mkOsc("sine", 100),
        og = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.1);
      og.gain.linearRampToValueAtTime(0.35, t + 0.005);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      pipe(o, og);
      o.start(t);
      o.stop(t + 0.12);
    });
  },

  // ── Momentum ──────────────────────────────────────────────────────────────

  momentumStack(stacks = 1) {
    if (!sfx.enabled) return;
    throttled("momStack", 60, () => {
      const c = ac(),
        t = c.currentTime;
      // Quick high blip, pitch rises slightly with stacks
      const freq = 600 + Math.min(stacks, 20) * 30;
      const o = mkOsc("sine", freq),
        g = mkGain(0);
      o.frequency.linearRampToValueAtTime(freq * 1.15, t + 0.04);
      g.gain.linearRampToValueAtTime(0.1, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.055);
    });
  },

  momentumRelease() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Whoosh + heavy impact
    const n = mkNoise(0.15),
      f = mkFilter("bandpass", 2200, 1.5),
      g = mkGain(0);
    f.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    g.gain.linearRampToValueAtTime(0.3, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.15);
    const o = mkOsc("sine", 120),
      og = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.2);
    og.gain.linearRampToValueAtTime(0.5, t + 0.006);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    pipe(o, og);
    o.start(t);
    o.stop(t + 0.22);
  },

  // ── CrystalBeam ───────────────────────────────────────────────────────────

  crystalSpawn() {
    if (!sfx.enabled) return;
    throttled("crystalSpawn", 400, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sine", 1800),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(2600, t + 0.06);
      g.gain.linearRampToValueAtTime(0.07, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.1);
    });
  },

  crystalCollect() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Ascending tinkle
    [1200, 1600].forEach((f, i) => {
      const o = mkOsc("sine", f),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.1, t + i * 0.05 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.1);
      pipe(o, g);
      o.start(t + i * 0.05);
      o.stop(t + i * 0.05 + 0.1);
    });
  },

  crystalBeamFire(level = 0) {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    const baseFreq = 300 + level * 120;
    // Electric rising whoosh
    const n = mkNoise(0.45),
      f = mkFilter("bandpass", baseFreq, 2.5),
      g = mkGain(0);
    f.frequency.exponentialRampToValueAtTime(baseFreq * 8, t + 0.35);
    g.gain.linearRampToValueAtTime(0.1 + level * 0.06, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.45);
    const o = mkOsc("sawtooth", baseFreq),
      og = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(baseFreq * 3, t + 0.3);
    og.gain.linearRampToValueAtTime(0.06 + level * 0.03, t + 0.04);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    pipe(o, og);
    o.start(t);
    o.stop(t + 0.38);
  },

  // ── Turret ────────────────────────────────────────────────────────────────

  turretSpawn() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Metallic clunk: short descending noise burst + low click
    const n = mkNoise(0.06),
      f = mkFilter("bandpass", 1200, 3),
      g = mkGain(0);
    f.frequency.exponentialRampToValueAtTime(320, t + 0.05);
    g.gain.linearRampToValueAtTime(0.22, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.06);
    const o = mkOsc("sine", 220),
      og = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    og.gain.linearRampToValueAtTime(0.28, t + 0.004);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    pipe(o, og);
    o.start(t);
    o.stop(t + 0.1);
  },

  turretBurstStart() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Short mechanical windup click
    const n = mkNoise(0.035),
      f = mkFilter("highpass", 2200, 2.5),
      g = mkGain(0);
    g.gain.linearRampToValueAtTime(0.18, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.04);
  },

  turretShot() {
    if (!sfx.enabled) return;
    throttled("turretShot", 80, () => {
      const c = ac(),
        t = c.currentTime;
      // Sharp high pew
      const o = mkOsc("square", 1400),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(300, t + 0.05);
      g.gain.linearRampToValueAtTime(0.11, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.06);
    });
  },

  turretHit() {
    if (!sfx.enabled) return;
    throttled("turretHit", 120, () => {
      const c = ac(),
        t = c.currentTime;
      const n = mkNoise(0.07),
        f = mkFilter("bandpass", 700, 1.8),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.2, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.07);
    });
  },

  crystalBeamTick() {
    if (!sfx.enabled) return;
    throttled("crystalTick", 200, () => {
      const c = ac(),
        t = c.currentTime;
      const o = mkOsc("sine", 900),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(400, t + 0.05);
      g.gain.linearRampToValueAtTime(0.07, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.06);
    });
  },

  // ── Mage ─────────────────────────────────────────────────────────────────────

  mageWarn() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Ominous rising siren: two oscillators sweeping up over 2s
    const o1 = mkOsc("sawtooth", 80),
      g1 = mkGain(0);
    const o2 = mkOsc("sawtooth", 120),
      g2 = mkGain(0);
    o1.frequency.exponentialRampToValueAtTime(340, t + 1.8);
    o2.frequency.exponentialRampToValueAtTime(510, t + 1.8);
    g1.gain.linearRampToValueAtTime(0.1, t + 0.15);
    g1.gain.setValueAtTime(0.1, t + 1.6);
    g1.gain.linearRampToValueAtTime(0, t + 2.0);
    g2.gain.linearRampToValueAtTime(0.06, t + 0.2);
    g2.gain.setValueAtTime(0.06, t + 1.6);
    g2.gain.linearRampToValueAtTime(0, t + 2.0);
    const f = mkFilter("bandpass", 600, 1.5);
    pipe(o1, f, g1);
    pipe(o2, g2);
    o1.start(t);
    o1.stop(t + 2.0);
    o2.start(t);
    o2.stop(t + 2.0);
  },

  mageExplode() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Massive sub-bass boom + high crack
    const boom = mkOsc("sine", 60),
      bg = mkGain(0);
    boom.frequency.exponentialRampToValueAtTime(18, t + 0.5);
    bg.gain.linearRampToValueAtTime(0.55, t + 0.01);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    pipe(boom, bg);
    boom.start(t);
    boom.stop(t + 0.55);

    // Mid punch
    const mid = mkOsc("triangle", 200),
      mg = mkGain(0);
    mid.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    mg.gain.linearRampToValueAtTime(0.3, t + 0.005);
    mg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    pipe(mid, mg);
    mid.start(t);
    mid.stop(t + 0.35);

    // White noise crack
    const n = mkNoise(0.2),
      f = mkFilter("highpass", 1800, 1),
      ng = mkGain(0);
    ng.gain.linearRampToValueAtTime(0.35, t + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    pipe(n, f, ng);
    n.start(t);
    n.stop(t + 0.2);
  },

  // ── Pulsar ───────────────────────────────────────────────────────────────────

  pulsarStart() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Rising electric whoosh: filtered noise + rising sine
    const n = mkNoise(0.4),
      f = mkFilter("bandpass", 2200, 3),
      g = mkGain(0);
    f.frequency.exponentialRampToValueAtTime(5000, t + 0.35);
    g.gain.linearRampToValueAtTime(0.22, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.4);
    const o = mkOsc("sawtooth", 280),
      og = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.3);
    og.gain.linearRampToValueAtTime(0.08, t + 0.04);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    pipe(o, og);
    o.start(t);
    o.stop(t + 0.35);
  },

  pulsarHit() {
    if (!sfx.enabled) return;
    throttled("pulsarHit", 180, () => {
      const c = ac(),
        t = c.currentTime;
      // Sharp electric zap
      const o = mkOsc("square", 1100),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(200, t + 0.06);
      g.gain.linearRampToValueAtTime(0.14, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.07);
    });
  },

  // ── Volcano ───────────────────────────────────────────────────────────────────

  volcanoFire() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Deep earth-shake rumble
    const boom = mkOsc("sine", 55),
      bg = mkGain(0);
    boom.frequency.exponentialRampToValueAtTime(22, t + 0.6);
    bg.gain.linearRampToValueAtTime(0.5, t + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    pipe(boom, bg);
    boom.start(t);
    boom.stop(t + 0.7);
    // Mid crackle
    const mid = mkOsc("sawtooth", 140),
      mg = mkGain(0);
    mid.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    mg.gain.linearRampToValueAtTime(0.22, t + 0.01);
    mg.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    pipe(mid, mg);
    mid.start(t);
    mid.stop(t + 0.45);
    // Hiss / steam
    const n = mkNoise(0.5),
      f = mkFilter("bandpass", 900, 1.5),
      ng = mkGain(0);
    ng.gain.linearRampToValueAtTime(0.18, t + 0.05);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    pipe(n, f, ng);
    n.start(t);
    n.stop(t + 0.5);
  },

  volcanoHit() {
    if (!sfx.enabled) return;
    throttled("volcanoHit", 300, () => {
      const c = ac(),
        t = c.currentTime;
      // Sizzle/splat — filtered noise drop
      const n = mkNoise(0.18),
        f = mkFilter("bandpass", 1800, 2),
        g = mkGain(0);
      f.frequency.exponentialRampToValueAtTime(400, t + 0.15);
      g.gain.linearRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.18);
    });
  },

  // ── Hot Potato ───────────────────────────────────────────────────────────────

  hotPotatoTick() {
    if (!sfx.enabled) return;
    throttled("hotTick", 60, () => {
      const c = ac(),
        t = c.currentTime;
      // Sharp metallic click
      const o = mkOsc("square", 1100),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(600, t + 0.025);
      g.gain.linearRampToValueAtTime(0.12, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.04);
    });
  },

  hotPotatoPass() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Swoosh + high blip — pass sound
    const n = mkNoise(0.09),
      f = mkFilter("bandpass", 3000, 2),
      g = mkGain(0);
    f.frequency.exponentialRampToValueAtTime(800, t + 0.07);
    g.gain.linearRampToValueAtTime(0.2, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.09);
    const o = mkOsc("sine", 1400),
      og = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.06);
    og.gain.linearRampToValueAtTime(0.1, t + 0.003);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    pipe(o, og);
    o.start(t);
    o.stop(t + 0.08);
  },

  hotPotatoExplode() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Big boom — low thump + mid noise burst
    const o = mkOsc("sine", 160),
      og = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(28, t + 0.35);
    og.gain.linearRampToValueAtTime(0.65, t + 0.008);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    pipe(o, og);
    o.start(t);
    o.stop(t + 0.38);
    const n = mkNoise(0.3),
      f = mkFilter("bandpass", 600, 1.2),
      g = mkGain(0);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.25);
    g.gain.linearRampToValueAtTime(0.45, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.3);
  },

  hotPotatoReset() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Short ascending ping — bomb respawns
    [500, 800, 1100].forEach((f, i) => {
      const o = mkOsc("sine", f),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.08, t + i * 0.06 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.1);
      pipe(o, g);
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.1);
    });
  },

  // ── Cluster Bomb ─────────────────────────────────────────────────────────────

  clusterLaunch() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Wobbly throw sound
    const o = mkOsc("sawtooth", 320),
      g = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.15);
    g.gain.linearRampToValueAtTime(0.14, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    pipe(o, g);
    o.start(t);
    o.stop(t + 0.18);
    const n = mkNoise(0.1),
      f = mkFilter("highpass", 1800, 1.5),
      ng = mkGain(0);
    ng.gain.linearRampToValueAtTime(0.12, t + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    pipe(n, f, ng);
    n.start(t);
    n.stop(t + 0.1);
  },

  clusterExplode() {
    if (!sfx.enabled) return;
    const c = ac(),
      t = c.currentTime;
    // Heavy detonation
    const o = mkOsc("sine", 200),
      og = mkGain(0);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    og.gain.linearRampToValueAtTime(0.7, t + 0.006);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    pipe(o, og);
    o.start(t);
    o.stop(t + 0.42);
    const n = mkNoise(0.35),
      f = mkFilter("bandpass", 800, 1),
      g = mkGain(0);
    f.frequency.exponentialRampToValueAtTime(150, t + 0.28);
    g.gain.linearRampToValueAtTime(0.55, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    pipe(n, f, g);
    n.start(t);
    n.stop(t + 0.35);
  },

  clusterBlastHit() {
    if (!sfx.enabled) return;
    throttled("clusterBlast", 200, () => {
      const c = ac(),
        t = c.currentTime;
      const n = mkNoise(0.12),
        f = mkFilter("bandpass", 500, 1.5),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.3, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.12);
    });
  },

  clusterSpikeStick() {
    if (!sfx.enabled) return;
    throttled("spikeStick", 80, () => {
      const c = ac(),
        t = c.currentTime;
      // Quick thud
      const n = mkNoise(0.05),
        f = mkFilter("bandpass", 900, 3),
        g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.15, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      pipe(n, f, g);
      n.start(t);
      n.stop(t + 0.055);
    });
  },

  clusterSpikeHit() {
    if (!sfx.enabled) return;
    throttled("spikeHit", 100, () => {
      const c = ac(),
        t = c.currentTime;
      // Sharp stab
      const o = mkOsc("sawtooth", 800),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(200, t + 0.06);
      g.gain.linearRampToValueAtTime(0.18, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.07);
    });
  },

  // ── Revolver ─────────────────────────────────────────────────────────────────

  revolverShot() {
    if (!sfx.enabled) return;
    throttled("revolverShot", 75, () => {
      const c = ac(), t = c.currentTime;
      // Crack (high noise burst)
      const n = mkNoise(0.06), f = mkFilter("highpass", 3200, 1.2), g = mkGain(0);
      g.gain.linearRampToValueAtTime(0.38, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      pipe(n, f, g); n.start(t); n.stop(t + 0.07);
      // Low thump
      const o = mkOsc("sine", 150), og = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.09);
      og.gain.linearRampToValueAtTime(0.38, t + 0.004);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      pipe(o, og); o.start(t); o.stop(t + 0.11);
    });
  },

  revolverCylinder() {
    if (!sfx.enabled) return;
    const c = ac(), t = c.currentTime;
    // Fast mechanical clicks as cylinder spins
    for (let i = 0; i < 6; i++) {
      const d = i * 0.03;
      const o = mkOsc("square", 850 - i * 25), g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(260, t + d + 0.022);
      g.gain.linearRampToValueAtTime(0.07, t + d + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.032);
      pipe(o, g); o.start(t + d); o.stop(t + d + 0.032);
    }
  },

  // ── Archer ───────────────────────────────────────────────────────────────────

  archerShot() {
    if (!sfx.enabled) return;
    throttled("archerShot", 60, () => {
      const c = ac(),
        t = c.currentTime;
      // Bowstring twang: sharp high pluck that decays fast
      const o = mkOsc("triangle", 1800),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(320, t + 0.08);
      g.gain.linearRampToValueAtTime(0.15, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.1);
      // Short noise burst (air displacement)
      const n = mkNoise(0.06),
        f = mkFilter("highpass", 2200, 1.5),
        ng = mkGain(0);
      ng.gain.linearRampToValueAtTime(0.1, t + 0.002);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      pipe(n, f, ng);
      n.start(t);
      n.stop(t + 0.055);
    });
  },

  archerHit() {
    if (!sfx.enabled) return;
    throttled("archerHit", 100, () => {
      const c = ac(),
        t = c.currentTime;
      // Dull thud — like an arrow embedding into something
      const o = mkOsc("sine", 180),
        g = mkGain(0);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.1);
      g.gain.linearRampToValueAtTime(0.3, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      pipe(o, g);
      o.start(t);
      o.stop(t + 0.12);
      const n = mkNoise(0.06),
        f = mkFilter("bandpass", 600, 2),
        ng = mkGain(0);
      ng.gain.linearRampToValueAtTime(0.18, t + 0.003);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      pipe(n, f, ng);
      n.start(t);
      n.stop(t + 0.07);
    });
  },
};
