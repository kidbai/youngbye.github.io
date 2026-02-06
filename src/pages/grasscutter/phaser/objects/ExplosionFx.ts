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

    // 关键：对象被提前清理（clear/restart/切场景）时，Tween 可能仍在跑。
    // 主动 kill 掉关联 Tween，避免 Phaser 在 null target 上写属性导致报错/卡死。
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.tweens.killTweensOf(this)
    })

    const duration = cfg.durationMs ?? 180

    // 用 scale 代替 tween radius（tween radius 在对象被销毁后更容易触发内部 null 目标错误）
    scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.15,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.active) this.destroy()
      },
    })
  }
}
