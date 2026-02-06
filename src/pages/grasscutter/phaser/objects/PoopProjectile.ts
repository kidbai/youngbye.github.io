/**
 * PoopProjectile - 丢大便投掷物（命中/到达落点后造成范围伤害，并可生成残留区）
 */

import Phaser from 'phaser'

export interface PoopProjectileConfig {
  x: number
  y: number
  targetX: number
  targetY: number
  speed: number
  radius: number
  impactRadius: number
  impactDamage: number
  fieldDurationMs: number
  fieldTickMs: number
  fieldTickDamage: number
}

export class PoopProjectile extends Phaser.GameObjects.Ellipse {
  public impactRadius: number
  public impactDamage: number
  public fieldDurationMs: number
  public fieldTickMs: number
  public fieldTickDamage: number

  private targetX: number
  private targetY: number

  constructor(scene: Phaser.Scene, cfg: PoopProjectileConfig) {
    super(scene, cfg.x, cfg.y, cfg.radius * 2, cfg.radius * 2, 0x9a3412)

    this.targetX = cfg.targetX
    this.targetY = cfg.targetY

    this.impactRadius = cfg.impactRadius
    this.impactDamage = cfg.impactDamage
    this.fieldDurationMs = cfg.fieldDurationMs
    this.fieldTickMs = cfg.fieldTickMs
    this.fieldTickDamage = cfg.fieldTickDamage

    scene.add.existing(this)
    scene.physics.world.enable(this)

    const dx = cfg.targetX - cfg.x
    const dy = cfg.targetY - cfg.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(cfg.radius)

    if (dist > 0) {
      body.setVelocity((dx / dist) * cfg.speed, (dy / dist) * cfg.speed)
    }
  }

  /** 是否抵达落点（或足够接近落点） */
  reachedTarget(): boolean {
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    return dx * dx + dy * dy <= 14 * 14
  }

  isOutOfBounds(worldWidth: number, worldHeight: number): boolean {
    return this.x < -80 || this.x > worldWidth + 80 || this.y < -80 || this.y > worldHeight + 80
  }

  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body
  }
}
