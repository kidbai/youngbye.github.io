/**
 * GrassCutter Phaser - 共享类型
 */

/** 存档结构（与 localStorage 'grasscutter_save' 保持兼容） */
export interface SaveData {
  currentLevel: number
  highScore: number

  /** 玩家等级（升级次数 + 1） */
  playerLevel: number

  /** 新版枪械存档 */
  gunKey: GunKey
  gunDamageMul: number
  gunFireRateMul: number
  gunRangeMul: number
  evolveMisses: number

  /** 是否已激活双持 */
  dualWield: boolean

  /** 是否已获得坦克宠物 */
  hasTankPet: boolean

  /** 旧字段：保留以兼容 UI / 旧存档（后续可以逐步下线） */
  weaponDamage: number
  weaponRange: number
  weaponRotationSpeed: number
  weaponCount: number
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

  /** 新版枪械信息（HUD 展示/存档） */
  gunKey: GunKey
  gunTitle: string
  gunDamageMul: number
  gunFireRateMul: number
  gunRangeMul: number
  evolveMisses: number

  /** 是否已激活双持 */
  dualWield: boolean

  /** 是否已获得坦克宠物 */
  hasTankPet: boolean

  /** 旧字段：暂留（HUD 仍有引用） */
  weaponDamage: number
  weaponRange: number
  weaponRotationSpeed: number
  weaponCount: number
}

/** 升级稀有度 */
export type UpgradeRarity = 'common' | 'rare' | 'epic'

/** 升级类别 */
export type UpgradeKind = 'damageMul' | 'fireRateMul' | 'rangeMul' | 'evolve' | 'dualWield' | 'tankPet'

/** 当前支持的枪械 key（与 balance.ts 的 GUN_BASE 保持一致） */
export type GunKey = 'pistol' | 'smg' | 'grenadeMg' | 'cannon'

/** 单个升级选项（Phaser 生成，React 展示并回传选择） */
export interface UpgradeOption {
  id: string
  kind: UpgradeKind
  rarity: UpgradeRarity
  title: string
  desc: string
  /** 对于数值类升级：例如 0.12 表示 +12% */
  value?: number
  /** 对于进化：目标枪械 key（由 Phaser 决定） */
  evolveToGunId?: GunKey
}

/** 玩家输入向量 */
export interface MoveVector {
  x: number
  y: number
}
