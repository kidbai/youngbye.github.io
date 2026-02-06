/**
 * SaveSystem - 存档系统
 * 
 * 兼容原有 localStorage 'grasscutter_save' 格式
 */

import type { SaveData } from '../types'
import {
  INITIAL_WEAPON_DAMAGE,
  INITIAL_WEAPON_RANGE,
  INITIAL_WEAPON_ROTATION_SPEED,
  INITIAL_WEAPON_COUNT,
} from '../../balance'

const STORAGE_KEY = 'grasscutter_save'

const DEFAULT_SAVE: SaveData = {
  currentLevel: 1,
  highScore: 0,
  weaponDamage: INITIAL_WEAPON_DAMAGE,
  weaponRange: INITIAL_WEAPON_RANGE,
  weaponRotationSpeed: INITIAL_WEAPON_ROTATION_SPEED,
  weaponCount: INITIAL_WEAPON_COUNT,
  playerLevel: 1,
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

  /** 保存进度 */
  static saveProgress(
    level: number,
    score: number,
    weaponDamage: number,
    weaponRange: number,
    weaponRotationSpeed: number,
    weaponCount: number,
    playerLevel: number
  ): void {
    const data = SaveSystem.load()
    data.currentLevel = level
    data.highScore = Math.max(data.highScore, score)
    data.weaponDamage = weaponDamage
    data.weaponRange = weaponRange
    data.weaponRotationSpeed = weaponRotationSpeed
    data.weaponCount = weaponCount
    data.playerLevel = playerLevel
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
