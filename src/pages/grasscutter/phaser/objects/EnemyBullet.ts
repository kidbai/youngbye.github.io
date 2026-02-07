/**
 * EnemyBullet - 普通敌人子弹
 */

import Phaser from 'phaser'

export class EnemyBullet extends Phaser.GameObjects.Image {
  public damage: number
  public speed: number
  public bulletRadius: number

  private vx: number
  private vy: number

  /** 子弹起点（用于计算射程） */
  private startX: number
  private startY: number
  /** 最大射程（像素），超过则销毁 */
  private maxRange: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    dirX: number,
    dirY: number,
    speed: number,
    damage: number,
    maxRange = 9999,
    textureKey = 'px-bullet',
    tint = 0x60a5fa
  ) {
    super(scene, x, y, textureKey)

    this.damage = damage
    this.speed = speed
    this.bulletRadius = radius
    this.maxRange = maxRange

    this.startX = x
    this.startY = y

    this.vx = dirX * speed
    this.vy = dirY * speed

    if (tint !== 0) this.setTint(tint)
    this.setRotation(Math.atan2(this.vy, this.vx))

    const d = this.bulletRadius * 2 + 2
    this.setDisplaySize(d, d)

    scene.add.existing(this)
  }

  /** 在被添加到 Group 之后调用，初始化物理 body */
  initPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    if (!body) return

    body.setCircle(this.bulletRadius)
    body.setOffset(-this.bulletRadius, -this.bulletRadius)
    body.setVelocity(this.vx, this.vy)
  }

  isOutOfBounds(worldWidth: number, worldHeight: number): boolean {
    return this.x < -50 || this.x > worldWidth + 50 || this.y < -50 || this.y > worldHeight + 50
  }

  /** 综合判断：超出射程 / 出界 → 应销毁 */
  shouldDestroy(worldWidth: number, worldHeight: number): boolean {
    if (this.isOutOfBounds(worldWidth, worldHeight)) return true

    // 平方距离，避免 sqrt
    const dx = this.x - this.startX
    const dy = this.y - this.startY
    const distSq = dx * dx + dy * dy
    const maxSq = this.maxRange * this.maxRange
    return distSq >= maxSq
  }

  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body
  }
}
