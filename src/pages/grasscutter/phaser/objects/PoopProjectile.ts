/**
 * PoopProjectile - 丢大便投掷物
 * - 飞行阶段先给出“落点预警圈”（telegraph）
 * - 到达落点/撞墙落地后进入 arming，延迟起爆（fuse）再结算
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
  fuseMs?: number
}

type PoopState = 'flying' | 'arming'

export class PoopProjectile extends Phaser.GameObjects.Image {
  public impactRadius: number
  public impactDamage: number
  public fieldDurationMs: number
  public fieldTickMs: number
  public fieldTickDamage: number
  public projectileRadius: number

  private targetX: number
  private targetY: number
  private vx: number
  private vy: number

  // 注意：Phaser 的 GameObject 本身有一个 public `state` 字段，这里避免同名
  private poopState: PoopState = 'flying'
  private fuseMs: number
  private fuseRemainMs: number = 0

  private warning: Phaser.GameObjects.Arc | null = null
  private warningTween: Phaser.Tweens.Tween | null = null

  constructor(scene: Phaser.Scene, cfg: PoopProjectileConfig) {
    super(scene, cfg.x, cfg.y, 'px-poop')

    this.targetX = cfg.targetX
    this.targetY = cfg.targetY

    this.impactRadius = cfg.impactRadius
    this.impactDamage = cfg.impactDamage
    this.fieldDurationMs = cfg.fieldDurationMs
    this.fieldTickMs = cfg.fieldTickMs
    this.fieldTickDamage = cfg.fieldTickDamage
    this.projectileRadius = cfg.radius

    this.fuseMs = cfg.fuseMs ?? 520

    const dx = cfg.targetX - cfg.x
    const dy = cfg.targetY - cfg.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0) {
      this.vx = (dx / dist) * cfg.speed
      this.vy = (dy / dist) * cfg.speed
    } else {
      this.vx = 0
      this.vy = 0
    }

    this.setTint(0x9a3412)
    this.setRotation(Math.atan2(this.vy, this.vx) + Phaser.Math.FloatBetween(-0.2, 0.2))

    const d = this.projectileRadius * 2 + 4
    this.setDisplaySize(d, d)

    // 落点预警：先标出“预计落点”
    this.warning = scene.add.circle(this.targetX, this.targetY, this.impactRadius, 0xf59e0b, 0.08) as Phaser.GameObjects.Arc
    this.warning.setDepth(12)
    this.warning.setStrokeStyle(3, 0xfbbf24, 0.45)

    this.warningTween = scene.tweens.add({
      targets: this.warning,
      alpha: 0.5,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // 清理：避免残留 tween/对象导致泄漏或异常
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      if (this.warningTween) {
        scene.tweens.remove(this.warningTween)
        this.warningTween = null
      }
      if (this.warning) {
        this.warning.destroy()
        this.warning = null
      }
    })

    scene.add.existing(this)
  }

  /** 在被添加到 Group 之后调用，初始化物理 body */
  initPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    if (!body) return

    body.setCircle(this.projectileRadius)
    body.setOffset(-this.projectileRadius, -this.projectileRadius)
    body.setVelocity(this.vx, this.vy)
  }

  /** 是否抵达落点（或足够接近落点） */
  reachedTarget(): boolean {
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    return dx * dx + dy * dy <= 14 * 14
  }

  /**
   * 落地并开始起爆倒计时。
   * - 进入 arming 后会停止物理运动，并将预警圈移动到真实落点。
   */
  beginArming(landX: number = this.targetX, landY: number = this.targetY): void {
    if (this.poopState === 'arming') return

    this.poopState = 'arming'
    this.fuseRemainMs = this.fuseMs

    this.setPosition(landX, landY)

    const body = this.body as Phaser.Physics.Arcade.Body
    if (body) {
      body.setVelocity(0, 0)
      // 关闭 body，避免落地后继续触发 collider 回调
      body.enable = false
    }

    // 预警强化：变红 + 更快闪烁
    if (this.warning) {
      this.warning.setPosition(landX, landY)
      this.warning.setFillStyle(0xef4444, 0.1)
      this.warning.setStrokeStyle(3, 0xef4444, 0.7)
    }

    const scene = this.scene
    if (this.warningTween) {
      scene.tweens.remove(this.warningTween)
      this.warningTween = null
    }

    if (this.warning) {
      this.warningTween = scene.tweens.add({
        targets: this.warning,
        alpha: 0.75,
        duration: 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
  }

  /**
   * 每帧更新；返回是否应当“起爆结算”。
   */
  updatePoop(deltaMs: number): boolean {
    if (this.poopState === 'flying') {
      if (this.reachedTarget()) {
        this.beginArming(this.targetX, this.targetY)
      }
      return false
    }

    this.fuseRemainMs -= deltaMs
    return this.fuseRemainMs <= 0
  }

  isOutOfBounds(worldWidth: number, worldHeight: number): boolean {
    return this.x < -80 || this.x > worldWidth + 80 || this.y < -80 || this.y > worldHeight + 80
  }

  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body
  }
}
