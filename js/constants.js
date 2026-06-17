// Storage War — 游戏常量配置

// --- Canvas ---
export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;

// --- 玩家 ---
export const PLAYER = {
  radius: 18,
  speed: 220,
  maxHp: 100,
  damage: 25,
  attackSpeed: 1.2,
  attackRange: 280,
  pickupRange: 60,
  invincibleTime: 0.3,
};

// --- NFT 持有者大招 ---
export const ULTIMATE_COOLDOWN = 30;

// --- 弹幕 ---
export const PROJECTILE = {
  speed: 450,
  radius: 5,
  lifetime: 0.8,        // 存活秒数(超过攻击范围后自动消失)
};

// --- 敌人类型定义 ---
// 形状: 'triangle' | 'rect' | 'circle' | 'pentagon' | 'diamond' | 'star'
export const ENEMY_TYPES = {
  floppy: {
    name: 'Floppy Disk',
    shape: 'square',
    color: '#8899aa',
    hpColor: '#667788',
    hp: 25,
    speed: 70,
    damage: 16,
    radius: 14,
    xpValue: 8,
    unlockTime: 0,
    weight: 50,
  },
  ssd: {
    name: 'SSD',
    shape: 'thinRect',
    color: '#00d2d3',
    hpColor: '#00b0b0',
    hp: 22,
    speed: 85,
    damage: 22,
    radius: 13,
    xpValue: 12,
    unlockTime: 60,        // 20秒解锁
    weight: 30,
  },
  hdd: {
    name: 'Hard Disk',
    shape: 'circle',
    color: '#576574',
    hpColor: '#3d4f5f',
    hp: 70,
    speed: 55,
    damage: 35,
    radius: 22,
    xpValue: 25,
    unlockTime: 180,
    weight: 25,
  },
  usb: {
    name: 'USB Stick',
    shape: 'smallRect',
    color: '#feca57',
    hpColor: '#d4a82c',
    hp: 18,
    speed: 100,
    damage: 20,
    radius: 11,
    xpValue: 18,
    unlockTime: 20,
    weight: 20,
  },
  raid: {
    name: 'RAID Array',
    shape: 'pentagon',
    color: '#ff6b6b',
    hpColor: '#cc4444',
    hp: 180,
    speed: 45,
    damage: 55,
    radius: 30,
    xpValue: 80,
    unlockTime: 300,       // 5分钟解锁 — Boss级
    weight: 10,
  },
  cd: {
    name: 'CD/DVD',
    shape: 'ring',
    color: '#dfe6e9',
    hpColor: '#b2bec3',
    hp: 45,
    speed: 130,
    damage: 28,
    radius: 17,
    xpValue: 30,
    unlockTime: 240,       // 3分钟解锁
    weight: 15,
  },
  // Boss 敌人
  cpu: {
    name: 'Overclocked CPU',
    shape: 'square',
    color: '#ff6b35',
    hpColor: '#cc4422',
    hp: 1250,
    speed: 35,
    damage: 100,
    radius: 60,
    xpValue: 250,
    unlockTime: 9999,
    weight: 0,
    isBoss: true,
  },
  rootkit: {
    name: 'Ransomware Rootkit',
    shape: 'skull',
    color: '#00ff44',
    hpColor: '#00aa22',
    hp: 1500,
    speed: 55,
    damage: 80,
    radius: 65,
    xpValue: 400,
    unlockTime: 9999,
    weight: 0,
    isBoss: true,
  },
  gpu: {
    name: 'NVIDIA RTX 9090',
    shape: 'gpu',
    color: '#76b900',
    hpColor: '#4a8000',
    hp: 1750,
    speed: 25,
    damage: 150,
    radius: 75,
    xpValue: 800,
    unlockTime: 9999,
    weight: 0,
    isBoss: true,
  },
  kernelPanic: {
    name: 'Kernel Panic',
    shape: 'bsod',
    color: '#0044cc',
    hpColor: '#0033aa',
    hp: 2250,
    speed: 28,
    damage: 55,
    radius: 65,
    xpValue: 600,
    unlockTime: 9999,
    weight: 0,
    isBoss: true,
  },
  childProcess: {
    name: 'Child Process',
    shape: 'smallBsod',
    color: '#0066ff',
    hpColor: '#0044cc',
    hp: 350,
    speed: 110,
    damage: 28,
    radius: 18,
    xpValue: 60,
    unlockTime: 9999,
    weight: 0,
  },
  corrupt: {
    name: 'Corrupted File',
    shape: 'smallRect',
    color: '#00ff44',
    hpColor: '#00aa22',
    hp: 15,
    speed: 150,
    damage: 16,
    radius: 6,
    xpValue: 10,
    unlockTime: 9999,
    weight: 0,
  },
  pumpAndDump: {
    name: 'Pump & Dump',
    shape: 'pumpAndDump',
    color: '#22cc66',
    hpColor: '#118844',
    hp: 2500,
    speed: 35,
    damage: 65,
    radius: 55,
    xpValue: 1200,
    unlockTime: 9999,
    weight: 0,
    isBoss: true,
  },
  dogeCoin: {
    name: 'Doge Coin',
    shape: 'dogeCoin',
    color: '#f0c040',
    hpColor: '#c09820',
    hp: 3200,
    speed: 60,
    damage: 60,
    radius: 50,
    xpValue: 1800,
    unlockTime: 9999,
    weight: 0,
    isBoss: true,
  },
};

// --- 经验与升级 ---
export const XP = {
  baseToLevel: 28,       // 升到2级所需经验
  levelMultiplier: 1.25, // 每级经验需求倍率
  coinRadius: 6,
  coinLifetime: 20,      // 掉落存活秒数
  magnetSpeed: 300,      // 磁铁吸附速度
};

// --- 敌人生成器 ---
export const SPAWNER = {
  initialInterval: 0.75,  // 初始生成间隔(秒)
  minInterval: 0.12,       // 最小生成间隔
  intervalDecay: 0.0023,  // 每秒减少的间隔
  maxEnemies: 350,        // 场上最大敌人数
  spawnMargin: 80,        // 屏幕外生成距离
};

// --- 粒子 ---
export const PARTICLES = {
  maxParticles: 200,
};

// --- 颜色主题 ---
export const COLORS = {
  background: '#060612',
  grid: '#28285c',
  player: '#6c5ce7',
  playerOutline: '#a29bfe',
  projectile: '#74b9ff',
  projectileGlow: '#a0d8ff',
  xpCoin: '#0090ff',
  xpCoinBorder: '#4db8ff',
  hudText: '#ffffff',
  hudBar: '#2d3436',
  hpBar: '#ff4757',
  xpBar: '#0090ff',
  menuBg: '#0a0a1a',
  menuText: '#dfe6e9',
};
