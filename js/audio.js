// Storage War — 音效系统（Web Audio API 程序化生成 retro 音效）

let audioCtx = null;
let masterGain = null;
let _muted = false;

function ctx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _muted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function out() {
  ctx();
  return masterGain;
}

/** 初始化/恢复音频上下文（需在用户交互后调用） */
export function initAudio() {
  const c = ctx();
  if (c.state === 'suspended') c.resume();
}

export function isMuted() { return _muted; }
export function toggleMute() {
  _muted = !_muted;
  if (masterGain) masterGain.gain.value = _muted ? 0 : 1;
  return _muted;
}

// ---- 工具函数 ----

function noiseNode(c, duration) {
  const len = c.sampleRate * duration;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function gainEnv(c, attack, decay, peak, now) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + attack);
  g.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);
  return g;
}

// ---- 武器音效 ----

export function playSectorSweep() {
  const c = ctx();
  const now = c.currentTime;
  const noise = noiseNode(c, 0.18);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);
  filter.Q.value = 0.6;
  const g = gainEnv(c, 0.02, 0.16, 0.25, now);
  noise.connect(filter);
  filter.connect(g);
  g.connect(out());
  noise.start(now);
  noise.stop(now + 0.2);
}

export function playBitBlaster() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1100, now);
  osc.frequency.exponentialRampToValueAtTime(350, now + 0.06);
  const g = gainEnv(c, 0.005, 0.07, 0.12, now);
  osc.connect(g);
  g.connect(out());
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playParticleBeam() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
  const g = gainEnv(c, 0.01, 0.28, 0.2, now);
  const noise = noiseNode(c, 0.3);
  const ng = gainEnv(c, 0.01, 0.2, 0.08, now);
  osc.connect(g);
  noise.connect(ng);
  g.connect(out());
  ng.connect(out());
  osc.start(now);
  noise.start(now);
  osc.stop(now + 0.35);
  noise.stop(now + 0.35);
}

export function playPingPulse() {
  const c = ctx();
  const now = c.currentTime;
  for (let i = 0; i < 2; i++) {
    const t = now + i * 0.06;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.06);
    const g = gainEnv(c, 0.005, 0.07, 0.1, t);
    osc.connect(g);
    g.connect(out());
    osc.start(t);
    osc.stop(t + 0.1);
  }
}

export function playZipBlackHole() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(55, now);
  osc.frequency.linearRampToValueAtTime(30, now + 0.6);
  const lfo = c.createOscillator();
  lfo.frequency.value = 7;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 25;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  const g = gainEnv(c, 0.08, 0.55, 0.35, now);
  osc.connect(g);
  g.connect(out());
  lfo.start(now);
  osc.start(now);
  lfo.stop(now + 0.65);
  osc.stop(now + 0.65);
}

export function playUsbChain() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
  const noise = noiseNode(c, 0.15);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 0.3;
  const g1 = gainEnv(c, 0.005, 0.13, 0.18, now);
  const g2 = gainEnv(c, 0.005, 0.1, 0.1, now);
  osc.connect(g1);
  noise.connect(filter);
  filter.connect(g2);
  g1.connect(out());
  g2.connect(out());
  osc.start(now);
  noise.start(now);
  osc.stop(now + 0.18);
  noise.stop(now + 0.18);
}

export function playCoolingFan() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.linearRampToValueAtTime(450, now + 0.12);
  osc.frequency.linearRampToValueAtTime(300, now + 0.2);
  const g = gainEnv(c, 0.01, 0.2, 0.1, now);
  osc.connect(g);
  g.connect(out());
  osc.start(now);
  osc.stop(now + 0.25);
}

// ---- 敌人死亡 ----

export function playEnemyDeath() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
  const noise = noiseNode(c, 0.12);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  const g1 = gainEnv(c, 0.005, 0.13, 0.1, now);
  const g2 = gainEnv(c, 0.005, 0.1, 0.05, now);
  osc.connect(g1);
  noise.connect(filter);
  filter.connect(g2);
  g1.connect(out());
  g2.connect(out());
  osc.start(now);
  noise.start(now);
  osc.stop(now + 0.16);
  noise.stop(now + 0.16);
}

export function playBossDeath() {
  const c = ctx();
  const now = c.currentTime;
  // 深层爆炸
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(20, now + 1.2);
  const lfo = c.createOscillator();
  lfo.frequency.value = 12;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 40;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  const g1 = gainEnv(c, 0.02, 1.2, 0.35, now);
  // 噪声爆炸
  const noise = noiseNode(c, 0.6);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);
  const g2 = gainEnv(c, 0.01, 0.55, 0.25, now);
  osc.connect(g1);
  noise.connect(filter);
  filter.connect(g2);
  g1.connect(out());
  g2.connect(out());
  lfo.start(now);
  osc.start(now);
  noise.start(now);
  lfo.stop(now + 1.3);
  osc.stop(now + 1.3);
  noise.stop(now + 1.3);
}

// ---- XP 拾取 ----

export function playXpPickup() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.setValueAtTime(1100, now + 0.04);
  osc.frequency.setValueAtTime(1320, now + 0.08);
  const g = gainEnv(c, 0.005, 0.12, 0.08, now);
  osc.connect(g);
  g.connect(out());
  osc.start(now);
  osc.stop(now + 0.15);
}

// ---- Boss 预警 ----

export function playBossWarning() {
  const c = ctx();
  const now = c.currentTime;
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.25;
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(660, t + 0.06);
    const g = gainEnv(c, 0.01, 0.15, 0.1, t);
    osc.connect(g);
    g.connect(out());
    osc.start(t);
    osc.stop(t + 0.2);
  }
}

// ---- 玩家受伤 ----

export function playPlayerDamage() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
  const noise = noiseNode(c, 0.1);
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.5;
  const g1 = gainEnv(c, 0.005, 0.15, 0.15, now);
  const g2 = gainEnv(c, 0.005, 0.1, 0.08, now);
  osc.connect(g1);
  noise.connect(filter);
  filter.connect(g2);
  g1.connect(out());
  g2.connect(out());
  osc.start(now);
  noise.start(now);
  osc.stop(now + 0.2);
  noise.stop(now + 0.2);
}

// ---- Boss 技能音效 ----

export function playCpuHeatWave() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.linearRampToValueAtTime(80, now + 0.4);
  const lfo = c.createOscillator();
  lfo.frequency.value = 20;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  const g = gainEnv(c, 0.05, 0.4, 0.2, now);
  osc.connect(g);
  g.connect(out());
  lfo.start(now);
  osc.start(now);
  lfo.stop(now + 0.5);
  osc.stop(now + 0.5);
}

export function playCpuCharge() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.linearRampToValueAtTime(400, now + 0.3);
  const g = gainEnv(c, 0.01, 0.3, 0.15, now);
  osc.connect(g);
  g.connect(out());
  osc.start(now);
  osc.stop(now + 0.35);
}

export function playRootkitSpawn() {
  const c = ctx();
  const now = c.currentTime;
  for (let i = 0; i < 2; i++) {
    const t = now + i * 0.08;
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    const g = gainEnv(c, 0.005, 0.1, 0.08, t);
    osc.connect(g);
    g.connect(out());
    osc.start(t);
    osc.stop(t + 0.12);
  }
}

export function playRootkitProjectile() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
  const g = gainEnv(c, 0.005, 0.12, 0.08, now);
  osc.connect(g);
  g.connect(out());
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playGpuBeam() {
  const c = ctx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.linearRampToValueAtTime(600, now + 0.08);
  osc.frequency.linearRampToValueAtTime(200, now + 0.16);
  const g = gainEnv(c, 0.005, 0.18, 0.12, now);
  osc.connect(g);
  g.connect(out());
  osc.start(now);
  osc.stop(now + 0.22);
}

export function playGpuVolley() {
  const c = ctx();
  const now = c.currentTime;
  for (let i = 0; i < 4; i++) {
    const t = now + i * 0.06;
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(500 + i * 100, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);
    const g = gainEnv(c, 0.003, 0.07, 0.06, t);
    osc.connect(g);
    g.connect(out());
    osc.start(t);
    osc.stop(t + 0.1);
  }
}
