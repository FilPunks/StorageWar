# Storage War — A FilPunks Survival Game

Vampire Survivors 风格生存 Roguelike 页游，纯前端（HTML5 Canvas + Vanilla JS ES Modules），零构建依赖。

- **入口**: 浏览器打开 `index.html` 即可运行
- **部署**: 静态文件，支持 GitHub Pages
- **版本**: 1.6（见 RELEASE_NOTES.md 完整更新记录）

## 项目结构

```
index.html          — 入口 HTML（UI 层：菜单、升级弹窗、钱包按钮、Toast、移动端提示）
js/
├── main.js         — Game 类 + 主循环 + 状态机（35KB）
├── constants.js    — 所有数值常量（玩家、敌人、弹幕、生成器、颜色主题）
├── entities.js     — Player / Enemy / XP Coin 实体类 + 全部敌人 AI 行为（33KB）
├── skills.js       — 8 主动武器 + 7 被动技能 + 进化系统（30KB）
├── renderer.js     — 全量 Canvas 2D 渲染（91KB，最大文件）
├── input.js        — 键盘输入（WASD/方向键/123 选择/P 暂停/Q 大招）
├── particles.js    — 粒子系统 + 屏幕特效（震屏/闪白）
├── systems.js      — EnemySpawner + 玩家-敌人碰撞检测
├── ui.js           — UpgradeUI 升级弹窗组件
├── utils.js        — 距离/归一化/随机/加权随机/碰撞检测
├── i18n.js         — 中英双语（localStorage 持久化语言选择）
├── audio.js        — Web Audio API 程序化生成 retro 音效
└── wallet.js       — Filecoin 主网钱包 + FilPunks NFT 验证 + IPFS 网关竞速
```

## 游戏状态机

```
MENU → PLAYING ⇄ UPGRADING ⇄ PAUSED → GAMEOVER → MENU
```

- `Game.state` 驱动，`gameLoop` 根据状态分发到 `update*` / `draw*`
- 升级时游戏暂停等待选择（`UpgradeUI.show()` 返回 Promise）
- P 键切换 PAUSED

## 核心数值

- **Canvas**: 1024×768 固定分辨率
- **摄像机**: 玩家始终居中，`camX/camY` 偏移转世界坐标
- **最大敌人**: 350 只，峰值生成 10 只/秒
- **经验公式**: `baseToLevel * levelMultiplier^(level-1)`，初始 28，倍率 1.25
- **敌人血量成长**: `hp * (1 + gameTime * 0.003)`，15 分钟约 3.7x

## Boss 出场时间表

| 时间 | Boss | HP | 核心机制 |
|------|------|-----|---------|
| 1:30 | Overclocked CPU | 1250 | 热浪 + 周期性冲锋 |
| 4:00 | Ransomware Rootkit | 1500 | 环绕玩家 + 召唤小兵 + 弹幕齐射 |
| 7:30 | NVIDIA RTX 9090 | 1750 | 旋转激光 + 风扇涡流 + 弹幕齐射 + 狂暴 |
| 11:00 | Kernel Panic | 2250 | Core Dump(360°弹幕) + System Crash(方向反转/传送) + BSOD 主题 |
| 13:30 | Pump & Dump | 2500 | 三阶段循环：膨胀追击 → 双环冲击波爆炸 → 缩小逃跑 |
| 16:00 | Doge Coin | 3200 | 弹跳移动 + Dogecoin 弹幕 + meme 文字攻击 |

## 技能系统

### 主动武器（8 种，Lv5 进化）

| 武器 | 进化形态 | 机制 |
|------|---------|------|
| Sector Sweep | Format Drive | 弧斩 → 360°环形斩+击退 |
| Bit Blaster | Quantum Stream | 锁定弹 → 锁定弹+定期360°齐射 |
| 404 Particle Beam | 502 Gateway Blast | 单束激光 → 双束/十字交叉 |
| Ping Pulse Charge | Latency Storm | 环绕球 → 双层8球 |
| Zip Black Hole | Tarball Singularity | 黑洞吸引DOT → 结束时即死杂兵 |
| Firewall | Next-Gen Firewall | 火焰光环 → 双倍范围+减速 |
| USB Chain Lightning | Thunderbolt Protocol | 弹跳闪电 → 8次弹跳+AOE |
| Cooling Fan Blades | Absolute Zero | 扇叶吸血 → 周期性时停 |

### 被动技能（7 种）

RAID Redundancy(HP/回血)、ECC Memory(攻击/暴击)、NVMe Bus(移速)、Machine Learning(XP倍率)、Cloud Backup(拾取范围/自动拾取)、Overclock(冷却缩减)、Firewall Rules(减伤)

## 钱包 & NFT

- **链**: Filecoin Mainnet (chainId `0x13a`)
- **NFT 合约**: `0xf7Ceaa5DA7305b87361f9db6A300BD6D74c674D2`
- **功能**: 连接后玩家精灵替换为 NFT 图片；解锁 Q 键大招「GC Sweep」（30s CD，链上实时验证 `balanceOf`）
- **IPFS**: 11 个网关并发 `Promise.any` 竞速加载
- **RPC**: 3 个端点轮询（glif/ankr/chainup）

## 编码约定

- ES Modules，无打包工具，浏览器原生加载 `<script type="module">`
- 模块加载顺序：constants → utils → i18n → input → entities → skills → renderer → systems → ui → audio → wallet → main
- 所有 UI 文案必须走 `i18n.js` 的 `t()` 函数，中英双语覆盖
- Canvas 渲染统一在 `renderer.js`，不在其他模块直接操作 `ctx`
- 音效通过 `audio.js` 导出函数调用，禁止内联 `AudioContext`
- 修改 `constants.js` 的数值前先看 `RELEASE_NOTES.md` 了解历史调优上下文
- `entities.js` 的 `Enemy.update()` 是巨型 switch（按 `typeKey` 分支），新增敌人 AI 在此添加
