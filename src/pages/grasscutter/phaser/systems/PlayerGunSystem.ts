/**
 * PlayerGunSystem - 玩家枪械系统（自动索敌射击）
 */

import Phaser from 'phaser'
import { PLAYER_BULLET_CAP, GUN_BASE, scaleSize } from '../../balance'
import { Enemy } from '../objects/Enemy'
import { Boss } from '../objects/Boss'
import { PlayerBullet } from '../objects/PlayerBullet'
import { PlayerExplosiveProjectile } from '../objects/PlayerExplosiveProjectile'
import { playGunSfx, playGrenadeSfx } from './GunSfx'

export type GunId = keyof typeof GUN_BASE

export interface GunRuntimeMultipliers {
  damageMul: number
  fireRateMul: number
  rangeMul: number
}

export interface GunComputedStats {
  gunId: string
  gunTitle: string
  bulletDamage: number
  fireRate: number
  range: number
}

/** 射击目标：普通敌人或 Boss */
interface ShootTarget {
  x: number
  y: number
}

export class PlayerGunSystem {
  private scene: Phaser.Scene
  private enemies: Phaser.GameObjects.Group
  private boss: Boss | null = null

  private playerX: number = 0
  private playerY: number = 0

  /** 枪口世界坐标获取器（由外部注入，用于子弹从枪口发射） */
  private getMuzzle: (() => { x: number; y: number }) | null = null
  /** 第二把枪口（双持时使用） */
  private getMuzzle2: (() => { x: number; y: number }) | null = null

  private gunId: GunId = 'pistol'
  private mul: GunRuntimeMultipliers = {
    damageMul: 1,
    fireRateMul: 1,
    rangeMul: 1,
  }

  private fireCooldownMs = 0
  private grenadeCooldownMs = 0

  /** 当前射击朝向角度（弧度），供外部读取以同步武器显示 */
  private aimAngle: number = 0

  /** 是否双持 */
  private dualWield: boolean = false

  /** 最大索敌距离平方（基于视口范围，由外部注入） */
  private maxTargetRange2: number = Number.POSITIVE_INFINITY

  private bullets: Phaser.Physics.Arcade.Group
  private projectiles: Phaser.Physics.Arcade.Group

  constructor(scene: Phaser.Scene, enemies: Phaser.GameObjects.Group) {
    this.scene = scene
    this.enemies = enemies

    this.bullets = this.scene.physics.add.group()
    this.projectiles = this.scene.physics.add.group()
  }

  getBulletsGroup(): Phaser.Physics.Arcade.Group {
    return this.bullets
  }

  getProjectilesGroup(): Phaser.Physics.Arcade.Group {
    return this.projectiles
  }

  setPlayerPosition(x: number, y: number): void {
    this.playerX = x
    this.playerY = y
  }

  /** 设置当前 Boss 引用（用于索敌） */
  setBoss(boss: Boss | null): void {
    this.boss = boss
  }

  /** 注入枪口位置获取器 */
  setMuzzleProvider(fn: () => { x: number; y: number }): void {
    this.getMuzzle = fn
  }

  /** 注入第二把枪口位置获取器（双持用） */
  setMuzzle2Provider(fn: () => { x: number; y: number }): void {
    this.getMuzzle2 = fn
  }

  setGunId(gunId: GunId): void {
    this.gunId = gunId
  }

  getGunId(): GunId {
    return this.gunId
  }

  /** 获取当前射击朝向角度（弧度） */
  getAimAngle(): number {
    return this.aimAngle
  }

  /** 设置双持状态 */
  setDualWield(enabled: boolean): void {
    this.dualWield = enabled
  }

  /** 是否双持 */
  isDualWield(): boolean {
    return this.dualWield
  }

  /** 设置最大索敌距离（每帧由 MainScene 基于视口计算后传入） */
  setMaxTargetRange(range: number): void {
    this.maxTargetRange2 = range * range
  }

  setMultipliers(partial: Partial<GunRuntimeMultipliers>): void {
    this.mul = { ...this.mul, ...partial }
  }

  getMultipliers(): GunRuntimeMultipliers {
    return { ...this.mul }
  }

  reset(): void {
    this.gunId = 'pistol'
    this.mul = { damageMul: 1, fireRateMul: 1, rangeMul: 1 }
    this.fireCooldownMs = 0
    this.grenadeCooldownMs = 0
    this.boss = null
    this.dualWield = false
    this.maxTargetRange2 = Number.POSITIVE_INFINITY

    this.bullets.clear(true, true)
    this.projectiles.clear(true, true)
  }

  update(deltaMs: number, worldWidth: number, worldHeight: number): void {
    this.updateLifetime(worldWidth, worldHeight)

    const target = this.findNearestTarget()
    if (!target) {
      this.fireCooldownMs = Math.max(0, this.fireCooldownMs - deltaMs)
      this.grenadeCooldownMs = Math.max(0, this.grenadeCooldownMs - deltaMs)
      return
    }

    // 更新瞄准角度（即使未开火也持续跟踪）
    this.aimAngle = Math.atan2(target.y - this.playerY, target.x - this.playerX)

    this.fireCooldownMs = Math.max(0, this.fireCooldownMs - deltaMs)
    this.grenadeCooldownMs = Math.max(0, this.grenadeCooldownMs - deltaMs)

    const base = GUN_BASE[this.gunId]

    // 主射击
    const fireIntervalMs = 1000 / (base.fireRate * this.mul.fireRateMul)
    if (this.fireCooldownMs <= 0) {
      if (this.bullets.getLength() < PLAYER_BULLET_CAP) {
        this.shootAt(target.x, target.y)
      }
      this.fireCooldownMs = fireIntervalMs
    }

    // 榴弹副武器（仅 grenadeMg 拥有）
    if (this.gunId === 'grenadeMg') {
      const grenade = GUN_BASE.grenadeMg.grenade
      if (grenade && this.grenadeCooldownMs <= 0) {
        this.fireGrenadeAt(target.x, target.y)
        this.grenadeCooldownMs = grenade.cooldownMs
      }
    }
  }

  getComputedStats(): GunComputedStats {
    const base = GUN_BASE[this.gunId]
    return {
      gunId: base.gunId,
      gunTitle: base.title,
      bulletDamage: Math.round(base.baseDamage * this.mul.damageMul),
      fireRate: +(base.fireRate * this.mul.fireRateMul).toFixed(2),
      range: Math.round(base.range * this.mul.rangeMul),
    }
  }

  /**
   * 查找最近的射击目标（优先普通敌人，也考虑 Boss）
   * 只在 maxTargetRange 范围内索敌，避免瞄准屏幕外目标。
   */
  private findNearestTarget(): ShootTarget | null {
    let best: ShootTarget | null = null
    let bestDist2 = this.maxTargetRange2

    // 遍历普通敌人
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Enemy
      if (!enemy.active) return

      const dx = enemy.x - this.playerX
      const dy = enemy.y - this.playerY
      const d2 = dx * dx + dy * dy

      if (d2 < bestDist2) {
        bestDist2 = d2
        best = { x: enemy.x, y: enemy.y }
      }
    })

    // 检查 Boss（如果存在且 active）
    if (this.boss && this.boss.active) {
      const dx = this.boss.x - this.playerX
      const dy = this.boss.y - this.playerY
      const d2 = dx * dx + dy * dy

      if (d2 < bestDist2) {
        best = { x: this.boss.x, y: this.boss.y }
      }
    }

    return best
  }

  private shootAt(targetX: number, targetY: number): void {
    const base = GUN_BASE[this.gunId]

    const dx = targetX - this.playerX
    const dy = targetY - this.playerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= 0) return

    // 散布（角度扰动）
    const spreadRad = (base.spreadDeg * Math.PI) / 180
    const angle = Math.atan2(dy, dx) + (spreadRad > 0 ? Phaser.Math.FloatBetween(-spreadRad, spreadRad) : 0)

    const dirX = Math.cos(angle)
    const dirY = Math.sin(angle)

    // 子弹从枪口发射
    const muzzle = this.getMuzzle ? this.getMuzzle() : { x: this.playerX, y: this.playerY }

    const bullet = new PlayerBullet(this.scene, {
      x: muzzle.x,
      y: muzzle.y,
      radius: base.bulletRadius,
      dirX,
      dirY,
      speed: base.bulletSpeed,
      damage: Math.round(base.baseDamage * this.mul.damageMul),
      range: base.range * this.mul.rangeMul,
    })

    this.bullets.add(bullet)
    bullet.initPhysics()

    // 双持：从第二把枪同时发射
    if (this.dualWield) {
      const angle2 = Math.atan2(dy, dx) + (spreadRad > 0 ? Phaser.Math.FloatBetween(-spreadRad, spreadRad) : 0)
      const dirX2 = Math.cos(angle2)
      const dirY2 = Math.sin(angle2)
      const muzzle2 = this.getMuzzle2 ? this.getMuzzle2() : muzzle

      const bullet2 = new PlayerBullet(this.scene, {
        x: muzzle2.x,
        y: muzzle2.y,
        radius: base.bulletRadius,
        dirX: dirX2,
        dirY: dirY2,
        speed: base.bulletSpeed,
        damage: Math.round(base.baseDamage * this.mul.damageMul),
        range: base.range * this.mul.rangeMul,
      })

      this.bullets.add(bullet2)
      bullet2.initPhysics()
    }

    playGunSfx(this.gunId)
  }

  private fireGrenadeAt(targetX: number, targetY: number): void {
    const base = GUN_BASE.grenadeMg
    if (!base.grenade) return

    const dx = targetX - this.playerX
    const dy = targetY - this.playerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= 0) return

    const dirX = dx / dist
    const dirY = dy / dist

    // 榴弹也从枪口发射
    const muzzle = this.getMuzzle ? this.getMuzzle() : { x: this.playerX, y: this.playerY }

    const projectile = new PlayerExplosiveProjectile(this.scene, {
      x: muzzle.x,
      y: muzzle.y,
      radius: Math.max(3, scaleSize(6)),
      dirX,
      dirY,
      speed: base.grenade.projectileSpeed,
      damage: Math.round(base.grenade.damage * this.mul.damageMul),
      range: base.grenade.range * this.mul.rangeMul,
      explosionRadius: base.grenade.explosionRadius,
      color: 0xfacc15,
    })

    this.projectiles.add(projectile)
    projectile.initPhysics()

    playGrenadeSfx()
  }

  private updateLifetime(worldWidth: number, worldHeight: number): void {
    this.bullets.getChildren().forEach((obj) => {
      const b = obj as PlayerBullet
      if (!b.active) return
      if (b.shouldDestroy(worldWidth, worldHeight)) {
        b.destroy()
        this.bullets.remove(b, true, true)
      }
    })

    this.projectiles.getChildren().forEach((obj) => {
      const p = obj as PlayerExplosiveProjectile
      if (!p.active) return
      if (p.shouldDestroy(worldWidth, worldHeight)) {
        p.destroy()
        this.projectiles.remove(p, true, true)
      }
    })
  }
}
