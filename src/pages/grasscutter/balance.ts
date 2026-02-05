// GrassCutter：地图/关卡数值与通用工具（从 GrassCutter.tsx 抽离）

export const WORLD_WIDTH = 5000
export const WORLD_HEIGHT = 5000

export const ENEMIES_PER_LEVEL = 100

// 测试用：降低怪物血量以便快速测试升级
export const ENEMY_BASE_HP = 30
export const ENEMY_HP_GROWTH = 1.15
export const BOSS_HP_FACTOR = 8

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
  return Math.round(getEnemyHpByLevel(level) * BOSS_HP_FACTOR)
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
