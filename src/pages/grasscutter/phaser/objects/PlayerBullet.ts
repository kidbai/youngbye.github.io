/**
 * PlayerBullet - 玩家子弹
 */

import Phaser from 'phaser'

export interface PlayerBulletConfig {
  x: number
  y: number
  radius: number
  dirX: number
  dirY: number
  speed: number
  damage: number
  range: number
}

export class PlayerBullet extends Phaser.GameObjects.Ellipse {
  public damage: number
  private startX: number
  private startY: number
  private maxRange: number

  constructor(scene: Phaser.Scene, cfg: PlayerBulletConfig) {
    super(scene, cfg.x, cfg.y, cfg.radius * 2, cfg.radius * 2, 0xa7f3d0)

    this.damage = cfg.damage
    this.startX = cfg.x
    this.startY = cfg.y
    this.maxRange = cfg.range

    scene.add.existing(this)
    scene.physics.world.enable(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(cfg.radius)
    body.setVelocity(cfg.dirX * cfg.speed, cfg.dirY * cfg.speed)
  }

  shouldDestroy(worldWidth: number, worldHeight: number): boolean {
    if (this.x < -50 || this.x > worldWidth + 50 || this.y < -50 || this.y > worldHeight + 50) return true

    const dx = this.x - this.startX
    const dy = this.y - this.startY
    return dx * dx + dy * dy > this.maxRange * this.maxRange
  }

  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body
  }
}
