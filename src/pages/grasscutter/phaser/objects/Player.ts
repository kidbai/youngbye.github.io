/**
 * Player - 玩家实体
 */

import Phaser from 'phaser'
import { scaleSize } from '../../balance'

/** 武器纹理 key 与显示尺寸映射（移动端等比缩小） */
const GUN_DISPLAY: Record<string, { key: string; w: number; h: number }> = {
  pistol:    { key: 'px-gun-pistol',    w: scaleSize(28), h: scaleSize(18) },
  smg:       { key: 'px-gun-smg',       w: scaleSize(36), h: scaleSize(18) },
  grenadeMg: { key: 'px-gun-grenadeMg', w: scaleSize(40), h: scaleSize(20) },
  cannon:    { key: 'px-gun-cannon',    w: scaleSize(46), h: scaleSize(24) },
}

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
  radius: scaleSize(30),
  hp: 100,
  maxHp: 100,
  speed: 300,
}

/** 双持枪口垂直偏移 */
const DUAL_SPREAD = scaleSize(12)

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

  /** 武器展示 */
  private gunSprite: Phaser.GameObjects.Image
  private gunSprite2: Phaser.GameObjects.Image | null = null // 双持副武器
  private gunAngle: number = 0 // 当前射击角度（弧度）
  private currentGunId: string = 'pistol'
  private _dualWield: boolean = false

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

    // 武器（放在头像下层，看起来在"手持"位置）
    const gunInfo = GUN_DISPLAY.pistol
    this.gunSprite = scene.add.image(this.radius, 0, gunInfo.key)
    this.gunSprite.setDisplaySize(gunInfo.w, gunInfo.h)
    this.gunSprite.setOrigin(0.15, 0.5) // 原点偏左中，便于围绕头像旋转
    this.add(this.gunSprite)

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

  /** 启用双持（创建第二把武器 sprite） */
  enableDualWield(): void {
    if (this._dualWield) return
    this._dualWield = true

    const info = GUN_DISPLAY[this.currentGunId] ?? GUN_DISPLAY.pistol
    this.gunSprite2 = this.scene.add.image(this.radius, 0, info.key)
    this.gunSprite2.setDisplaySize(info.w, info.h)
    this.gunSprite2.setOrigin(0.15, 0.5)
    // 插入到 gunSprite 的同层（头像下方）
    this.addAt(this.gunSprite2, this.getIndex(this.gunSprite))
  }

  /** 更新武器朝向和类型 */
  setGunDisplay(gunId: string, angle: number): void {
    this.gunAngle = angle

    // 切换武器纹理
    if (gunId !== this.currentGunId) {
      this.currentGunId = gunId
      const info = GUN_DISPLAY[gunId] ?? GUN_DISPLAY.pistol
      this.gunSprite.setTexture(info.key)
      this.gunSprite.setDisplaySize(info.w, info.h)

      if (this.gunSprite2) {
        this.gunSprite2.setTexture(info.key)
        this.gunSprite2.setDisplaySize(info.w, info.h)
      }
    }

    // 主武器位置：围绕头像边缘
    const offset = this.radius + 5
    this.gunSprite.setPosition(
      Math.cos(angle) * offset,
      Math.sin(angle) * offset,
    )
    this.gunSprite.setRotation(angle)

    const absAngle = Math.abs(angle)
    this.gunSprite.setFlipY(absAngle > Math.PI / 2)

    // 双持副武器：与主武器同方向，但沿垂直方向偏移（上下分离）
    if (this.gunSprite2) {
      const perpAngle = angle + Math.PI / 2 // 垂直于射击方向
      const spread = DUAL_SPREAD
      // 主枪向一侧偏移
      this.gunSprite.setPosition(
        Math.cos(angle) * offset + Math.cos(perpAngle) * spread,
        Math.sin(angle) * offset + Math.sin(perpAngle) * spread,
      )
      // 副枪向另一侧偏移，朝向与主枪一致
      this.gunSprite2.setPosition(
        Math.cos(angle) * offset - Math.cos(perpAngle) * spread,
        Math.sin(angle) * offset - Math.sin(perpAngle) * spread,
      )
      this.gunSprite2.setRotation(angle)
      this.gunSprite2.setFlipY(absAngle > Math.PI / 2)
    }
  }

  /** 获取主枪口在世界坐标系中的位置（供子弹生成点使用） */
  getGunMuzzleWorld(): { x: number; y: number } {
    const info = GUN_DISPLAY[this.currentGunId] ?? GUN_DISPLAY.pistol
    const muzzleDist = (this.radius + 5) + info.w * 0.85
    if (this._dualWield) {
      const perpAngle = this.gunAngle + Math.PI / 2
      const spread = DUAL_SPREAD
      return {
        x: this.x + Math.cos(this.gunAngle) * muzzleDist + Math.cos(perpAngle) * spread,
        y: this.y + Math.sin(this.gunAngle) * muzzleDist + Math.sin(perpAngle) * spread,
      }
    }
    return {
      x: this.x + Math.cos(this.gunAngle) * muzzleDist,
      y: this.y + Math.sin(this.gunAngle) * muzzleDist,
    }
  }

  /** 获取副枪口在世界坐标系中的位置（双持用） */
  getGunMuzzle2World(): { x: number; y: number } {
    const info = GUN_DISPLAY[this.currentGunId] ?? GUN_DISPLAY.pistol
    const muzzleDist = (this.radius + 5) + info.w * 0.85
    const perpAngle = this.gunAngle + Math.PI / 2
    const spread = DUAL_SPREAD
    return {
      x: this.x + Math.cos(this.gunAngle) * muzzleDist - Math.cos(perpAngle) * spread,
      y: this.y + Math.sin(this.gunAngle) * muzzleDist - Math.sin(perpAngle) * spread,
    }
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
