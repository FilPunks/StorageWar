// Storage War — 技能系统 v2（仿 Vampire Survivors）
// 8 主动武器 + 8 被动技能，5级进化

import { randomFromArray, distance, angleBetween } from './utils.js';
import { PLAYER } from './constants.js';
import {
  playSectorSweep, playBitBlaster, playParticleBeam,
  playZipBlackHole, playUsbChain, playCoolingFan,
} from './audio.js';

const PLAYER_BASE_DAMAGE = PLAYER.damage;

// ============================================================
//  稀有度 / UI 常量
// ============================================================

export const RARITY_COLORS = {
  active: '#74b9ff',    // 蓝色 — 主动武器
  passive: '#55efc4',   // 绿色 — 被动技能
  evolved: '#ffd700',   // 金色 — 进化武器
};

// ============================================================
//  主动武器定义
// ============================================================

const ACTIVE_WEAPONS = [
  {
    id: 'sectorSweep',
    name: 'Sector Sweep',
    emoji: '🔪',
    type: 'active',
    description: '前方弧斩',
    maxLevel: 5,
    initialLevel: 1, // 开局自带
    cooldowns: [1.2, 1.1, 1.0, 0.9, 0.7],
    evolveName: 'Format Drive',
    evolveDesc: '360°环形斩 + 击退',
  },
  {
    id: 'bitBlaster',
    name: 'Bit Blaster',
    emoji: '🔫',
    type: 'active',
    description: '锁定全屏敌人发射像素弹',
    maxLevel: 5,
    cooldowns: [0.6, 0.5, 0.4, 0.35, 0.25],
    evolveName: 'Quantum Stream',
    evolveDesc: '保留锁定弹 + 每1.5秒360°全方向齐射24发',
  },
  {
    id: 'particleBeam',
    name: '404 Particle Beam',
    emoji: '⚡',
    type: 'active',
    description: '随机方向粗激光束，直线穿透',
    maxLevel: 5,
    cooldowns: [2.5, 2.2, 1.9, 1.5, 1.8],
    evolveName: '502 Gateway Blast',
    evolveDesc: '双束激光 + 偶尔十字交叉四束',
  },
  {
    id: 'pingPulse',
    name: 'Ping Pulse Charge',
    emoji: '📡',
    type: 'active',
    description: '脉冲球环绕，撞敌爆炸形成麻痹立场',
    maxLevel: 5,
    cooldowns: [0, 0, 0, 0, 0],
    evolveName: 'Latency Storm',
    evolveDesc: '球的数量翻倍',
  },
  {
    id: 'zipBlackHole',
    name: 'Zip Black Hole',
    emoji: '🕳️',
    type: 'active',
    description: '抛出迷你黑洞，吸引敌人并造成DOT',
    maxLevel: 5,
    cooldowns: [5, 4.5, 4, 3.5, 4.5],
    evolveName: 'Tarball Singularity',
    evolveDesc: '结束时范围内非Boss敌人被黑洞吞噬即死',
  },
  {
    id: 'firewall',
    name: 'Firewall',
    emoji: '🔥',
    type: 'active',
    description: '周身火焰光环，百分比灼烧 DOT',
    maxLevel: 5,
    cooldowns: [0, 0, 0, 0, 0],
    evolveName: 'Next-Gen Firewall',
    evolveDesc: '范围翻倍 + 非Boss敌人减速33%',
  },
  {
    id: 'usbChain',
    name: 'USB Chain Lightning',
    emoji: '🔗',
    type: 'active',
    description: '从天而降闪电链，弹跳于敌人之间',
    maxLevel: 5,
    cooldowns: [1.8, 1.5, 1.3, 1.0, 0.9],
    evolveName: 'Thunderbolt Protocol',
    evolveDesc: '8次弹跳 + 每击25px范围AOE伤害',
  },
  {
    id: 'coolingFan',
    name: 'Cooling Fan Blades',
    emoji: '🌀',
    type: 'active',
    description: '旋转扇叶追踪敌人，生命偷取25%',
    maxLevel: 5,
    cooldowns: [2.0, 1.8, 1.5, 1.2, 1.0],
    evolveName: 'Absolute Zero',
    evolveDesc: '周期时间停止：100px内非Boss敌人静止2秒',
  },
];

// ============================================================
//  被动技能定义
// ============================================================

const PASSIVE_SKILLS = [
  {
    id: 'raidRedundancy',
    name: 'RAID Redundancy',
    emoji: '💾',
    type: 'passive',
    description: '最大 HP +25，每秒回复 2 HP',
    maxLevel: 5,
    lv5Bonus: 'HP<30% 时回复翻倍',
    apply(player, level) {
      player.maxHp += 25;
      player.heal(25);
      player.hpRegen += 2;
      if (level >= 5) player.skillState.raid5 = true;
    },
  },
  {
    id: 'eccMemory',
    name: 'ECC Memory',
    emoji: '🧠',
    type: 'passive',
    description: '攻击力 +18%',
    maxLevel: 5,
    lv5Bonus: '弹幕15%暴击率(×2伤害)',
    apply(player, level) {
      player.damageBonus += 0.18;
      player.damage = Math.floor(PLAYER_BASE_DAMAGE * (1 + player.damageBonus));
      if (level >= 5) player.critChance = 0.15;
    },
  },
  {
    id: 'nvmeBus',
    name: 'NVMe Bus',
    emoji: '💨',
    type: 'passive',
    description: '闪避 +6.5%，移速 +3%',
    maxLevel: 5,
    lv5Bonus: '每3秒触发一次无敌帧',
    apply(player, level) {
      player.dodgeChance = level * 0.065;
      player.speed = PLAYER.speed * (1 + level * 0.03);
      if (level >= 5) player.skillState.nvme5 = true;
    },
  },
  {
    id: 'machineLearning',
    name: 'Machine Learning',
    emoji: '🤖',
    type: 'passive',
    description: '经验获取 +20%',
    maxLevel: 5,
    lv5Bonus: '拾取经验时额外 +50% 经验值',
    apply(player, level) {
      player.xpMultiplier = (player.xpMultiplier || 1) + 0.20;
      if (level >= 5) player.skillState.ml5 = true;
    },
  },
  {
    id: 'cloudBackup',
    name: 'Cloud Backup',
    emoji: '☁️',
    type: 'passive',
    description: '拾取范围 +35%',
    maxLevel: 5,
    lv5Bonus: '每60秒自动拾取全屏经验',
    apply(player, level) {
      player.pickupRange *= 1.35;
      if (level >= 5) player.skillState.cloud5 = true;
    },
  },
  {
    id: 'overclock',
    name: 'Overclock',
    emoji: '⏱️',
    type: 'passive',
    description: '主动武器冷却 -8%',
    maxLevel: 5,
    lv5Bonus: '所有主动武器 +1 弹幕数',
    apply(player, level) {
      player.coolDownReduction += 0.08;
      if (level >= 5) player.attackSpeedBonus += 1; // 额外弹幕数
    },
  },
  {
    id: 'firewallRules',
    name: 'Firewall Rules',
    emoji: '🛡️',
    type: 'passive',
    description: '受到伤害 -10%',
    maxLevel: 5,
    lv5Bonus: '无敌帧时间 +0.2s',
    apply(player, level) {
      player.damageReduction = Math.min(0.5, level * 0.1);
      if (level >= 5) player.invincibleTime = PLAYER.invincibleTime + 0.2;
    },
  },
];

// ============================================================
//  完整技能列表
// ============================================================

const ALL_SKILLS = [...ACTIVE_WEAPONS, ...PASSIVE_SKILLS];

// ============================================================
//  技能选择
// ============================================================

export function getAvailableSkills(player) {
  if (!player.skillLevels) player.skillLevels = {};

  return ALL_SKILLS.filter(skill => {
    const lv = player.skillLevels[skill.id] || 0;
    return lv < skill.maxLevel;
  });
}

export function rollSkills(player, count = 3) {
  const available = getAvailableSkills(player);
  if (available.length === 0) return [];

  // 简单随机抽（避免过度复杂权重）
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function applySkill(player, skill) {
  if (!player.skillLevels) player.skillLevels = {};
  if (!player.skillState) player.skillState = {};
  if (!player.activeWeapons) player.activeWeapons = new Map();
  if (!player.passiveSkills) player.passiveSkills = new Map();

  const currentLv = player.skillLevels[skill.id] || 0;
  const newLv = currentLv + 1;
  player.skillLevels[skill.id] = newLv;

  if (skill.type === 'active') {
    let entry = player.activeWeapons.get(skill.id);
    if (!entry) {
      entry = { level: 0, cooldownTimer: 0, evolved: false, emoji: skill.emoji };
      player.activeWeapons.set(skill.id, entry);
    }
    entry.level = newLv;
    entry.cooldownTimer = 0; // 升级时立即可以攻击一次

    // Lv5 进化
    if (newLv >= 5 && !entry.evolved) {
      entry.evolved = true;
    }
  }

  if (skill.type === 'passive') {
    let entry = player.passiveSkills.get(skill.id);
    if (!entry) {
      entry = { level: 0, emoji: skill.emoji };
      player.passiveSkills.set(skill.id, entry);
    }
    entry.level = newLv;
  }

  if (skill.apply) skill.apply(player, newLv);
}

// ============================================================
//  初始化
// ============================================================

export function initPlayerWeapons(player) {
  player.skillLevels = {};
  player.skillState = {};
  player.activeWeapons = new Map();
  player.passiveSkills = new Map();

  player.hpRegen = 0;
  player.critChance = 0;
  player.dodgeChance = 0;
  player.projectileCount = 1;
  player.pierceCount = 0;
  player.projectileSize = 1;
  player.attackSpeedBonus = 0;
  player.coolDownReduction = 0;
  player.damageBonus = 0;
  player.damageReduction = 0;
  player.invincibleTime = PLAYER.invincibleTime;
  player.xpMultiplier = 1;

  player.speedTrail = [];
  player.fireTrails = [];
  player.blackHoles = [];
  player.afterimages = [];    // NVMe Bus dodge afterimage
  player._timeStopCooldown = 0;
  player._nvmeInvincibleCooldown = 0;
  player._pulseFireReady = 0;

  // 初始武器：Sector Sweep Lv1
  const sectorSweep = ACTIVE_WEAPONS.find(w => w.id === 'sectorSweep');
  if (sectorSweep) applySkill(player, sectorSweep);
}

// ============================================================
//  武器行为引擎 — 每帧更新所有主动武器
// ============================================================

/**
 * @param {Object} player
 * @param {number} dt
 * @param {Object} ctx - { enemies, projectiles, particles, gameTime, screenFX }
 */
export function updateAllWeapons(player, dt, ctx) {
  const { enemies, projectiles, particles } = ctx;
  const extraCount = Math.floor(player.attackSpeedBonus); // Overclock Lv5 额外弹幕数

  for (const [weaponId, entry] of player.activeWeapons) {
    const weaponDef = ACTIVE_WEAPONS.find(w => w.id === weaponId);
    if (!weaponDef) continue;

    // 冷却缩减
    const cdReduction = 1 - Math.min(player.coolDownReduction, 0.6);
    const baseCD = weaponDef.cooldowns[Math.min(entry.level - 1, 4)];

    // 持续型武器（cooldown=0）每帧都触发
    if (baseCD <= 0) {
      fireWeapon(weaponDef, player, entry, enemies, projectiles, particles, extraCount, dt);
      continue;
    }

    // 冷却型武器
    entry.cooldownTimer -= dt;
    if (entry.cooldownTimer <= 0) {
      const crashBonus = 1 + (entry._crashCDBonus || 0);
      entry.cooldownTimer = baseCD * cdReduction * crashBonus;
      fireWeapon(weaponDef, player, entry, enemies, projectiles, particles, extraCount, dt);
    }
  }
}

// ============================================================
//  各武器开火逻辑
// ============================================================

function fireWeapon(weaponDef, player, entry, enemies, projectiles, particles, extraCount, dt) {
  const lv = entry.level;
  const evolved = entry.evolved;

  switch (weaponDef.id) {

    // ============ Sector Sweep ============
    case 'sectorSweep': {
      const slashRange = 120;
      const arcDeg = evolved ? 360 : [90, 120, 150, 180][Math.min(lv - 1, 3)];
      const arcRad = (arcDeg * Math.PI) / 180;
      // 面朝最近敌人，没有敌人则面朝右侧
      const nearest = findNearestEnemy(player, enemies, 9999);
      const baseAngle = nearest
        ? Math.atan2(nearest.y - player.y, nearest.x - player.x)
        : 0;

      const dmg = Math.floor(player.damage * (1.2 + (lv - 1) * 0.1));

      // 伤害弧内所有敌人
      for (const enemy of enemies) {
        const ed = distance(player.x, player.y, enemy.x, enemy.y);
        if (ed > slashRange + enemy.radius) continue;
        const aToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        let angleDiff = aToEnemy - baseAngle;
        // 归一化到 [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) < arcRad / 2) {
          enemy.takeDamage(dmg);
          if (evolved) {
            // Format Drive 击退（Boss、RAID 免疫）— 平滑滑动
            if (!enemy.isBoss) {
              enemy._knockbackVx = Math.cos(aToEnemy) * 400;
              enemy._knockbackVy = Math.sin(aToEnemy) * 400;
            }
          }
        }
      }

      // 刀刃横扫视觉
      if (!player._sectorSlashes) player._sectorSlashes = [];
      player._sectorSlashes.push({
        x: player.x, y: player.y,
        baseAngle, arcRad, range: slashRange,
        life: 0.25, maxLife: 0.25,
        clockwise: Math.random() > 0.5,
      });
      // 限制最多 3 个同时显示
      if (player._sectorSlashes.length > 3) player._sectorSlashes.shift();
      playSectorSweep();
      break;
    }

    // ============ Bit Blaster ============
    case 'bitBlaster': {
      if (enemies.length === 0) break;
      const nearest = findNearestEnemy(player, enemies, 9999);
      if (!nearest) break;

      // 普通像素弹（进化后保留）
      const count = (evolved ? 3 : [1, 2, 2, 3][Math.min(lv - 1, 3)]) + extraCount;
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.1;
        const a = Math.atan2(nearest.y - player.y, nearest.x - player.x) + spread;
        const dmg = Math.floor(player.damage * 0.8);
        const p = createProjectile(player.x, player.y, a, dmg, 550, 4, player.pierceCount, 1.2);
        p.color = '#ffffff';
        p._isBitBlaster = true;
        projectiles.push(p);
      }

      // Quantum Stream 进化：周期性 360° 全方向齐射
      if (evolved) {
        // 用冷却周期而非帧 dt 计时，避免计时器过慢
        const cdReduction = 1 - Math.min((player.coolDownReduction || 0), 0.6);
        const myCD = weaponDef.cooldowns[Math.min(lv - 1, 4)] * cdReduction;
        if (!player._bitBlasterVolleyTimer) player._bitBlasterVolleyTimer = 0;
        player._bitBlasterVolleyTimer += myCD;
        const volleyInterval = 1.5;
        if (player._bitBlasterVolleyTimer >= volleyInterval) {
          player._bitBlasterVolleyTimer -= volleyInterval;
          const volleyCount = 24;
          const dmg = Math.floor(player.damage * 0.6);
          for (let i = 0; i < volleyCount; i++) {
            const a = (i / volleyCount) * Math.PI * 2;
            const p = createProjectile(player.x, player.y, a, dmg, 500, 3, player.pierceCount, 2.0);
            p.color = '#74b9ff';
            p._isBitBlaster = true;
            projectiles.push(p);
          }
        }
      }
      playBitBlaster();
      break;
    }

    // ============ 404 Particle Beam ============
    case 'particleBeam': {
      if (enemies.length === 0) break;
      const target = findNearestEnemy(player, enemies, player.attackRange);
      if (!target) break;
      const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);

      const beamCount = evolved ? (Math.random() < 0.3 ? 4 : 2) : 1;
      for (let b = 0; b < beamCount; b++) {
        const a = baseAngle + (b - (beamCount - 1) / 2) * 0.3;
        const beamLen = 500;
        const endX = player.x + Math.cos(a) * beamLen;
        const endY = player.y + Math.sin(a) * beamLen;
        const beamWidth = [12, 15, 18, 20, 22][Math.min(lv - 1, 4)];
        const dmg = Math.floor(player.damage * (2.5 + (lv - 1) * 0.3));

        // 找出直线上所有敌人并造成伤害
        for (const enemy of enemies) {
          const distToBeam = pointToLineDist(enemy.x, enemy.y, player.x, player.y, endX, endY);
          if (distToBeam < enemy.radius + beamWidth) {
            enemy.takeDamage(dmg);
            spawnBeamParticles(particles, player.x, player.y, enemy.x, enemy.y, '#ff6348', 5);
          }
        }
        // 视觉效果：存储光束信息用于渲染
        if (!player._beams) player._beams = [];
        player._beams.push({ x1: player.x, y1: player.y, x2: endX, y2: endY, life: 0.3, color: '#ff6348', width: beamWidth });
      }
      playParticleBeam();
      break;
    }

    // ============ Ping Pulse Charge ============
    case 'pingPulse': {
      if (!player._pulseBalls) player._pulseBalls = [];

      const maxBalls = evolved ? lv * 2 : lv;
      const orbRadius = 8;
      const outerDist = 60 + (lv - 1) * 18;
      const innerDist = outerDist * 0.55;
      const outerSpeed = Math.min(2.3, 2.0 + (lv - 1) * 0.15);
      const innerSpeed = outerSpeed * 1.4;
      const fireSpeed = Math.min(250, outerSpeed * outerDist * 1.6);
      // 麻痹立场半径：Lv1=50px，每级+25px
      const paraRadius = 50 + (lv - 1) * 25;

      while (player._pulseBalls.length < maxBalls) {
        const idx = player._pulseBalls.length;
        const isInner = evolved && idx >= lv;
        const dist = isInner ? innerDist : outerDist;
        const a = Math.random() * Math.PI * 2;
        // 5 级进化后每个球速度有 ±20% 浮动，层次不齐
        const speedMult = evolved ? 0.8 + Math.random() * 0.4 : 1.0;
        player._pulseBalls.push({
          angle: a, state: 'orbiting', respawnTimer: 0,
          x: player.x + Math.cos(a) * dist,
          y: player.y + Math.sin(a) * dist,
          isInner, speedMult,
        });
      }
      while (player._pulseBalls.length > maxBalls) player._pulseBalls.pop();

      const orbitingBalls = player._pulseBalls.filter(b => b.state === 'orbiting');
      const firingBalls = player._pulseBalls.filter(b => b.state === 'firing');

      if (!player._pulseFireReady) player._pulseFireReady = 0;
      if (orbitingBalls.length === maxBalls) {
        player._pulseFireReady += dt;
      } else {
        player._pulseFireReady = 0;
      }

      if (orbitingBalls.length === maxBalls && player._pulseFireReady > 0.4 && firingBalls.length === 0 && enemies.length > 0) {
        const target = findNearestEnemy(player, enemies, 9999);
        if (target) {
          player._pulseFireReady = 0;
          const ball = player._pulseBalls[0];
          ball.state = 'firing';
          ball.originX = ball.x;
          ball.originY = ball.y;
          const a = Math.atan2(target.y - ball.y, target.x - ball.x);
          ball.fireVx = Math.cos(a) * fireSpeed;
          ball.fireVy = Math.sin(a) * fireSpeed;
          ball.distTraveled = 0;
          ball._hitEnemies = new Set();
          ball.radius = orbRadius;
        }
      }

      const dmg = Math.floor(player.damage * 0.4);
      for (const ball of player._pulseBalls) {
        if (ball.state === 'orbiting') {
          const dist = ball.isInner ? innerDist : outerDist;
          const speed = (ball.isInner ? innerSpeed : outerSpeed) * (ball.speedMult || 1);
          ball.angle += speed * dt;
          ball.x = player.x + Math.cos(ball.angle) * dist;
          ball.y = player.y + Math.sin(ball.angle) * dist;
          ball.radius = orbRadius;
        } else if (ball.state === 'firing') {
          ball.x += ball.fireVx * dt;
          ball.y += ball.fireVy * dt;
          ball.distTraveled = distance(ball.originX, ball.originY, ball.x, ball.y);
          ball.radius = orbRadius;

          let hitFirst = false;
          for (const enemy of enemies) {
            if (ball._hitEnemies.has(enemy)) continue;
            if (distance(ball.x, ball.y, enemy.x, enemy.y) < orbRadius + enemy.radius) {
              ball._hitEnemies.add(enemy);
              hitFirst = true;
              break;
            }
          }

          const travelMax = 600;
          if (hitFirst || ball.distTraveled >= travelMax) {
            if (hitFirst) {
              // 麻痹立场爆炸
              if (!player._paralyzeExplosions) player._paralyzeExplosions = [];
              player._paralyzeExplosions.push({
                x: ball.x, y: ball.y, radius: 5, maxRadius: paraRadius,
                life: 0.6, maxLife: 0.6,
              });
              for (const enemy of enemies) {
                if (enemy.isBoss) continue;
                const ed = distance(ball.x, ball.y, enemy.x, enemy.y);
                if (ed < paraRadius + enemy.radius) {
                  enemy.takeDamage(dmg);
                  enemy.paralyzeTimer = 3.0;
                }
              }
            }
            ball.state = 'respawning';
            ball.respawnTimer = 0.25 + Math.random() * 0.2;
          }
        } else if (ball.state === 'respawning') {
          ball.respawnTimer -= dt;
          if (ball.respawnTimer <= 0) {
            ball.state = 'orbiting';
            ball.angle = Math.random() * Math.PI * 2;
            ball.speedMult = evolved ? 0.8 + Math.random() * 0.4 : 1.0;
            const dist = ball.isInner ? innerDist : outerDist;
            ball.x = player.x + Math.cos(ball.angle) * dist;
            ball.y = player.y + Math.sin(ball.angle) * dist;
          }
        }
      }
      break;
    }

    // ============ Zip Black Hole ============
    case 'zipBlackHole': {
      if (enemies.length === 0) break;
      // 从距离玩家 350px 内的敌人中随机选一个
      const nearby = enemies.filter(e => distance(player.x, player.y, e.x, e.y) < 350);
      if (nearby.length === 0) break;
      const target = nearby[Math.floor(Math.random() * nearby.length)];

      const dur = [3, 3.5, 4, 4.5, 4.5][Math.min(lv - 1, 4)];
      const radius = evolved ? 150 : [95, 110, 125, 140, 155][Math.min(lv - 1, 4)];
      const dps = player.damage * (0.5 + (lv - 1) * 0.1);

      player.blackHoles.push({
        x: target.x, y: target.y, radius, life: dur, maxLife: dur,
        dps, succOnDeath: evolved,
      });
      playZipBlackHole();
      break;
    }

    // ============ Firewall ============
    case 'firewall': {
      const fwRadius = evolved ? 240 : 100 + (lv - 1) * 30;
      for (const enemy of enemies) {
        const ed = distance(player.x, player.y, enemy.x, enemy.y);
        if (ed < fwRadius + enemy.radius) {
          // 百分比 DOT：Boss 1%/级/秒，普通敌人 3%/级/秒
          const pctPerSec = enemy.isBoss ? 0.01 * lv : 0.03 * lv;
          enemy.hp -= enemy.maxHp * pctPerSec * dt;
          // 标记在防火墙内（增伤倍率 = 1 + 等级*0.1）
          enemy._inFirewall = true;
          enemy._firewallDmgMult = 1.0 + lv * 0.1;
          // 进化：减速非 Boss 敌人 33%
          if (evolved && !enemy.isBoss) {
            enemy._firewallSlowed = true;
          }
        }
      }
      break;
    }

    // ============ USB Chain Lightning（从天而降） ============
    case 'usbChain': {
      if (enemies.length === 0) break;
      // 从距离玩家 300px 内的敌人中随机选一个
      const nearby = enemies.filter(e => distance(player.x, player.y, e.x, e.y) < 300);
      if (nearby.length === 0) break;
      const firstTarget = nearby[Math.floor(Math.random() * nearby.length)];

      const bounces = evolved ? 8 : [2, 3, 4, 5][Math.min(lv - 1, 3)];
      const bounceRange = evolved ? 150 : [100, 110, 120, 130][Math.min(lv - 1, 3)];
      const baseDmg = Math.floor(player.damage * (1.0 + (lv - 1) * 0.1));
      const rampPerBounce = evolved ? 0.15 : 0;

      const hit = new Set();
      // 从天而降：起点在目标上方
      const skyY = firstTarget.y - 300;
      let chainPoints = [{ x: firstTarget.x, y: skyY }];
      let current = firstTarget;
      let dmg = baseDmg;

      for (let b = 0; b < bounces; b++) {
        if (!current) break;
        hit.add(current);
        current.takeDamage(dmg);
        // Thunderbolt Protocol 进化：25px AOE 伤害 + 视觉
        if (evolved) {
          for (const e of enemies) {
            if (e === current || hit.has(e)) continue;
            const aoeDist = distance(current.x, current.y, e.x, e.y);
            if (aoeDist < 25 + e.radius) {
              e.takeDamage(dmg);
            }
          }
          // AOE 视觉：金色扩散环
          if (!player._chainAoeRings) player._chainAoeRings = [];
          player._chainAoeRings.push({
            x: current.x, y: current.y,
            radius: 5, maxRadius: 30,
            life: 0.4, maxLife: 0.4,
          });
        }
        dmg = Math.floor(dmg * (1 + rampPerBounce));
        chainPoints.push({ x: current.x, y: current.y });
        // 密集粒子沿闪电路径
        spawnBeamParticles(particles, chainPoints[b].x, chainPoints[b].y, current.x, current.y, '#ffd700', 12);
        // 命中点火花环
        for (let j = 0; j < 8; j++) {
          const sa = (j / 8) * Math.PI * 2;
          particles.push({
            x: current.x, y: current.y,
            vx: Math.cos(sa) * (40 + Math.random() * 80),
            vy: Math.sin(sa) * (40 + Math.random() * 80),
            color: j % 2 === 0 ? '#ffd700' : '#ffffff',
            size: 2 + Math.random() * 3,
            life: 0.2 + Math.random() * 0.4, maxLife: 0.6,
            update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; },
            get isDead() { return this.life <= 0; },
            get alpha() { return this.life / this.maxLife; },
          });
        }
        current = findNearestEnemy(current, enemies.filter(e => !hit.has(e)), bounceRange);
      }

      if (chainPoints.length > 1) {
        if (!player._lightningChains) player._lightningChains = [];
        player._lightningChains.push({ points: chainPoints, life: 0.4, color: '#ffd700' });
      }
      playUsbChain();
      break;
    }

    // ============ Cooling Fan Blades ============
    case 'coolingFan': {
      if (enemies.length === 0) break;
      const bladeCount = [1, 1, 2, 2, 2][Math.min(lv - 1, 4)];
      const lifeStealPct = [0.25, 0.30, 0.35, 0.40, 0.45][Math.min(lv - 1, 4)];
      const bladeDmg = Math.floor(player.damage * (1.0 + (lv - 1) * 0.15));

      for (let i = 0; i < bladeCount; i++) {
        const target = findNearestEnemy(player, enemies, player.attackRange);
        if (!target) break;
        const a = Math.atan2(target.y - player.y, target.x - player.x) + (i - (bladeCount - 1) / 2) * 0.2;
        const p = createProjectile(player.x, player.y, a, bladeDmg, 320, 6, player.pierceCount, 0.8);
        p.color = '#00ff88';
        p._lifeSteal = lifeStealPct;
        p._isFanBlade = true;
        p._homingTarget = target;
        projectiles.push(p);
      }

      // Absolute Zero 进化：周期性时间停止
      if (evolved) {
        // 用冷却周期而非帧 dt 计时（与 Bit Blaster 相同的修复）
        const cdReduction = 1 - Math.min((player.coolDownReduction || 0), 0.6);
        const myCD = weaponDef.cooldowns[Math.min(lv - 1, 4)] * cdReduction;
        if (!player._timeStopCooldown) player._timeStopCooldown = 0;
        player._timeStopCooldown -= myCD;
        if (player._timeStopCooldown <= 0) {
          player._timeStopCooldown = 8.0;
          // 视觉：多重触发波纹 + 屏幕边缘提示
          if (!player._timeStopWaves) player._timeStopWaves = [];
          for (let w = 0; w < 3; w++) {
            player._timeStopWaves.push({ radius: 5 + w * 10, maxRadius: 120, life: 1.5, maxLife: 1.5 });
          }
          const freezeRange = 100;
          for (const enemy of enemies) {
            if (enemy.isBoss) continue;
            const ed = distance(player.x, player.y, enemy.x, enemy.y);
            if (ed < freezeRange + enemy.radius) {
              enemy._timeStopped = true;
              enemy._timeStopTimer = 2.0;
            }
          }
        }
      }
      playCoolingFan();
      break;
    }
  }
}

// ============================================================
//  每帧后处理：清理过期效果
// ============================================================

export function postUpdateWeapons(player, dt) {
  // 清理光束渲染数据
  if (player._beams) {
    for (const b of player._beams) b.life -= dt;
    player._beams = player._beams.filter(b => b.life > 0);
  }

  // 清理闪电链渲染数据
  if (player._lightningChains) {
    for (const c of player._lightningChains) c.life -= dt;
    player._lightningChains = player._lightningChains.filter(c => c.life > 0);
  }

  // 清理闪电链 AOE 视觉环
  if (player._chainAoeRings) {
    for (const r of player._chainAoeRings) r.life -= dt;
    player._chainAoeRings = player._chainAoeRings.filter(r => r.life > 0);
  }

  // 清理时间停止触发波纹
  if (player._timeStopWaves) {
    for (const w of player._timeStopWaves) w.life -= dt;
    player._timeStopWaves = player._timeStopWaves.filter(w => w.life > 0);
  }

  // 清理 ping 波纹
  if (player._pingRings) {
    for (const r of player._pingRings) r.life -= dt;
    player._pingRings = player._pingRings.filter(r => r.life > 0);
  }

  // 清理 Sector Sweep 刀刃视觉
  if (player._sectorSlashes) {
    for (const s of player._sectorSlashes) s.life -= dt;
    player._sectorSlashes = player._sectorSlashes.filter(s => s.life > 0);
  }

  // 清理麻痹爆炸环
  if (player._paralyzeExplosions) {
    for (const ex of player._paralyzeExplosions) ex.life -= dt;
    player._paralyzeExplosions = player._paralyzeExplosions.filter(ex => ex.life > 0);
  }

  // 更新火痕
  for (const ft of player.fireTrails) ft.life -= dt;
  player.fireTrails = player.fireTrails.filter(ft => ft.life > 0);

  // NVMe Bus Lv5 后像残影
  if (player.afterimages) {
    for (const a of player.afterimages) a.life -= dt;
    player.afterimages = player.afterimages.filter(a => a.life > 0);
  }

  // NVMe Bus 闪避移动残影：闪避后短时间内移动带出残影
  if (player._dodgeTrailTimer > 0) {
    player._dodgeTrailTimer -= dt;
    if (!player.afterimages) player.afterimages = [];
    // 每 0.06s 生成一个残影（移动时更密）
    if (!player._dodgeTrailSpawn) player._dodgeTrailSpawn = 0;
    player._dodgeTrailSpawn += dt;
    const spawnInterval = 0.05;
    while (player._dodgeTrailSpawn >= spawnInterval) {
      player._dodgeTrailSpawn -= spawnInterval;
      player.afterimages.push({
        x: player.x, y: player.y,
        life: 0.35, maxLife: 0.35,
        offsetX: (Math.random() - 0.5) * 12,
        offsetY: (Math.random() - 0.5) * 12,
      });
    }
  } else {
    player._dodgeTrailSpawn = 0;
  }

  // NVMe Bus Lv5 无敌帧计时器
  if (player.skillState.nvme5) {
    player._nvmeInvincibleCooldown = (player._nvmeInvincibleCooldown || 0) - dt;
    if (player._nvmeInvincibleCooldown <= 0) {
      player._nvmeInvincibleCooldown = 3.0;
      player.invincibleTimer = 0.15; // 短暂无敌帧
      // 残影效果
      if (!player.afterimages) player.afterimages = [];
      for (let i = 0; i < 6; i++) {
        player.afterimages.push({
          x: player.x, y: player.y,
          life: 0.45 + i * 0.08, maxLife: 0.55,
          offsetX: (Math.random() - 0.5) * 14,
          offsetY: (Math.random() - 0.5) * 14,
        });
      }
    }
  }

  // Cloud Backup Lv5：每60秒自动拾取
  if (player.skillState.cloud5) {
    player.cloudBackupTimer = (player.cloudBackupTimer || 0) + dt;
  }

  // 更新黑洞
  for (const bh of player.blackHoles) {
    bh.life -= dt;
    for (const enemy of (ctx_enemies || [])) {
      const ed = distance(bh.x, bh.y, enemy.x, enemy.y);
      if (ed < bh.radius + enemy.radius) {
        enemy.takeDamage(bh.dps * dt);
        if (!enemy.isBoss) {
          enemy._inBlackHole = true;
          // Boss 免疫牵引
          const pullStrength = 60 * dt;
          const dx = bh.x - enemy.x;
          const dy = bh.y - enemy.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          enemy.x += (dx / len) * pullStrength;
          enemy.y += (dy / len) * pullStrength;
        }
      }
    }
  }
  // 黑洞即死效果
  const succing = player.blackHoles.filter(bh => bh.life <= 0 && bh.succOnDeath);
  for (const bh of succing) {
    for (const enemy of (ctx_enemies || [])) {
      if (enemy.isBoss) continue;
      const ed = distance(bh.x, bh.y, enemy.x, enemy.y);
      if (ed < bh.radius + enemy.radius) {
        enemy.hp = 0;
      }
    }
    // 视觉效果：吞噬爆炸
    if (!player._bhExplosions) player._bhExplosions = [];
    player._bhExplosions.push({ x: bh.x, y: bh.y, radius: bh.radius, damage: 0 });
  }
  player.blackHoles = player.blackHoles.filter(bh => bh.life > 0);

  // 清理 Quantum Stream 标记
  // (标记在每帧渲染前由 postUpdate 重置)
}

// 全局敌人引用（黑洞吸引用）
let ctx_enemies = null;
export function setWeaponCtxEnemies(enemies) { ctx_enemies = enemies; }

// ============================================================
//  工具函数
// ============================================================

function findNearestEnemy(from, enemies, maxRange) {
  let best = null, bestDist = Infinity;
  for (const e of enemies) {
    const d = distance(from.x, from.y, e.x, e.y);
    if (d < bestDist && d < maxRange) { bestDist = d; best = e; }
  }
  return best;
}

function createProjectile(x, y, angle, damage, speed, radius, pierce, lifetime) {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius, damage, pierce, lifetime,
    hitEnemies: new Set(),
    color: '#74b9ff',
    prevPositions: [],
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.lifetime -= dt; },
    get isDead() { return this.lifetime <= 0 || this.pierce < 0; },
  };
}

function pointToLineDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distance(px, py, x1 + t * dx, y1 + t * dy);
}

function spawnBeamParticles(particles, x1, y1, x2, y2, color, count) {
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const px = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 10;
    const py = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 10;
    particles.push({
      x: px, y: py,
      vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
      color, size: 1 + Math.random() * 3,
      life: 0.2 + Math.random() * 0.3, maxLife: 0.5,
      update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; },
      get isDead() { return this.life <= 0; },
      get alpha() { return this.life / this.maxLife; },
    });
  }
}
