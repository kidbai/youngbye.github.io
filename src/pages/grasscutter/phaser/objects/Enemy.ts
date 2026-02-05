/**
 * Enemy - 敌人实体
 */

import Phaser from 'phaser'

// 小蛋卷的随机话术
const ENEMY_SPEECHES = [
  '我特喵来了！',
  '小贼喵往哪里跑！',
  '汝竟然是厚颜无耻之喵',
]
const SPEECH_DURATION = 2000

export interface EnemyConfig {
  x: number
  y: number
  radius: number
  hp: number
  maxHp: number
  speed: number
  imageKey: string
}

const DEFAULT_CONFIG: Omit<EnemyConfig, 'x' | 'y'> = {
  radius: 25,
  hp: 100,
  maxHp: 100,
  speed: 80,
  imageKey: 'minion',
}

export class Enemy extends Phaser.GameObjects.Container {
  public hp: number
  public maxHp: number
  public speed: number
  public radius: number
  public hitFlash: number = 0
  public speech: string = ''
  public speechTimer: number = 0
  public imageKey: string

  private avatar: Phaser.GameObjects.Image
  private speechText: Phaser.GameObjects.Text | null = null
  private hpBarBg: Phaser.GameObjects.Graphics
  private hpBarFill: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, x: number, y: number, config: Partial<Omit<EnemyConfig, 'x' | 'y'>> = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    super(scene, x, y)

    this.hp = cfg.hp
    this.maxHp = cfg.maxHp
    this.speed = cfg.speed
    this.radius = cfg.radius
    this.imageKey = cfg.imageKey

    // 头像（使用圆形裁剪的纹理）
    this.avatar = scene.add.image(0, 0, `${cfg.imageKey}-circle`)
    this.avatar.setDisplaySize(cfg.radius * 2, cfg.radius * 2)
    this.add(this.avatar)

    // 血条背景
    this.hpBarBg = scene.add.graphics()
    this.add(this.hpBarBg)

    // 血条填充
    this.hpBarFill = scene.add.graphics()
    this.add(this.hpBarFill)

    // 初始化血条
    this.updateHpBar()

    // 添加到场景
    scene.add.existing(this)

    // 物理 body
    scene.physics.world.enable(this)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(cfg.radius)
    body.setOffset(-cfg.radius, -cfg.radius)

    // 初始话术（一定概率）
    if (Math.random() < 0.3) {
      this.showSpeech(ENEMY_SPEECHES[Math.floor(Math.random() * ENEMY_SPEECHES.length)])
    }
  }

  /** 更新血条显示 */
  private updateHpBar(): void {
    const barWidth = this.radius * 2
    const barHeight = 4
    const barY = -this.radius - 10

    // 背景
    this.hpBarBg.clear()
    this.hpBarBg.fillStyle(0x000000, 0.5)
    this.hpBarBg.fillRect(-barWidth / 2, barY, barWidth, barHeight)

    // 填充（根据血量百分比变色）
    const hpPercent = Math.max(0, this.hp / this.maxHp)
    let fillColor = 0x2ed573 // 绿色
    if (hpPercent <= 0.5) fillColor = 0xffa502 // 橙色
    if (hpPercent <= 0.25) fillColor = 0xff4757 // 红色

    this.hpBarFill.clear()
    this.hpBarFill.fillStyle(fillColor, 1)
    this.hpBarFill.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight)
  }

  /** 显示话术气泡 */
  showSpeech(text: string, duration: number = SPEECH_DURATION): void {
    this.speech = text
    this.speechTimer = duration

    if (this.speechText) {
      this.speechText.destroy()
    }

    this.speechText = this.scene.add.text(0, -this.radius - 20, text, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 6, y: 3 },
    })
    this.speechText.setOrigin(0.5, 1)
    this.add(this.speechText)
  }

  /** 追踪目标 */
  chaseTarget(targetX: number, targetY: number): void {
    const dx = targetX - this.x
    const dy = targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0) {
      const body = this.body as Phaser.Physics.Arcade.Body
      body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed)
    }
  }

  /** 每帧更新 */
  updateEnemy(delta: number): void {
    // 受击闪烁
    if (this.hitFlash > 0) {
      this.hitFlash -= delta
      this.avatar.setTint(0xff0000)
    } else {
      this.avatar.clearTint()
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
  }

  /** 受到伤害 */
  takeDamage(amount: number): boolean {
    this.hp -= amount
    this.hitFlash = 100
    this.updateHpBar()
    return this.hp <= 0
  }

  /** 获取物理 body */
  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body
  }
}
