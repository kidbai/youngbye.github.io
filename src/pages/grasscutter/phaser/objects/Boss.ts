/**
 * Boss - Boss 实体
 */

import Phaser from 'phaser'

// 蛋卷大魔王的骚话
const BOSS_SPEECHES = [
  '本喵王驾到，还不速速跪下！',
  '小小元宵，竟敢挑战本王！',
  '看我的无敌喵喵拳！',
  '哼，你的攻击给本王挠痒痒呢~',
  '本王今天心情不好，拿你出气！',
  '颤抖吧！蛋卷大魔王参上！',
  '你已经被本王盯上了，逃不掉的！',
  '就这？就这？就这？',
  '本王的子弹可是会转弯的...骗你的！',
  '元宵？听起来很好吃的样子！',
]
const BOSS_SPEECH_INTERVAL = 4000

export interface BossConfig {
  x: number
  y: number
  radius: number
  hp: number
  maxHp: number
  speed: number
  shootInterval: number
  bulletSpeed: number
  bulletDamage: number
  bulletRadius: number
}

const DEFAULT_CONFIG: Omit<BossConfig, 'x' | 'y' | 'hp' | 'maxHp'> = {
  radius: 50,
  speed: 72, // 1.2 * 60 (原逻辑是 speed * dt，这里转成像素/秒)
  shootInterval: 1500,
  bulletSpeed: 240, // 4 * 60
  bulletDamage: 15,
  bulletRadius: 8,
}

export class Boss extends Phaser.GameObjects.Container {
  public hp: number
  public maxHp: number
  public speed: number
  public radius: number
  public hitFlash: number = 0
  public speech: string = ''
  public speechTimer: number = 0
  public speechCooldown: number = 0
  public shootTimer: number = 0
  public isShooting: boolean = false
  public shootingTimer: number = 0

  public shootInterval: number
  public bulletSpeed: number
  public bulletDamage: number
  public bulletRadius: number

  private avatar: Phaser.GameObjects.Image
  private speechText: Phaser.GameObjects.Text | null = null

  constructor(scene: Phaser.Scene, x: number, y: number, bossHp: number, config: Partial<Omit<BossConfig, 'x' | 'y' | 'hp' | 'maxHp'>> = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    super(scene, x, y)

    this.hp = bossHp
    this.maxHp = bossHp
    this.speed = cfg.speed
    this.radius = cfg.radius
    this.shootInterval = cfg.shootInterval
    this.bulletSpeed = cfg.bulletSpeed
    this.bulletDamage = cfg.bulletDamage
    this.bulletRadius = cfg.bulletRadius

    // 头像（使用圆形裁剪的纹理）
    this.avatar = scene.add.image(0, 0, 'boss-circle')
    this.avatar.setDisplaySize(cfg.radius * 2, cfg.radius * 2)
    this.add(this.avatar)

    // 添加到场景
    scene.add.existing(this)

    // 物理 body
    scene.physics.world.enable(this)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(cfg.radius)
    body.setOffset(-cfg.radius, -cfg.radius)

    // 初始话术
    this.showSpeech(BOSS_SPEECHES[0])
  }

  /** 显示话术气泡 */
  showSpeech(text: string, duration: number = 3000): void {
    this.speech = text
    this.speechTimer = duration
    this.speechCooldown = BOSS_SPEECH_INTERVAL

    if (this.speechText) {
      this.speechText.destroy()
    }

    this.speechText = this.scene.add.text(0, -this.radius - 30, text, {
      fontSize: '14px',
      color: '#ffcc00',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 8, y: 4 },
    })
    this.speechText.setOrigin(0.5, 1)
    this.add(this.speechText)
  }

  /** AI 行为：追踪但保持距离 */
  chaseTarget(targetX: number, targetY: number): void {
    const dx = targetX - this.x
    const dy = targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    const body = this.body as Phaser.Physics.Arcade.Body
    const minDist = 200 // 保持最小距离
    const maxDist = 400 // 追踪最大距离

    if (dist > maxDist) {
      // 太远，追过去
      body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed)
    } else if (dist < minDist) {
      // 太近，后退
      body.setVelocity((-dx / dist) * this.speed * 0.5, (-dy / dist) * this.speed * 0.5)
    } else {
      // 适当距离，缓慢移动
      body.setVelocity((dx / dist) * this.speed * 0.3, (dy / dist) * this.speed * 0.3)
    }
  }

  /** 每帧更新 */
  updateBoss(delta: number): void {
    // 受击闪烁
    if (this.hitFlash > 0) {
      this.hitFlash -= delta
      this.avatar.setTint(0xff0000)
    } else {
      this.avatar.clearTint()
    }

    // 射击动画
    if (this.isShooting) {
      this.shootingTimer -= delta
      if (this.shootingTimer <= 0) {
        this.isShooting = false
        this.avatar.setTexture('boss-circle')
      }
    }

    // 射击冷却
    if (this.shootTimer > 0) {
      this.shootTimer -= delta
    }

    // 话术计时
    if (this.speechTimer > 0) {
      this.speechTimer -= delta
      if (this.speechTimer <= 0 && this.speechText) {
        this.speechText.destroy()
        this.speechText = null
        this.speech = ''
      }
    }

    // 骚话冷却
    if (this.speechCooldown > 0) {
      this.speechCooldown -= delta
    } else {
      // 随机骚话
      this.showSpeech(BOSS_SPEECHES[Math.floor(Math.random() * BOSS_SPEECHES.length)])
    }
  }

  /** 是否可以射击 */
  canShoot(): boolean {
    return this.shootTimer <= 0
  }

  /** 开始射击 */
  startShoot(): void {
    this.shootTimer = this.shootInterval
    this.isShooting = true
    this.shootingTimer = 200
    this.avatar.setTexture('boss-shot-circle')
  }

  /** 受到伤害 */
  takeDamage(amount: number): boolean {
    this.hp -= amount
    this.hitFlash = 100
    return this.hp <= 0
  }

  /** 获取物理 body */
  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body
  }
}
