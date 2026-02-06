/**
 * ExplosionFx - 轻量爆炸特效（不参与碰撞，只做视觉反馈）
 */

import Phaser from 'phaser'

export interface ExplosionFxConfig {
  x: number
  y: number
  radius: number
  color?: number
  durationMs?: number
}

export class ExplosionFx extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene, cfg: ExplosionFxConfig) {
    super(scene, cfg.x, cfg.y, cfg.radius, 0, 360, false, cfg.color ?? 0xf97316, 0.18)

    scene.add.existing(this)
    this.setDepth(50)

    // 外圈描边
    this.setStrokeStyle(3, cfg.color ?? 0xf97316, 0.55)

    const duration = cfg.durationMs ?? 180
    scene.tweens.add({
      targets: this,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    })

    scene.tweens.add({
      targets: this,
      radius: cfg.radius * 1.15,
      duration,
      ease: 'Quad.easeOut',
    })
  }
}
