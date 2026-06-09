# Storage War — Release Notes

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
