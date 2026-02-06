/**
 * PlayerGunSystem - 玩家枪械系统（自动索敌射击）
 */

import Phaser from 'phaser'
import { PLAYER_BULLET_CAP, GUN_BASE } from '../../balance'
import { Enemy } from '../objects/Enemy'
import { PlayerBullet } from '../objects/PlayerBullet'
import { PlayerExplosiveProjectile } from '../objects/PlayerExplosiveProjectile'

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

export class PlayerGunSystem {
  private scene: Phaser.Scene
  private enemies: Phaser.GameObjects.Group

  private playerX: number = 0
  private playerY: number = 0

  private gunId: GunId = 'pistol'
  private mul: GunRuntimeMultipliers = {
    damageMul: 1,
    fireRateMul: 1,
    rangeMul: 1,
  }

  private fireCooldownMs = 0
  private grenadeCooldownMs = 0

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

  setGunId(gunId: GunId): void {
    this.gunId = gunId
  }

  getGunId(): GunId {
    return this.gunId
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

    this.bullets.clear(true, true)
    this.projectiles.clear(true, true)
  }

  update(deltaMs: number, worldWidth: number, worldHeight: number): void {
    this.updateLifetime(worldWidth, worldHeight)

    const target = this.findNearestEnemy()
    if (!target) {
      this.fireCooldownMs = Math.max(0, this.fireCooldownMs - deltaMs)
      this.grenadeCooldownMs = Math.max(0, this.grenadeCooldownMs - deltaMs)
      return
    }

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

  private findNearestEnemy(): Enemy | null {
    let best: Enemy | null = null
    let bestDist2 = Number.POSITIVE_INFINITY

    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Enemy
      if (!enemy.active) return

      const dx = enemy.x - this.playerX
      const dy = enemy.y - this.playerY
      const d2 = dx * dx + dy * dy

      if (d2 < bestDist2) {
        bestDist2 = d2
        best = enemy
      }
    })

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

    const bullet = new PlayerBullet(this.scene, {
      x: this.playerX,
      y: this.playerY,
      radius: base.bulletRadius,
      dirX,
      dirY,
      speed: base.bulletSpeed,
      damage: Math.round(base.baseDamage * this.mul.damageMul),
      range: base.range * this.mul.rangeMul,
    })

    this.bullets.add(bullet)
    bullet.initPhysics()
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

    const projectile = new PlayerExplosiveProjectile(this.scene, {
      x: this.playerX,
      y: this.playerY,
      radius: 6,
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
