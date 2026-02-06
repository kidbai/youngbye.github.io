/**
 * PlayerExplosiveProjectile - 玩家爆炸类投射物（榴弹/炮弹）
 */

import Phaser from 'phaser'

export interface PlayerExplosiveProjectileConfig {
  x: number
  y: number
  radius: number
  dirX: number
  dirY: number
  speed: number
  damage: number
  range: number
  explosionRadius: number
  color?: number
}

export class PlayerExplosiveProjectile extends Phaser.GameObjects.Ellipse {
  public damage: number
  public explosionRadius: number
  public projectileRadius: number

  private startX: number
  private startY: number
  private maxRange: number
  private vx: number
  private vy: number

  constructor(scene: Phaser.Scene, cfg: PlayerExplosiveProjectileConfig) {
    super(scene, cfg.x, cfg.y, cfg.radius * 2, cfg.radius * 2, cfg.color ?? 0xfbbf24)

    this.damage = cfg.damage
    this.explosionRadius = cfg.explosionRadius
    this.projectileRadius = cfg.radius

    this.startX = cfg.x
    this.startY = cfg.y
    this.maxRange = cfg.range
    this.vx = cfg.dirX * cfg.speed
    this.vy = cfg.dirY * cfg.speed

    scene.add.existing(this)
  }

  /** 在被添加到 Group 之后调用，初始化物理 body */
  initPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    if (!body) return

    body.setCircle(this.projectileRadius)
    body.setVelocity(this.vx, this.vy)
  }

  shouldDestroy(worldWidth: number, worldHeight: number): boolean {
    if (this.x < -80 || this.x > worldWidth + 80 || this.y < -80 || this.y > worldHeight + 80) return true

    const dx = this.x - this.startX
    const dy = this.y - this.startY
    return dx * dx + dy * dy > this.maxRange * this.maxRange
  }

  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body
  }
}
