/**
 * BossBullet - Boss 子弹
 */

import Phaser from 'phaser'

export class BossBullet extends Phaser.GameObjects.Ellipse {
  public damage: number
  public speed: number
  public bulletRadius: number
  private vx: number
  private vy: number

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
    this.bulletRadius = radius
    this.vx = dirX * speed
    this.vy = dirY * speed

    scene.add.existing(this)
  }

  /** 在被添加到 Group 之后调用，初始化物理 body */
  initPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    if (!body) return

    body.setCircle(this.bulletRadius)
    body.setVelocity(this.vx, this.vy)
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
