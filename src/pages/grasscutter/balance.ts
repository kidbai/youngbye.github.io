// GrassCutter：地图/关卡数值与通用工具
// - 单一真源：玩法数值（HP/升级/刷怪）与工具函数

// ==================== 移动端缩放系统 ====================

/** 判断是否为移动端（模块加载时计算一次，缓存结果） */
const _isMobile: boolean = typeof window !== 'undefined' && window.innerWidth < 768

export function isMobile(): boolean {
  return _isMobile
}

/** 移动端尺寸缩放系数（影响实体大小、爆炸半径、保持距离等） */
export const MOBILE_SIZE_SCALE = _isMobile ? 0.6 : 1

/** 移动端速度缩放系数（稍高于尺寸缩放，避免移动迟钝） */
export const MOBILE_SPEED_SCALE = _isMobile ? 0.65 : 1

/** 便捷函数：按尺寸缩放 */
export function scaleSize(v: number): number {
  return Math.round(v * MOBILE_SIZE_SCALE)
}

/** 便捷函数：按速度缩放 */
export function scaleSpeed(v: number): number {
  return Math.round(v * MOBILE_SPEED_SCALE)
}

/**
 * 根据摄像机视口计算动态攻击范围（敌人射击/投掷、玩家索敌）。
 * 公式：视口对角线一半 + margin，确保只有屏幕内可见的敌人才能攻击。
 */
export function getViewportFireRange(camWidth: number, camHeight: number, margin = 40): number {
  return Math.sqrt((camWidth / 2) ** 2 + (camHeight / 2) ** 2) + margin
}

// ==================== 世界尺寸 ====================

export const WORLD_WIDTH = 5000
export const WORLD_HEIGHT = 5000

export const ENEMIES_PER_LEVEL = 100

// ==================== 玩家与升级（单一真源） ====================

export const PLAYER_MAX_HP = 100

/** 玩家移动速度（像素/秒）：调低以提升手感与躲避难度 */
export const PLAYER_SPEED = scaleSpeed(280)

// 每击杀多少只怪物获得一次升级
// 说明：MainScene 的升级逻辑是按累计击杀（totalKills）计算，因此该值会显著影响整局节奏。
export const KILLS_PER_UPGRADE = 10

export const MAX_WEAPONS = 8

export const INITIAL_WEAPON_DAMAGE = 45
export const INITIAL_WEAPON_RANGE = 90
export const INITIAL_WEAPON_ROTATION_SPEED = 3
export const INITIAL_WEAPON_COUNT = 1

export const UPGRADE_DAMAGE_INCREASE = 8
export const UPGRADE_RANGE_INCREASE = 14
export const UPGRADE_SPEED_INCREASE = 0.35

// ==================== 总关卡数 ====================

/**
 * 总关卡数（通关判定/跳关上限/数值曲线的名义范围）
 * - UI 目前支持跳到 20
 */
export const TOTAL_LEVELS = 20

// ==================== 枪械方案（单一真源） ====================

/** 线性进化：手枪 → 冲锋枪 → 榴弹机枪（大炮改为独立坦克宠物） */
export const EVOLVE_AT_PLAYER_LEVEL = {
  smg: 6,
  grenadeMg: 13,
} as const

/** 达到进化门槛后，连续错过进化卡 N 次则下一次必出 */
export const EVOLVE_PITY_AFTER_MISSES = 2

/** 稀有度权重（用于"随机 3 选 1"抽卡） */
export const UPGRADE_RARITY_WEIGHTS = {
  common: 75,
  rare: 20,
  epic: 5,
} as const

/** 三维属性升级（乘法叠加；例如 +8% => * 1.08） */
export const STAT_UPGRADE_VALUES = {
  damageMul: { common: 0.08, rare: 0.12, epic: 0.18 },
  fireRateMul: { common: 0.06, rare: 0.09, epic: 0.14 },
  rangeMul: { common: 0.07, rare: 0.1, epic: 0.16 },
} as const

/** 玩家子弹上限（控性能；SMG 阶段尤其重要） */
export const PLAYER_BULLET_CAP = 70

/** 枪械基础参数：单位说明
 * - fireRate: 发/秒
 * - range: 最大飞行距离（像素）
 * - bulletSpeed: 像素/秒
 */
export const GUN_BASE = {
  pistol: {
    gunId: 'pistol' as const,
    tier: 1,
    title: '小手枪',
    baseDamage: 28,
    fireRate: 2.2,
    range: scaleSize(520),
    bulletSpeed: scaleSpeed(520),
    bulletRadius: Math.max(2, scaleSize(4)),
    spreadDeg: 0,
  },
  smg: {
    gunId: 'smg' as const,
    tier: 2,
    title: '连射机关枪',
    baseDamage: 14,
    fireRate: 6.5,
    range: scaleSize(560),
    bulletSpeed: scaleSpeed(600),
    bulletRadius: Math.max(2, scaleSize(3)),
    spreadDeg: 5,
  },
  grenadeMg: {
    gunId: 'grenade-mg' as const,
    tier: 3,
    title: '榴弹机关枪',
    baseDamage: 12,
    fireRate: 7.5,
    range: scaleSize(580),
    bulletSpeed: scaleSpeed(620),
    bulletRadius: Math.max(2, scaleSize(3)),
    spreadDeg: 6,
    grenade: {
      cooldownMs: 2800,
      damage: 75,
      explosionRadius: scaleSize(95),
      range: scaleSize(520),
      projectileSpeed: scaleSpeed(520),
    },
  },
  cannon: {
    gunId: 'cannon' as const,
    tier: 4,
    title: '大炮',
    baseDamage: 95,
    fireRate: 1.2,
    range: scaleSize(720),
    bulletSpeed: scaleSpeed(480),
    bulletRadius: Math.max(3, scaleSize(7)),
    spreadDeg: 1,
    explosionRadius: scaleSize(120),
  },
}

// ==================== 坦克宠物参数 ====================

/** 坦克宠物射击冷却（ms） */
export const TANK_PET_COOLDOWN_MS = 2500
/** 坦克跟随玩家偏移距离（px） */
export const TANK_PET_FOLLOW_OFFSET = scaleSize(60)
/** 坦克跟随插值系数（越小越平滑） */
export const TANK_PET_FOLLOW_LERP = 0.06

// ==================== 敌人与Boss数值 ====================

// 普通怪物：配合双持+坦克 AOE 的高输出，提高血量保持中上难度
export const ENEMY_BASE_HP = 280
export const ENEMY_HP_GROWTH = 1.19

// Boss：倍率随关卡缓增（配合玩家后期强力输出）
export const BOSS_HP_FACTOR_BASE = 8.0
export const BOSS_HP_FACTOR_GROWTH = 0.6

export const LEVEL_SPAWN_INTERVAL_BASE = 1200
export const LEVEL_SPAWN_INTERVAL_MIN = 450
export const LEVEL_SPAWN_INTERVAL_DECAY = 50

// 敌人移动速度曲线：整体下调，缓解"贴脸过快 + 扎堆"
export const LEVEL_ENEMY_SPEED_BASE = 0.85 * MOBILE_SPEED_SCALE
export const LEVEL_ENEMY_SPEED_GROWTH = 0.045 * MOBILE_SPEED_SCALE
export const LEVEL_ENEMY_SPEED_MAX = 2.8 * MOBILE_SPEED_SCALE

// ==================== 大蛋卷（bigDanjuan）专属数值 ====================

/** 大蛋卷血量倍率（普通怪物的 2~3 倍，取 2.5 倍） */
export const BIG_DANJUAN_HP_MULTIPLIER = 2.5

/** 大蛋卷头像大小倍率（比普通怪物大 1/2） */
export const BIG_DANJUAN_SIZE_MULTIPLIER = 1.5

/** 大蛋卷移动速度倍率（比普通怪物快 1/4） */
export const BIG_DANJUAN_SPEED_MULTIPLIER = 1.25

// ==================== 怪物聚集速度增强 ====================

/** 怪物向玩家聚集的加速系数（提升割草乐趣） */
export const ENEMY_CHASE_SPEED_BOOST = 1.15

// ==================== 普通怪物攻击（随关卡提升） ====================

/** 四类怪物占比（bigDanjuan 占 4 成，其余三类占 6 成；按关卡渐变） */
export function getEnemyTypeSpawnWeights(level: number): {
  melee: number
  shooter: number
  thrower: number
  bigDanjuan: number
} {
  const t = clamp((level - 1) / (TOTAL_LEVELS - 1), 0, 1)
  // 大蛋卷固定占约 40%
  const bigDanjuan = 40
  // 其余三类共占 60%，前期近战多、后期远程/投掷增多
  const melee = Math.round((55 - 15 * t) * 0.6)
  const shooter = Math.round((25 + 10 * t) * 0.6)
  const thrower = Math.round((20 + 5 * t) * 0.6)
  return { melee, shooter, thrower, bigDanjuan }
}

// 近战怪：改为"接触不自爆"，而是按冷却对玩家造成伤害
export function getMeleeEnemyAttackIntervalMs(level: number): number {
  return Math.max(350, 900 - 25 * (level - 1))
}

export function getMeleeEnemyAttackDamage(level: number): number {
  return Math.round(8 + 0.7 * level)
}

// 射击怪：保持距离并定时射击
export function getShooterEnemyShootIntervalMs(level: number): number {
  return Math.max(650, 1600 - 50 * (level - 1))
}

export function getShooterEnemyBulletSpeed(level: number): number {
  return Math.min(scaleSpeed(420), scaleSpeed(210) + scaleSpeed(10) * (level - 1))
}

export function getShooterEnemyBulletDamage(level: number): number {
  return Math.round(6 + 0.6 * level)
}

/** 射击怪开火距离阈值（后备值；优先使用 getViewportFireRange 动态计算） */
export const SHOOTER_FIRE_RANGE = scaleSize(520)

/** 敌方普通子弹最大飞行距离（超过即销毁） */
export const ENEMY_BULLET_MAX_RANGE = scaleSize(650)

// 丢大便怪：投掷落点范围伤害（可选残留区）
export function getThrowerEnemyThrowIntervalMs(level: number): number {
  return Math.max(1200, 3400 - 70 * (level - 1))
}

/** 丢大便怪开火距离阈值（后备值；优先使用 getViewportFireRange 动态计算） */
export const THROWER_FIRE_RANGE = scaleSize(520)

export const THROWER_POOP_IMPACT_RADIUS = scaleSize(90)

export function getThrowerEnemyImpactDamage(level: number): number {
  return Math.round(10 + 0.8 * level)
}

/** 残留区（可选）：低频 tick，控制性能 */
export const POOP_FIELD_DURATION_MS = 1100
export const POOP_FIELD_TICK_MS = 300

export function getPoopFieldTickDamage(level: number): number {
  return Math.round(2 + 0.2 * level)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function getEnemyHpByLevel(level: number): number {
  return Math.round(ENEMY_BASE_HP * Math.pow(ENEMY_HP_GROWTH, level - 1))
}

export function getBossHpByLevel(level: number, playerDamageMul = 1, playerFireRateMul = 1): number {
  const factor = BOSS_HP_FACTOR_BASE + BOSS_HP_FACTOR_GROWTH * (level - 1)
  const baseHp = Math.round(getEnemyHpByLevel(level) * factor)
  // 根据玩家攻击力与攻速倍率进行适当提升，确保 Boss 不会被秒杀
  // 综合 DPS 倍率 = damageMul * fireRateMul，Boss 血量按其平方根缩放（缓和增长）
  const dpsMul = playerDamageMul * playerFireRateMul
  const scaleFactor = dpsMul > 1 ? Math.sqrt(dpsMul) : 1
  return Math.round(baseHp * scaleFactor)
}

export function getLevelConfig(level: number): {
  level: number
  enemyHp: number
  enemySpeed: number
  spawnInterval: number
  killTarget: number
} {
  const enemyHp = getEnemyHpByLevel(level)
  const enemySpeed = Math.min(
    LEVEL_ENEMY_SPEED_MAX,
    LEVEL_ENEMY_SPEED_BASE + LEVEL_ENEMY_SPEED_GROWTH * (level - 1)
  )
  const spawnInterval = Math.max(
    LEVEL_SPAWN_INTERVAL_MIN,
    LEVEL_SPAWN_INTERVAL_BASE - LEVEL_SPAWN_INTERVAL_DECAY * (level - 1)
  )

  return {
    level,
    enemyHp,
    enemySpeed,
    spawnInterval,
    killTarget: ENEMIES_PER_LEVEL,
  }
}
