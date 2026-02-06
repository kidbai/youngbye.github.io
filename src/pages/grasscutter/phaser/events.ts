/**
 * GrassCutter Phaser - 事件总线 (React ↔ Phaser)
 */

import type { GameSnapshot, MoveVector, UpgradeOption } from './types'

/** 回调签名 */
type Callback<T> = (payload: T) => void

/** 事件类型枚举 */
export const Events = {
  /** Phaser → React: 状态快照更新 */
  STATE_UPDATE: 'state_update',
  /** Phaser → React: 需要显示升级弹窗 */
  NEED_UPGRADE: 'need_upgrade',
  /** Phaser → React: 玩家死亡 */
  PLAYER_DEAD: 'player_dead',
  /** Phaser → React: 通关 */
  VICTORY: 'victory',

  /** React → Phaser: 移动向量 */
  MOVE: 'move',
  /** React → Phaser: 暂停 */
  PAUSE: 'pause',
  /** React → Phaser: 继续 */
  RESUME: 'resume',
  /** React → Phaser: 应用升级选择 */
  APPLY_UPGRADE: 'apply_upgrade',
  /** React → Phaser: 重开当前关 */
  RESTART: 'restart',
  /** React → Phaser: 退出到首页 */
  EXIT: 'exit',
  /** React → Phaser: 跳关（开发者调试） */
  SKIP_LEVEL: 'skip_level',
  /** React → Phaser: 直接击杀全部敌人（开发者调试） */
  KILL_ALL: 'kill_all',
} as const

type EventType = (typeof Events)[keyof typeof Events]

/** 简易事件总线实现 */
class EventBus {
  private listeners = new Map<EventType, Set<Callback<unknown>>>()

  on<T>(event: EventType, cb: Callback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(cb as Callback<unknown>)
  }

  off<T>(event: EventType, cb: Callback<T>): void {
    this.listeners.get(event)?.delete(cb as Callback<unknown>)
  }

  emit<T>(event: EventType, payload: T): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload))
  }

  clear(): void {
    this.listeners.clear()
  }
}

/** 单例，供 React 组件与 Phaser Scene 共用 */
export const eventBus = new EventBus()

/** 类型安全的快捷发射 */
export const emitStateUpdate = (snapshot: GameSnapshot) =>
  eventBus.emit(Events.STATE_UPDATE, snapshot)

export const emitNeedUpgrade = (options: UpgradeOption[]) => eventBus.emit(Events.NEED_UPGRADE, options)
export const emitPlayerDead = () => eventBus.emit(Events.PLAYER_DEAD, undefined)
export const emitVictory = () => eventBus.emit(Events.VICTORY, undefined)

export const emitMove = (v: MoveVector) => eventBus.emit(Events.MOVE, v)
export const emitPause = () => eventBus.emit(Events.PAUSE, undefined)
export const emitResume = () => eventBus.emit(Events.RESUME, undefined)
export const emitApplyUpgrade = (option: UpgradeOption) => eventBus.emit(Events.APPLY_UPGRADE, option)
export const emitRestart = () => eventBus.emit(Events.RESTART, undefined)
export const emitExit = () => eventBus.emit(Events.EXIT, undefined)
export const emitSkipLevel = () => eventBus.emit(Events.SKIP_LEVEL, undefined)
export const emitKillAll = () => eventBus.emit(Events.KILL_ALL, undefined)
