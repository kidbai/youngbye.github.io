---
name: phaser
description: This skill should be used when building Phaser 3 games (JavaScript/TypeScript) to set up project structure and implement scenes, loading, input, physics, animation, camera, UI, debugging, and performance best practices.
---

# Phaser 游戏开发（在任意项目里写游戏）

## 适用范围（触发条件）

- 在业务仓库 / 独立仓库里使用 Phaser 3 编写游戏（JS / TS）
- 需要从 0 搭建项目（Vite / Webpack / React / Vue 等）并把 Phaser 跑起来
- 需要实现核心玩法：Scene 结构、资源加载、输入、物理、动画、相机、UI
- 需要处理常见工程问题：缩放适配、资源体积、性能优化、调试与发布

## 工作流决策树（先走对路）

- **新项目**：优先用脚手架生成可运行模板，再迭代玩法
  - 执行 `npm create @phaserjs/game@latest` 或 `npx @phaserjs/create-game@latest`
- **已有项目**：先确定构建体系（Vite/Webpack）与 Phaser 导入方式（ESM/UMD），再接入一套最小可跑的 `Game + Scene`
- **需要物理**：
  - 2D 轻量碰撞/平台跳跃：优先 Arcade Physics
  - 需要复杂刚体/约束：使用 Matter
- **需要大量资源/动画**：优先 Texture Atlas（减少 draw calls + 管理资产）

## 最小可跑骨架（Game + Scene）

- 创建 3 个 Scene：`Boot`（配置/预加载最低限依赖）、`Preload`（Loading UI + 资源加载）、`Main`（玩法）
- 在 `update` 中只做“输入采样 + 状态推进”，重活交给事件/系统/定时器
- 使用 `this.registry` / 自建 store 管理跨 Scene 状态，避免到处找全局变量

## 资源加载（Loader）

- 统一资产 key 命名：`"bg.forest"` / `"sfx.jump"` / `"atlas.player"` 这类分层 key
- 在 `Preload` 里集中加载，并监听 `progress`/`complete` 驱动 Loading UI
- 图片序列或多动画：优先 `atlas` 或 `spritesheet`，减少文件数与请求数

## 输入（Input）

- Keyboard：用 `this.input.keyboard.addKeys` 一次性注册 keys，避免每帧查询字符串
- Pointer：用 `pointerdown/up/move` 事件驱动，而不是 `update` 里频繁判断
- 手柄：需要时再接 `this.input.gamepad`，并做降级（无手柄时可用键鼠）

## 物理（Physics）

- Arcade：适合大多数 2D 游戏。重点管理：重力、body size/offset、碰撞层与触发器
- Matter：适合复杂碰撞与刚体。重点管理：body 合并、sleep、碰撞过滤（category/mask）

## 动画与动效（Animation / Tween）

- 帧动画：用 `this.anims.create` + `generateFrameNames/Numbers`，把动画定义集中在一个模块
- Tween：用 tween 做 UI 动效与轻量位移，避免用 tween 代替物理运动

## 相机与缩放适配（Camera / Scale）

- 设计分辨率（logical size）与真实画布尺寸分离：用 Scale Manager 做自适应
- 需要像素风：开启 pixelArt 相关配置并关注缩放后的采样
- Resize：监听 `scale.on('resize', ...)` 重排 UI 与摄像机 bounds

## 性能与工程化（能跑得久、能发得出去）

- 复用对象：对子弹/特效使用 group + pooling，避免频繁 `new` 与 `destroy`
- 减少每帧分配：`update` 中避免创建临时数组/对象；把常用向量缓存起来
- 贴图策略：合图优先；同时注意 atlas 过大导致的显存压力
- 调试：优先打开 physics debug / 自建 debug overlay（fps、entities、colliders）

## 常见问题排查

- 黑屏：先确认 canvas 挂载、Scene 是否启动、资源是否 404、相机是否看得到目标
- 资源加载慢：检查是否拆分过细（小文件过多）、是否需要 atlas、是否启用缓存策略
- 物理不工作：确认 physics 配置启用、对象是否 `enableBody`、碰撞层是否正确
- 分辨率错乱：检查 Scale mode 与 parent 容器 CSS（尤其是 `display`/`width`/`height`）

## 参考资料（按需加载）

- 读取 `references/api_reference.md`：包含常用 API 速查、Scene 模板、加载与缩放配方、Arcade/Matter 选型与范式、常见坑
