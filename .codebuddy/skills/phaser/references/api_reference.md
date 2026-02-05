# Phaser 游戏开发速查（Recipes & Patterns）

## 推荐的项目结构（可按需调整）

- `src/game/`
  - `config.ts`：`Phaser.Types.Core.GameConfig`（尺寸、scale、physics、fps）
  - `main.ts`：创建 `new Phaser.Game(config)`
- `src/scenes/`
  - `BootScene`：最小依赖、设备能力检测、切 Scene
  - `PreloadScene`：Loading UI + 资源加载
  - `MainScene`：玩法
  - `UIScene`：HUD / 菜单（与 `MainScene` 解耦）
- `src/systems/`：输入、战斗、生成器、UI 逻辑等（把 `update` 拆小）
- `src/assets/`：图片/音频/atlas/json（由 bundler 处理或静态拷贝）

## Scene 模板（生命周期要点）

- `init(data)`：接收切 Scene 传参
- `preload()`：加载资源
- `create()`：创建对象、注册事件
- `update(time, delta)`：推进状态（尽量只做采样与调度）
- `shutdown/destroy`：清理事件监听与定时器（避免内存泄漏）

## Loader 常用配方

- **进度条**：监听 `this.load.on('progress', cb)` 与 `this.load.on('complete', cb)`
- **Texture Atlas**：
  - `this.load.atlas(key, textureURL, atlasDataURL)`
  - 动画帧：`this.anims.generateFrameNames(key, { prefix, start, end, zeroPad })`
- **资源 key 命名约定**：用域前缀区分：`bg.*` / `ui.*` / `sfx.*` / `atlas.*`

## 输入常用配方

- **方向键/wasd**：`this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE')`
- **点击/触摸**：用 `pointerdown` 驱动交互，避免 `update` 里轮询
- **拖拽**：对对象 `setInteractive({ draggable: true })`，监听 `drag` 事件

## 物理选型与范式

- **Arcade Physics（默认推荐）**
  - 适用：平台跳跃、俯视角移动、轻量碰撞
  - 关键点：
    - `setCollideWorldBounds(true)`
    - 调整 `body.setSize(w, h)` / `body.setOffset(x, y)`
    - 分清 `overlap`（触发）与 `collider`（阻挡）

- **Matter Physics**
  - 适用：复杂刚体、旋转、约束
  - 关键点：碰撞过滤（category/mask）、sleep、复合 body

## 动画与动效

- **帧动画（Animation）**：集中定义在一个模块，避免每个 Scene 重复创建
- **Tween**：用于 UI/过渡，不要代替物理运动；大量 tween 用完记得 stop/remove

## 相机与缩放适配

- **Camera**：
  - 跟随：`camera.startFollow(target)`
  - 限制：`camera.setBounds(0, 0, worldW, worldH)`
- **Scale**：
  - 监听：`this.scale.on('resize', cb)` 重新布局 UI
  - 统一“设计分辨率”概念，把 UI 尺寸按逻辑尺寸计算

## UI 组织

- HUD 与玩法分离：使用 `UIScene`（避免 UI 跟随相机、避免生命周期耦合）
- 文本：普通 `Text` + 像素风优先 `BitmapText`
- 层级：优先 `Container` 或 `Layer` 管理 UI；复杂 UI 直接上 DOM overlay（谨慎）

## 性能与稳定性

- pooling：对子弹/粒子/敌人使用 `Group` + 复用；减少 `destroy` 频率
- update 减负：避免每帧创建临时对象；把常用计算缓存到成员变量
- 资源策略：
  - 小图多：优先 atlas
  - 超大 atlas：注意显存与低端机纹理上限

## 常见故障排查清单

- **黑屏**：canvas 是否挂载、Scene 是否启动、资源是否 404、相机 bounds 是否正确
- **点击无响应**：对象是否 `setInteractive`、输入是否被 UI 吞掉、camera scroll 是否影响 hit test
- **碰撞不生效**：physics 是否启用、body 是否存在、collider/overlap 是否注册
- **缩放错乱**：Scale mode + 父容器 CSS（宽高/overflow）是否冲突
