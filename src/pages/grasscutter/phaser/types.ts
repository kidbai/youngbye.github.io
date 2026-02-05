/**
 * GrassCutter Phaser - 共享类型
 */

/** 存档结构（与 localStorage 'grasscutter_save' 保持兼容） */
export interface SaveData {
  currentLevel: number
  highScore: number
  weaponDamage: number
  weaponRange: number
  weaponRotationSpeed: number
  weaponCount: number
  playerLevel: number
}

/** React UI 需要订阅的运行态快照 */
export interface GameSnapshot {
  hp: number
  maxHp: number
  score: number
  kills: number
  level: number
  killsNeeded: number
  bossHp: number
  bossMaxHp: number
  /** playing | upgrading | dead | victory | settings | confirmExit | confirmRestart */
  gameState: string
  playerLevel: number
  weaponDamage: number
  weaponRange: number
  weaponRotationSpeed: number
  weaponCount: number
}

/** 升级选项 */
export type UpgradeType = 'damage' | 'range' | 'speed' | 'weapon'

/** 玩家输入向量 */
export interface MoveVector {
  x: number
  y: number
}
