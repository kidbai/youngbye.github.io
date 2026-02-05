---
name: grasscutter-地图与关卡升级
overview: 为“鸡哔蛋卷大魔王”新增 5000×5000 世界地图 + 摄像机跟随，并升级关卡为每关 100 只小怪、击杀后刷出 BOSS、血量按 1.15 倍递增且自动进下一关。
todos:
  - id: locate-grasscutter-runtime
    content: 定位 assets/index-wR0PISXW.js 中 grasscutter 组件与关键状态变量
    status: completed
  - id: implement-world-camera
    content: 实现世界坐标与摄像机，改造玩家/怪物/BOSS/子弹渲染与背景滚动
    status: completed
    dependencies:
      - locate-grasscutter-runtime
  - id: implement-level-spawn-boss
    content: 实现每关100只刷怪、击杀后刷BOSS、BOSS击败自动进下一关
    status: completed
    dependencies:
      - implement-world-camera
  - id: implement-hp-scaling-balance
    content: 实现小怪500起步×1.15成长与BOSS倍率血量，并统一HUD展示目标数
    status: completed
    dependencies:
      - implement-level-spawn-boss
  - id: smoke-test-gameplay
    content: 本地自测：移动越界、刷怪停止、BOSS触发、自动过关、性能与碰撞正常
    status: completed
    dependencies:
      - implement-hp-scaling-balance
  - id: 895c6221
    content: 代码模块需要优化，不要全都放在 G'r'a's's'C'u't'te'r
    status: completed
---

## User Requirements

- 新增“地图”玩法：元宵移动不再限制在一个屏幕内，而是在固定世界地图中移动；屏幕作为摄像机视口跟随元宵移动；怪物仍按原追踪逻辑追击并攻击元宵。
- 升级关卡玩法：
- 每关小怪总数固定为 100 只（本关只生成 100 只，生成完停止刷怪）。
- 小怪血量基础值提升到 500，并随关卡按倍率 ×1.15 递增血量上限。
- 每关都有 BOSS：击杀 100 只小怪后刷出 BOSS；BOSS 血量也随关卡按同趋势提升，并设置一个相对小怪的平衡倍率。
- 不需要“过关弹窗确认”：达成过关条件后自动进入下一关。

## Product Overview

- 一个以 Canvas 渲染的俯视角生存/割草小游戏：摇杆控制元宵在地图中移动，武器环绕攻击，怪物追击，击杀推进关卡与 BOSS。

## Core Features

- 地图与摄像机：世界坐标 + 视口跟随 + 边界约束 + 背景网格随视口滚动。
- 关卡节奏：每关 100 小怪 → 刷出 BOSS → 击败 BOSS 自动进下一关（无确认弹窗）。
- 血量成长：小怪 500 起步按 ×1.15 递增；BOSS 依据同趋势并乘以平衡倍率提升。

## Tech Stack Selection

- 前端：React（已在产物中确认）+ React Router（已在产物中确认）
- 渲染：Canvas 2D + requestAnimationFrame 主循环（已在产物中确认）
- 当前工作区分支：`gh-pages` 仅包含静态产物（`index.html` + `assets/*`），未包含可直接修改的 TS/源码目录；本次改造将以产物文件为落点完成。

## Implementation Approach

- 采用“世界坐标系 + 摄像机视口”的方式改造现有单屏坐标：
- 玩家、怪物、子弹、BOSS 均使用 worldX/worldY。
- 每帧根据玩家位置计算 cameraX/cameraY（视口左上角），渲染时做 world→screen 坐标变换。
- 将关卡刷怪从“无限定时刷”改为“本关最多生成 100 只”：
- 维护 spawnedCount / killedCount（每关重置），spawnedCount 达到 100 后停止 setInterval 刷怪。
- killedCount 达到 100 时触发刷出 BOSS（每关都有），并在 BOSS 被击败后自动进入下一关。
- 血量平衡：
- 小怪：`enemyHp(level) = round(500 * 1.15^(level-1))`
- BOSS：`bossHp(level) = round(enemyHp(level) * BOSS_HP_FACTOR)`，建议先落地 `BOSS_HP_FACTOR = 8`（保留为常量便于后续快速调参）。

## Implementation Notes (Execution Details)

- 性能：最多 100 只小怪，主循环 O(n)；渲染阶段对实体做视口裁剪（在视口外大幅不绘制），减少 drawImage/路径绘制开销。
- 兼容：保留现有 DPR 画布初始化与 imageSmoothing 设置；仅将坐标体系升级，不改变输入/升级系统等非必要逻辑。
- 风险控制：由于修改落点为打包产物 `assets/index-wR0PISXW.js`，需严格小范围改动并保持函数结构稳定，避免破坏路由与其他小游戏模块。

## Architecture Design

- GameLoop（rAF）：
- update(dt)：移动玩家（世界边界约束）→ 更新武器旋转 → 怪物追踪 → 碰撞/扣血 → 关卡推进条件判定（刷 BOSS/进下一关）
- render()：计算 camera → 绘制背景（基于 camera 偏移）→ 绘制可见实体（world→screen）→ HUD（不随 camera）
- 数据关系：
- Player(world)
- Enemies(world[])
- Boss(world|null)
- Bullets(world[])
- Camera(viewport from player)

## Directory Structure

project-root/
├── assets/
│   └── index-wR0PISXW.js  # [MODIFY] “鸡哔蛋卷大魔王/grasscutter”主游戏逻辑：引入世界地图坐标与摄像机，改造刷怪/关卡/BOSS/血量成长与自动过关。
└── index.html             # [NO CHANGE] 继续加载现有产物入口（本需求无需改动）。

## Agent Extensions

- 本次实现不需要使用已提供的扩展能力；直接在现有代码产物中完成地图与关卡逻辑改造。