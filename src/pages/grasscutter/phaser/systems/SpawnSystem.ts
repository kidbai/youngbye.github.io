/**
 * SpawnSystem - 刷怪系统
 */

import Phaser from 'phaser'
import { Enemy } from '../objects/Enemy'
import { getLevelConfig, WORLD_WIDTH, WORLD_HEIGHT, ENEMIES_PER_LEVEL } from '../../balance'

const ENEMY_IMAGES = ['minion', 'minion2', 'monster']

export class SpawnSystem {
  private scene: Phaser.Scene
  private enemies: Phaser.GameObjects.Group
  private spawnTimer: Phaser.Time.TimerEvent | null = null
  private spawnedCount: number = 0
  private level: number = 1
  private onKillTargetReached: (() => void) | null = null

  constructor(scene: Phaser.Scene, enemies: Phaser.GameObjects.Group) {
    this.scene = scene
    this.enemies = enemies
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
    if (this.spawnedCount >= ENEMIES_PER_LEVEL) {
      this.stopSpawning()
      return
    }

    const config = getLevelConfig(this.level)
    const camera = this.scene.cameras.main

    // 在摄像机视口边缘生成
    const edge = Phaser.Math.Between(0, 3)
    let x: number, y: number

    const margin = 100
    const camX = camera.scrollX
    const camY = camera.scrollY
    const camW = camera.width
    const camH = camera.height

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

    const imageKey = ENEMY_IMAGES[Phaser.Math.Between(0, ENEMY_IMAGES.length - 1)]

    const enemy = new Enemy(this.scene, x, y, {
      hp: config.enemyHp,
      maxHp: config.enemyHp,
      speed: config.enemySpeed * 60, // 转换为像素/秒
      imageKey,
    })

    this.enemies.add(enemy)
    this.spawnedCount++
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
