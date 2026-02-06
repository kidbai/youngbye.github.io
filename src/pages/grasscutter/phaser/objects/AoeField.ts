/**
 * AoeField - 残留范围伤害区（低频 tick，控制性能）
 */

import Phaser from 'phaser'

export interface AoeFieldConfig {
  x: number
  y: number
  radius: number
  durationMs: number
  tickMs: number
  tickDamage: number
  color?: number
}

export class AoeField extends Phaser.GameObjects.Arc {
  public tickDamage: number
  public tickMs: number

  private remainMs: number
  private tickRemainMs: number

  constructor(scene: Phaser.Scene, cfg: AoeFieldConfig) {
    super(scene, cfg.x, cfg.y, cfg.radius, 0, 360, false, cfg.color ?? 0xf59e0b, 0.12)

    this.remainMs = cfg.durationMs
    this.tickRemainMs = cfg.tickMs
    this.tickDamage = cfg.tickDamage
    this.tickMs = cfg.tickMs

    scene.add.existing(this)
    this.setDepth(20)
    this.setStrokeStyle(2, cfg.color ?? 0xf59e0b, 0.35)
  }

  /**
   * 更新残留区；返回是否已结束。
   * - tick 时若玩家在范围内，则回调 onTickDamage。
   */
  updateField(deltaMs: number, playerX: number, playerY: number, onTickDamage: (amount: number) => void): boolean {
    this.remainMs -= deltaMs
    if (this.remainMs <= 0) {
      this.destroy()
      return true
    }

    this.tickRemainMs -= deltaMs
    if (this.tickRemainMs <= 0) {
      this.tickRemainMs += this.tickMs

      const dx = playerX - this.x
      const dy = playerY - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < this.radius + 1) {
        onTickDamage(this.tickDamage)
      }
    }

    return false
  }
}
