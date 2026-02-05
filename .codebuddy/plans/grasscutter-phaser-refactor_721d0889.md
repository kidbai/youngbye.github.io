---
name: grasscutter-phaser-refactor
overview: 分析现有 React+Canvas 割草游戏实现，并给出基于 Phaser 3 的分阶段重构方案（含目录结构、Scene/实体/系统拆分、与 React UI 的集成与迁移步骤）。
todos:
  - id: add-phaser-dep
    content: 修改 package.json 引入 phaser，必要时调整路由懒加载
    status: completed
  - id: phaser-host
    content: 改造 src/pages/GrassCutter.tsx：挂载 Phaser 容器并保留现有 UI
    status: completed
    dependencies:
      - add-phaser-dep
  - id: scene-skeleton
    content: 使用 [skill:phaser] 搭建 Boot/Preload/Main Scene 与资源加载
    status: completed
    dependencies:
      - phaser-host
  - id: player-camera-input
    content: 实现玩家移动、相机跟随、摇杆与键盘输入适配
    status: completed
    dependencies:
      - scene-skeleton
  - id: combat-systems
    content: 实现刷怪、武器命中、Boss/子弹、伤害与升级触发
    status: completed
    dependencies:
      - player-camera-input
  - id: save-bridge-victory
    content: 实现存档兼容、React 事件桥接，并补齐第10关通关逻辑
    status: completed
    dependencies:
      - combat-systems
---

## User Requirements

- 将现有“割草游戏”重构为基于成熟 2D 游戏框架的实现，保持当前玩法与数值行为一致。
- 保留全屏沉浸式体验：大地图探索、角色移动、武器环绕攻击、敌群追踪、Boss 战、升级选择、结算弹窗、设置与调试面板。
- 保持现有资源与表现要点：敌人/玩家/Boss 贴图、血条显示、骚话气泡、子弹与受击反馈。

## Product Overview

- 一个全屏 2D 俯视角生存战斗游戏：玩家在大世界中移动，持续击败敌人并成长，每关击杀达标后触发 Boss，击败 Boss 进入下一关。

## Core Features

- 角色移动：虚拟摇杆与键盘控制，移动受世界边界限制。
- 战斗系统：多把环绕武器持续旋转造成伤害；敌人与 Boss 接触/子弹造成伤害；受击与话术提示。
- 关卡流程：每关刷怪上限与击杀目标；击杀达标后刷 Boss；Boss 击败后进入下一关；支持通关结算。
- 成长与存档：击杀触发升级选择（伤害/范围/转速/武器数量）；本地存档记录关卡、最高分、武器与玩家等级。
- UI 覆盖层：状态面板、Boss 血条、升级/死亡/胜利/设置/确认弹窗、开发者调试菜单。

## Tech Stack Selection（基于已验证工程现状）

- 构建与框架：Vite + React 18 + TypeScript（现有）
- 路由：react-router-dom v6（现有 HashRouter）
- 游戏框架：新增 Phaser 3（当前 package.json 未引入，需要补充依赖）

## Implementation Approach（重构策略）

- 采用“React UI 覆盖层 + Phaser 世界渲染与主循环”的分层方式：React 继续负责弹窗/按钮/面板，Phaser 负责地图、实体、碰撞、相机与 update 循环。
- 以现有逻辑为“行为基准”：从 src/pages/GrassCutter.tsx 抽取并对齐关键规则（世界 5000x5000、每关刷怪/击杀阈值、Boss 生成与子弹、武器线段命中、升级与存档）。
- 分阶段迁移（降低风险）：先接入 Phaser 最小可运行骨架，再逐步完成玩家/敌人/Boss/升级/存档，最终替换现有手写 Canvas 循环。

## Implementation Notes（执行要点与性能/稳定性）

- 资源加载：使用现有图片 import（如 src/assets/*.png）在 Phaser Loader 中加载；对需要“圆形头像”效果可在 Scene create 时一次性生成圆形裁剪纹理，避免每帧 mask。
- 碰撞与伤害：敌人与 Boss 采用 Arcade Physics 圆形 body；武器命中沿用现有“线段-圆最短距离”几何判定（O(敌人×武器)，现有规模可控），避免复杂物理形状带来的开销与不确定性。
- 对象池：敌人、Boss 子弹使用 Phaser Group pooling，避免频繁 new/destroy，减少 GC 抖动。
- React 状态同步：通过事件总线向 React 推送“离散变化”（hp/score/kills/bossHp/state），避免每帧 setState 导致重渲染；必要时对高频数据做节流（例如 10Hz）。
- 生命周期：在 GrassCutter 页面 mount 创建 Phaser.Game，在 unmount destroy；当 gameState 进入 settings/upgrading/dead 等时，暂停 Scene 或 timeScale=0，防止后台继续模拟。
- 逻辑补齐：现代码存在 victory UI 但缺少触发逻辑；重构时统一在“第10关 Boss 击败后”进入通关状态。

## Architecture Design（模块关系）

- React（页面/覆盖 UI）
- 负责：设置/升级/结算弹窗、开发者菜单、路由返回、存档按钮行为
- 通过事件/控制接口驱动 Phaser（暂停/继续/重开/切关）
- Phaser（Game + Scenes）
- BootScene：基础配置/缩放适配/注册全局资源 key
- PreloadScene：加载图片资源与生成派生纹理（圆形头像、爪子武器纹理）
- MainScene：实体创建、刷怪、Boss、碰撞与数值、相机跟随、事件派发

## Directory Structure（拟新增/修改文件，路径基于当前仓库）

youngbye.github.io/
├── package.json                                   # [MODIFY] 新增 phaser 依赖
├── src/
│   ├── App.tsx                                     # [MODIFY] 可选：对 /grasscutter 做懒加载以降低首屏体积
│   └── pages/
│       ├── GrassCutter.tsx                         # [MODIFY] 由“手写 Canvas 引擎”改为“Phaser 容器 + React UI”
│       └── grasscutter/
│           ├── balance.ts                          # [REUSE] 继续作为关卡与数值来源
│           └── phaser/
│               ├── create-game.ts                  # [NEW] 创建/销毁 Phaser.Game，绑定 parent DOM
│               ├── events.ts                       # [NEW] React↔Phaser 事件类型与事件总线
│               ├── types.ts                        # [NEW] 共享类型（存档结构、运行态快照、事件 payload）
│               ├── scenes/
│               │   ├── BootScene.ts                # [NEW] 基础配置与跳转 Preload
│               │   ├── PreloadScene.ts             # [NEW] Loader + 派生纹理生成
│               │   └── MainScene.ts                # [NEW] 核心玩法（实体、相机、循环、事件）
│               ├── objects/
│               │   ├── Player.ts                   # [NEW] 玩家实体封装（速度、受击状态等）
│               │   ├── Enemy.ts                    # [NEW] 小怪实体封装（追踪、血量、话术计时）
│               │   ├── Boss.ts                     # [NEW] Boss 行为（追踪/远离、射击、受击）
│               │   └── BossBullet.ts               # [NEW] 子弹对象池与生命周期
│               └── systems/
│                   ├── SpawnSystem.ts              # [NEW] 刷怪节奏与“每关上限/击杀触发 Boss”
│                   ├── WeaponSystem.ts             # [NEW] 环绕武器旋转与命中判定
│                   └── SaveSystem.ts               # [NEW] 兼容 grasscutter_save 的读写与版本兜底

## Key Code Structures（关键接口，签名级别）

- 事件总线（React 订阅状态变化，Phaser 派发）
- 控制接口（React 控制暂停/继续/重开/应用升级）

## Agent Extensions

- Skill: phaser
- Purpose: 指导 Phaser 3 在现有 Vite+React+TS 工程内的接入、Scene 设计、缩放/相机/物理、对象池与性能最佳实践。
- Expected outcome: 形成可维护的 Boot/Preload/Main Scene 架构，并按最佳实践实现输入、物理与资源加载。