// GrassCutter：地图/关卡数值与通用工具
// - 单一真源：玩法数值（HP/升级/刷怪）与工具函数

export const WORLD_WIDTH = 5000
export const WORLD_HEIGHT = 5000

export const ENEMIES_PER_LEVEL = 100

// ==================== 玩家与升级（单一真源） ====================

export const PLAYER_MAX_HP = 100

/** 玩家移动速度（像素/秒）：调低以提升手感与躲避难度 */
export const PLAYER_SPEED = 280

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
    gunId: 'pistol',
    tier: 1,
    title: '小手枪',
    baseDamage: 28,
    fireRate: 2.2,
    range: 520,
    bulletSpeed: 520,
    bulletRadius: 4,
    spreadDeg: 0,
  },
  smg: {
    gunId: 'smg',
    tier: 2,
    title: '连射机关枪',
    baseDamage: 14,
    fireRate: 6.5,
    range: 560,
    bulletSpeed: 600,
    bulletRadius: 3,
    spreadDeg: 5,
  },
  grenadeMg: {
    gunId: 'grenade-mg',
    tier: 3,
    title: '榴弹机关枪',
    baseDamage: 12,
    fireRate: 7.5,
    range: 580,
    bulletSpeed: 620,
    bulletRadius: 3,
    spreadDeg: 6,
    grenade: {
      cooldownMs: 2800,
      damage: 75,
      explosionRadius: 95,
      range: 520,
      projectileSpeed: 520,
    },
  },
  cannon: {
    gunId: 'cannon',
    tier: 4,
    title: '大炮',
    baseDamage: 95,
    fireRate: 1.2,
    range: 720,
    bulletSpeed: 480,
    bulletRadius: 7,
    spreadDeg: 1,
    explosionRadius: 120,
  },
} as const

// ==================== 坦克宠物参数 ====================

/** 坦克宠物射击冷却（ms） */
export const TANK_PET_COOLDOWN_MS = 2500
/** 坦克跟随玩家偏移距离（px） */
export const TANK_PET_FOLLOW_OFFSET = 60
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
export const LEVEL_ENEMY_SPEED_BASE = 0.85
export const LEVEL_ENEMY_SPEED_GROWTH = 0.045
export const LEVEL_ENEMY_SPEED_MAX = 2.8

// ==================== 普通怪物攻击（随关卡提升） ====================

/** 三类怪物占比（按关卡渐变；数值为权重，最终由 SpawnSystem 抽样） */
export function getEnemyTypeSpawnWeights(level: number): {
  melee: number
  shooter: number
  thrower: number
} {
  const t = clamp((level - 1) / (TOTAL_LEVELS - 1), 0, 1)
  // 前期近战多、后期远程/投掷增多
  const melee = Math.round(55 - 15 * t)
  const shooter = Math.round(25 + 10 * t)
  const thrower = Math.round(20 + 5 * t)
  return { melee, shooter, thrower }
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
  return Math.min(420, 210 + 10 * (level - 1))
}

export function getShooterEnemyBulletDamage(level: number): number {
  return Math.round(6 + 0.6 * level)
}

/** 射击怪开火距离阈值（玩家必须进入该范围内才会被射击） */
export const SHOOTER_FIRE_RANGE = 520

/** 敌方普通子弹最大飞行距离（超过即销毁） */
export const ENEMY_BULLET_MAX_RANGE = 650

// 丢大便怪：投掷落点范围伤害（可选残留区）
export function getThrowerEnemyThrowIntervalMs(level: number): number {
  return Math.max(1200, 3400 - 70 * (level - 1))
}

/** 丢大便怪开火距离阈值（玩家必须进入该范围内才会投掷） */
export const THROWER_FIRE_RANGE = 520

export const THROWER_POOP_IMPACT_RADIUS = 90

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

export function getBossHpByLevel(level: number): number {
  const factor = BOSS_HP_FACTOR_BASE + BOSS_HP_FACTOR_GROWTH * (level - 1)
  return Math.round(getEnemyHpByLevel(level) * factor)
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
