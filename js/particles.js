// Storage War — 粒子系统（增强版：震屏、闪屏、技能特效粒子）

import { randomBetween } from './utils.js';

// ---- 全局特效状态 ----

export const screenFX = {
  shakeIntensity: 0,
  shakeDuration: 0,
  flashAlpha: 0,
  flashDuration: 0,
  flashColor: '#ffffff',
};

/** 触发屏幕震动 */
export function addScreenShake(intensity, duration) {
  screenFX.shakeIntensity = Math.max(screenFX.shakeIntensity, intensity);
  screenFX.shakeDuration = Math.max(screenFX.shakeDuration, duration);
}

/** 触发屏幕闪白 */
export function addScreenFlash(alpha, duration, color = '#ffffff') {
  screenFX.flashAlpha = Math.max(screenFX.flashAlpha, alpha);
  screenFX.flashDuration = Math.max(screenFX.flashDuration, duration);
  screenFX.flashColor = color;
}

/** 每帧更新全局特效 */
export function updateScreenFX(dt) {
  if (screenFX.shakeDuration > 0) {
    screenFX.shakeDuration -= dt;
    if (screenFX.shakeDuration <= 0) screenFX.shakeIntensity = 0;
  }
  if (screenFX.flashDuration > 0) {
    screenFX.flashDuration -= dt;
    if (screenFX.flashDuration <= 0) screenFX.flashAlpha = 0;
  }
}

/** 获取当前屏幕震动偏移 */
export function getShakeOffset() {
  if (screenFX.shakeDuration <= 0) return { x: 0, y: 0 };
  const i = screenFX.shakeIntensity * (screenFX.shakeDuration / Math.max(screenFX.shakeDuration + 0.1, 0.1));
  return {
    x: (Math.random() - 0.5) * i * 2,
    y: (Math.random() - 0.5) * i * 2,
  };
}

// ---- 粒子类 ----

export class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  get isDead() { return this.life <= 0; }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
}

// ---- 基础粒子工厂 ----

export function spawnHitParticles(particles, x, y, color, count = 5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(40, 150);
    particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, randomBetween(2, 5), randomBetween(0.15, 0.4)));
  }
}

export function spawnDeathParticles(particles, x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(60, 200);
    particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, randomBetween(3, 7), randomBetween(0.3, 0.7)));
  }
}

export function spawnLevelUpParticles(particles, x, y) {
  const colors = ['#ffd700', '#a29bfe', '#74b9ff', '#ff4757', '#00d2d3'];
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(80, 300);
    particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, colors[Math.floor(Math.random() * colors.length)], randomBetween(3, 8), randomBetween(0.5, 1.2)));
  }
}

// ---- 技能特效粒子工厂 ----

/** Disk Defrag 冲击波粒子 */
export function spawnShockwaveParticles(particles, x, y) {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(100, 350);
    particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#74b9ff', randomBetween(2, 6), randomBetween(0.3, 0.8)));
  }
}

/** Firewall 灼烧粒子 */
export function spawnFirewallParticles(particles, x, y) {
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(20, 80);
    particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ff6348', randomBetween(2, 4), randomBetween(0.2, 0.5)));
  }
}

/** Virus Spread 感染粒子 */
export function spawnVirusParticles(particles, x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = randomBetween(20, 60);
  particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#00ff44', randomBetween(1, 3), randomBetween(0.3, 0.7)));
}

/** Format C:// 全屏核爆粒子 */
export function spawnScreenNukeParticles(particles, x, y) {
  const colors = ['#ffd700', '#ff6348', '#ff4757', '#ffa502', '#ffffff'];
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(150, 600);
    particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, colors[Math.floor(Math.random() * colors.length)], randomBetween(3, 10), randomBetween(0.5, 1.5)));
  }
  // 第二波延迟粒子（更大更慢）
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(50, 200);
    particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ffd700', randomBetween(5, 12), randomBetween(0.8, 2.0)));
  }
}

// ---- 清理 ----

export function updateParticles(particles, dt, maxParticles = 300) {
  for (const p of particles) p.update(dt);
  let alive = particles.filter(p => !p.isDead);
  if (alive.length > maxParticles) alive = alive.slice(alive.length - maxParticles);
  return alive;
}
