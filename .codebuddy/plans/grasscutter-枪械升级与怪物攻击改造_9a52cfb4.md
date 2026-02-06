---
name: grasscutter-枪械升级与怪物攻击改造
overview: 将 GrassCutter 的近战旋转武器改为自动瞄准的枪械体系，加入线性进化与随机三选一稀有度升级，并为三类怪物增加三种攻击方式且随 20 关逐步强化。
design:
  architecture:
    framework: react
  styleKeywords:
    - Glassmorphism
    - 高对比霓虹描边（仅用于稀有度强调）
    - 卡片式抽取
    - 细腻微动效
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 22px
      weight: 700
    subheading:
      size: 14px
      weight: 600
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#22C55E"
      - "#3B82F6"
      - "#A855F7"
    background:
      - "#0B1220"
      - "#111827"
    text:
      - "#E5E7EB"
      - "#FFFFFF"
    functional:
      - "#22C55E"
      - "#F59E0B"
      - "#EF4444"
      - "#A855F7"
todos:
  - id: rebalance-and-constants
    content: 调整 balance.ts：20关曲线、枪械方案、敌人攻击频率参数
    status: completed
  - id: player-gun-system
    content: 使用[skill:phaser]实现 PlayerGunSystem 与玩家子弹/爆炸对象
    status: completed
    dependencies:
      - rebalance-and-constants
  - id: upgrade-random-rarity
    content: 实现随机3选1+稀有度+进化保底，并改造升级弹窗
    status: completed
    dependencies:
      - player-gun-system
  - id: enemy-attack-types
    content: 实现三类敌人攻击：射击/近战CD/投掷AOE，并接入刷怪占比
    status: completed
    dependencies:
      - rebalance-and-constants
  - id: save-snapshot-migration
    content: 更新 SaveData/GameSnapshot，兼容旧存档并完善HUD展示字段
    status: completed
    dependencies:
      - upgrade-random-rarity
      - enemy-attack-types
---

## User Requirements

- 将玩家攻击从“绕身近战武器”改为“枪械射击”，射击为**自动瞄准最近敌人**。
- 设计一套**线性进化**枪械路线：小手枪 → 连射机关枪 → 带CD榴弹的机关枪 → 大炮，并给出相对平衡的数值方案。
- 升级系统改为：每次升级**随机 3 选 1**，并包含**稀有度**；可升级枪械**攻击力 / 攻速 / 射程**等，并能触发枪械进化（避免卡手要有保底）。
- 增加 3 种普通怪物攻击方式（对应现有 3 种怪物外观/类型）：**可射击 / 近战攻击 / 丢大便**；攻击频率随关卡逐步提升。
- 关卡规模扩展到 **20 关**，整体数值曲线需同步调整以保持平衡。

## Product Overview

- 一个俯视角生存闯关玩法：玩家自动射击、移动走位，击杀获得升级，清完本关目标后挑战Boss并进入下一关。

## Core Features

- 枪械系统：自动索敌射击、弹道/爆炸/范围伤害等差异化武器表现
- 随机升级系统：3选1 + 稀有度 + 进化保底机制
- 怪物攻击体系：三类敌人对应三套攻击逻辑，且随关卡提升强度/频率

## Tech Stack Selection

- 前端：React 18 + TypeScript（`src/pages/GrassCutter.tsx`）
- 构建：Vite（`vite.config.ts`）
- 游戏引擎：Phaser 3（`phaser` 相关代码位于 `src/pages/grasscutter/phaser/`）
- 样式：CSS Modules（`GrassCutter.module.css`）

## Implementation Approach

- 用“**玩家枪械系统 + 子弹/爆炸对象**”替换现有 `WeaponSystem` 近战命中；保持现有输入（仅移动），射击全自动。
- 升级系统改为“**加权随机抽取（含稀有度）**”，每次生成 3 个不重复、且当前可用的升级项；当达到进化门槛且尚未进化时，使用**保底规则**确保进化项在限定次数内出现。
- 敌人改为“**三类行为/攻击策略**”，复用 Boss 子弹实现思路（定时器/冷却、弹道、与地形/玩家碰撞）；“丢大便”采用落点范围伤害/持续区域（简化为可实现且性能可控的对象生命周期）。
- 将关卡拓展到 20：同步调整 `balance.ts` 的敌人HP增长、刷怪间隔、敌人攻击间隔等曲线，避免后期过度膨胀与弹幕失控。

## Balanced Gun Scheme (推荐初版数值，可在 `balance.ts` 统一配置)

> 单位说明：射程=子弹最大飞行距离；攻速=发射频率（发/秒）；CD=技能型子弹独立冷却。

- Tier 1：小手枪（起始）
- 单发，攻速 2.2/s，伤害 28，射程 520，子弹速度 520
- Tier 2：连射机关枪（进化1）
- 连射单发，攻速 6.5/s，伤害 14，射程 560，轻微散布（命中稳定但需走位）
- Tier 3：榴弹机关枪（进化2）
- 主武器：攻速 7.5/s，伤害 12，射程 580
- 副武器：榴弹（CD 2.8s），伤害 75，爆炸半径 95，射程 520（落点小范围AOE）
- Tier 4：大炮（进化3）
- 攻速 1.2/s，伤害 95，射程 720，炮弹爆炸半径 120（对群强、对单吃攻速/伤害升级）

### Stat Upgrades（随机池示例）

- 攻击力：+8%（常见）/+12%（稀有）/+18%（史诗）
- 攻速：+6%（常见）/+9%（稀有）/+14%（史诗）
- 射程：+7%（常见）/+10%（稀有）/+16%（史诗）
- 进化（史诗）：当达到门槛等级且未进化时可出现
- 进化门槛建议：Lv6 / Lv13 / Lv20（或按总升级次数触发）
- 保底：达到门槛后，若连续 N 次升级未刷到进化，则下一次必出（N 建议 2~3）

## Enemy Attack Scheme（随关卡提升频率）

- 近战怪（接触攻击）
- 接触不再“自爆死亡”；改为冷却攻击
- 攻击间隔：max(900ms - 25ms*(level-1), 350ms)
- 伤害：8 + 0.7*level
- 射击怪（远程射击）
- 保持距离区间（例如 220~380），过近后撤，过远追击
- 射击间隔：max(1600ms - 50ms*(level-1), 650ms)
- 子弹速度：min(210 + 10*(level-1), 420)，伤害：6 + 0.6*level
- 丢大便怪（投掷落点/范围）
- 保持距离区间（例如 260~420）
- 投掷间隔：max(2400ms - 70ms*(level-1), 900ms)
- 命中：落点半径 90（落地瞬间伤害）+ 短暂残留区域（可选，低频tick以控性能）

## Implementation Notes (Execution Details)

- 性能：玩家/敌人子弹用 `Phaser.Physics.Arcade.Group` 管理；子弹出界/碰墙即销毁；限制同屏子弹上限（尤其机关枪阶段）。
- 兼容：`SaveSystem` 通过“默认值合并”机制兼容旧存档；新增字段不删除旧字段，必要时做迁移映射。
- 控爆：尽量保留现有事件总线与 React HUD 架构；只在“升级弹窗”做结构调整，避免改动其它 UI 逻辑。

## Architecture Design

- React：继续负责 HUD/升级弹窗/设置面板
- Phaser MainScene：
- PlayerGunSystem：自动索敌、发射、管理玩家子弹
- SpawnSystem：按关卡生成敌人（带 EnemyType）
- Enemy：追击/保持距离 + 攻击逻辑（射击/近战/投掷）
- Projectile Objects：玩家子弹、敌人子弹、投掷物/爆炸/残留区

（本次改造无需复杂Mermaid图，按现有分层即可。）

## Directory Structure

```text
/Users/youngbye/pro/github/youngbye.github.io/
├── src/pages/GrassCutter.tsx                              # [MODIFY] 升级弹窗改为随机3选1+稀有度；HUD显示枪械/攻速/射程等新字段
├── src/pages/GrassCutter.module.css                       # [MODIFY] 升级卡片样式（稀有度边框/渐变/动效）
├── src/pages/grasscutter/balance.ts                       # [MODIFY] 20关曲线、枪械参数、敌人攻击间隔/伤害等单一真源
├── src/pages/grasscutter/phaser/types.ts                  # [MODIFY] 新增枪械/升级项/稀有度等类型；扩展 GameSnapshot/SaveData
├── src/pages/grasscutter/phaser/events.ts                 # [MODIFY] 若需要：增加“升级选项下发/确认选择”等事件载荷
├── src/pages/grasscutter/phaser/scenes/MainScene.ts       # [MODIFY] 接入 PlayerGunSystem；重写命中/升级应用；敌人攻击与投射物更新
├── src/pages/grasscutter/phaser/systems/SpawnSystem.ts    # [MODIFY] 生成三类敌人（EnemyType），并按关卡调整占比
├── src/pages/grasscutter/phaser/systems/SaveSystem.ts     # [MODIFY] 存档字段扩展与向后兼容合并
├── src/pages/grasscutter/phaser/objects/Enemy.ts          # [MODIFY] 敌人类型、保持距离AI、攻击冷却/发射/投掷逻辑
├── src/pages/grasscutter/phaser/systems/WeaponSystem.ts   # [MODIFY or DEPRECATE] 视需要保留（旧近战）或改为兼容层/移除引用
├── src/pages/grasscutter/phaser/systems/PlayerGunSystem.ts# [NEW] 玩家自动索敌射击、武器进化、属性叠加、子弹组管理
├── src/pages/grasscutter/phaser/objects/PlayerBullet.ts   # [NEW] 玩家子弹对象（速度/伤害/出界检测/命中表现）
├── src/pages/grasscutter/phaser/objects/EnemyBullet.ts    # [NEW] 普通敌人子弹（可复用BossBullet结构但独立命名便于区分）
├── src/pages/grasscutter/phaser/objects/PoopProjectile.ts # [NEW] 投掷物（落点/定时/触发AOE）
├── src/pages/grasscutter/phaser/objects/AoeField.ts        # [NEW] 残留范围伤害（可选，低频tick）
```

## Key Code Structures (critical interfaces only)

```ts
export type GunId = 'pistol' | 'smg' | 'grenade-mg' | 'cannon'
export type Rarity = 'common' | 'rare' | 'epic'

export interface GunRuntimeStats {
  gunId: GunId
  damageMul: number
  fireRateMul: number
  rangeMul: number
}

export interface UpgradeOption {
  id: string
  rarity: Rarity
  title: string
  desc: string
  applyType: 'damage' | 'fireRate' | 'range' | 'evolve'
  payload?: unknown
}
```

## Design Style

- 保持现有整体布局（HUD + 弹窗），重点升级“升级弹窗”为卡片式抽卡体验：三张可点击升级卡片，突出稀有度与收益对比。
- 卡片信息：名称、稀有度标签、简短描述、关键数值增量；进化卡片显示“当前枪械 → 下一枪械”。

## Pages (涉及改动的界面)

- 仅改造：升级弹窗（upgrading modal）

## Blocks (升级弹窗从上到下)

1) 顶部标题区：显示“选择升级”、当前等级与下一等级。
2) 升级卡片区：3张卡片纵向排列（移动端友好），稀有度渐变边框+微动效。
3) 说明区：展示“进化保底提示/下一次必出进化”等轻提示（可选）。
4) 操作反馈：点击后立刻高亮选中并关闭弹窗，避免误触；禁用不可用项（若出现则不生成）。

## Agent Extensions

### Skill

- **phaser**
- Purpose: 指导 Phaser 3 中子弹组/碰撞/对象生命周期/性能控制的最佳实践，并用于枪械与怪物攻击实现设计复核
- Expected outcome: 形成稳定的“自动索敌射击 + 多投射物 + AOE”实现方案，避免弹幕导致掉帧与逻辑混乱