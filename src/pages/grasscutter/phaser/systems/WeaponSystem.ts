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

  /** 绘制单把武器（只绘制猫爪，无连接线） */
  private drawWeapon(
    graphics: Phaser.GameObjects.Graphics,
    _startX: number,
    _startY: number,
    endX: number,
    endY: number,
    angle: number
  ): void {
    graphics.clear()

    // 只绘制猫爪在末端，无连接线
    this.drawPaw(graphics, endX, endY, angle, this.config.width * 3)
  }

  /** 
   * 绘制猫爪（参考标准猫爪图案）
   * 结构：大掌垫在中心偏下，四个趾垫在上方呈弧形排列
   * 朝向：趾垫朝向外侧（远离玩家方向）
   */
  private drawPaw(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    angle: number,
    size: number
  ): void {
    // 猫爪朝向外侧（angle 指向外侧）
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    // === 外轮廓（可选，让猫爪更明显） ===
    // graphics.lineStyle(2, PAW_COLORS.stroke)
    // graphics.strokeCircle(x, y, size * 0.6)

    // === 大掌垫（心形底部，位于中心偏内侧） ===
    // 掌垫偏移到内侧（靠近玩家方向）
    const padOffsetX = -cos * size * 0.15
    const padOffsetY = -sin * size * 0.15
    const padX = x + padOffsetX
    const padY = y + padOffsetY

    // 白色外圈
    graphics.fillStyle(PAW_COLORS.main)
    graphics.fillEllipse(padX, padY, size * 0.7, size * 0.6)
    graphics.lineStyle(2, PAW_COLORS.stroke)
    graphics.strokeEllipse(padX, padY, size * 0.7, size * 0.6)

    // 黑色内垫
    graphics.fillStyle(PAW_COLORS.pad)
    graphics.fillEllipse(padX, padY, size * 0.5, size * 0.42)

    // === 四个趾垫（在外侧呈弧形排列） ===
    // 趾垫相对于猫爪中心的位置（朝外侧）
    const toeDistance = size * 0.42 // 趾垫到中心的距离
    const toeAngles = [-0.45, -0.15, 0.15, 0.45] // 相对于主方向的偏移角度（弧度）
    const toeSizes = [size * 0.18, size * 0.2, size * 0.2, size * 0.18] // 趾垫大小

    toeAngles.forEach((toeAngle, i) => {
      // 趾垫的实际角度 = 武器角度 + 偏移角度
      const actualAngle = angle + toeAngle
      const toeX = x + Math.cos(actualAngle) * toeDistance
      const toeY = y + Math.sin(actualAngle) * toeDistance

      // 白色外圈
      graphics.fillStyle(PAW_COLORS.main)
      graphics.fillEllipse(toeX, toeY, toeSizes[i], toeSizes[i] * 1.1)
      graphics.lineStyle(1.5, PAW_COLORS.stroke)
      graphics.strokeEllipse(toeX, toeY, toeSizes[i], toeSizes[i] * 1.1)

      // 黑色内垫
      graphics.fillStyle(PAW_COLORS.pad)
      graphics.fillEllipse(toeX, toeY, toeSizes[i] * 0.65, toeSizes[i] * 0.75)
    })
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
