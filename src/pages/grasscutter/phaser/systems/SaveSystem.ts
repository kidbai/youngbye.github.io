/**
 * SaveSystem - 存档系统
 * 
 * 兼容原有 localStorage 'grasscutter_save' 格式
 */

import type { SaveData } from '../types'
import { GUN_BASE } from '../../balance'

const STORAGE_KEY = 'grasscutter_save'

const DEFAULT_SAVE: SaveData = {
  currentLevel: 1,
  highScore: 0,

  playerLevel: 1,

  gunKey: 'pistol',
  gunDamageMul: 1,
  gunFireRateMul: 1,
  gunRangeMul: 1,
  evolveMisses: 0,
  dualWield: false,

  // 旧字段：默认值对齐新版"手枪"
  weaponDamage: GUN_BASE.pistol.baseDamage,
  weaponRange: GUN_BASE.pistol.range,
  weaponRotationSpeed: GUN_BASE.pistol.fireRate,
  weaponCount: 1,
}

export class SaveSystem {
  /** 加载存档 */
  static load(): SaveData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved) as Partial<SaveData>
        // 合并默认值，兼容旧版存档缺少字段
        return { ...DEFAULT_SAVE, ...data }
      }
    } catch (e) {
      console.warn('[SaveSystem] Failed to load save:', e)
    }
    return { ...DEFAULT_SAVE }
  }

  /** 保存存档 */
  static save(data: SaveData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('[SaveSystem] Failed to save:', e)
    }
  }

  /** 更新高分 */
  static updateHighScore(score: number): void {
    const data = SaveSystem.load()
    if (score > data.highScore) {
      data.highScore = score
      SaveSystem.save(data)
    }
  }

  /** 保存进度（支持增量 patch，便于向后兼容扩展字段） */
  static saveProgress(patch: Partial<SaveData> & { currentLevel: number; score: number }): void {
    const { score, ...rest } = patch

    const data = SaveSystem.load()
    data.currentLevel = rest.currentLevel
    data.highScore = Math.max(data.highScore, score)

    Object.assign(data, rest)

    SaveSystem.save(data)
  }

  /** 重置存档 */
  static reset(): void {
    SaveSystem.save({ ...DEFAULT_SAVE })
  }

  /** 获取默认存档 */
  static getDefault(): SaveData {
    return { ...DEFAULT_SAVE }
  }
}
