/**
 * WeaponSystem - 武器系统
 * 
 * 管理绕玩家旋转的武器，用于命中敌人/Boss
 */

import Phaser from 'phaser'
import { Enemy } from '../objects/Enemy'
import { Boss } from '../objects/Boss'

export interface WeaponConfig {
  damage: number
  range: number
  rotationSpeed: number // 弧度/秒
  width: number
}

interface Weapon {
  angle: number // 当前角度（弧度）
  graphics: Phaser.GameObjects.Graphics
}

const DEFAULT_CONFIG: WeaponConfig = {
  damage: 10,
  range: 80,
  rotationSpeed: 3,
  width: 8,
}

/** 猫爪颜色配置（元宵白色系，与原版一致） */
const PAW_COLORS = {
  main: 0xffffff,
  pad: 0x111827,
  stroke: 0x111827,
}

export class WeaponSystem {
  private scene: Phaser.Scene
  private weapons: Weapon[] = []
  private config: WeaponConfig
  private playerX: number = 0
  private playerY: number = 0

  constructor(scene: Phaser.Scene, config: Partial<WeaponConfig> = {}) {
    this.scene = scene
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /** 初始化武器（创建 N 把均匀分布） */
  initWeapons(count: number): void {
    this.clearWeapons()

    const angleStep = (Math.PI * 2) / count

    for (let i = 0; i < count; i++) {
      const graphics = this.scene.add.graphics()
      this.weapons.push({
        angle: i * angleStep,
        graphics,
      })
    }
  }

  /** 清除所有武器 */
  clearWeapons(): void {
    this.weapons.forEach((w) => w.graphics.destroy())
    this.weapons = []
  }

  /** 添加一把武器 */
  addWeapon(): void {
    const count = this.weapons.length + 1
    this.initWeapons(count)
  }

  /** 设置玩家位置 */
  setPlayerPosition(x: number, y: number): void {
    this.playerX = x
    this.playerY = y
  }

  /** 更新武器参数 */
  updateConfig(config: Partial<WeaponConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /** 每帧更新 */
  update(delta: number): void {
    const deltaSeconds = delta / 1000

    this.weapons.forEach((weapon) => {
      // 旋转
      weapon.angle += this.config.rotationSpeed * deltaSeconds

      // 计算末端位置
      const endX = this.playerX + Math.cos(weapon.angle) * this.config.range
      const endY = this.playerY + Math.sin(weapon.angle) * this.config.range

      // 重绘
      this.drawWeapon(weapon.graphics, this.playerX, this.playerY, endX, endY, weapon.angle)
    })
  }

  /** 绘制单把武器（抓痕线段 + 猫爪） */
  private drawWeapon(
    graphics: Phaser.GameObjects.Graphics,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    angle: number
  ): void {
    graphics.clear()

    // 抓痕线段（细线半透明白色，与原版一致）
    graphics.lineStyle(Math.max(1, this.config.width * 0.25), 0xffffff, 0.22)
    graphics.beginPath()
    graphics.moveTo(startX, startY)
    graphics.lineTo(endX, endY)
    graphics.strokePath()

    // 猫爪在末端
    this.drawPaw(graphics, endX, endY, angle, this.config.width * 3)
  }

  /** 绘制猫爪 */
  private drawPaw(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    angle: number,
    size: number
  ): void {
    graphics.save?.()

    // 主掌垫
    graphics.fillStyle(PAW_COLORS.main)
    graphics.fillEllipse(x, y, size * 0.76, size * 0.64)
    graphics.lineStyle(2, PAW_COLORS.stroke)
    graphics.strokeEllipse(x, y, size * 0.76, size * 0.64)

    // 掌垫细节
    graphics.fillStyle(PAW_COLORS.pad)
    graphics.fillEllipse(x, y, size * 0.56, size * 0.44)

    // 四个趾垫（简化版，不做旋转偏移）
    const toeOffsets = [
      { dx: -size * 0.32, dy: -size * 0.36 },
      { dx: -size * 0.12, dy: -size * 0.42 },
      { dx: size * 0.12, dy: -size * 0.42 },
      { dx: size * 0.32, dy: -size * 0.36 },
    ]
    const toeRadii = [size * 0.14, size * 0.16, size * 0.16, size * 0.14]

    // 将偏移量按武器角度旋转
    const cos = Math.cos(angle - Math.PI / 2)
    const sin = Math.sin(angle - Math.PI / 2)

    toeOffsets.forEach((offset, i) => {
      const rotatedX = offset.dx * cos - offset.dy * sin
      const rotatedY = offset.dx * sin + offset.dy * cos
      const toeX = x + rotatedX
      const toeY = y + rotatedY

      graphics.fillStyle(PAW_COLORS.main)
      graphics.fillEllipse(toeX, toeY, toeRadii[i] * 1.8, toeRadii[i] * 2)
      graphics.lineStyle(1.5, PAW_COLORS.stroke)
      graphics.strokeEllipse(toeX, toeY, toeRadii[i] * 1.8, toeRadii[i] * 2)

      graphics.fillStyle(PAW_COLORS.pad)
      graphics.fillEllipse(toeX, toeY, toeRadii[i] * 1.2, toeRadii[i] * 1.4)
    })

    graphics.restore?.()
  }

  /** 检测武器命中（对敌人组） */
  checkHitEnemies(enemies: Phaser.GameObjects.Group): Enemy[] {
    const hitList: Enemy[] = []
    const hitRadius = this.config.width * 1.5 // 末端命中判定半径

    this.weapons.forEach((weapon) => {
      const endX = this.playerX + Math.cos(weapon.angle) * this.config.range
      const endY = this.playerY + Math.sin(weapon.angle) * this.config.range

      enemies.getChildren().forEach((obj) => {
        const enemy = obj as Enemy
        if (!enemy.active) return

        const dx = endX - enemy.x
        const dy = endY - enemy.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < hitRadius + enemy.radius) {
          if (!hitList.includes(enemy)) {
            hitList.push(enemy)
          }
        }
      })
    })

    return hitList
  }

  /** 检测武器命中 Boss */
  checkHitBoss(boss: Boss | null): boolean {
    if (!boss) return false

    const hitRadius = this.config.width * 1.5

    for (const weapon of this.weapons) {
      const endX = this.playerX + Math.cos(weapon.angle) * this.config.range
      const endY = this.playerY + Math.sin(weapon.angle) * this.config.range

      const dx = endX - boss.x
      const dy = endY - boss.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < hitRadius + boss.radius) {
        return true
      }
    }

    return false
  }

  /** 获取当前武器数量 */
  getWeaponCount(): number {
    return this.weapons.length
  }

  /** 获取当前配置 */
  getConfig(): WeaponConfig {
    return { ...this.config }
  }
}
