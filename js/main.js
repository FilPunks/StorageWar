// Storage War — 主入口 & 游戏循环 v2（武器系统集成）

import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, SPAWNER, ENEMY_TYPES } from './constants.js';
import { initInput, getMovementVector, isKeyPressed, isKeyJustPressed } from './input.js';
import { Player, XpCoin, Enemy } from './entities.js';
import {
  drawBackground, drawPlayer, drawEnemies, drawProjectiles,
  drawXpCoins, drawParticles, drawHUD, drawPlayerEffects, drawBossEffects,
} from './renderer.js';
import { EnemySpawner } from './systems.js';
import { distance, circleCollision } from './utils.js';
import {
  rollSkills, applySkill, initPlayerWeapons, updateAllWeapons, postUpdateWeapons, setWeaponCtxEnemies,
  RARITY_COLORS,
} from './skills.js';
import { UpgradeUI } from './ui.js';
import {
  updateParticles, spawnDeathParticles, spawnLevelUpParticles,
  screenFX, updateScreenFX, getShakeOffset, addScreenShake,
} from './particles.js';
import { t, getLanguage, setLanguage } from './i18n.js';
import { initAudio, isMuted, toggleMute,
  playEnemyDeath, playBossDeath, playXpPickup,
  playBossWarning, playPlayerDamage, playPingPulse,
  playKernelCrash,
} from './audio.js';

const STATE = { MENU: 'menu', PLAYING: 'playing', UPGRADING: 'upgrading', PAUSED: 'paused', GAMEOVER: 'gameover' };

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.state = STATE.MENU;
    this.lastTime = 0;
    this.gameTime = 0;
    this.kills = 0;
    this.camX = 0;
    this.camY = 0;

    this.player = null;
    this.spawner = null;
    this.enemies = [];
    this.projectiles = [];
    this.xpCoins = [];
    this.particles = [];

    this.running = false;
    this.paused = false;
    this.upgradeUI = new UpgradeUI();

    // 语言切换按钮
    this.langBtn = document.getElementById('lang-toggle');
    this._updateLangBtn();
    this.langBtn.addEventListener('click', () => {
      const newLang = getLanguage() === 'zh' ? 'en' : 'zh';
      setLanguage(newLang);
      this._updateLangBtn();
      this._updateDonateText();
      const title = document.getElementById('upgrade-title');
      if (title) title.textContent = t('upgrade.title');
    });

    // 音效开关按钮
    this.soundBtn = document.getElementById('sound-toggle');
    this._updateSoundBtn();
    this.soundBtn.addEventListener('click', () => {
      toggleMute();
      this._updateSoundBtn();
    });

    // 赞助复制按钮
    this.donateText = document.getElementById('donate-text');
    this.copyBtn = document.getElementById('copy-btn');
    this._updateDonateText();
    this.copyBtn.addEventListener('click', () => {
      const addr = '0x8fD277649299407aef2BF6Bd88c89D2f14a75EfC';
      navigator.clipboard.writeText(addr).then(() => {
        this.copyBtn.textContent = '✓';
        this.copyBtn.classList.add('copied');
        setTimeout(() => {
          this.copyBtn.textContent = '⎘';
          this.copyBtn.classList.remove('copied');
        }, 1500);
      }).catch(() => {});
    });
  }

  start() {
    initInput();
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  _updateLangBtn() {
    if (this.langBtn) {
      this.langBtn.textContent = '中/EN';
    }
  }

  _updateSoundBtn() {
    if (this.soundBtn) {
      if (isMuted()) {
        this.soundBtn.textContent = '♪';
        this.soundBtn.classList.add('muted');
      } else {
        this.soundBtn.textContent = '♪';
        this.soundBtn.classList.remove('muted');
      }
    }
  }

  _updateDonateText() {
    if (this.donateText) {
      this.donateText.textContent = t('menu.donate');
    }
  }

  /** Retro 像素风多层文字渲染 */
  _drawRetroText(ctx, text, x, y, font, mainColor, shadowColor, layerCount, stepX, stepY) {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mr = parseInt(mainColor.slice(1, 3), 16);
    const mg = parseInt(mainColor.slice(3, 5), 16);
    const mb = parseInt(mainColor.slice(5, 7), 16);
    const sr = parseInt(shadowColor.slice(1, 3), 16);
    const sg = parseInt(shadowColor.slice(3, 5), 16);
    const sb = parseInt(shadowColor.slice(5, 7), 16);
    // 多层阴影：从暗到亮，shadowColor → mainColor
    for (let i = layerCount; i >= 1; i--) {
      const t = i / (layerCount + 1);
      const r = Math.floor(sr + (mr - sr) * t);
      const g = Math.floor(sg + (mg - sg) * t);
      const b = Math.floor(sb + (mb - sb) * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(text, x + stepX * i, y + stepY * i);
    }
    // 最上层：主色
    ctx.fillStyle = mainColor;
    ctx.fillText(text, x, y);
  }

  loop(timestamp) {
    if (!this.running) return;
    try {
      const rawDt = (timestamp - this.lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      this.lastTime = timestamp;
      this.update(dt);
      this.render();
    } catch (e) {
      console.error('Game loop error:', e);
      this.renderError(e);
      return;
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // P 键暂停/继续
    if (isKeyJustPressed('p') && (this.state === STATE.PLAYING || this.state === STATE.UPGRADING || this.state === STATE.PAUSED)) {
      if (this.state === STATE.PAUSED) {
        this.state = this._prePauseState || STATE.PLAYING;
        this.paused = false;
      } else {
        this._prePauseState = this.state;
        this.state = STATE.PAUSED;
        this.paused = true;
      }
      return;
    }

    switch (this.state) {
      case STATE.MENU: this.updateMenu(dt); break;
      case STATE.PLAYING: this.updatePlaying(dt); break;
      case STATE.UPGRADING: break;
      case STATE.PAUSED: break;
      case STATE.GAMEOVER: this.updateGameOver(dt); break;
    }
  }

  updateMenu(_dt) {
    if (isKeyPressed(' ') || isKeyPressed('Enter')) this.startGame();
  }

  updatePlaying(dt) {
    this.gameTime += dt;
    updateScreenFX(dt);

    // 玩家移动
    const inputVec = getMovementVector();
    // System Crash: 方向反转
    if (this._systemCrashDebuff && this._systemCrashDebuff.type === 'reverse') {
      inputVec.x *= -1;
      inputVec.y *= -1;
    }
    this.player.update(dt, inputVec);

    // RAID Redundancy Lv5: 低血量回复翻倍
    if (this.player.skillState.raid5 && this.player.hp < this.player.maxHp * 0.3) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.hpRegen * dt);
    }

    // 摄像机
    this.camX = this.player.x - CANVAS_WIDTH / 2;
    this.camY = this.player.y - CANVAS_HEIGHT / 2;

    // 敌人生成
    this.spawner.update(dt, this.gameTime, this.enemies, SPAWNER.maxEnemies, this.camX, this.camY);

    // Kernel Panic System Crash 逻辑更新
    this.updateSystemCrash(dt);

    // 敌人移动
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.x, this.player.y, this.player, this.projectiles, this.enemies, this.gameTime);
    }

    // Corrupted File 感染：触碰其他敌人后传染
    for (const enemy of this.enemies) {
      if (enemy.typeKey !== 'corrupt' || enemy.hp <= 0) continue;
      for (const other of this.enemies) {
        if (other === enemy || other.typeKey === 'corrupt' || other._corrupted || other.isBoss) continue;
        if (circleCollision(enemy, other)) {
          other._corrupted = true;
          // 属性提升 50%
          other.hp *= 1.5;
          other.maxHp *= 1.5;
          other.speed *= 1.5;
          other.damage = Math.floor(other.damage * 1.5);
          other._corruptColor = enemy.color;
        }
      }
    }

    // Boss 生成系统
    this.spawnBosses(dt);

    // Boss 预警计时器
    if (this._bossWarnings) {
      for (const w of this._bossWarnings) w.timeRemaining -= dt;
      this._bossWarnings = this._bossWarnings.filter(w => w.timeRemaining > 0);
    }

    // Boss 特效处理
    this.processBossEffects(dt);

    // ===== 武器系统 =====
    setWeaponCtxEnemies(this.enemies);
    updateAllWeapons(this.player, dt, {
      enemies: this.enemies,
      projectiles: this.projectiles,
      particles: this.particles,
      gameTime: this.gameTime,
    });

    // 弹幕更新 + 敌人弹幕碰撞玩家
    for (const p of this.projectiles) {
      p.update(dt);
      if (p._enemyProjectile && !p.isDead && circleCollision(p, this.player)) {
        const wasInvincible = this.player.isInvincible;
        const died = this.player.takeDamage(p.damage);
        if (!died && !wasInvincible) playPlayerDamage();
        p.lifetime = -1; // 命中后消失
        if (died) { this.endGame(); return; }
      }
    }

    // 弹幕碰撞
    this.checkProjectileCollisions();

    // 清理弹幕
    this.projectiles = this.projectiles.filter(p => !p.isDead);

    // 技能后处理
    this.postProcessEffects(dt);

    // 清理技能击杀的敌人
    this.processSkillKills();

    // 武器后处理
    postUpdateWeapons(this.player, dt);
    this.processSkillKills();

    // Cloud Backup Lv5 自动拾取
    if (this.player.skillState.cloud5) {
      this.player.cloudBackupTimer = (this.player.cloudBackupTimer || 0) + dt;
      if (this.player.cloudBackupTimer >= 60) {
        this.player.cloudBackupTimer = 0;
        for (const coin of this.xpCoins) {
          coin.beingMagnetized = true;
        }
      }
    }

    // 粒子
    this.particles = updateParticles(this.particles, dt);

    // XP Coin
    const levelUps = this.updateXpCoins(dt);

    // 玩家-敌人碰撞
    if (this.checkPlayerEnemyCollision()) {
      this.endGame();
    }
    // 清理自爆 SSD
    this.processSkillKills();

    if (levelUps > 0) this.handleLevelUp(levelUps);
  }

  /** 弹幕碰撞检测（含暴击、溅射、生命偷取） */
  checkProjectileCollisions() {
    for (const p of this.projectiles) {
      if (p._enemyProjectile) continue; // 跳过敌人弹幕
      for (const enemy of this.enemies) {
        if (p.hitEnemies.has(enemy)) continue;
        if (!circleCollision(p, enemy)) continue;

        // ECC Memory Lv5 暴击
        let dmg = p.damage;
        let isCrit = false;
        if (this.player.critChance > 0 && Math.random() < this.player.critChance) {
          dmg *= 2;
          isCrit = true;
        }

        const killed = enemy.takeDamage(dmg);
        p.hitEnemies.add(enemy);
        p.pierce--;

        // 生命偷取（Cooling Fan Blades）
        if (p._lifeSteal && p._lifeSteal > 0) {
          this.player.heal(Math.floor(dmg * p._lifeSteal));
        }

        if (killed) {
          this.kills++;
          this.xpCoins.push(new XpCoin(enemy.x, enemy.y, enemy.xpValue));
          spawnDeathParticles(this.particles, enemy.x, enemy.y, enemy.color);
          playEnemyDeath();
        } else {
          // 击中粒子
          const pColor = p.color || '#ffffff';
          for (let i = 0; i < (isCrit ? 8 : 3); i++) {
            this.particles.push({
              x: p.x, y: p.y,
              vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
              color: isCrit ? '#ffd700' : pColor,
              size: isCrit ? 3 + Math.random() * 4 : 1 + Math.random() * 3,
              life: 0.2 + Math.random() * 0.3, maxLife: 0.5,
              update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; },
              get isDead() { return this.life <= 0; },
              get alpha() { return this.life / this.maxLife; },
            });
          }
        }
      }
    }
  }

  /** 后处理特效（火痕伤害、黑洞爆炸伤害） */
  postProcessEffects(dt) {
    // 火痕伤害
    for (const ft of this.player.fireTrails) {
      for (const enemy of this.enemies) {
        if (distance(ft.x, ft.y, enemy.x, enemy.y) < ft.radius + enemy.radius) {
          enemy.hp -= ft.dps * dt;
        }
      }
    }

    // 黑洞爆炸
    if (this.player._bhExplosions) {
      for (const ex of this.player._bhExplosions) {
        for (const enemy of this.enemies) {
          if (distance(ex.x, ex.y, enemy.x, enemy.y) < ex.radius + enemy.radius) {
            enemy.hp -= ex.damage;
          }
        }
        // 爆炸粒子
        for (let i = 0; i < 20; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 50 + Math.random() * 200;
          this.particles.push({
            x: ex.x, y: ex.y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            color: '#b464ff', size: 2 + Math.random() * 5,
            life: 0.3 + Math.random() * 0.5, maxLife: 0.8,
            update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; },
            get isDead() { return this.life <= 0; },
            get alpha() { return this.life / this.maxLife; },
          });
        }
      }
      this.player._bhExplosions = [];
    }
  }

  /** 清理被技能杀死的敌人 */
  processSkillKills() {
    const alive = this.enemies.filter(e => e.hp > 0);
    const dead = this.enemies.filter(e => e.hp <= 0);
    for (const enemy of dead) {
      this.kills++;
      this.xpCoins.push(new XpCoin(enemy.x, enemy.y, enemy.xpValue));
      if (enemy.isBoss) {
        playBossDeath();
        // Boss 大型爆炸效果
        const count = 40 + Math.floor(enemy.radius * 0.8);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 100 + Math.random() * 350;
          const size = 3 + Math.random() * 12;
          this.particles.push({
            x: enemy.x, y: enemy.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? '#ffd700' : enemy.color),
            size, life: 0.5 + Math.random() * 1.0, maxLife: 1.5,
            update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; },
            get isDead() { return this.life <= 0; },
            get alpha() { return this.life / this.maxLife; },
          });
        }
        addScreenShake(10, 0.5);
      } else {
        playEnemyDeath();
        spawnDeathParticles(this.particles, enemy.x, enemy.y, enemy.color);
      }
    }
    if (dead.length > 0) this.enemies = alive;
  }

  checkPlayerEnemyCollision() {
    for (const enemy of this.enemies) {
      if (circleCollision(this.player, enemy)) {
        const wasInvincible = this.player.isInvincible;
        const died = this.player.takeDamage(enemy.damage);
        if (!died && !wasInvincible) playPlayerDamage();
        // SSD 自爆：撞到玩家后自身消亡
        if (enemy.typeKey === 'ssd') {
          // SSD 自爆额外伤害
          const reduction = this.player.damageReduction || 0;
          this.player.hp -= Math.floor(enemy.damage * 0.8 * (1 - reduction));
          enemy.hp = 0;
          this.kills++;
          this.xpCoins.push(new XpCoin(enemy.x, enemy.y, enemy.xpValue));
          spawnDeathParticles(this.particles, enemy.x, enemy.y, enemy.color);
        }
        if (died) return true;
      }
    }
    return false;
  }

  /** System Crash：Kernel Panic Boss 的干扰 debuff */
  updateSystemCrash(dt) {
    // 检查 Kernel Panic Boss 是否触发了 System Crash
    for (const enemy of this.enemies) {
      if (enemy.typeKey !== 'kernelPanic' || !enemy._triggerSystemCrash) continue;
      enemy._triggerSystemCrash = false;
      playKernelCrash();

      const types = ['reverse', 'teleport'];
      const type = types[Math.floor(Math.random() * types.length)];

      if (type === 'cooldown') {
        this._systemCrashDebuff = { type: 'cooldown', timer: 3 };
        for (const [, entry] of this.player.activeWeapons) {
          entry._crashCDBonus = (entry._crashCDBonus || 0) + 0.5;
        }
      } else if (type === 'reverse') {
        this._systemCrashDebuff = { type: 'reverse', timer: 2.5 };
      } else if (type === 'teleport') {
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 140;
        this.player.x += Math.cos(angle) * dist;
        this.player.y += Math.sin(angle) * dist;
        addScreenShake(8, 0.4);
        this._systemCrashDebuff = { type: null, timer: 0 };
      }
    }

    if (this._systemCrashDebuff && this._systemCrashDebuff.timer > 0) {
      this._systemCrashDebuff.timer -= dt;
      if (this._systemCrashDebuff.timer <= 0) {
        if (this._systemCrashDebuff.type === 'cooldown') {
          for (const [, entry] of this.player.activeWeapons) {
            entry._crashCDBonus = Math.max(0, (entry._crashCDBonus || 0) - 0.5);
          }
        }
        this._systemCrashDebuff = null;
      }
    }
  }

  /** Boss 定时生成 */
  spawnBosses(_dt) {
    const bosses = [
      { key: 'cpu', time: 90, name: t('enemy.cpu') },
      { key: 'rootkit', time: 240, name: t('enemy.rootkit') },
      { key: 'gpu', time: 450, name: t('enemy.gpu') },
      { key: 'kernelPanic', time: 660, name: t('enemy.kernelPanic') },
    ];
    const warningDuration = 3; // 预警持续 3 秒
    for (const b of bosses) {
      if (!this._bossesSpawned[b.key] && !this._bossesWarned[b.key] &&
          this.gameTime >= b.time - warningDuration) {
        // 触发预警
        this._bossesWarned[b.key] = true;
        playBossWarning();
        if (!this._bossWarnings) this._bossWarnings = [];
        this._bossWarnings.push({
          key: b.key, name: b.name,
          timeRemaining: warningDuration,
          maxTime: warningDuration,
        });
      }
      if (!this._bossesSpawned[b.key] && this.gameTime >= b.time) {
        this._bossesSpawned[b.key] = true;
        const def = { key: b.key, ...ENEMY_TYPES[b.key] };
        const margin = 100;
        const side = Math.floor(Math.random() * 4);
        let ex, ey;
        switch (side) {
          case 0:
            ex = this.player.x + (Math.random() - 0.5) * CANVAS_WIDTH;
            ey = this.player.y - CANVAS_HEIGHT / 2 - margin;
            break;
          case 1:
            ex = this.player.x + (Math.random() - 0.5) * CANVAS_WIDTH;
            ey = this.player.y + CANVAS_HEIGHT / 2 + margin;
            break;
          case 2:
            ex = this.player.x - CANVAS_WIDTH / 2 - margin;
            ey = this.player.y + (Math.random() - 0.5) * CANVAS_HEIGHT;
            break;
          case 3:
            ex = this.player.x + CANVAS_WIDTH / 2 + margin;
            ey = this.player.y + (Math.random() - 0.5) * CANVAS_HEIGHT;
            break;
        }
        this.enemies.push(new Enemy(def, ex, ey, this.gameTime));
        addScreenShake(8, 0.3);
      }
    }
  }

  /** Boss 特效处理（热浪、GPU火痕等对玩家/敌人造成伤害） */
  processBossEffects(dt) {
    for (const enemy of this.enemies) {
      // CPU 热浪伤害玩家
      if (enemy._heatWaves && enemy._heatWaves.length > 0) {
        for (const w of enemy._heatWaves) {
          const progress = 1 - w.life / w.maxLife;
          const r = w.radius || (10 + progress * 140);
          if (circleCollision({ x: enemy.x, y: enemy.y, radius: r }, this.player)) {
            this.player.takeDamage(w.damage * dt);
          }
        }
      }
      // GPU 火痕伤害玩家
      if (enemy._fireTrails && enemy._fireTrails.length > 0) {
        for (const ft of enemy._fireTrails) {
          if (distance(ft.x, ft.y, this.player.x, this.player.y) < ft.radius + this.player.radius) {
            this.player.hp -= ft.dps * dt;
          }
        }
      }
    }
  }

  updateXpCoins(dt) {
    let levelUps = 0;
    for (const coin of this.xpCoins) {
      coin.update(dt);
      const dist = distance(coin.x, coin.y, this.player.x, this.player.y);
      if (dist < this.player.pickupRange + 40) {
        coin.beingMagnetized = true;
        const speed = 400;
        const dx = this.player.x - coin.x, dy = this.player.y - coin.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        coin.x += (dx / len) * speed * dt;
        coin.y += (dy / len) * speed * dt;
      }
      if (circleCollision(coin, this.player)) {
        if (this.player.addXp(coin.xpValue)) levelUps++;
        playXpPickup();
        coin.lifetime = -1;
      }
    }
    this.xpCoins = this.xpCoins.filter(c => !c.isExpired && c.lifetime > 0);
    return levelUps;
  }

  async handleLevelUp(count = 1) {
    for (let i = 0; i < count; i++) {
      this.state = STATE.UPGRADING;
      playPingPulse();
      const choices = rollSkills(this.player, 3);
      if (choices.length === 0) { this.state = STATE.PLAYING; return; }
      const chosen = await this.upgradeUI.show(choices, this.player);
      applySkill(this.player, chosen);
      spawnLevelUpParticles(this.particles, this.player.x, this.player.y);
    }
    this.state = STATE.PLAYING;
  }

  updateGameOver(_dt) {
    if (isKeyPressed(' ') || isKeyPressed('Enter')) this.startGame();
  }

  startGame() {
    initAudio();
    this.gameTime = 0;
    this.kills = 0;
    this.player = new Player();
    this.spawner = new EnemySpawner();
    this.enemies = [];
    this.projectiles = [];
    this.xpCoins = [];
    this.particles = [];
    this._bossesSpawned = {};
    this._bossesWarned = {};
    this._bossWarnings = [];
    this._systemCrashDebuff = null;
    initPlayerWeapons(this.player);
    screenFX.shakeIntensity = 0;
    screenFX.shakeDuration = 0;
    screenFX.flashAlpha = 0;
    screenFX.flashDuration = 0;
    this.paused = false;
    this.state = STATE.PLAYING;
  }

  endGame() {
    this.state = STATE.GAMEOVER;
    addScreenShake(12, 0.5);
  }

  // ========== 渲染 ==========

  render() {
    const { ctx } = this;
    drawBackground(ctx, this.camX, this.camY);

    switch (this.state) {
      case STATE.MENU: this.renderMenu(); break;
      case STATE.PLAYING:
      case STATE.UPGRADING:
      case STATE.PAUSED:
        this.renderPlaying();
        if (this.state === STATE.PAUSED) this.renderPause();
        break;
      case STATE.GAMEOVER:
        this.renderPlaying();
        this.renderGameOver();
        break;
    }
  }

  renderMenu() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this._drawRetroText(ctx, t('menu.title'), cx, cy - 90, 'bold 88px monospace',
      '#2080f0', '#081830', 5, 5, 5);
    this._drawRetroText(ctx, t('menu.subtitle'), cx, cy - 10, 'bold 26px monospace',
      '#2080f0', '#081830', 3, 2, 2);
    ctx.fillStyle = COLORS.menuText;
    ctx.font = '16px monospace';
    ctx.fillText(t('menu.move'), cx, cy + 50);
    ctx.fillText(t('menu.auto'), cx, cy + 80);
    ctx.fillText(t('menu.collect'), cx, cy + 110);
    const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 600);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(t('menu.start'), cx, cy + 180);
  }

  renderPlaying() {
    const { ctx } = this;
    const shake = getShakeOffset();

    ctx.save();
    ctx.translate(-this.camX + shake.x, -this.camY + shake.y);

    drawXpCoins(ctx, this.xpCoins);
    drawEnemies(ctx, this.enemies);

    if (this.player) {
      drawPlayer(ctx, this.player);
      drawPlayerEffects(ctx, this.player);
    }

    drawProjectiles(ctx, this.projectiles);
    drawParticles(ctx, this.particles);
    drawBossEffects(ctx, this.enemies);

    ctx.restore();

    drawHUD(ctx, this.gameTime, this.kills, this.player, this.enemies, this._bossWarnings, this._systemCrashDebuff);
  }

  renderPause() {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = canvas.width / 2, cy = canvas.height / 2;
    this._drawRetroText(ctx, 'PAUSED', cx, cy, 'bold 52px monospace',
      '#dfe6e9', '#1a1a3a', 4, 3, 3);
    ctx.fillStyle = '#888';
    ctx.font = '16px monospace';
    ctx.fillText(t('pause.hint'), cx, cy + 50);
  }

  renderGameOver() {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this._drawRetroText(ctx, t('gameover.title'), cx, cy - 100, 'bold 80px monospace',
      '#ff4757', '#2a0000', 6, 5, 5);
    ctx.fillStyle = COLORS.menuText;
    ctx.font = '20px monospace';
    ctx.fillText(t('gameover.time', { time: this.gameTime.toFixed(1) }), cx, cy - 10);
    ctx.fillText(t('gameover.kills', { kills: this.kills }), cx, cy + 40);
    ctx.fillText(t('gameover.level', { level: this.player ? this.player.level : 1 }), cx, cy + 70);
    const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 600);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(t('gameover.restart'), cx, cy + 120);
  }

  renderError(e) {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff4757';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('error.title'), canvas.width / 2, canvas.height / 2 - 40);
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    const lines = (e.message || String(e)).match(/.{1,60}/g) || [String(e)];
    lines.forEach((l, i) => ctx.fillText(l, canvas.width / 2, canvas.height / 2 + i * 18));
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText(t('error.hint'), canvas.width / 2, canvas.height / 2 + lines.length * 18 + 20);
  }
}

if (!window.__IS_MOBILE) {
  const game = new Game();
  game.start();
}
