/**
 * TankPet - 坦克宠物（跟随玩家、自动索敌、CD 射击范围爆炸炮弹）
 */

import Phaser from 'phaser'
import {
  GUN_BASE,
  TANK_PET_COOLDOWN_MS,
  TANK_PET_FOLLOW_OFFSET,
  TANK_PET_FOLLOW_LERP,
} from '../../balance'
import { Enemy } from './Enemy'
import { Boss } from './Boss'
import { PlayerExplosiveProjectile } from './PlayerExplosiveProjectile'
import { playTankCannonSfx } from '../systems/GunSfx'

export class TankPet extends Phaser.GameObjects.Container {
  private body!: Phaser.GameObjects.Image
  private turret!: Phaser.GameObjects.Image
  private cooldownMs: number = 0
  private projectilesGroup: Phaser.Physics.Arcade.Group

  /** 当前炮管瞄准角度 */
  private turretAngle: number = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    projectilesGroup: Phaser.Physics.Arcade.Group,
  ) {
    super(scene, x, y)

    this.projectilesGroup = projectilesGroup

    // 车身
    this.body = scene.add.image(0, 0, 'px-tank-body')
    this.body.setDisplaySize(40, 28)
    this.add(this.body)

    // 炮管（在车身之上）
    this.turret = scene.add.image(4, 0, 'px-tank-turret')
    this.turret.setDisplaySize(30, 12)
    this.turret.setOrigin(0.25, 0.5)
    this.add(this.turret)

    this.setDepth(45)
    scene.add.existing(this)
  }

  /**
   * 每帧更新：跟随玩家 + 索敌 + CD 射击
   */
  update(
    delta: number,
    playerX: number,
    playerY: number,
    enemies: Phaser.GameObjects.Group,
    boss: Boss | null,
  ): void {
    // 跟随玩家（lerp 插值，偏移在左后方）
    const targetX = playerX - TANK_PET_FOLLOW_OFFSET
    const targetY = playerY + TANK_PET_FOLLOW_OFFSET * 0.5
    this.x += (targetX - this.x) * TANK_PET_FOLLOW_LERP * Math.min(delta / 16, 3)
    this.y += (targetY - this.y) * TANK_PET_FOLLOW_LERP * Math.min(delta / 16, 3)

    // 索敌
    const target = this.findNearestTarget(enemies, boss)

    if (target) {
      // 更新炮管朝向
      const dx = target.x - this.x
      const dy = target.y - this.y
      this.turretAngle = Math.atan2(dy, dx)
      this.turret.setRotation(this.turretAngle)

      // 车身也朝向大致方向（水平翻转）
      this.body.setFlipX(dx < 0)
    }

    // CD 冷却
    this.cooldownMs = Math.max(0, this.cooldownMs - delta)

    // 射击
    if (target && this.cooldownMs <= 0) {
      this.fireAt(target.x, target.y)
      this.cooldownMs = TANK_PET_COOLDOWN_MS
    }
  }

  private findNearestTarget(
    enemies: Phaser.GameObjects.Group,
    boss: Boss | null,
  ): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null
    let bestDist2 = Number.POSITIVE_INFINITY

    enemies.getChildren().forEach((obj) => {
      const enemy = obj as Enemy
      if (!enemy.active) return
      const dx = enemy.x - this.x
      const dy = enemy.y - this.y
      const d2 = dx * dx + dy * dy
      if (d2 < bestDist2) {
        bestDist2 = d2
        best = { x: enemy.x, y: enemy.y }
      }
    })

    if (boss && boss.active) {
      const dx = boss.x - this.x
      const dy = boss.y - this.y
      const d2 = dx * dx + dy * dy
      if (d2 < bestDist2) {
        best = { x: boss.x, y: boss.y }
      }
    }

    return best
  }

  private fireAt(targetX: number, targetY: number): void {
    const cannon = GUN_BASE.cannon

    const dx = targetX - this.x
    const dy = targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= 0) return

    const dirX = dx / dist
    const dirY = dy / dist

    // 炮弹从炮管口发射
    const muzzleOffset = 20
    const startX = this.x + Math.cos(this.turretAngle) * muzzleOffset
    const startY = this.y + Math.sin(this.turretAngle) * muzzleOffset

    const projectile = new PlayerExplosiveProjectile(this.scene, {
      x: startX,
      y: startY,
      radius: cannon.bulletRadius,
      dirX,
      dirY,
      speed: cannon.bulletSpeed,
      damage: cannon.baseDamage,
      range: cannon.range,
      explosionRadius: cannon.explosionRadius,
      color: 0xff6b35,
    })

    this.projectilesGroup.add(projectile)
    projectile.initPhysics()

    playTankCannonSfx()
  }

  /** 重置冷却 */
  reset(): void {
    this.cooldownMs = 0
  }
}
