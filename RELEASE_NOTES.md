# Storage War — Release Notes

---

## version 1.3 (2026-06-18)

**中文**

- 增强 Q 大招「GC Sweep」清屏音效：新增 4 层叠加爆炸音效（低频轰鸣 + 噪声冲击 + LFO 颤音 + 高频碎裂），替代原先单次敌人死亡音效
- 增强 Q 大招清屏视觉效果：每敌人死亡粒子数 12→20，震屏强度 8→14 持续 0.4→0.55s，新增屏幕闪白效果
- 修复屏幕闪白渲染缺失：`screenFX.flashAlpha` 已正确渲染到屏幕空间（之前仅写入从未绘制）
- 修复 `startGame()` 中 `_ultimateCharging` / `_chargeStart` 未重置，防止死后重开时异常触发大招

**English**

- Enhanced Q ultimate "GC Sweep" sound: new 4-layer explosion SFX (deep rumble + noise burst + LFO tremolo + high-frequency shatter), replacing the single enemy death sound
- Enhanced Q ultimate visuals: death particles per enemy 12→20, screen shake intensity 8→14 duration 0.4→0.55s, added screen white flash on activation
- Fixed screen flash rendering: `screenFX.flashAlpha` now correctly draws to screen space (was written but never rendered before)
- Fixed `_ultimateCharging` / `_chargeStart` not being reset in `startGame()`, preventing accidental ultimate trigger after death-restart

---

## version 1.2 (2026-06-17)

**中文**

- 新增 Boss 5：Pump & Dump（膨胀崩盘），13:30 出场，Crypto 代币周期主题
  - 三阶段循环：Pump（膨胀变大 + 远程吸取 XP 币 + 50% 减伤）→ 红色波纹预警 → Dump（全屏冲击波 + 红色 XP 弹片）→ Crash（缩小逃跑，4s 输出窗口）
  - 吸取 XP 币越多，Dump 伤害越高
  - 像素金币精灵 + 字母 P/D 随币体摇动
- 新增 Boss 6：Doge Coin（狗狗币），16:00 出场，Doge 表情包主题
  - 弹跳式移动 + 持续发射 Dogecoin 弹幕（SVG 币面，金色辉光 + 细边框 + 高光点）
  - Meme 文字特殊攻击：wow（环形弹幕）/ much damage（高速重击弹）/ very fast（冲锋加速）/ such danger（金色热浪环，半径 400px）
  - 漫画气泡（圆角矩形 + 三角尾巴，随机偏移位置）
  - Boss 精灵使用真实图片，自动去白底
  - 随血量降低攻击频率递增
- Boss 头顶不再显示血条（仅保留 HUD 顶部 Boss 血条）
- Pump & Dump 和 Doge Coin 弹幕均取消射程限制

**English**

- New Boss 5: Pump & Dump (13:30), crypto token cycle themed
  - Three-phase cycle: Pump (inflates + vacuums XP coins + 50% DR) → red ripple warning → Dump (screen-wide shockwave + red XP shrapnel) → Crash (shrinks + flees, 4s vulnerability window)
  - More XP absorbed = stronger Dump damage
  - Pixel gold coin sprite + letter P/D wobbling with coin
- New Boss 6: Doge Coin (16:00), Doge meme themed
  - Bouncing movement + continuous Dogecoin projectile fire (SVG coin face, golden glow + border + highlight)
  - Meme text specials: wow (ring burst) / much damage (high-speed heavy shot) / very fast (speed charge) / such danger (golden heat wave ring, 400px radius)
  - Comic speech bubbles (rounded rectangle + triangle tail, random offset)
  - Real photo sprite with auto white-background removal
  - Attack frequency scales with remaining HP
- Boss overhead HP bars removed (HUD top-center boss HP bars remain)
- Pump & Dump and Doge Coin projectiles: unlimited range

---

## version 1.1 (2026-06-15)

**中文**

- 主菜单新增"在**这里**铸造 Filpunks NFT，获得大招"提示，**这里**为超链接跳转 filpunks.io
- 右上角 ☰ 菜单新增「铸造 Filpunks NFT ↗」选项，点击跳转 filpunks.io
- "Press SPACE / ENTER to Start" 字号加大，与上方说明文字留白增加

**English**

- Main menu: added "Mint Filpunks NFT **here** to unlock ultimate" hint, with **here** linking to filpunks.io
- ☰ menu: added "Mint Filpunks NFT ↗" option linking to filpunks.io
- "Press SPACE / ENTER to Start" font size increased, spacing from instructions widened

---

## version 1.0 (2026-06-10)

**中文**

- 新增钱包连接：右上角「Connect Wallet」按钮，支持 MetaMask / Rabby 连接 Filecoin 主网
- NFT 头像替换：连接后若持有 FilPunks NFT（合约 0xf7Ceaa5DA7305b87361f9db6A300BD6D74c674D2），玩家精灵自动替换为持有的 NFT 图片
- 11 个 IPFS 网关并发竞速（Promise.any），首个成功即返回，大幅提升加载速度
- 新增 Q 键大招「GC Sweep」：仅限 NFT 持有者，瞬间清屏所有非 Boss 敌人并转化为经验币，30 秒冷却
- 按 Q 后链上实时验证 `balanceOf`，无法通过控制台绕过
- 蓄力期间：金色扩散光环 + 旋转粒子 + 击退周围敌人 + 低频嗡鸣音效
- HUD 右下角大招冷却图标（🧹），WoW 风格扇形遮罩扫过，中央倒计时数字
- 右上角按钮整合为 ☰ 菜单，点击展开音效开关和语言切换
- Toast 通知系统：钱包/NFT 状态、大招反馈均有中英双语提示
- 升级卡片显示「Lv3 → 4」当前到下一级的变化
- Rootkit Boss 弹幕取消射程限制
- 所有 UI 文案中英双语全覆盖

**English**

- Wallet connection: "Connect Wallet" button at top-right, supports MetaMask/Rabby on Filecoin mainnet
- NFT avatar replacement: connected wallet's FilPunks NFT (0xf7Ceaa5DA7305b87361f9db6A300BD6D74c674D2) replaces player sprite
- 11 IPFS gateways raced via Promise.any, fastest wins — much faster loading
- Q key ultimate "GC Sweep": NFT holders only, instantly clears all non-boss enemies → XP coins, 30s cooldown
- On-chain `balanceOf` verification on each Q press, not bypassable via console
- Charge-up: expanding golden rings + orbiting particles + knockback + rising synth sound
- Ultimate cooldown icon (🧹) at bottom-right HUD with WoW-style radial sweep + countdown
- Top-right buttons consolidated into ☰ menu with sound toggle and language switch
- Toast notification system: wallet/NFT status and ultimate feedback, fully bilingual
- Upgrade cards show "Lv3 → 4" (current → next level)
- Rootkit boss projectiles: unlimited range
- All UI text fully bilingual (Chinese / English)

---

## version 0.3 (2026-06-09)

**中文**

- 新增第 4 个 Boss：Kernel Panic（内核恐慌），10:00 出场，蓝屏死机主题
  - Core Dump：周期性 360° 密集弹幕（10→16 发），带正弦波抖动轨迹，无限射程
  - System Crash：随机触发方向反转（2.5 秒）或随机传送 + 震屏
  - Stack Overflow：半血时一次性生成 3 个 Child Process 子进程小兵
  - 六边形 hex 文字护盾视觉效果
  - 半血狂暴：Core Dump CD 减半、System Crash CD 缩短
- 新增 Child Process 敌人类型（Kernel Panic 召唤）
- GPU Boss 重新平衡：HP 3500→1500，半径 100→75px
- Kernel Panic 半径 55→65px
- Core Dump 弹幕视觉大小与碰撞半径挂钩

**English**

- New Boss 4: Kernel Panic (10:00), BSOD-themed
  - Core Dump: periodic 360° dense projectile barrage (10→16 shots), wobbling trajectories, infinite range
  - System Crash: randomly triggers input reversal (2.5s) or random teleport + screen shake
  - Stack Overflow: spawns 3 Child Process minions at half HP
  - Hex text wall visual shield
  - Half-HP rage mode: Core Dump CD halved, System Crash CD reduced
- New Child Process enemy type (spawned by Kernel Panic)
- GPU boss rebalance: HP 3500→1500, radius 100→75px
- Kernel Panic radius 55→65px
- Core Dump projectile visual size now scales with collision radius

---

## version 0.2 (2026-06-04)

**中文**

- 画面右下角展示已习得技能 emoji，主动技能蓝色边框、被动技能绿色边框，右下角标注技能等级
- 新增 P 键暂停/继续功能
- 赛博网格背景视觉调整：底色加深、格线提亮，更清晰
- 右下角 HUD 技能栏与左侧 HP/XP 栏中位线对齐
- 敌人刷新参数调整：场上最大 350 只，峰值刷新 10 只/秒，难度爬坡更平缓
- 新增 `RELEASE_NOTES.md`
- 感谢 Eric、Jon Geater 的反馈

**English**

- Skill emoji display at bottom-right HUD: active skills with blue border, passive with green border, level number in corner
- P key to pause/resume game
- Cyberpunk grid background tweaks: darker background, brighter grid lines for better visibility
- Right HUD skill bar vertically aligned with left HP/XP bar centerline
- Enemy spawn tuning: max 350 on screen, peak spawn 10/s, smoother difficulty ramp
- Added `RELEASE_NOTES.md`
- Thanks to Eric and Jon Geater for their feedback

---

## version 0.1 (2026-06-04)

**中文**

- 初始版本：Vampire Survivors 风格生存 Roguelike 页游
- 8 种主动武器 + 8 种被动技能，最高 5 级，5 级自动进化
- 9 种敌人（含 3 个 Boss），3 个 Boss 定时出场
- 程序化像素精灵 + 粒子特效 + 震屏
- Web Audio API 程序化音效
- 中/英文双语切换
- 画面右下角显示版本号

**English**

- Initial release: Vampire Survivors-style survival roguelike browser game
- 8 active weapons + 8 passive skills, max level 5, auto-evolve at Lv5
- 9 enemy types (including 3 bosses), bosses spawn at set intervals
- Procedural pixel-art sprites + particle effects + screen shake
- Web Audio API procedural sound effects
- Chinese/English bilingual support
- Version number displayed at bottom-right
