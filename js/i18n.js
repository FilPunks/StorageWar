// Storage War — i18n 中英文切换模块

const STORAGE_KEY = 'storageWar_lang';
let currentLang = localStorage.getItem(STORAGE_KEY) || 'zh';
const listeners = [];

// ============================================================
//  翻译字典
// ============================================================

const dict = {
  // --- 主菜单 ---
  'menu.title':          { zh: 'STORAGE WAR',                         en: 'STORAGE WAR' },
  'menu.subtitle':       { zh: 'A FilPunks Survival Game',            en: 'A FilPunks Survival Game' },
  'menu.move':           { zh: 'WASD / Arrow Keys — 移动',            en: 'WASD / Arrow Keys — Move' },
  'menu.auto':           { zh: '自动攻击 + 多种武器技能',              en: 'Auto-attack + Multiple Weapon Skills' },
  'menu.collect':        { zh: '收集经验 → 升级 → 选择技能 → 存活更久', en: 'Collect XP → Level Up → Pick Skills → Survive' },
  'menu.start':          { zh: '按 SPACE / ENTER 开始游戏',           en: 'Press SPACE / ENTER to Start' },
  'menu.donate':         { zh: '如果你喜欢这个游戏，可以考虑赞助我们一些 AI token。0x8fD277649299407aef2BF6Bd88c89D2f14a75EfC', en: 'If you like the game, please consider buy us some AI tokens. 0x8fD277649299407aef2BF6Bd88c89D2f14a75EfC' },

  // --- 游戏结束 ---
  'gameover.title':      { zh: 'GAME OVER',                           en: 'GAME OVER' },
  'gameover.time':       { zh: '存活时间: ${time} 秒',                 en: 'Survival Time: ${time}s' },
  'gameover.kills':      { zh: '击杀数: ${kills}',                     en: 'Kills: ${kills}' },
  'gameover.level':      { zh: '等级: ${level}',                       en: 'Level: ${level}' },
  'gameover.restart':    { zh: '按 SPACE / ENTER 重新开始',           en: 'Press SPACE / ENTER to Restart' },

  // --- 错误 ---
  'error.title':         { zh: 'RUNTIME ERROR',                       en: 'RUNTIME ERROR' },
  'error.hint':          { zh: 'Check browser console (F12) for details', en: 'Check browser console (F12) for details' },

  // --- HUD ---
  'hud.time':            { zh: '时间',   en: 'TIME' },
  'hud.kills':           { zh: '击杀',   en: 'KILLS' },
  'hud.enemies':         { zh: '敌人',   en: 'ENEMIES' },
  'hud.hp':              { zh: 'HP',     en: 'HP' },
  'hud.xp':              { zh: 'XP',     en: 'XP' },
  'hud.lv':              { zh: 'LV',     en: 'LV' },

  // --- Boss 预警 ---
  'boss.warning':        { zh: '⚠ 警告 — ${name} 即将出现 ⚠',        en: '⚠ WARNING — ${name} INCOMING ⚠' },

  // --- 升级界面 ---
  'upgrade.title':       { zh: '⭐ 升级！选择一个技能 ⭐',              en: '⭐ Level Up! Choose a Skill ⭐' },
  'upgrade.active':      { zh: '主动',   en: 'Active' },
  'upgrade.passive':     { zh: '被动',   en: 'Passive' },
  'upgrade.new':         { zh: 'NEW!',   en: 'NEW!' },
  'upgrade.lv':          { zh: 'Lv${n}', en: 'Lv${n}' },
  'upgrade.evolveLabel': { zh: 'Lv5 进化: ${name}',                   en: 'Lv5 Evolution: ${name}' },
  'upgrade.bonusLabel':  { zh: 'Lv5 加成',                             en: 'Lv5 Bonus' },
  'upgrade.maxLv':       { zh: 'Max Lv.${n}',                         en: 'Max Lv.${n}' },
  'upgrade.press':       { zh: '按 ${idx} 选择',                       en: 'Press ${idx} to Choose' },

  // --- 敌人名称 ---
  'enemy.floppy':        { zh: '软盘',               en: 'Floppy Disk' },
  'enemy.ssd':           { zh: '固态硬盘',            en: 'SSD' },
  'enemy.hdd':           { zh: '机械硬盘',            en: 'Hard Disk' },
  'enemy.usb':           { zh: 'U盘',                en: 'USB Stick' },
  'enemy.raid':          { zh: '磁盘阵列',            en: 'RAID Array' },
  'enemy.cd':            { zh: '光盘',               en: 'CD/DVD' },
  'enemy.cpu':           { zh: '超频 CPU',            en: 'Overclocked CPU' },
  'enemy.rootkit':       { zh: '勒索软件',            en: 'Ransomware Rootkit' },
  'enemy.gpu':           { zh: 'NVIDIA RTX 9090',    en: 'NVIDIA RTX 9090' },
  'enemy.corrupt':       { zh: '损坏文件',            en: 'Corrupted File' },

  // --- 主动武器 ---
  'skill.sectorSweep.name':        { zh: '扇区清扫',         en: 'Sector Sweep' },
  'skill.sectorSweep.desc':        { zh: '前方弧斩',         en: 'Frontal arc slash' },
  'skill.sectorSweep.evolveName':  { zh: '格式化驱动器',     en: 'Format Drive' },
  'skill.sectorSweep.evolveDesc':  { zh: '360°环形斩 + 击退', en: '360° circular slash + knockback' },

  'skill.bitBlaster.name':        { zh: '比特冲击',           en: 'Bit Blaster' },
  'skill.bitBlaster.desc':        { zh: '锁定全屏敌人发射像素弹', en: 'Lock-on pixel bullets at all enemies' },
  'skill.bitBlaster.evolveName':  { zh: '量子流',             en: 'Quantum Stream' },
  'skill.bitBlaster.evolveDesc':  { zh: '保留锁定弹 + 每1.8秒360°全方向齐射12发', en: 'Keep lock-on + 360° 12-shot volley every 1.8s' },

  'skill.particleBeam.name':        { zh: '404 粒子光束',       en: '404 Particle Beam' },
  'skill.particleBeam.desc':        { zh: '随机方向粗激光束，直线穿透', en: 'Random-direction thick laser, linear pierce' },
  'skill.particleBeam.evolveName':  { zh: '502 网关爆破',       en: '502 Gateway Blast' },
  'skill.particleBeam.evolveDesc':  { zh: '双束激光 + 偶尔十字交叉四束', en: 'Dual lasers + occasional 4-beam cross' },

  'skill.pingPulse.name':        { zh: 'Ping 脉冲充能',       en: 'Ping Pulse Charge' },
  'skill.pingPulse.desc':        { zh: '脉冲球环绕玩家，接触伤害', en: 'Orbiting pulse balls, contact damage' },
  'skill.pingPulse.evolveName':  { zh: '延迟风暴',            en: 'Latency Storm' },
  'skill.pingPulse.evolveDesc':  { zh: '双层环绕 — 内圈4球 + 外圈4球', en: 'Dual-layer orbit: 4 inner + 4 outer' },

  'skill.zipBlackHole.name':        { zh: 'Zip 黑洞',           en: 'Zip Black Hole' },
  'skill.zipBlackHole.desc':        { zh: '抛出迷你黑洞，吸引敌人并造成DOT', en: 'Throws mini black hole, pulls enemies + DOT' },
  'skill.zipBlackHole.evolveName':  { zh: 'Tarball 奇点',       en: 'Tarball Singularity' },
  'skill.zipBlackHole.evolveDesc':  { zh: '结束时范围内非Boss/HDD/RAID敌人被黑洞吞噬即死', en: 'Instakills non-Boss/HDD/RAID enemies in range on expiry' },

  'skill.firewall.name':        { zh: '防火墙',              en: 'Firewall' },
  'skill.firewall.desc':        { zh: '周身火焰光环灼烧 DOT', en: 'Surrounding fire aura, burn DOT' },
  'skill.firewall.evolveName':  { zh: '下一代防火墙',         en: 'Next-Gen Firewall' },
  'skill.firewall.evolveDesc':  { zh: '范围翻倍 + 范围内非Boss/HDD/RAID敌人减速30%', en: 'Double range + 30% slow to non-Boss/HDD/RAID enemies' },

  'skill.usbChain.name':        { zh: 'USB 闪电链',           en: 'USB Chain Lightning' },
  'skill.usbChain.desc':        { zh: '从天而降闪电链，弹跳于敌人之间', en: 'Lightning strikes from above, bounces between enemies' },
  'skill.usbChain.evolveName':  { zh: '雷霆协议',             en: 'Thunderbolt Protocol' },
  'skill.usbChain.evolveDesc':  { zh: '8次弹跳 + 每击25px范围AOE伤害', en: '8 bounces + 25px AOE per hit' },

  'skill.coolingFan.name':        { zh: '散热风扇',             en: 'Cooling Fan Blades' },
  'skill.coolingFan.desc':        { zh: '旋转扇叶追踪敌人，生命偷取25%', en: 'Spinning blades track enemies, 25% life steal' },
  'skill.coolingFan.evolveName':  { zh: '绝对零度',             en: 'Absolute Zero' },
  'skill.coolingFan.evolveDesc':  { zh: '周期时间停止：100px内非Boss敌人静止2秒', en: 'Periodic time freeze: non-Boss enemies within 100px frozen for 2s' },

  // --- 被动技能 ---
  'skill.raidRedundancy.name':     { zh: 'RAID 冗余',           en: 'RAID Redundancy' },
  'skill.raidRedundancy.desc':     { zh: '最大 HP +25，每秒回复 2 HP', en: 'Max HP +25, regen 2 HP/s' },
  'skill.raidRedundancy.lv5Bonus': { zh: 'HP<30% 时回复翻倍',    en: 'Doubled regen when HP<30%' },

  'skill.eccMemory.name':     { zh: 'ECC 内存',                  en: 'ECC Memory' },
  'skill.eccMemory.desc':     { zh: '攻击力 +18%',               en: 'Attack power +18%' },
  'skill.eccMemory.lv5Bonus': { zh: '弹幕15%暴击率(×2伤害)',     en: '15% crit chance (×2 dmg) for projectiles' },

  'skill.nvmeBus.name':     { zh: 'NVMe 总线',                   en: 'NVMe Bus' },
  'skill.nvmeBus.desc':     { zh: '移速 +10%',                   en: 'Move speed +10%' },
  'skill.nvmeBus.lv5Bonus': { zh: '移动留下加速尾迹',             en: 'Leaves speed trail while moving' },

  'skill.machineLearning.name':     { zh: '机器学习',             en: 'Machine Learning' },
  'skill.machineLearning.desc':     { zh: '经验获取 +20%',        en: 'XP gain +20%' },
  'skill.machineLearning.lv5Bonus': { zh: '拾取经验时额外 +50% 经验值', en: '+50% bonus XP on pickup' },

  'skill.cloudBackup.name':     { zh: '云备份',                   en: 'Cloud Backup' },
  'skill.cloudBackup.desc':     { zh: '拾取范围 +35%',            en: 'Pickup range +35%' },
  'skill.cloudBackup.lv5Bonus': { zh: '每60秒自动拾取全屏经验',    en: 'Auto-collect all XP every 60s' },

  'skill.overclock.name':     { zh: '超频',                       en: 'Overclock' },
  'skill.overclock.desc':     { zh: '主动武器冷却 -8%',            en: 'Active weapon cooldown -8%' },
  'skill.overclock.lv5Bonus': { zh: '所有主动武器 +1 弹幕数',      en: 'All active weapons +1 projectile' },

  'skill.firewallRules.name':     { zh: '防火墙规则',              en: 'Firewall Rules' },
  'skill.firewallRules.desc':     { zh: '受到伤害 -10%',           en: 'Damage taken -10%' },
  'skill.firewallRules.lv5Bonus': { zh: '无敌帧时间 +0.2s',        en: 'Invincibility frames +0.2s' },

  // --- 移动端提示 ---
  'mobile.title':        { zh: 'STORAGE WAR',                         en: 'STORAGE WAR' },
  'mobile.subtitle':     { zh: 'A FilPunks Survival Game',            en: 'A FilPunks Survival Game' },
  'mobile.message':      { zh: '请使用电脑浏览器打开此页面',            en: 'Please open this page on a desktop browser' },
  'mobile.hint':         { zh: '本游戏需要键盘和鼠标操作，不支持移动端',  en: 'This game requires keyboard & mouse, mobile is not supported' },
};

// ============================================================
//  公开 API
// ============================================================

/**
 * 获取当前语言的翻译字符串
 * @param {string} key - 翻译 key
 * @param {object} [params] - 模板参数，替换 ${varName}
 * @param {string} [fallback] - 找不到翻译时的回退值
 */
export function t(key, params, fallback) {
  const entry = dict[key];
  let template = fallback !== undefined ? fallback : key;
  if (entry && entry[currentLang]) template = entry[currentLang];
  if (!params) return template;
  return template.replace(/\$\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : '');
}

/** 切换语言 */
export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach(fn => fn(lang));
  return lang;
}

/** 获取当前语言 */
export function getLanguage() {
  return currentLang;
}

/**
 * 注册语言变更回调
 * @returns {function} 取消订阅函数
 */
export function onLanguageChange(cb) {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
