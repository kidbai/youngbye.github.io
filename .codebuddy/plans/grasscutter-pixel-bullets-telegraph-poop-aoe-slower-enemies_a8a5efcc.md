---
name: grasscutter-pixel-bullets-telegraph-poop-aoe-slower-enemies
overview: 将子弹/投射物改为程序生成的像素风纹理；为丢大便怪的落点爆炸加入预警与起爆延迟以提升可躲避性；整体下调怪物移动速度并缓解扎堆。
todos:
  - id: audit-targets
    content: 梳理子弹/投掷物渲染与碰撞链路，确定需改动文件清单
    status: completed
  - id: pixel-bullet-textures
    content: 使用[skill:phaser]在PreloadScene生成像素子弹纹理并注册key
    status: completed
    dependencies:
      - audit-targets
  - id: swap-bullet-renderers
    content: 将各Bullet/Projectile从Ellipse改为Sprite/Image并保持物理圆形判定
    status: completed
    dependencies:
      - pixel-bullet-textures
  - id: poop-telegraph-fuse
    content: 为PoopProjectile加入落点预警与起爆延迟，并在MainScene接入结算
    status: completed
    dependencies:
      - audit-targets
  - id: enemy-speed-dispersion
    content: 下调balance敌速曲线并在updateEnemies加入轻量分散策略缓解扎堆
    status: completed
    dependencies:
      - audit-targets
  - id: balance-tuning-smoke
    content: 校验数值与边界：上限保护/销毁/暂停升级/切场景无异常
    status: completed
    dependencies:
      - swap-bullet-renderers
      - poop-telegraph-fuse
      - enemy-speed-dispersion
---

## User Requirements

- 将所有子弹/投射物从“矢量圆点”优化为更贴合像素风的视觉效果（使用程序生成纹理，不新增图片资源）。
- 优化丢大便怪投掷物的爆炸规则：增加落点预警/起爆延迟，降低“到点就瞬间中招”的挫败感。
- 降低怪物整体追随/移动速度，并缓解怪物扎堆问题（尽量不引入高开销计算）。

## Product Overview

- 战斗中子弹/投射物呈现清晰的像素化形态（有方向感/描边/高光或简易拖尾观感），并与现有像素化地图风格一致。
- 投掷物落点在爆炸前有可感知的预警表现，玩家有反应窗口；残留伤害区更“公平”。
- 怪物更不容易快速贴脸堆成一团，整体节奏更可控。

## Core Features

- 像素风子弹/投射物渲染（通过 canvas 生成纹理并复用）
- 丢大便投掷物“预警 + 延迟爆炸/结算”规则
- 怪物追击速度下调 + 轻量“分散/避免扎堆”策略

## Tech Stack Selection (基于现有项目)

- 语言：TypeScript
- 构建：Vite
- 游戏引擎：Phaser 3（Arcade Physics）
- 渲染风格：全局已启用 `pixelArt: true`, `antialias: false`, `roundPixels: true`（`src/pages/grasscutter/phaser/create-game.ts`）

## Implementation Approach

1. **子弹像素风**：沿用项目中已存在的“canvas 生成纹理”模式（`PreloadScene.generateCircleTextures()`），新增一套 `generateBulletTextures()`，生成多个 bullet 纹理 key；各子弹类从 `Ellipse` 改为 `Image/Sprite`，物理仍使用 circle body，按半径缩放显示尺寸。
2. **投掷物爆炸规则**：为 `PoopProjectile` 增加“落点预警 + 起爆延迟（fuse）”状态机；到达落点后先停住进入 arming，再在 fuse 到期时结算伤害并生成残留区。
3. **怪物速度与扎堆缓解**：在 `balance.ts` 下调关卡速度曲线（base/growth/max）；在 `MainScene.updateEnemies` 增加轻量“分离/扰动”以降低同点堆叠（优先 O(n) 或近似 O(n) 的做法，避免全量 O(n^2)）。

## Implementation Notes (Execution Details)

- 性能：纹理生成只在 Preload 执行一次；子弹对象从矢量改贴图后渲染更统一且通常更省；“分离”使用网格分桶/近邻采样，避免每帧全量两两距离计算。
- 兼容性：保持现有碰撞半径、伤害/上限保护逻辑不变；仅在必要处扩展配置字段与更新逻辑，避免影响其他系统（Boss/玩家枪械系统）。
- 风险控制：投掷物改为延迟爆炸后，需同步调整清理逻辑（出界/销毁）与提示对象销毁，避免残留 tween/计时器泄漏（参考 `ExplosionFx` 的 destroy 处理方式）。

## Architecture Design

- `PreloadScene` 负责生成并注册 bullet textures（CanvasTexture）
- `objects/*Bullet.ts`、`objects/*Projectile.ts` 只负责显示与物理 body
- `MainScene` 负责碰撞/规则（投掷物预警、爆炸结算、残留区）
- `balance.ts` 作为全局数值入口，集中调整怪物速度曲线与投掷物 fuse 参数

## Directory Structure

project-root/
├── src/pages/grasscutter/phaser/scenes/PreloadScene.ts            # [MODIFY] 新增 generateBulletTextures，注册像素子弹纹理 key
├── src/pages/grasscutter/phaser/objects/PlayerBullet.ts           # [MODIFY] Ellipse → Image/Sprite，使用 bullet 纹理 + 按半径缩放
├── src/pages/grasscutter/phaser/objects/EnemyBullet.ts            # [MODIFY] 同上
├── src/pages/grasscutter/phaser/objects/BossBullet.ts             # [MODIFY] 同上
├── src/pages/grasscutter/phaser/objects/PlayerExplosiveProjectile.ts # [MODIFY] 同上（可增加旋转/高光像素细节）
├── src/pages/grasscutter/phaser/objects/PoopProjectile.ts         # [MODIFY] 增加 fuse/arming 状态、预警引用、到点停住延迟结算
├── src/pages/grasscutter/phaser/objects/AoeField.ts               # [MODIFY] 适度更公平的命中判定（可选：有效半径/进入后结算策略）
├── src/pages/grasscutter/phaser/scenes/MainScene.ts               # [MODIFY] 投掷物预警/延迟爆炸接入；怪物分散策略接入
└── src/pages/grasscutter/balance.ts                               # [MODIFY] 下调 LEVEL_ENEMY_SPEED_*；新增/调整投掷物 fuse/预警参数

## Key Code Structures (关键新增/变更接口草案)

- `PreloadScene.generateBulletTextures(): void`
- `PoopProjectile` 新增字段：`fuseMs / state(flying|arming) / warningObj?`；新增方法：`beginArming()`、`shouldExplode(delta)`（签名以实现时为准）
- `AoeField.updateField(...)` 可扩展入参：`playerRadius` 或 `hitMargin`（以保持可配置与可读性）

## Agent Extensions

- **[skill:phaser]**
- Purpose: 指导 Phaser 纹理生成、像素风渲染、Arcade Physics 与性能优化的最佳实践落地
- Expected outcome: 生成可复用的 bullet textures；对象从矢量切换到贴图后表现稳定且性能可控；新增规则不引入卡顿/泄漏
- **[mcp:cnb]**（可选）
- Purpose: 若需要追溯类似改动的历史提交/对比实现方式，用于方案校验
- Expected outcome: 获取参考提交信息，降低实现偏差（若本次不需要可不使用）