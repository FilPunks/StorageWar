# Storage War — 技能系统设计文档 v2

> 2026-05-28 定稿

## 核心机制

- **槽位**：不限槽位，可无限获取技能
- **等级上限**：所有技能最高 5 级
- **5 级进化**：主动武器升到第 5 级时自动触发进化，弹幕模式发生质变
- **选择方式**：每级升级从随机抽取的 3 个技能中选 1 个
- **初始武器**：Sector Sweep Lv1 开局自带
- **冷却公式**：每种主动武器有独立 CD，受 Overclock 被动加成
- **弹幕伤害**：所有弹幕基础伤害 = player.damage * 武器倍率

## 技能池（16 个）

每次升级从池中过滤已满级技能后随机抽 3 个展示。

---

## 一、主动武器（8 种）

每种 Lv1-4 逐步增强数值，Lv5 自动进化为增强形态。

### 1. Sector Sweep（初始武器，开局自带 Lv1）
- **模式**：玩家前方半月形弧斩
- **Lv1**：90° 弧，伤害 ×1.2，CD 1.2s
- **Lv2**：120° 弧，伤害 ×1.3，CD 1.1s
- **Lv3**：150° 弧，伤害 ×1.4，CD 1.0s
- **Lv4**：180° 弧，伤害 ×1.5，CD 0.9s
- **Lv5 → Format Drive**：360° 全屏环形斩 + 击中附带击退效果，CD 0.7s

### 2. Bit Blaster
- **模式**：自动锁定最近敌人，发射高速数据弹
- **Lv1**：1 发，CD 0.6s
- **Lv2**：2 发，CD 0.5s
- **Lv3**：2 发，CD 0.4s
- **Lv4**：3 发，CD 0.35s
- **Lv5 → Quantum Stream**：改为持续光束射线，锁定敌人持续伤害（无弹幕，直接造成 player.damage * 0.8 的 DPS）

### 3. 404 Particle Beam
- **模式**：随机方向发射激光束，直线穿透所有敌人
- **Lv1**：宽度 6px，伤害 ×2.5，CD 2.5s
- **Lv2**：宽度 8px，伤害 ×2.8，CD 2.2s
- **Lv3**：宽度 10px，伤害 ×3.0，CD 1.9s
- **Lv4**：宽度 12px，伤害 ×3.3，CD 1.5s
- **Lv5 → 502 Gateway Blast**：双束激光同时发射（相对方向），偶尔十字交叉四束

### 4. Ping Pulse Charge
- **模式**：脉冲能量球环绕玩家旋转，接触敌人造成伤害
- **Lv1**：1 球，伤害 ×0.6 DPS，距离 60px，转速 2.0
- **Lv2**：2 球，伤害 ×0.7 DPS，距离 65px，转速 2.2
- **Lv3**：3 球，伤害 ×0.8 DPS，距离 70px，转速 2.4
- **Lv4**：4 球，伤害 ×0.9 DPS，距离 75px，转速 2.6
- **Lv5 → Latency Storm**：双层环绕 — 内圈 4 球（距离 55px，转速 3.0）+ 外圈 4 球（距离 90px，转速 2.0）

### 5. Zip Black Hole
- **模式**：向随机位置抛出一个迷你黑洞，吸引附近敌人并造成 DOT
- **Lv1**：持续 3s，吸力范围 80px，DPS ×0.5，CD 5s
- **Lv2**：持续 3.5s，吸力范围 90px，DPS ×0.6，CD 4.5s
- **Lv3**：持续 4s，吸力范围 100px，DPS ×0.7，CD 4s
- **Lv4**：持续 4.5s，吸力范围 110px，DPS ×0.8，CD 3.5s
- **Lv5 → Tarball Singularity**：吸力范围 150px + 消失时产生爆炸（伤害 ×3.0，范围 = 吸力范围）

### 6. Firewall
- **模式**：玩家周围持续火焰光环，敌人进入即受灼烧 DOT
- **Lv1**：光环半径 40px，DPS ×0.4
- **Lv2**：光环半径 48px，DPS ×0.5
- **Lv3**：光环半径 56px，DPS ×0.6
- **Lv4**：光环半径 64px，DPS ×0.7
- **Lv5 → Next-Gen Firewall**：光环半径 100px + 经过的地面留下火痕（持续 2s，伤害为光环的 60%）

### 7. USB Chain Lightning
- **模式**：发射闪电击中敌人后弹跳到附近下一个敌人
- **Lv1**：弹跳 2 次，伤害 ×1.0，弹跳距离 100px，CD 1.8s
- **Lv2**：弹跳 3 次，伤害 ×1.1，弹跳距离 110px，CD 1.5s
- **Lv3**：弹跳 4 次，伤害 ×1.2，弹跳距离 120px，CD 1.3s
- **Lv4**：弹跳 5 次，伤害 ×1.3，弹跳距离 130px，CD 1.0s
- **Lv5 → Thunderbolt Protocol**：弹跳 8 次 + 每次弹跳伤害递增 15%，弹跳距离 150px

### 8. Cooling Fan Blades
- **模式**：扔出旋转扇叶追踪最近敌人，伤害的 20% 转化为 HP 回复
- **Lv1**：1 扇叶，伤害 ×1.0，生命偷取 20%，CD 2.0s
- **Lv2**：1 扇叶，伤害 ×1.2，生命偷取 22%，CD 1.8s
- **Lv3**：2 扇叶，伤害 ×1.3，生命偷取 24%，CD 1.5s
- **Lv4**：2 扇叶，伤害 ×1.5，生命偷取 26%，CD 1.2s
- **Lv5 → Liquid Cooling**：双扇叶 + 生命偷取提升至 35%，CD 1.0s

---

## 二、被动技能（8 种）

### 1. SSD Cache（攻速）
- **每级**：攻速 +12%（即 attackSpeed *= 1.12）
- **Lv5**：攻击时 20% 几率该帧双倍攻速

### 2. RAID Redundancy（生存）
- **每级**：maxHp +25，每秒回复 0.5 HP
- **Lv5**：HP 低于 30% 时，HP 回复速度翻倍（1.0 HP/s）

### 3. ECC Memory（攻击）
- **每级**：攻击力 +18%（即 damage *= 1.18）
- **Lv5**：弹幕获得 15% 暴击率（伤害 ×2）

### 4. NVMe Bus（速度）
- **每级**：移速 +10%
- **Lv5**：移动时留下加速尾迹（持续 1.5s，踏上尾迹的玩家速度 +15%）

### 5. DMA Channel（穿透）
- **每级**：弹幕穿透 +1
- **Lv5**：穿透后弹幕伤害 +25%

### 6. Cloud Backup（拾取）
- **每级**：拾取范围 +20%
- **Lv5**：每 60 秒自动拾取全屏经验一次

### 7. L2 Cache（弹幕大小）
- **每级**：弹幕大小 +25%
- **Lv5**：弹幕命中时 30% 伤害的小范围溅射

### 8. Overclock（冷却）
- **每级**：所有主动武器冷却时间 -8%
- **Lv5**：所有主动武器额外 +1 弹幕/投射物数

---

## 实现架构

### Player 新增字段
- `activeWeapons: Map<weaponId, { level, cooldown, evolved }>`
- `passiveSkills: Map<passiveId, { level }>`
- `hpRegen: number` — 每秒回血量
- `critChance: number` — 暴击率
- `speedTrail: [{x, y, life}]` — 加速尾迹

### skills.js 新增
- 16 个技能定义，每个包含：
  - `type: 'active' | 'passive'`
  - `weaponBehavior` — 主动武器的弹幕生成逻辑函数
  - `onLevelUp(player, level)` — 升级回调
  - `onEvolve(player)` — 5 级进化回调
- `getAvailableSkills(player)` — 过滤满级技能
- `rollSkills(player, 3)` — 随机抽 3 个

### 主循环改动
- `updatePlaying(dt)` 中新增：
  - 遍历 `activeWeapons`，每个武器独立冷却计时
  - 冷却完毕调用 `weaponBehavior(player, enemies, projectiles, particles)`
  - 处理 HP 回复
  - 更新加速尾迹
  - 处理 Cloud Backup 的自动拾取

### 视觉渲染新增
- 弧斩渲染（Sector Sweep / Format Drive）
- 激光束渲染（404 Particle Beam / 502 Gateway Blast）
- 黑洞渲染（Zip Black Hole / Tarball Singularity）
- 闪电链渲染（USB Chain Lightning / Thunderbolt Protocol）
- 扇叶渲染（Cooling Fan Blades / Liquid Cooling）
- 火痕渲染（Next-Gen Firewall 地面痕迹）
- 加速尾迹渲染（NVMe Bus Lv5）
