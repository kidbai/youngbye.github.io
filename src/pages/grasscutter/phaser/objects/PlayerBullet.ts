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

export class PlayerBullet extends Phaser.GameObjects.Image {
  public damage: number
  public bulletRadius: number

  private startX: number
  private startY: number
  private maxRange: number
  private vx: number
  private vy: number

  constructor(scene: Phaser.Scene, cfg: PlayerBulletConfig) {
    super(scene, cfg.x, cfg.y, 'px-bullet')

    this.damage = cfg.damage
    this.bulletRadius = cfg.radius

    this.startX = cfg.x
    this.startY = cfg.y
    this.maxRange = cfg.range

    this.vx = cfg.dirX * cfg.speed
    this.vy = cfg.dirY * cfg.speed

    // 像素风：使用预生成纹理 + tint
    this.setTint(0xa7f3d0)

    // 纹理朝右，按速度方向旋转
    this.setRotation(Math.atan2(this.vy, this.vx))

    // 给描边留一点空间（视觉略大于判定半径）
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
