---
name: grasscutter-balance-and-pixel-tilemap
overview: 为 GrassCutter（Phaser 版）设计并落地新的怪物血量/升级节奏平衡，同时将背景从绿色网格替换为像素风 Tilemap（含山坡/河流/丛林与物理碰撞）。
todos:
  - id: rebalance-hp-upgrade
    content: 使用[skill:phaser]统一怪物HP与升级参数：balance.ts、MainScene、SaveSystem、GrassCutter.tsx
    status: completed
  - id: enable-pixel-render
    content: 使用[skill:phaser]开启像素风渲染：create-game.ts、PreloadScene.ts
    status: completed
    dependencies:
      - rebalance-hp-upgrade
  - id: add-tilemap-assets-mapgen
    content: 新增像素瓦片与地图生成模块：assets/grasscutter、phaser/maps/OverworldMap.ts
    status: completed
    dependencies:
      - enable-pixel-render
  - id: wire-tilemap-collisions
    content: 在MainScene接入Tilemap并实现玩家/怪/Boss/子弹碰撞与子弹销毁
    status: completed
    dependencies:
      - add-tilemap-assets-mapgen
  - id: spawn-avoid-obstacles-tuning
    content: 在SpawnSystem加入避障重试并进行10关通关难度调参回归
    status: completed
    dependencies:
      - wire-tilemap-collisions
---

## User Requirements

- 调整数值：普通怪物基础血量从第1关 **200** 起步，后续随关卡逐步增大；整体平衡且有一定难度，并与现有武器升级节奏匹配。
- 优化地图：替换当前绿色网格背景，提供像素风地形（山坡、河流、丛林），并包含不可跨越的物理碰撞区域。
- 碰撞影响范围：地形碰撞会影响 **玩家、普通怪物、Boss、Boss子弹**。
- 渲染观感：整体采用像素风渲染效果。

## Product Overview

- 一款关卡制割草玩法：每关刷满一定数量敌人后出现Boss，击败Boss进入下一关；击杀累计触发升级选择。

## Core Features

- **数值平衡方案**：怪物血量曲线 + Boss血量曲线 + 与升级节奏一致的升级成长（含UI展示一致）。
- **像素风Tilemap地图**：地形绘制（山坡/河流/丛林）+ 瓦片碰撞（不可跨越）+ 全实体碰撞生效。

## Tech Stack Selection

- React + TypeScript（项目现有 .tsx）
- Phaser 3（现有 Scene/Arcade 物理）
- Vite 静态资源导入（现有 PreloadScene 通过 import png 加载）

## Implementation Approach

1. **数值与升级统一“单一真源”**：将升级阈值与加成、基础武器初始值、怪物HP曲线统一收敛到 `src/pages/grasscutter/balance.ts`（或新增同目录 `upgrade-balance.ts`），由 `MainScene/SaveSystem/GrassCutter.tsx` 共同引用，消除当前 UI 常量与玩法常量不一致的问题。
2. **怪物血量曲线**：按“可通关但有压迫感”的目标设计：  

- 普通怪：L1=200 起步，按指数增长（10关内控制在约 4~6 倍量级），避免Boss血量爆炸。  
- Boss：改为“随关卡缓增的倍率”而非固定 `BOSS_HP_FACTOR`，避免后期过度膨胀。  
- 同步调参：必要时联动 `spawnInterval/enemySpeed` 的增长上限，保证难度来自“压力+容错减少”，而非单纯“肉度堆叠”。

3. **像素风Tilemap地图**：采用 Phaser Tilemap（用户选择），提供：

- 视觉层（地表草地/山坡/丛林/河流）
- 碰撞层（河流深水/山体岩壁/树林等不可跨越瓦片）

4. **全实体碰撞链路**：

- `player`、`enemies` 物理组、`boss` 与碰撞层 `collider`
- `bossBullets` 改为 **physics group** 并与碰撞层碰撞；命中地形后销毁，避免无限飞行。

5. **刷怪避障**：`SpawnSystem` 生成点需避开碰撞瓦片（最多重试N次），防止敌人/子弹出生即卡墙或无法接近玩家。

## Implementation Notes (Execution Details)

- **性能**：Tilemap 建议使用单一静态层 + `setCollisionByExclusion/ByProperty`；碰撞仅在 Arcade 物理步进时计算，避免在 `update` 中对全图做扫描。刷怪避障只在生成时做 `getTileAtWorldXY` 查询（O(1)），避免运行时开销。
- **像素渲染**：在 `create-game.ts` 开启 `pixelArt: true`、关闭 `antialias`、开启 `roundPixels`，并确保地图纹理缩放为 nearest。
- **兼容与回归控制**：保留现有 Scene 链路与事件总线，避免大规模重构；对 `SpawnSystem.startSpawning` 采用可选参数/回调扩展，降低改动面。

## Architecture Design

- `balance.ts`：统一输出关卡配置（怪物HP、BossHP、速度、刷怪间隔、升级阈值/加成、初始武器参数）。
- `MainScene`：加载存档→初始化武器/刷怪→创建Tilemap与碰撞→挂载全实体碰撞→主循环维持现有结构。
- `Map(NEW)`：负责地图数据生成/加载（tile数组、碰撞标记、可选seed），并返回给 `MainScene` 进行渲染与碰撞配置。

## Directory Structure

项目变更聚焦于 GrassCutter Phaser 子模块与资源补充：

- /Users/youngbye/pro/github/youngbye.github.io/assets/
- grasscutter/
    - tileset.png                      # [NEW] 像素风瓦片集（草地/山坡/丛林/河流/岩壁/树等）
- /Users/youngbye/pro/github/youngbye.github.io/src/pages/grasscutter/
- balance.ts                         # [MODIFY] 怪物HP=200起步曲线、BossHP曲线、升级参数统一导出
- /Users/youngbye/pro/github/youngbye.github.io/src/pages/grasscutter/phaser/
- create-game.ts                     # [MODIFY] 像素风渲染开关（pixelArt/antialias/roundPixels）
- scenes/PreloadScene.ts             # [MODIFY] 加载 tileset 资源；按像素风需求调整纹理平滑策略
- scenes/MainScene.ts                # [MODIFY] 替换 drawBackground 为 Tilemap；接入碰撞与子弹销毁
- systems/SpawnSystem.ts             # [MODIFY] 生成点避障（依赖 MainScene 提供的可走区域判定）
- objects/BossBullet.ts              # [MODIFY]（如需）适配 physics group 碰撞回调与销毁路径
- maps/OverworldMap.ts               # [NEW] Tilemap 数据生成/组装（地形分布 + 碰撞标记）
- /Users/youngbye/pro/github/youngbye.github.io/src/pages/
- GrassCutter.tsx                    # [MODIFY] 升级UI展示参数与玩法一致（从 balance 读取）

## Key Code Structures (Optional)

- `getLevelConfig(level)` 扩展为包含：`enemyHp`、`bossHp`、`enemySpeed`、`spawnInterval`、`killsPerUpgrade`、`upgradeDeltas`、`initialWeaponConfig` 等字段（以最小改动方式落地）。

## Agent Extensions

- **[skill:phaser]**
- Purpose: 指导 Phaser 3 Tilemap、Arcade 物理碰撞、像素渲染与性能最佳实践的落地实现。
- Expected outcome: 可靠接入 Tilemap 地形 + 全实体碰撞 + 像素风渲染，且不破坏现有主循环与事件桥。