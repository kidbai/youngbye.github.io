/**
 * BossBullet - Boss 子弹
 */

import Phaser from 'phaser'

export class BossBullet extends Phaser.GameObjects.Ellipse {
  public damage: number
  public speed: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    dirX: number,
    dirY: number,
    speed: number,
    damage: number
  ) {
    super(scene, x, y, radius * 2, radius * 2, 0xff6600)

    this.damage = damage
    this.speed = speed

    scene.add.existing(this)
    scene.physics.world.enable(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(radius)
    body.setVelocity(dirX * speed, dirY * speed)
  }

  /** 检查是否出界 */
  isOutOfBounds(worldWidth: number, worldHeight: number): boolean {
    return this.x < -50 || this.x > worldWidth + 50 || this.y < -50 || this.y > worldHeight + 50
  }

  /** 获取物理 body */
  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body
  }
}
