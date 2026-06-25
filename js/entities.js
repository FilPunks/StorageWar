// Storage War — 游戏实体类 (Player, Enemy, Projectile, XP Coin)

import { PLAYER, CANVAS_WIDTH, CANVAS_HEIGHT, XP, ENEMY_TYPES } from './constants.js';
import { distance, normalize, angleBetween } from './utils.js';
import { PROJECTILE } from './constants.js';
import {
  playCpuHeatWave, playCpuCharge,
  playRootkitSpawn, playRootkitProjectile,
  playGpuBeam, playGpuVolley,
  playPlayerDamage,
  playPumpGrow, playPumpExplode,
} from './audio.js';

/** 玩家 */
export class Player {
  constructor() {
    this.x = CANVAS_WIDTH / 2;
    this.y = CANVAS_HEIGHT / 2;
    this.radius = PLAYER.radius;
    this.speed = PLAYER.speed;
    this.hp = PLAYER.maxHp;
    this.maxHp = PLAYER.maxHp;
    this.damage = PLAYER.damage;
    this.attackSpeed = PLAYER.attackSpeed;
    this.attackRange = PLAYER.attackRange;
    this.pickupRange = PLAYER.pickupRange;
    this.invincibleTime = PLAYER.invincibleTime;
    this.invincibleTimer = 0;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = XP.baseToLevel;

    // --- 主动武器系统 ---
    // activeWeapons: Map<weaponId, { level, cooldownTimer, evolved }>
    this.activeWeapons = new Map();
    // passiveSkills: Map<passiveId, { level }>
    this.passiveSkills = new Map();

    // 被动属性加成（由被动技能叠加）
    this.hpRegen = 0;             // 每秒 HP 回复
    this.critChance = 0;          // 暴击率 (0-1)
    this.projectileCount = 1;     // 弹幕数加成
    this.pierceCount = 0;         // 穿透加成
    this.projectileSize = 1;      // 弹幕大小倍率
    this.attackSpeedBonus = 0;    // 攻速额外倍率（Overclock Lv5）
    this.coolDownReduction = 0;   // 冷却缩减 (0-1)
    this.damageBonus = 0;         // 攻击力额外倍率 (ECC Memory)
    this.damageReduction = 0;     // 减伤 (Firewall Rules)

    // 运行时状态
    this.speedTrail = [];         // NVMe Bus 加速尾迹
    this.fireTrails = [];         // Next-Gen Firewall 火痕
    this.blackHoles = [];         // Zip Black Hole 活动黑洞
    this.cloudBackupTimer = 0;    // Cloud Backup Lv5 自动拾取计时
  }

  get xpProgress() {
    return this.xp / this.xpToNext;
  }

  get isInvincible() {
    return this.invincibleTimer > 0;
  }

  /** 每帧更新 */
  update(dt, inputVec) {
    // 无敌计时
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }

    // 移动
    const vx = inputVec.x * this.speed;
    const vy = inputVec.y * this.speed;

    this.x += vx * dt;
    this.y += vy * dt;

    // HP 回复
    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
    }
  }

  /** 受到伤害 */
  takeDamage(amount) {
    if (this.isInvincible) return false;
    const reduction = this.damageReduction || 0;
    const dmg = Math.floor(amount * (1 - reduction));
    this.hp -= dmg;
    this.invincibleTimer = this.invincibleTime;
    return this.hp <= 0;
  }

  /** 获得经验，返回是否升级 */
  addXp(amount) {
    const multiplier = this.xpMultiplier || 1;
    const ml5Bonus = (this.skillState?.ml5) ? 0.5 : 0;
    this.xp += Math.floor(amount * (multiplier + ml5Bonus));
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(XP.baseToLevel * Math.pow(XP.levelMultiplier, this.level - 1));
      return true;
    }
    return false;
  }

  /** 治疗 */
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}

/** 敌人 */
export class Enemy {
  constructor(typeDef, x, y, gameTime) {
    this.typeKey = typeDef.key || typeDef; // key string or direct typeDef object
    this.x = x;
    this.y = y;
    this.radius = typeDef.radius;
    this.hp = typeDef.hp * (1 + gameTime * 0.003);   // 随时间变强 — 15分钟约3.7x
    this.maxHp = this.hp;
    this.speed = typeDef.speed * (1 + gameTime * 0.001);
    this.damage = typeDef.damage * (1 + gameTime * 0.002);
    this.xpValue = Math.floor(typeDef.xpValue * (1 + gameTime * 0.002));
    this.isBoss = typeDef.isBoss || false;
    this.color = typeDef.color;
    this.hpColor = typeDef.hpColor;

    // 视觉：微微随机旋转和偏移，避免所有同类型敌人看起来完全一样
    this.angle = Math.random() * Math.PI * 2;
    this.wobble = Math.random() * Math.PI * 2;

    // Virus Spread DOT
    this.virusDamage = 0;
    this.virusTimer = 0;

    // 特殊行为计时器
    this.attackTimer = 0;
    this.paralyzeTimer = 0;
  }

  /** 每帧更新：根据敌人类型执行不同行为 */
  update(dt, playerX, playerY, player, projectiles, enemies, gameTime) {
    // Firewall 减速效果：临时降速
    const savedSpeed = this.speed;
    if (this._firewallSlowed) {
      this.speed *= 0.7;
      // 红色减速波纹
      if (!this._firewallRipples) this._firewallRipples = [];
      if (!this._fwRippleTimer) this._fwRippleTimer = 0;
      this._fwRippleTimer += dt;
      if (this._fwRippleTimer >= 0.35) {
        this._fwRippleTimer = 0;
        const rippleMaxR = this.radius * 1.2;
        this._firewallRipples.push({ radius: 3, maxRadius: rippleMaxR, life: 0.5, maxLife: 0.5 });
      }
      for (const r of this._firewallRipples) r.life -= dt;
      this._firewallRipples = this._firewallRipples.filter(r => r.life > 0);
    } else {
      // 离开 Firewall 范围：清除红色波纹
      if (this._firewallRipples && this._firewallRipples.length > 0) {
        this._firewallRipples = [];
        this._fwRippleTimer = 0;
      }
    }
    this._firewallSlowed = false; // 每帧重置
    this._inBlackHole = false;    // 每帧重置

    // 击退滑动（Format Drive）
    if (this._knockbackVx !== undefined) {
      this.x += this._knockbackVx * dt;
      this.y += this._knockbackVy * dt;
      // 每帧衰减
      const decay = 0.88;
      this._knockbackVx *= decay;
      this._knockbackVy *= decay;
      if (Math.abs(this._knockbackVx) < 1 && Math.abs(this._knockbackVy) < 1) {
        this._knockbackVx = undefined;
        this._knockbackVy = undefined;
      }
    }

    // 时间停止（Absolute Zero）：非Boss敌人静止，无法攻击
    if (this._timeStopped) {
      this._timeStopTimer -= dt;
      // 白色波纹效果
      if (!this._timeStopRipples) this._timeStopRipples = [];
      if (!this._tsRippleTimer) this._tsRippleTimer = 0;
      this._tsRippleTimer += dt;
      if (this._tsRippleTimer >= 0.3) {
        this._tsRippleTimer = 0;
        const rippleMaxR = this.radius * 1.5;
        this._timeStopRipples.push({ radius: 3, maxRadius: rippleMaxR, life: 0.6, maxLife: 0.6, _white: true });
      }
      for (const r of this._timeStopRipples) r.life -= dt;
      this._timeStopRipples = this._timeStopRipples.filter(r => r.life > 0);
      this.wobble += dt * 3;
      if (this._timeStopTimer <= 0) {
        this._timeStopped = false;
        this._timeStopRipples = [];
        this._tsRippleTimer = 0;
      }
      this.speed = savedSpeed;
      return;
    }
    // 清除时间停止残留波纹
    if (this._timeStopRipples && this._timeStopRipples.length > 0) {
      this._timeStopRipples = [];
      this._tsRippleTimer = 0;
    }

    // 麻痹状态：无法移动，产生波纹视觉效果
    if (this.paralyzeTimer > 0) {
      this.paralyzeTimer -= dt;
      // 管理麻痹波纹
      if (!this._paralyzeRings) this._paralyzeRings = [];
      if (!this._paralyzeRingTimer) this._paralyzeRingTimer = 0;
      this._paralyzeRingTimer += dt;
      if (this._paralyzeRingTimer >= 0.4) {
        this._paralyzeRingTimer = 0;
        this._paralyzeRings.push({ radius: 5, maxRadius: 50, life: 0.8, maxLife: 0.8 });
      }
      for (const r of this._paralyzeRings) r.life -= dt;
      this._paralyzeRings = this._paralyzeRings.filter(r => r.life > 0);
      this.wobble += dt * 3;
      this.speed = savedSpeed;
      return;
    }
    // 麻痹恢复：清除波纹效果
    if (this._paralyzeRings && this._paralyzeRings.length > 0) {
      this._paralyzeRings = [];
      this._paralyzeRingTimer = 0;
    }

    const dist = distance(this.x, this.y, playerX, playerY);
    if (dist <= 0) { this.wobble += dt * 3; return; }

    if (this.typeKey === 'ssd') {
      // SSD: 200px 内发起冲锋，途中不减速，直冲到底
      const chargeRange = 180;
      const charging = dist < chargeRange;
      this._isCharging = charging;
      if (charging) {
        const minutes = (gameTime || 0) / 60;
        const ratio = Math.min(1.20, 0.95 + minutes * 0.01);
        const chargeSpeed = PLAYER.speed * ratio;
        const dir = normalize(playerX - this.x, playerY - this.y);
        this.x += dir.x * chargeSpeed * dt;
        this.y += dir.y * chargeSpeed * dt;
      } else if (dist > 0) {
        const dir = normalize(playerX - this.x, playerY - this.y);
        this.x += dir.x * this.speed * dt;
        this.y += dir.y * this.speed * dt;
      }
    } else if (this.typeKey === 'usb') {
      // USB: 玩家靠近时后退，始终远程攻击
      const retreatRange = 240;
      if (dist < retreatRange) {
        // 远离玩家
        const dir = normalize(this.x - playerX, this.y - playerY);
        const retreatSpeed = this.speed * 0.55;
        this.x += dir.x * retreatSpeed * dt;
        this.y += dir.y * retreatSpeed * dt;
      } else if (dist > 0) {
        const dir = normalize(playerX - this.x, playerY - this.y);
        this.x += dir.x * this.speed * dt;
        this.y += dir.y * this.speed * dt;
      }

      // 远程攻击：1 发高伤害弹幕
      this.attackTimer += dt;
      if (this.attackTimer >= 4.0 && projectiles && !this._inBlackHole) {
        this.attackTimer = 0;
        const a = Math.atan2(playerY - this.y, playerX - this.x);
        projectiles.push({
          x: this.x, y: this.y,
          vx: Math.cos(a) * 200,
          vy: Math.sin(a) * 200,
          radius: 4,
          damage: Math.floor(this.damage * 1.6),
          lifetime: 8.0,
          color: '#ff3333',
          _enemyProjectile: true,
          update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
          get isDead() { return this.lifetime <= 0; },
        });
      }
    } else if (this.typeKey === 'cpu') {
      // Boss 1: Overclocked CPU — 慢速移动 + 热浪 + 周期性冲锋
      const dir = normalize(playerX - this.x, playerY - this.y);
      this.x += dir.x * this.speed * dt;
      this.y += dir.y * this.speed * dt;

      // 热浪攻击
      this.attackTimer += dt;
      if (this.attackTimer >= 4.0) {
        this.attackTimer = 0;
        playCpuHeatWave();
        if (!this._heatWaves) this._heatWaves = [];
        this._heatWaves.push({ radius: 10, maxRadius: 150, life: 0.8, maxLife: 0.8, damage: this.damage * 0.7 });
      }
      if (this._heatWaves) {
        for (const w of this._heatWaves) w.life -= dt;
        this._heatWaves = this._heatWaves.filter(w => w.life > 0);
      }

      // 周期性冲锋（无半血限制）
      if (!this._chargeTimer) this._chargeTimer = 0;
      this._chargeTimer += dt;
      if (this._chargeTimer >= 6.0) {
        this._chargeTimer = 0;
        this._isCharging = true;
        playCpuCharge();
      }
      if (this._isCharging) {
        const chargeSpeed = PLAYER.speed * 1.1;
        this.x += dir.x * chargeSpeed * dt;
        this.y += dir.y * chargeSpeed * dt;
        if (!this._chargeDuration) this._chargeDuration = 0;
        this._chargeDuration += dt;
        if (this._chargeDuration >= 0.8) {
          this._isCharging = false;
          this._chargeDuration = 0;
        }
      }
    } else if (this.typeKey === 'rootkit') {
      // Boss 2: Ransomware Rootkit — 环绕玩家 + 召唤小兵 + 远程攻击
      const orbitDist = 200;
      const angle = Math.atan2(this.y - playerY, this.x - playerX);
      // 切向移动（环绕）
      const tangentX = -Math.sin(angle);
      const tangentY = Math.cos(angle);
      this.x += tangentX * this.speed * dt;
      this.y += tangentY * this.speed * dt;
      // 保持轨道距离
      if (dist > orbitDist + 20) {
        const pullDir = normalize(playerX - this.x, playerY - this.y);
        this.x += pullDir.x * this.speed * 0.5 * dt;
        this.y += pullDir.y * this.speed * 0.5 * dt;
      } else if (dist < orbitDist - 20) {
        const pushDir = normalize(this.x - playerX, this.y - playerY);
        this.x += pushDir.x * this.speed * 0.5 * dt;
        this.y += pushDir.y * this.speed * 0.5 * dt;
      }

      // 召唤小兵
      this.attackTimer += dt;
      const spawnRate = this.hp < this.maxHp * 0.3 ? 2.0 : 3.5;
      if (this.attackTimer >= spawnRate && enemies) {
        this.attackTimer = 0;
        playRootkitSpawn();
        for (let i = 0; i < 2; i++) {
          const sx = this.x + (Math.random() - 0.5) * 80;
          const sy = this.y + (Math.random() - 0.5) * 80;
          enemies.push(new Enemy(
            { key: 'corrupt', ...ENEMY_TYPES.corrupt }, sx, sy, 0
          ));
        }
      }

      // 远程绿色弹幕
      if (!this._rangedTimer) this._rangedTimer = 0;
      this._rangedTimer += dt;
      if (this._rangedTimer >= 2.0 && projectiles) {
        this._rangedTimer = 0;
        playRootkitProjectile();
        const a = Math.atan2(playerY - this.y, playerX - this.x);
        for (let j = 0; j < 3; j++) {
          const spread = (j - 1) * 0.2;
          projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(a + spread) * 200,
            vy: Math.sin(a + spread) * 200,
            radius: 3, damage: Math.floor(this.damage * 0.5),
            lifetime: 99, color: '#00ff44',
            _enemyProjectile: true,
            update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
            get isDead() { return this.lifetime <= 0; },
          });
        }
      }
    } else if (this.typeKey === 'gpu') {
      // Boss 3: NVIDIA RTX 9090 — 旋转激光 + 风扇漩涡 + 过载模式
      const dir = normalize(playerX - this.x, playerY - this.y);
      this.x += dir.x * this.speed * dt;
      this.y += dir.y * this.speed * dt;

      const hpRatio = this.hp / this.maxHp;
      const rageMode = hpRatio < 0.3;
      const attackCD = rageMode ? 1.2 : (hpRatio < 0.6 ? 2.0 : 3.0);

      // RTX 旋转激光
      if (!this._beamAngle) this._beamAngle = 0;
      this._beamAngle += (rageMode ? 4.0 : 2.0) * dt;
      const beamLen = 400;
      const beamEndX = this.x + Math.cos(this._beamAngle) * beamLen;
      const beamEndY = this.y + Math.sin(this._beamAngle) * beamLen;
      if (!this._beams) this._beams = [];
      this._beams = [{ x1: this.x, y1: this.y, x2: beamEndX, y2: beamEndY, life: 0.05, color: '#76b900', width: 8 }];
      // 激光伤害玩家
      if (player) {
        const beamDx = beamEndX - this.x;
        const beamDy = beamEndY - this.y;
        const beamLenSq = beamDx * beamDx + beamDy * beamDy;
        if (beamLenSq > 0) {
          let t = ((playerX - this.x) * beamDx + (playerY - this.y) * beamDy) / beamLenSq;
          t = Math.max(0, Math.min(1, t));
          const closestX = this.x + t * beamDx;
          const closestY = this.y + t * beamDy;
          const cdx = playerX - closestX;
          const cdy = playerY - closestY;
          const distToBeam = Math.sqrt(cdx * cdx + cdy * cdy);
          if (distToBeam < player.radius + 10) {
            // 每次扫过立即造成伤害，0.4s 冷却（光束扫过玩家仅~0.09s，不能累计计时）
            if (!this._beamHitCooldown) this._beamHitCooldown = 0;
            if (this._beamHitCooldown <= 0) {
              const reduction = player.damageReduction || 0;
              player.hp -= Math.floor(this.damage * 0.5 * (1 - reduction));
              playGpuBeam();
              playPlayerDamage();
              this._beamHitCooldown = 0.4;
            }
          }
          if (this._beamHitCooldown !== undefined) this._beamHitCooldown -= dt;
        }
      }

      // 风扇漩涡（拉玩家）
      if (hpRatio < 0.6) {
        if (dist < 300 && player) {
          const pullX = (this.x - playerX) * 0.3 * dt;
          const pullY = (this.y - playerY) * 0.3 * dt;
          // 通过修改玩家位置实现吸引（间接通过 inputVec）
          player.x += pullX;
          player.y += pullY;
        }
      }

      // 弹幕攻击
      this.attackTimer += dt;
      if (this.attackTimer >= attackCD && projectiles) {
        this.attackTimer = 0;
        playGpuVolley();
        const count = rageMode ? 8 : 5;
        for (let j = 0; j < count; j++) {
          const a = (j / count) * Math.PI * 2 + this._beamAngle;
          projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(a) * (rageMode ? 250 : 180),
            vy: Math.sin(a) * (rageMode ? 250 : 180),
            radius: 3, damage: Math.floor(this.damage * 0.35),
            lifetime: 1.8, color: '#76b900',
            _enemyProjectile: true,
            update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
            get isDead() { return this.lifetime <= 0; },
          });
        }
      }

      // 过载模式（不留火痕）
      if (this._fireTrails) {
        for (const ft of this._fireTrails) ft.life -= dt;
        this._fireTrails = this._fireTrails.filter(ft => ft.life > 0);
      }
    } else if (this.typeKey === 'kernelPanic') {
      // Boss 4: Kernel Panic — 缓慢追踪 + Core Dump + System Crash
      const dir = normalize(playerX - this.x, playerY - this.y);
      this.x += dir.x * this.speed * dt;
      this.y += dir.y * this.speed * dt;

      // Core Dump：周期性密集弹幕（半血后频率翻倍）
      const hpRatio = this.hp / this.maxHp;
      const rageMode = hpRatio < 0.5;
      this.attackTimer += dt;
      const coreDumpCD = rageMode ? 2.5 : 4.5;
      if (this.attackTimer >= coreDumpCD && projectiles) {
        this.attackTimer = 0;
        const count = rageMode ? 16 : 10;
        // 半血后触发一次性 Stack Overflow：生成 3 个子进程
        if (rageMode && !this._hasSplit && enemies) {
          this._hasSplit = true;
          this._stackOverflowTriggered = true;
          const childDef = { key: 'childProcess', ...ENEMY_TYPES.childProcess };
          for (let c = 0; c < 3; c++) {
            const cx = this.x + (Math.random() - 0.5) * 100;
            const cy = this.y + (Math.random() - 0.5) * 100;
            enemies.push(new Enemy(childDef, cx, cy, gameTime || 0));
          }
        }
        for (let i = 0; i < count; i++) {
          const baseAngle = (i / count) * Math.PI * 2;
          const speed = 100 + Math.random() * 80;
          projectiles.push({
            x: this.x, y: this.y,
            _baseVx: Math.cos(baseAngle) * speed,
            _baseVy: Math.sin(baseAngle) * speed,
            vx: Math.cos(baseAngle) * speed,
            vy: Math.sin(baseAngle) * speed,
            radius: 12, damage: Math.floor(this.damage * 0.4),
            lifetime: 8, color: '#ffffff',
            _enemyProjectile: true, _isMemoryFrag: true,
            _wobblePhase: Math.random() * Math.PI * 2,
            _wobbleAmp: 40 + Math.random() * 40,
            update(dt) {
              const lifeRatio = this.lifetime / 2.5;
              const wobble = Math.sin(lifeRatio * 12 + this._wobblePhase) * this._wobbleAmp * lifeRatio;
              const len = Math.sqrt(this._baseVx * this._baseVx + this._baseVy * this._baseVy) || 1;
              this.vx = this._baseVx + (-this._baseVy / len) * wobble;
              this.vy = this._baseVy + (this._baseVx / len) * wobble;
              this.x += this.vx * dt;
              this.y += this.vy * dt;
              this.lifetime -= dt;
            },
            get isDead() { return this.lifetime <= 0; },
          });
        }
      }

      // System Crash 计时器（在 main.js 中处理实际 debuff）
      if (!this._crashTimer) this._crashTimer = 0;
      this._crashTimer += dt;
      const crashCD = rageMode ? 7 : 10;
      if (this._crashTimer >= crashCD) {
        this._crashTimer = 0;
        this._triggerSystemCrash = true;
      }

    } else if (this.typeKey === 'childProcess') {
      // Child Process: 快速追踪玩家
      const dir = normalize(playerX - this.x, playerY - this.y);
      this.x += dir.x * this.speed * dt;
      this.y += dir.y * this.speed * dt;

    } else if (this.typeKey === 'pumpAndDump') {
      // Pump & Dump — 三阶段循环 Boss
      if (!this._phase) {
        this._phase = 'pump';
        this._phaseTimer = 0;
        this._pumpMeter = 0;
        this._baseRadius = this.radius;
      }

      const hpRatio = this.hp / this.maxHp;
      this._phaseTimer += dt;

      if (this._phase === 'pump') {
        // 膨胀期：变大、变慢、远程吸取 XP 币
        const pumpDuration = 6 + Math.random() * 2;
        const progress = Math.min(1, this._phaseTimer / pumpDuration);
        this.radius = this._baseRadius + progress * 55;
        this.speed = savedSpeed * (1.2 - progress * 0.4);
        this._xpSuction = true;
        this._xpSuctionRadius = 500;

        const dir = normalize(playerX - this.x, playerY - this.y);
        this.x += dir.x * this.speed * dt;
        this.y += dir.y * this.speed * dt;

        // 稀疏弹幕（不限距离）
        this.attackTimer += dt;
        if (this.attackTimer >= 1.8 && projectiles) {
          this.attackTimer = 0;
          const a = Math.atan2(playerY - this.y, playerX - this.x);
          projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(a) * 150, vy: Math.sin(a) * 150,
            radius: 4, damage: Math.floor(this.damage * 0.4),
            lifetime: 99, color: '#22cc66',
            _enemyProjectile: true,
            update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
            get isDead() { return this.lifetime <= 0; },
          });
        }

        if (progress >= 1) {
          this._phase = 'peak';
          this._phaseTimer = 0;
          playPumpGrow();
        }

      } else if (this._phase === 'peak') {
        // 峰值预警 0.8s
        if (this._phaseTimer >= 0.8) {
          // Dump 爆炸
          playPumpExplode();
          if (projectiles) {
            const ringDmg = Math.floor(this.damage * (1 + this._pumpMeter * 0.02));
            // 大范围冲击波
            projectiles.push({
              x: this.x, y: this.y,
              vx: 0, vy: 0, radius: 0,
              _expandSpeed: 500, _maxRadius: 500,
              damage: Math.min(ringDmg, this.damage * 3),
              lifetime: 1.0, maxLife: 1.0, color: '#ff3333',
              _enemyProjectile: true, _isDumpRing: true,
              update(dt) { this.radius += this._expandSpeed * dt; this.lifetime -= dt; },
              get isDead() { return this.lifetime <= 0; },
            });
            // 弹片：红色 XP（数量随 pumpMeter）
            const shrapCount = 8 + Math.floor(this._pumpMeter * 0.5);
            for (let i = 0; i < shrapCount; i++) {
              const sa = (i / shrapCount) * Math.PI * 2 + Math.random() * 0.3;
              const ss = 180 + Math.random() * 250;
              projectiles.push({
                x: this.x, y: this.y,
                vx: Math.cos(sa) * ss, vy: Math.sin(sa) * ss,
                radius: 6, damage: Math.floor(this.damage * 0.6),
                lifetime: 99, color: '#ff3333',
                _enemyProjectile: true, _isRedXp: true,
                update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
                get isDead() { return this.lifetime <= 0; },
              });
            }
          }
          this._phase = 'crash';
          this._phaseTimer = 0;
          this._pumpMeter = 0;
        }

      } else if (this._phase === 'crash') {
        // 低谷期：小而快，逃跑
        this._xpSuction = false;
        this.radius = this._baseRadius * 0.45;
        this.speed = savedSpeed * 1.5;
        const fleeDir = normalize(this.x - playerX, this.y - playerY);
        this.x += fleeDir.x * this.speed * dt;
        this.y += fleeDir.y * this.speed * dt;
        // 少量弱弹幕
        this.attackTimer += dt;
        if (this.attackTimer >= 2.5 && projectiles) {
          this.attackTimer = 0;
          const a = Math.random() * Math.PI * 2;
          projectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(a) * 100, vy: Math.sin(a) * 100,
            radius: 3, damage: Math.floor(this.damage * 0.2),
            lifetime: 99, color: '#88ccaa',
            _enemyProjectile: true,
            update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
            get isDead() { return this.lifetime <= 0; },
          });
        }

        if (this._phaseTimer >= 4) {
          this._phase = 'pump';
          this._phaseTimer = 0;
          playPumpGrow();
        }
      }

    } else if (this.typeKey === 'dogeCoin') {
      // Doge Coin — 弹跳狗币 + meme 攻击
      if (!this._vx) {
        const a = Math.random() * Math.PI * 2;
        this._vx = Math.cos(a) * this.speed;
        this._vy = Math.sin(a) * this.speed;
        this._memeTimer = 0;
        this._memeText = '';
        this._memeTextTimer = 0;
        this._fireTimer = 0;
      }

      const hpRatio = this.hp / this.maxHp;

      // 弹跳移动（血量越低越快）
      const spdMult = 1 + (1 - hpRatio) * 0.5;
      this.x += this._vx * spdMult * dt;
      this.y += this._vy * spdMult * dt;
      if (this.x < playerX - CANVAS_WIDTH/2 + this.radius) { this.x = playerX - CANVAS_WIDTH/2 + this.radius; this._vx *= -1; }
      if (this.x > playerX + CANVAS_WIDTH/2 - this.radius) { this.x = playerX + CANVAS_WIDTH/2 - this.radius; this._vx *= -1; }
      if (this.y < playerY - CANVAS_HEIGHT/2 + this.radius) { this.y = playerY - CANVAS_HEIGHT/2 + this.radius; this._vy *= -1; }
      if (this.y > playerY + CANVAS_HEIGHT/2 - this.radius) { this.y = playerY + CANVAS_HEIGHT/2 - this.radius; this._vy *= -1; }

      // 持续射击追踪弹（狗币样式）
      this._fireTimer += dt;
      const fireCD = hpRatio > 0.5 ? 0.6 : (hpRatio > 0.25 ? 0.45 : 0.3);
      if (this._fireTimer >= fireCD && projectiles) {
        this._fireTimer = 0;
        const a = Math.atan2(playerY - this.y, playerX - this.x);
        projectiles.push({
          x: this.x, y: this.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180,
          radius: 7, damage: Math.floor(this.damage * 0.35),
          lifetime: 99, _enemyProjectile: true, _isDogeCoin: true,
          update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
          get isDead() { return this.lifetime <= 0; },
        });
      }

      // Meme 文字计时器
      if (this._memeTextTimer > 0) {
        this._memeTextTimer -= dt;
      } else {
        this._memeText = '';
      }

      // Meme 特殊攻击
      this._memeTimer += dt;
      const memeCD = hpRatio > 0.5 ? 2.5 : (hpRatio > 0.25 ? 2.0 : 1.5);

      if (this._memeTimer >= memeCD && projectiles) {
        this._memeTimer = 0;
        const roll = Math.random();
        if (roll < 0.3) {
          // wow — 环形狗币弹幕
          this._memeText = 'wow';
          this._memeTextTimer = 0.8;
          const count = 10;
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            projectiles.push({
              x: this.x, y: this.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
              radius: 8, damage: Math.floor(this.damage * 0.45),
              lifetime: 99, _enemyProjectile: true, _isDogeCoin: true,
              update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
              get isDead() { return this.lifetime <= 0; },
            });
          }
        } else if (roll < 0.55) {
          // much damage — 重型狗币追踪弹
          this._memeText = 'much damage';
          this._memeTextTimer = 0.8;
          const a = Math.atan2(playerY - this.y, playerX - this.x);
          projectiles.push({
            x: this.x, y: this.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
            radius: 14, damage: Math.floor(this.damage * 1.0),
            lifetime: 99, _enemyProjectile: true, _isDogeCoin: true,
            update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
            get isDead() { return this.lifetime <= 0; },
          });
        } else if (roll < 0.75) {
          // very fast — 加速弹跳
          this._memeText = 'very fast';
          this._memeTextTimer = 0.8;
          const a = Math.atan2(playerY - this.y, playerX - this.x);
          const spd = this.speed * 3;
          this._vx = Math.cos(a) * spd;
          this._vy = Math.sin(a) * spd;
        } else {
          // such danger — 扩散热浪环
          this._memeText = 'such danger';
          this._memeTextTimer = 1.0;
          if (!this._heatWaves) this._heatWaves = [];
          this._heatWaves.push({ radius: 15, maxRadius: 400, life: 1.3, maxLife: 1.3, damage: this.damage * 0.7, _color: "#c2a633" });
        }
      }
      // 热浪生命周期
      if (this._heatWaves) {
        for (const w of this._heatWaves) w.life -= dt;
        this._heatWaves = this._heatWaves.filter(w => w.life > 0);
      }

    } else {
      // 默认：向玩家移动
      const dir = normalize(playerX - this.x, playerY - this.y);
      this.x += dir.x * this.speed * dt;
      this.y += dir.y * this.speed * dt;
    }
    this.wobble += dt * 3;
    this.speed = savedSpeed;
  }
  takeDamage(amount) {
    this.hp -= amount;
    return this.hp <= 0;
  }
}

/** 弹幕 */
export class Projectile {
  constructor(x, y, targetX, targetY, damage, speed, radius, pierce) {
    const angle = angleBetween(x, y, targetX, targetY);
    // 加一点随机散布
    const spread = (Math.random() - 0.5) * 0.15;
    const finalAngle = angle + spread;

    this.x = x;
    this.y = y;
    this.vx = Math.cos(finalAngle) * speed;
    this.vy = Math.sin(finalAngle) * speed;
    this.radius = radius;
    this.damage = damage;
    this.pierce = pierce;
    this.lifetime = PROJECTILE.lifetime;
    this.hitEnemies = new Set();
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
  }

  get isDead() {
    return this.lifetime <= 0 || this.pierce < 0;
  }
}

/** XP Coin — Filecoin 风格代币 */
export class XpCoin {
  constructor(x, y, xpValue) {
    this.x = x;
    this.y = y;
    this.radius = XP.coinRadius;
    this.xpValue = xpValue;
    this.lifetime = XP.coinLifetime;
    this.pulse = Math.random() * Math.PI * 2; // 脉冲动画相位
    this.beingMagnetized = false; // 被磁铁吸引
  }

  update(dt) {
    this.lifetime -= dt;
    this.pulse += dt * 4;
  }

  get isExpired() {
    return this.lifetime <= 0;
  }
}
