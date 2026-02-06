/**
 * SpawnSystem - 刷怪系统
 */

import Phaser from 'phaser'
import { Enemy, type EnemyType } from '../objects/Enemy'
import { getLevelConfig, getEnemyTypeSpawnWeights, WORLD_WIDTH, WORLD_HEIGHT, ENEMIES_PER_LEVEL } from '../../balance'

const ENEMY_TYPE_IMAGE: Record<EnemyType, string> = {
  shooter: 'minion',
  thrower: 'minion2',
  melee: 'monster',
}

export class SpawnSystem {
  private scene: Phaser.Scene
  private enemies: Phaser.GameObjects.Group
  private spawnTimer: Phaser.Time.TimerEvent | null = null
  private spawnedCount: number = 0
  private level: number = 1
  private onKillTargetReached: (() => void) | null = null

  /** 地形阻挡判定（可选：由 MainScene 注入，用于刷怪避障） */
  private isBlocked: ((x: number, y: number) => boolean) | null = null

  constructor(scene: Phaser.Scene, enemies: Phaser.GameObjects.Group) {
    this.scene = scene
    this.enemies = enemies
  }

  /** 设置地形阻挡判定（用于刷怪避障） */
  setIsBlocked(fn: ((x: number, y: number) => boolean) | null): void {
    this.isBlocked = fn
  }

  /** 开始刷怪 */
  startSpawning(level: number, onKillTargetReached: () => void): void {
    this.level = level
    this.spawnedCount = 0
    this.onKillTargetReached = onKillTargetReached

    this.stopSpawning()

    const config = getLevelConfig(level)

    this.spawnTimer = this.scene.time.addEvent({
      delay: config.spawnInterval,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    })

    // 立即刷一只
    this.spawnEnemy()
  }

  /** 停止刷怪 */
  stopSpawning(): void {
    if (this.spawnTimer) {
      this.spawnTimer.destroy()
      this.spawnTimer = null
    }
  }

  /** 生成一只敌人 */
  private spawnEnemy(): void {
    // 已刷满则停止
    if (this.spawnedCount >= ENEMIES_PER_LEVEL) {
      this.stopSpawning()
      return
    }

    // 先增加计数，确保能刷满 ENEMIES_PER_LEVEL 只
    this.spawnedCount++

    const config = getLevelConfig(this.level)
    const camera = this.scene.cameras.main

    const pickEdgeSpawn = (): { x: number; y: number } => {
      // 在摄像机视口边缘生成
      const edge = Phaser.Math.Between(0, 3)

      const margin = 100
      const camX = camera.scrollX
      const camY = camera.scrollY
      const camW = camera.width
      const camH = camera.height

      let x: number, y: number

      switch (edge) {
        case 0: // 上边
          x = Phaser.Math.Between(camX - margin, camX + camW + margin)
          y = camY - margin
          break
        case 1: // 下边
          x = Phaser.Math.Between(camX - margin, camX + camW + margin)
          y = camY + camH + margin
          break
        case 2: // 左边
          x = camX - margin
          y = Phaser.Math.Between(camY - margin, camY + camH + margin)
          break
        default: // 右边
          x = camX + camW + margin
          y = Phaser.Math.Between(camY - margin, camY + camH + margin)
          break
      }

      // 限制在世界范围内
      x = Phaser.Math.Clamp(x, 50, WORLD_WIDTH - 50)
      y = Phaser.Math.Clamp(y, 50, WORLD_HEIGHT - 50)

      return { x, y }
    }

    // 刷怪避障：最多重试 N 次，避免出生即卡在不可走地形里
    const MAX_ATTEMPTS = 12
    let spawn = pickEdgeSpawn()
    if (this.isBlocked) {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (!this.isBlocked(spawn.x, spawn.y)) break
        spawn = pickEdgeSpawn()
      }
    }

    const enemyType = this.pickEnemyType()
    const imageKey = ENEMY_TYPE_IMAGE[enemyType]

    const enemy = new Enemy(this.scene, spawn.x, spawn.y, {
      hp: config.enemyHp,
      maxHp: config.enemyHp,
      speed: config.enemySpeed * 60, // 转换为像素/秒
      imageKey,
      enemyType,
    })

    this.enemies.add(enemy)
  }

  private pickEnemyType(): EnemyType {
    const w = getEnemyTypeSpawnWeights(this.level)
    const total = w.melee + w.shooter + w.thrower
    const r = Phaser.Math.Between(1, total)

    if (r <= w.melee) return 'melee'
    if (r <= w.melee + w.shooter) return 'shooter'
    return 'thrower'
  }

  /** 获取已生成数量 */
  getSpawnedCount(): number {
    return this.spawnedCount
  }

  /** 检查是否刷满 */
  isSpawnComplete(): boolean {
    return this.spawnedCount >= ENEMIES_PER_LEVEL
  }

  /** 重置 */
  reset(): void {
    this.stopSpawning()
    this.spawnedCount = 0
  }
}
