# GrassCutter 割草游戏 - 游戏设计文档

> 本文档为游戏机制的完整整理，作为后续迭代更新的参考。

---

## 1. 世界与地图

| 参数 | 值 |
| --- | --- |
| 世界尺寸 | 5000 × 5000 像素 |
| 地形系统 | Phaser Tilemap（像素风 OverworldMap） |
| 地形类型 | 草地（可通行）、森林/岩壁（完全阻挡移动和子弹）、河流（阻挡移动但不阻挡子弹） |
| 碰撞 | 玩家、敌人、Boss 均与地形层碰撞；子弹/投射物仅被森林/岩壁销毁 |

### 移动端缩放系统

- 判定依据：`window.innerWidth < 768`
- **尺寸缩放** `MOBILE_SIZE_SCALE = 0.6`：影响实体大小、爆炸半径、保持距离等
- **速度缩放** `MOBILE_SPEED_SCALE = 0.65`：稍高于尺寸缩放，避免移动迟钝
- 工具函数：`scaleSize(v)` / `scaleSpeed(v)` 全局统一调用

---

## 2. 玩家（Player）

| 参数 | 值 |
| --- | --- |
| 最大生命值 | 100 |
| 移动速度 | 280 px/s（移动端 ×0.65） |
| 碰撞半径 | 30 px（移动端 ×0.6） |
| 控制方式 | 虚拟摇杆（移动端）/ WASD + 方向键（PC） |

### 受击效果

- 受击时显示红色光环（外圈半透明 + 红色描边），持续 200ms
- 受击时随机显示重庆方言骚话气泡（如"哎哟喂，老子遭起了！"）
- Boss 触碰伤害 25，冷却 650ms，附带 40px 击退

### 双持系统

- Epic 稀有度升级选项，前两次升级出现概率较高
- 启用后从两个枪口同时发射子弹，DPS 翻倍
- 主副枪沿射击方向的垂直轴偏移 12px（移动端 ×0.6）

---

## 3. 枪械系统（PlayerGunSystem）

### 3.1 枪械进化路线

```
手枪(pistol) → [Lv6] 冲锋枪(smg) → [Lv13] 榴弹机枪(grenadeMg)
                                         大炮(cannon) → 独立坦克宠物武器
```

进化通过升级抽卡的 Epic 进化卡触发，不是自动进化。

### 3.2 枪械参数表

| 枪械 | Tier | 基础伤害 | 射速(发/s) | 射程(px) | 弹速(px/s) | 弹径(px) | 散布(°) | 特殊 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 小手枪 pistol | 1 | 28 | 2.2 | 520 | 520 | 4 | 0 | - |
| 连射机关枪 smg | 2 | 14 | 6.5 | 560 | 600 | 3 | 5 | - |
| 榴弹机关枪 grenadeMg | 3 | 12 | 7.5 | 580 | 620 | 3 | 6 | 副武器：榴弹 |
| 大炮 cannon | 4 | 95 | 1.2 | 720 | 480 | 7 | 1 | 爆炸半径120，坦克宠物专用 |

> 以上数值为 PC 端基准，移动端按 `scaleSize`/`scaleSpeed` 缩放。

### 3.3 榴弹副武器（grenadeMg 专属）

| 参数 | 值 |
| --- | --- |
| 冷却 | 2800ms |
| 伤害 | 75 |
| 爆炸半径 | 95px |
| 射程 | 520px |
| 弹速 | 520px/s |

### 3.4 射击机制

- **自动索敌**：每帧查找视口范围内最近的敌人/Boss
- **视口攻击范围**：`√((camW/2)² + (camH/2)²) + 40` 像素（动态计算）
- **子弹上限**：70 发（性能保护）
- **子弹从枪口发射**：通过 `getMuzzle()` 获取枪口世界坐标
- **枪械朝向**：持续追踪目标，即使未开火也更新 `aimAngle`

### 3.5 倍率系统（乘法叠加）

升级卡通过乘法叠加提升枪械属性：

| 属性 | Common | Rare | Epic |
| --- | --- | --- | --- |
| 攻击力 damageMul | +8% | +12% | +18% |
| 攻速 fireRateMul | +6% | +9% | +14% |
| 射程 rangeMul | +7% | +10% | +16% |

实际伤害 = `baseDamage × damageMul`，射速 = `baseFireRate × fireRateMul`

---

## 4. 敌人系统

### 4.1 敌人类型总览

| 类型 | 代号 | 头像 | 武器 | 行为模式 |
| --- | --- | --- | --- | --- |
| 弓箭手 | melee | monster | px-bow (24×22) | 保持距离 + 横移 + 远程射箭 + 接触微伤 |
| 射击怪 | shooter | minion | px-gun-enemy (26×14) | 保持距离 + 定时射击 + 接触微伤 |
| 丢大便怪 | thrower | minion2 | px-toilet-roll (22×18) | 保持距离 + 投掷AOE + 接触微伤 |
| 大蛋卷 | bigDanjuan | big-danjuan | px-bow (30×28) | 纯近战冲锋 + 高伤接触 |

### 4.2 基础数值与成长

| 参数 | 公式/值 |
| --- | --- |
| 基础HP | 280 |
| HP成长 | `280 × 1.19^(level-1)` |
| 基础移动速度 | `0.85 × MOBILE_SPEED_SCALE` |
| 速度成长 | `+0.045/级`，上限 `2.8 × MOBILE_SPEED_SCALE` |
| 刷怪间隔 | `max(450, 1200 - 50×(level-1))` ms |
| 每关刷怪数 | 100 只 |

### 4.3 大蛋卷（bigDanjuan）专属属性

| 参数 | 值 | 说明 |
| --- | --- | --- |
| HP倍率 | ×2.5 | 普通怪的 2.5 倍 |
| 尺寸倍率 | ×1.5 | 碰撞半径 `25×1.5 = 37.5 → 38px`（移动端再 ×0.6） |
| 速度倍率 | ×1.25 | 比普通怪快 25% |
| 聚集加速 | ×1.15 | `ENEMY_CHASE_SPEED_BOOST` |
| 接触伤害 | `8 + 0.7×level` | 使用 `getMeleeEnemyAttackDamage()` |
| 接触间隔 | `max(350, 900-25×(level-1))` ms | 使用 `getMeleeEnemyAttackIntervalMs()` |

### 4.4 刷怪类型占比

| 类型 | 占比策略 |
| --- | --- |
| 大蛋卷 | 固定 40% |
| 弓箭手(melee) | 约 `(55-15t)×0.6%` → 前期 33% → 后期 24% |
| 射击怪(shooter) | 约 `(25+10t)×0.6%` → 前期 15% → 后期 21% |
| 丢大便怪(thrower) | 约 `(20+5t)×0.6%` → 前期 12% → 后期 15% |

> `t = (level-1)/(TOTAL_LEVELS-1)`，从 0 到 1 线性插值

### 4.5 弓箭手（melee）AI 行为

- 保持距离：160~320px（移动端 ×0.6）
- 太远 → 直接追击
- 太近 → 后退（0.9 倍速）
- 适中 → 横移绕圈（0.4 倍速，随机顺/逆时针）
- 远程射箭：使用 `px-arrow` 纹理，与 shooter 共用射击逻辑
- 接触微伤：`3 + 0.3×level`，间隔 950ms

### 4.6 射击怪（shooter）AI 行为

- 保持距离：220~380px
- 定时射击：`max(650, 1600-50×(level-1))` ms
- 弹速：`min(420, 210+10×(level-1))` px/s
- 弹伤：`6 + 0.6×level`
- 散布：±0.12 弧度
- 子弹最大飞行距离：650px，超过销毁
- 敌方子弹上限：280 发

### 4.7 丢大便怪（thrower）AI 行为

- 保持距离：260~420px
- 投掷间隔：`max(1200, 3400-70×(level-1))` ms
- 投掷物 AOE：
  - 落点瞬伤半径：90px
  - 落点伤害：`10 + 0.8×level`
  - 撞墙会"落地 + 读条"而非立即爆炸（给玩家反应时间）
- 残留区（大便地面）：
  - 持续：1100ms
  - Tick 间隔：300ms
  - Tick 伤害：`2 + 0.2×level`
- 投掷物上限：60 个
- 残留区上限：30 个

### 4.8 敌人分散系统

- **Grid-based 空间哈希**：`CELL_SIZE = 140`，避免 O(n²) 遍历
- 分散距离阈值：`radius × 1.25`
- 分散速度：`enemy.speed × 0.55`（近战怪 ×1，远程怪 ×0.55）
- 最终速度限制：`enemy.speed × 1.1`（防止分散叠加导致加速）

---

## 5. Boss 系统

### 5.1 Boss 基础参数

| 参数 | 值 |
| --- | --- |
| 碰撞半径 | 50px（移动端 ×0.6） |
| 移动速度 | 72 px/s（移动端 ×0.65） |
| 射击间隔 | 1500ms |
| 弹速 | 240 px/s（移动端 ×0.65） |
| 弹伤 | 15 |
| 弹径 | 8px |
| 触碰伤害 | 25，冷却 650ms |
| 击退距离 | 40px |
| 头像 | boss-circle / boss-shot-circle（射击时） |

### 5.2 Boss HP 动态缩放

```
baseHp = getEnemyHpByLevel(level) × (8.0 + 0.6×(level-1))
dpsMul = playerDamageMul × playerFireRateMul
scaleFactor = dpsMul > 1 ? √dpsMul : 1
finalBossHp = baseHp × scaleFactor
```

- 基础 HP 随关卡指数增长（`1.19^level` × 关卡倍率）
- 额外按玩家当前 DPS 倍率的 **平方根** 缩放，防止玩家强力升级后秒杀 Boss

### 5.3 Boss AI 行为

- **距离管理**：保持 200~400px（移动端缩放）
  - 太远 → 全速追击
  - 太近 → 半速后退
  - 适中 → 0.3 倍速缓慢逼近
- **射击**：冷却到期后向玩家发射直线子弹
- **骚话**：每 4 秒随机说一句（如"就这？就这？就这？"）
- Boss 子弹上限：160 发

### 5.4 Boss 生成条件

1. 本关击杀数 ≥ 100（`ENEMIES_PER_LEVEL`）
2. 无待处理的升级
3. 游戏状态为 playing
4. 生成时清理所有剩余敌人和投射物
5. 出生点在玩家上方 300px，自动寻找非阻挡地形

---

## 6. 坦克宠物（TankPet）

| 参数 | 值 |
| --- | --- |
| 获得条件 | 玩家等级 ≥ 10 时的 Epic 升级选项 |
| 武器 | 大炮（cannon），伤害 95，爆炸半径 120px |
| 射击冷却 | 2500ms |
| 跟随偏移 | 60px（左后方） |
| 跟随插值 | 0.06（越小越平滑） |
| 索敌范围 | 与玩家相同（视口范围） |
| 外观 | 像素风坦克车身 40×28 + 炮管 30×12 |

- 完全自动：自动索敌 → 自动瞄准 → CD 到即射击
- 炮弹使用 `PlayerExplosiveProjectile`，命中即爆，范围伤害

---

## 7. 升级系统

### 7.1 升级触发

- 每击杀 **10** 只怪物获得一次升级（`KILLS_PER_UPGRADE = 10`）
- 累计击杀数 `totalKills` 决定总升级次数
- 升级时暂停物理引擎 + 刷怪系统

### 7.2 三选一抽卡

每次升级生成 3 个不重复类别的选项卡：

| 类别 | 稀有度 | 说明 |
| --- | --- | --- |
| 攻击力提升 damageMul | Common/Rare/Epic | 乘法叠加 |
| 攻速提升 fireRateMul | Common/Rare/Epic | 乘法叠加 |
| 射程提升 rangeMul | Common/Rare/Epic | 乘法叠加 |
| 进化 evolve | Epic | 枪械进化（需达到等级门槛） |
| 双持武器 dualWield | Epic | 解锁后永久双枪 |
| 坦克宠物 tankPet | Epic | 解锁后永久跟随 |

### 7.3 稀有度权重

| 稀有度 | 权重 |
| --- | --- |
| Common | 75 |
| Rare | 20 |
| Epic | 5 |

### 7.4 进化保底机制

- 达到进化等级门槛后（Lv6 手枪→冲锋枪 / Lv13 冲锋枪→榴弹机枪）
- 连续 **2 次** 升级没有选择进化卡 → 下一次**必出**进化选项
- 选择进化卡后重置计数

### 7.5 特殊选项出现概率

- **进化卡**：权重 0.35（正常情况，非保底）
- **双持**：前 2 次升级权重 1.8，之后降为 0.4
- **坦克宠物**：权重 0.5（需玩家等级 ≥ 10）

---

## 8. 刷怪系统（SpawnSystem）

### 8.1 生成位置

- 在摄像机视口**边缘**生成（上/下/左/右随机）
- 边缘外扩 100px margin
- 限制在世界边界内（距边界 ≥ 50px）

### 8.2 地形避障

- 最多重试 **20 次**寻找可用出生点
- 检查出生点周围 3×3 tile 区域
- 中心点阻挡 → 重试
- 周围 8 格中 ≥ 5 格阻挡（口袋地形） → 重试

### 8.3 刷怪节奏

| 关卡 | 刷怪间隔 | 敌人速度 | 敌人HP |
| --- | --- | --- | --- |
| Lv1 | 1200ms | 0.85 | 280 |
| Lv5 | 1000ms | 1.03 | 492 |
| Lv10 | 750ms | 1.255 | 1167 |
| Lv15 | 500ms | 1.48 | 2765 |
| Lv20 | 450ms(min) | 1.705 | 6554 |

> 速度值需 ×60 转换为实际像素/秒（代码中 `config.enemySpeed * 60`）

---

## 9. 关卡与通关

| 参数 | 值 |
| --- | --- |
| 总关卡数 | 20 |
| 每关击杀目标 | 100 只 |
| 通关条件 | 击败第 20 关 Boss |
| 关卡流程 | 刷怪 → 击杀满 100 → Boss 战 → 击败 Boss → 下一关 |

---

## 10. 存档系统（SaveSystem）

### 持久化字段（localStorage）

```typescript
interface SaveData {
  currentLevel: number       // 当前关卡
  highScore: number          // 历史最高分
  playerLevel: number        // 玩家等级
  gunKey: GunKey             // 当前枪械
  gunDamageMul: number       // 攻击力倍率
  gunFireRateMul: number     // 攻速倍率
  gunRangeMul: number        // 射程倍率
  evolveMisses: number       // 进化保底计数
  dualWield: boolean         // 是否双持
  hasTankPet: boolean        // 是否有坦克宠物
  weaponDamage: number       // 旧字段（兼容）
  weaponRange: number        // 旧字段（兼容）
  weaponRotationSpeed: number // 旧字段（兼容）
  weaponCount: number        // 旧字段（兼容）
}
```

- 存档时机：击败 Boss 进入下一关时
- 重开游戏：清除存档，回到 Lv1 初始状态

---

## 11. 事件总线（React ↔ Phaser 通信）

使用 `globalThis` 单例 EventBus，保证 HMR 后事件互通。

### Phaser → React

| 事件 | 说明 |
| --- | --- |
| `STATE_UPDATE` | 每帧/关键操作后推送 `GameSnapshot` |
| `NEED_UPGRADE` | 发送 3 个升级选项供 UI 展示 |
| `PLAYER_DEAD` | 玩家死亡 |
| `VICTORY` | 通关 |

### React → Phaser

| 事件 | 说明 |
| --- | --- |
| `MOVE` | 摇杆移动向量 `{x, y}` |
| `PAUSE` / `RESUME` | 暂停/继续（含物理引擎+刷怪） |
| `APPLY_UPGRADE` | 玩家选择的升级卡 |
| `RESTART` | 重开游戏 |
| `SKIP_LEVEL` | 跳关（调试） |
| `KILL_ALL` | 清屏（调试） |

---

## 12. 性能保护

| 保护项 | 上限 |
| --- | --- |
| 玩家子弹 | 70 发 |
| 敌方子弹 | 280 发 |
| Boss 子弹 | 160 发 |
| 丢大便投掷物 | 60 个 |
| AOE 残留区 | 30 个 |
| 敌人分散算法 | Grid 空间哈希，避免 O(n²) |

---

## 13. 资源清单（PreloadScene 加载）

### 图片资源

| Key | 说明 |
| --- | --- |
| yuanxiao | 玩家头像（元宵） |
| boss / boss-shot | Boss 头像（普通/射击态） |
| minion | shooter 敌人头像 |
| minion2 | thrower 敌人头像 |
| monster | melee 敌人头像 |
| big-danjuan | 大蛋卷敌人头像 |

### 程序生成纹理

所有头像生成 `*-circle` 圆形裁剪版本，用于 Arcade 圆形碰撞体显示。

像素风武器/子弹/坦克等纹理均通过 `Graphics` 程序生成：
- `px-gun-*`：各级别枪械
- `px-bow`：弓
- `px-arrow`：箭
- `px-gun-enemy`：敌人枪
- `px-toilet-roll`：手纸卷（大便怪武器）
- `px-bullet`：通用子弹
- `px-tank-body` / `px-tank-turret`：坦克车身/炮管

---

## 附录：关键文件索引

| 文件 | 职责 |
| --- | --- |
| `balance.ts` | 单一真源：所有数值常量与计算函数 |
| `MainScene.ts` | 核心场景：游戏循环、碰撞、升级、Boss 流程 |
| `Player.ts` | 玩家实体：移动、受击、双持、枪械显示 |
| `Enemy.ts` | 敌人实体：HP条、武器、话术、追击 |
| `Boss.ts` | Boss 实体：AI 行为、射击、骚话 |
| `PlayerGunSystem.ts` | 枪械系统：自动索敌、射击、进化、倍率 |
| `SpawnSystem.ts` | 刷怪系统：边缘生成、地形避障、类型权重 |
| `TankPet.ts` | 坦克宠物：跟随、索敌、大炮射击 |
| `events.ts` | 事件总线：React ↔ Phaser 通信 |
| `types.ts` | 共享类型：SaveData / GameSnapshot / UpgradeOption |
