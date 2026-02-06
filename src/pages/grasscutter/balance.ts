// GrassCutter：地图/关卡数值与通用工具
// - 单一真源：玩法数值（HP/升级/刷怪）与工具函数

export const WORLD_WIDTH = 5000
export const WORLD_HEIGHT = 5000

export const ENEMIES_PER_LEVEL = 100

// ==================== 玩家与升级（单一真源） ====================

export const PLAYER_MAX_HP = 100

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

// ==================== 敌人与Boss数值 ====================

// 普通怪物：第 1 关 200 起步，10 关内控制在约 3~4 倍，避免纯“堆肉”
export const ENEMY_BASE_HP = 200
export const ENEMY_HP_GROWTH = 1.16

// Boss：倍率随关卡缓增（避免固定倍率导致后期过度膨胀）
export const BOSS_HP_FACTOR_BASE = 6.5
export const BOSS_HP_FACTOR_GROWTH = 0.5

export const LEVEL_SPAWN_INTERVAL_BASE = 1200
export const LEVEL_SPAWN_INTERVAL_MIN = 450
export const LEVEL_SPAWN_INTERVAL_DECAY = 50

export const LEVEL_ENEMY_SPEED_BASE = 1.0
export const LEVEL_ENEMY_SPEED_GROWTH = 0.06
export const LEVEL_ENEMY_SPEED_MAX = 3.5

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
