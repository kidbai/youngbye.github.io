/**
 * Player - 玩家实体
 */

import Phaser from 'phaser'

export interface PlayerConfig {
  x: number
  y: number
  radius: number
  hp: number
  maxHp: number
  speed: number
}

const DEFAULT_CONFIG: PlayerConfig = {
  x: 0,
  y: 0,
  radius: 30,
  hp: 100,
  maxHp: 100,
  speed: 300,
}

export class Player extends Phaser.GameObjects.Container {
  public hp: number
  public maxHp: number
  public speed: number
  public radius: number
  public isHit: boolean = false
  public hitTimer: number = 0
  public speech: string = ''
  public speechTimer: number = 0
  public bossTouchCooldown: number = 0

  private avatar: Phaser.GameObjects.Image
  private hitGlow: Phaser.GameObjects.Graphics // 受击红色光环
  private speechText: Phaser.GameObjects.Text | null = null

  constructor(scene: Phaser.Scene, config: Partial<PlayerConfig> = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    super(scene, cfg.x, cfg.y)

    this.hp = cfg.hp
    this.maxHp = cfg.maxHp
    this.speed = cfg.speed
    this.radius = cfg.radius

    // 受击红色光环（放在头像下层）
    this.hitGlow = scene.add.graphics()
    this.hitGlow.setVisible(false)
    this.add(this.hitGlow)

    // 头像（使用圆形裁剪的纹理）
    this.avatar = scene.add.image(0, 0, 'yuanxiao-circle')
    this.avatar.setDisplaySize(cfg.radius * 2, cfg.radius * 2)
    this.add(this.avatar)

    // 添加到场景
    scene.add.existing(this)

    // 物理 body
    scene.physics.world.enable(this)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setCircle(cfg.radius)
    body.setOffset(-cfg.radius, -cfg.radius)
    body.setCollideWorldBounds(true)
  }

  /** 受击效果（红色光环，不切换贴图） */
  setHit(hit: boolean): void {
    this.isHit = hit
    
    if (hit) {
      // 绘制红色光环
      this.hitGlow.clear()
      // 外圈光晕
      this.hitGlow.fillStyle(0xff3232, 0.35)
      this.hitGlow.fillCircle(0, 0, this.radius + 10)
      // 红色边框
      this.hitGlow.lineStyle(3, 0xff0000, 0.6)
      this.hitGlow.strokeCircle(0, 0, this.radius + 16)
      this.hitGlow.setVisible(true)
    } else {
      this.hitGlow.setVisible(false)
    }
  }

  /** 显示话术气泡 */
  showSpeech(text: string, duration: number = 1500): void {
    this.speech = text
    this.speechTimer = duration

    if (this.speechText) {
      this.speechText.destroy()
    }

    this.speechText = this.scene.add.text(0, -this.radius - 30, text, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 8, y: 4 },
    })
    this.speechText.setOrigin(0.5, 1)
    this.add(this.speechText)
  }

  /** 每帧更新 */
  updatePlayer(delta: number): void {
    // 受击计时
    if (this.isHit) {
      this.hitTimer -= delta
      if (this.hitTimer <= 0) {
        this.setHit(false)
      }
    }

    // Boss 触碰冷却
    if (this.bossTouchCooldown > 0) {
      this.bossTouchCooldown -= delta
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
  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount)
    this.setHit(true)
    this.hitTimer = 200
  }

  /** 获取物理 body */
  getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body
  }
}
