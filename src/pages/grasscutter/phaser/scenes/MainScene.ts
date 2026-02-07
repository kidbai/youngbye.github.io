/**
 * MainScene - 核心玩法场景
 */

import Phaser from 'phaser'
import { eventBus, Events, emitStateUpdate, emitNeedUpgrade, emitPlayerDead, emitVictory } from '../events'
import type { MoveVector, GameSnapshot, UpgradeOption, UpgradeKind, UpgradeRarity } from '../types'
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getLevelConfig,
  getBossHpByLevel,
  clamp,
  ENEMIES_PER_LEVEL,
  PLAYER_MAX_HP,
  TOTAL_LEVELS,
  KILLS_PER_UPGRADE,
  MAX_WEAPONS,
  INITIAL_WEAPON_DAMAGE,
  INITIAL_WEAPON_RANGE,
  INITIAL_WEAPON_ROTATION_SPEED,
  INITIAL_WEAPON_COUNT,
  UPGRADE_DAMAGE_INCREASE,
  UPGRADE_RANGE_INCREASE,
  UPGRADE_SPEED_INCREASE,
  EVOLVE_AT_PLAYER_LEVEL,
  EVOLVE_PITY_AFTER_MISSES,
  UPGRADE_RARITY_WEIGHTS,
  STAT_UPGRADE_VALUES,
  GUN_BASE,
  getShooterEnemyShootIntervalMs,
  getShooterEnemyBulletSpeed,
  getShooterEnemyBulletDamage,
  getThrowerEnemyThrowIntervalMs,
  THROWER_POOP_IMPACT_RADIUS,
  getThrowerEnemyImpactDamage,
  POOP_FIELD_DURATION_MS,
  POOP_FIELD_TICK_MS,
  getPoopFieldTickDamage,
  ENEMY_BULLET_MAX_RANGE,
  PLAYER_SPEED,
  getViewportFireRange,
  scaleSize,
  ENEMY_CHASE_SPEED_BOOST,
  getMeleeEnemyAttackIntervalMs,
  getMeleeEnemyAttackDamage,
} from '../../balance'
import { Player } from '../objects/Player'
import { Enemy } from '../objects/Enemy'
import { Boss } from '../objects/Boss'
import { BossBullet } from '../objects/BossBullet'
import { EnemyBullet } from '../objects/EnemyBullet'
import { PoopProjectile } from '../objects/PoopProjectile'
import { AoeField } from '../objects/AoeField'
import { SpawnSystem } from '../systems/SpawnSystem'
import { PlayerGunSystem } from '../systems/PlayerGunSystem'
import { SaveSystem } from '../systems/SaveSystem'
import { PlayerBullet } from '../objects/PlayerBullet'
import { PlayerExplosiveProjectile } from '../objects/PlayerExplosiveProjectile'
import { ExplosionFx } from '../objects/ExplosionFx'
import { TankPet } from '../objects/TankPet'
import { createOverworldMap, isBlockedAtWorldXY, FULL_COLLISION_TILE_IDS } from '../maps/OverworldMap'

/** 玩家被击中时的重庆话骚话 */
const PLAYER_HIT_SPEECHES = [
  '哎哟喂，老子遭起了！',
  '锤子哦，疼死老子了！',
  '瓜娃子，你敢打老子！',
  '格老子的，安逸惨了！',
  '妈哟，老子要发火了！',
  '啷个搞起的嘛！',
  '日白，老子不得行了！',
  '你龟儿等到，老子要收拾你！',
  '遭不住了，痛惨了！',
  '哦豁，老子要翻车！',
]

/** 配置常量 */
const BOSS_TOUCH_DAMAGE = 25
const BOSS_TOUCH_COOLDOWN = 650
const BOSS_KNOCKBACK_DISTANCE = scaleSize(40)

export class MainScene extends Phaser.Scene {
  // 玩家
  private player!: Player

  // 地形碰撞层（Tilemap）
  private terrainLayer!: Phaser.Tilemaps.TilemapLayer

  // 敌人组
  private enemies!: Phaser.GameObjects.Group

  // Boss
  private boss: Boss | null = null

  // Boss 子弹组（需要与地形碰撞，因此用 Arcade 物理组）
  private bossBullets!: Phaser.Physics.Arcade.Group

  // 普通敌人的子弹/投掷物
  private enemyBullets!: Phaser.Physics.Arcade.Group
  private poopProjectiles!: Phaser.Physics.Arcade.Group
  private aoeFields!: Phaser.GameObjects.Group

  // 系统
  private spawnSystem!: SpawnSystem
  private gunSystem!: PlayerGunSystem

  // 玩家子弹/投射物组（Arcade 物理组）
  private playerBullets!: Phaser.Physics.Arcade.Group
  private playerProjectiles!: Phaser.Physics.Arcade.Group

  // 移动向量（来自摇杆）
  private moveVector: MoveVector = { x: 0, y: 0 }

  // 键盘输入
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }

  // 游戏状态
  private gameState = 'playing'
  private level = 1
  private score = 0
  private kills = 0 // 本关击杀
  private totalKills = 0 // 累计击杀（用于升级计数）
  private playerLevel = 1
  private pendingUpgrades = 0 // 待处理的升级次数
  private evolveMisses = 0 // 达到进化门槛后，连续未选进化的次数（保底用）
  private bossSpawned = false
  private dualWield = false // 是否已激活双持
  private hasTankPet = false // 是否已获得坦克宠物
  private tankPet: TankPet | null = null

  // 武器属性
  private weaponDamage = INITIAL_WEAPON_DAMAGE
  private weaponRange = INITIAL_WEAPON_RANGE
  private weaponRotationSpeed = INITIAL_WEAPON_ROTATION_SPEED
  private weaponCount = INITIAL_WEAPON_COUNT


  constructor() {
    super({ key: 'MainScene' })
  }

  create(): void {
    const worldW = this.registry.get('worldWidth') || WORLD_WIDTH
    const worldH = this.registry.get('worldHeight') || WORLD_HEIGHT

    // 设置世界边界
    this.physics.world.setBounds(0, 0, worldW, worldH)

    // 创建像素风 Tilemap 地图（含碰撞）
    const overworld = createOverworldMap(this)
    this.terrainLayer = overworld.layer
    this.terrainLayer.setDepth(-10)

    // 创建组（使用物理组以支持碰撞）
    this.enemies = this.physics.add.group()
    this.bossBullets = this.physics.add.group()
    this.enemyBullets = this.physics.add.group()
    this.poopProjectiles = this.physics.add.group()
    this.aoeFields = this.add.group()

    // 地形碰撞：敌人会被地形挡住
    this.physics.add.collider(this.enemies, this.terrainLayer)

    // 地形碰撞：Boss 子弹撞墙即销毁（仅森林/岩壁，河流不阻挡）
    this.physics.add.collider(this.bossBullets, this.terrainLayer, (obj) => {
      const bullet = obj as BossBullet
      if (!bullet.active) return
      bullet.destroy()
      this.bossBullets.remove(bullet, true, true)
    }, (obj, tile) => {
      // 仅与森林/岩壁碰撞，河流不阻挡子弹
      const t = tile as Phaser.Tilemaps.Tile
      return FULL_COLLISION_TILE_IDS.includes(t.index)
    })

    // 地形碰撞：普通敌人子弹撞墙即销毁（仅森林/岩壁，河流不阻挡）
    this.physics.add.collider(this.enemyBullets, this.terrainLayer, (obj) => {
      const bullet = obj as EnemyBullet
      if (!bullet.active) return
      bullet.destroy()
      this.enemyBullets.remove(bullet, true, true)
    }, (obj, tile) => {
      const t = tile as Phaser.Tilemaps.Tile
      return FULL_COLLISION_TILE_IDS.includes(t.index)
    })

    // 地形碰撞：大便撞墙会"落地并开始读条"，不再立刻爆炸结算（给玩家反应时间）
    this.physics.add.collider(this.poopProjectiles, this.terrainLayer, (obj) => {
      const poop = obj as unknown as PoopProjectile
      if (!poop.active) return
      poop.beginArming(poop.x, poop.y)
    })

    // 设置敌人之间的碰撞（防止重叠）
    this.physics.add.collider(this.enemies, this.enemies)

    // 加载存档
    const save = SaveSystem.load()
    this.level = save.currentLevel
    this.playerLevel = save.playerLevel
    this.weaponCount = save.weaponCount
    this.evolveMisses = save.evolveMisses
    this.dualWield = save.dualWield ?? false
    this.hasTankPet = save.hasTankPet ?? false

    // 创建玩家（确保不出生在阻挡地形上）
    const startPos = this.findFreePosition(worldW / 2, worldH / 2)
    this.player = new Player(this, {
      x: startPos.x,
      y: startPos.y,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      speed: PLAYER_SPEED,
    })

    // 地形碰撞：玩家会被地形挡住
    this.physics.add.collider(this.player, this.terrainLayer)

    // 创建枪械系统（自动索敌射击）
    this.gunSystem = new PlayerGunSystem(this, this.enemies)
    this.gunSystem.setMuzzleProvider(() => this.player.getGunMuzzleWorld())
    this.gunSystem.setMuzzle2Provider(() => this.player.getGunMuzzle2World())
    this.playerBullets = this.gunSystem.getBulletsGroup()
    this.playerProjectiles = this.gunSystem.getProjectilesGroup()

    // 地形碰撞：玩家子弹/投射物撞墙即销毁（仅森林/岩壁，河流不阻挡）
    this.physics.add.collider(this.playerBullets, this.terrainLayer, (obj) => {
      const b = obj as PlayerBullet
      if (!b.active) return
      b.destroy()
      this.playerBullets.remove(b, true, true)
    }, (obj, tile) => {
      const t = tile as Phaser.Tilemaps.Tile
      return FULL_COLLISION_TILE_IDS.includes(t.index)
    })

    this.physics.add.collider(this.playerProjectiles, this.terrainLayer, (obj) => {
      const p = obj as PlayerExplosiveProjectile
      if (!p.active) return
      this.explodeAt(p.x, p.y, p.explosionRadius, p.damage)
      p.destroy()
      this.playerProjectiles.remove(p, true, true)
    }, (obj, tile) => {
      const t = tile as Phaser.Tilemaps.Tile
      return FULL_COLLISION_TILE_IDS.includes(t.index)
    })

    // 命中：子弹 → 敌人
    this.physics.add.overlap(this.playerBullets, this.enemies, (a, b) => {
      const bullet = a as PlayerBullet
      const enemy = b as Enemy
      if (!bullet.active || !enemy.active) return

      bullet.destroy()
      this.playerBullets.remove(bullet, true, true)

      const isDead = enemy.takeDamage(bullet.damage)
      if (isDead) {
        this.onEnemyKilled(enemy)
      }
    })

    // 命中：爆炸投射物 → 敌人（命中即爆）
    this.physics.add.overlap(this.playerProjectiles, this.enemies, (a, b) => {
      const proj = a as PlayerExplosiveProjectile
      const enemy = b as Enemy
      if (!proj.active || !enemy.active) return

      this.explodeAt(proj.x, proj.y, proj.explosionRadius, proj.damage)
      proj.destroy()
      this.playerProjectiles.remove(proj, true, true)
    })

    // 应用存档中的枪械状态
    this.gunSystem.setGunId(save.gunKey)
    this.gunSystem.setMultipliers({
      damageMul: save.gunDamageMul,
      fireRateMul: save.gunFireRateMul,
      rangeMul: save.gunRangeMul,
    })

    // 应用双持
    if (this.dualWield) {
      this.gunSystem.setDualWield(true)
      this.player.enableDualWield()
    }

    // 创建坦克宠物（如果存档中已获得）
    if (this.hasTankPet) {
      this.tankPet = new TankPet(this, this.player.x - 60, this.player.y + 30, this.playerProjectiles)
    }

    // 同步 HUD/旧字段（临时兼容）
    this.syncGunStatsToLegacyFields()

    // 创建刷怪系统
    this.spawnSystem = new SpawnSystem(this, this.enemies)

    // 供刷怪避障：注入地形阻挡判定
    this.spawnSystem.setIsBlocked((x: number, y: number) => isBlockedAtWorldXY(this.terrainLayer, x, y))

    // 相机跟随
    this.cameras.main.setBounds(0, 0, worldW, worldH)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    // 初始化键盘输入
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }

    // 开始刷怪
    this.startLevel()

    // 绑定事件
    this.bindEvents()

    // 初始状态推送
    this.emitState()
  }

  update(_time: number, delta: number): void {
    if (this.gameState !== 'playing') return

    // 更新玩家移动
    this.updatePlayerMovement()
    this.player.updatePlayer(delta)

    // 更新枪械系统
    const worldW = this.registry.get('worldWidth') || WORLD_WIDTH
    const worldH = this.registry.get('worldHeight') || WORLD_HEIGHT

    // 计算视口攻击范围（敌人射击/玩家索敌共用）
    const cam = this.cameras.main
    const viewportRange = getViewportFireRange(cam.width, cam.height)

    this.gunSystem.setPlayerPosition(this.player.x, this.player.y)
    this.gunSystem.setMaxTargetRange(viewportRange)
    this.gunSystem.update(delta, worldW, worldH)
    this.syncGunStatsToLegacyFields()

    // 同步武器显示（朝向 + 类型）
    this.player.setGunDisplay(this.gunSystem.getGunId(), this.gunSystem.getAimAngle())

    // 更新坦克宠物
    if (this.tankPet) {
      this.tankPet.setMaxTargetRange(viewportRange)
      this.tankPet.update(delta, this.player.x, this.player.y, this.enemies, this.boss)
    }

    // 更新敌人
    this.updateEnemies(delta)

    // 更新 Boss
    this.updateBoss(delta)

    // 更新 Boss 子弹
    this.updateBossBullets(delta)

    // 更新普通敌人的投射物/残留区
    this.updateEnemyBullets(delta)
    this.updatePoopProjectiles(delta)
    this.updateAoeFields(delta)

    // 玩家子弹命中 Boss
    this.checkPlayerShotsHitBoss()

    // 检查升级
    this.checkUpgrade()

    // 检查 Boss 生成
    this.checkBossSpawn()

    // 检查死亡
    if (this.player.hp <= 0) {
      this.onPlayerDead()
    }
  }

  /**
   * 旧版：绘制世界背景（绿色网格）。
   * 现在已改为 Tilemap 地图，保留此函数便于回退调试。
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private drawBackground(_w: number, _h: number): void {
    // no-op
  }

  /**
   * 找到一个非阻挡地形的位置（用于玩家/Boss 初始出生点，避免卡在河流/丛林/岩壁里）。
   */
  private findFreePosition(x: number, y: number, maxRadius: number = 640): { x: number; y: number } {
    if (!isBlockedAtWorldXY(this.terrainLayer, x, y)) return { x, y }

    const step = 32
    for (let r = step; r <= maxRadius; r += step) {
      const samples = 16
      for (let i = 0; i < samples; i++) {
        const angle = (Math.PI * 2 * i) / samples
        const nx = clamp(x + Math.cos(angle) * r, 50, WORLD_WIDTH - 50)
        const ny = clamp(y + Math.sin(angle) * r, 50, WORLD_HEIGHT - 50)
        if (!isBlockedAtWorldXY(this.terrainLayer, nx, ny)) {
          return { x: nx, y: ny }
        }
      }
    }

    return { x, y }
  }

  /** 开始当前关 */
  private startLevel(): void {
    this.kills = 0
    this.bossSpawned = false
    this.boss = null

    // 清理敌人和子弹
    this.enemies.clear(true, true)
    this.bossBullets.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.poopProjectiles.clear(true, true)
    this.aoeFields.clear(true, true)
    this.playerBullets?.clear(true, true)
    this.playerProjectiles?.clear(true, true)

    // 开始刷怪
    this.spawnSystem.startSpawning(this.level, () => this.onKillTargetReached())
  }

  /** 更新玩家移动 */
  private updatePlayerMovement(): void {
    // 优先使用摇杆输入
    let { x, y } = this.moveVector

    // 如果摇杆没有输入，检查键盘
    if (x === 0 && y === 0) {
      // 检查方向键
      if (this.cursors.left.isDown) x -= 1
      if (this.cursors.right.isDown) x += 1
      if (this.cursors.up.isDown) y -= 1
      if (this.cursors.down.isDown) y += 1

      // 检查 WASD
      if (this.wasdKeys.A.isDown) x -= 1
      if (this.wasdKeys.D.isDown) x += 1
      if (this.wasdKeys.W.isDown) y -= 1
      if (this.wasdKeys.S.isDown) y += 1
    }

    const body = this.player.getBody()

    if (x === 0 && y === 0) {
      body.setVelocity(0, 0)
      return
    }

    const len = Math.sqrt(x * x + y * y)
    const nx = x / len
    const ny = y / len
    body.setVelocity(nx * this.player.speed, ny * this.player.speed)
  }

  /** 更新敌人（追击/保持距离 + 攻击逻辑） */
  private updateEnemies(delta: number): void {
    const level = this.level

    // 收集活跃敌人（用于轻量分散）
    const activeEnemies: Enemy[] = []
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as Enemy
      if (e.active) activeEnemies.push(e)
    })

    // 轻量分桶：避免 O(n^2)
    const CELL_SIZE = 140
    const keyMul = 1024
    const grid = new Map<number, Enemy[]>()

    for (const e of activeEnemies) {
      const cx = Math.floor(e.x / CELL_SIZE)
      const cy = Math.floor(e.y / CELL_SIZE)
      const k = cx * keyMul + cy
      const list = grid.get(k)
      if (list) list.push(e)
      else grid.set(k, [e])

      // 给近战怪一个固定"绕圈方向"，减少扎堆贴脸
      if (e.getData('swirlDir') === undefined) {
        e.setData('swirlDir', Math.random() < 0.5 ? -1 : 1)
      }
    }

    const computeSeparation = (self: Enemy): { x: number; y: number } => {
      const cx = Math.floor(self.x / CELL_SIZE)
      const cy = Math.floor(self.y / CELL_SIZE)

      // 半径阈值：只处理很近的重叠
      const minSep = self.radius * 1.25
      const minSep2 = minSep * minSep

      let sx = 0
      let sy = 0

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const k = (cx + ox) * keyMul + (cy + oy)
          const list = grid.get(k)
          if (!list) continue

          for (const other of list) {
            if (other === self || !other.active) continue

            const dx = self.x - other.x
            const dy = self.y - other.y
            const d2 = dx * dx + dy * dy
            if (d2 <= 0 || d2 > minSep2) continue

            const d = Math.sqrt(d2)
            const nx = dx / d
            const ny = dy / d

            // 越近推得越开
            const t = (minSep - d) / minSep
            sx += nx * t
            sy += ny * t
          }
        }
      }

      return { x: sx, y: sy }
    }

    for (const enemy of activeEnemies) {
      const body = enemy.getBody()

      const dx = this.player.x - enemy.x
      const dy = this.player.y - enemy.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      let vx = 0
      let vy = 0

      // 行为：不同类型有不同的走位策略
      if (dist > 0) {
        const nx = dx / dist
        const ny = dy / dist

        if (enemy.enemyType === 'bigDanjuan') {
          // 大蛋卷：纯近战冲锋，直奔玩家，聚集速度更快
          const chaseSpeed = enemy.speed * ENEMY_CHASE_SPEED_BOOST
          vx = nx * chaseSpeed
          vy = ny * chaseSpeed
        } else if (enemy.enemyType === 'melee') {
          // 弓箭手：保持距离 + 横移（比 shooter 稍近）
          const minDist = scaleSize(160)
          const maxDist = scaleSize(320)

          if (dist > maxDist) {
            vx = nx * enemy.speed
            vy = ny * enemy.speed
          } else if (dist < minDist) {
            vx = -nx * enemy.speed * 0.9
            vy = -ny * enemy.speed * 0.9
          } else {
            const swirlDir = (enemy.getData('swirlDir') as number) ?? 1
            const tx = -ny
            const ty = nx
            vx = tx * enemy.speed * 0.4 * swirlDir
            vy = ty * enemy.speed * 0.4 * swirlDir
          }
        } else {
          // shooter/thrower：保持距离
          const minDist = enemy.enemyType === 'shooter' ? scaleSize(220) : scaleSize(260)
          const maxDist = enemy.enemyType === 'shooter' ? scaleSize(380) : scaleSize(420)

          if (dist > maxDist) {
            vx = nx * enemy.speed
            vy = ny * enemy.speed
          } else if (dist < minDist) {
            vx = -nx * enemy.speed * 0.95
            vy = -ny * enemy.speed * 0.95
          } else {
            // 中间距离：横移一点点，让战斗更"活"
            const tx = -ny
            const ty = nx
            vx = tx * enemy.speed * 0.35
            vy = ty * enemy.speed * 0.35
          }
        }
      }

      // 轻量分散：对速度做一个小叠加，减少堆叠
      const sep = computeSeparation(enemy)
      if (sep.x !== 0 || sep.y !== 0) {
        const sLen = Math.sqrt(sep.x * sep.x + sep.y * sep.y)
        if (sLen > 0) {
          const snx = sep.x / sLen
          const sny = sep.y / sLen

          const typeFactor = enemy.enemyType === 'melee' ? 1 : 0.55
          const sepSpeed = enemy.speed * 0.55 * typeFactor
          vx += snx * sepSpeed
          vy += sny * sepSpeed
        }
      }

      // 限速：避免分散叠加导致"突然加速"
      const maxSpeed = enemy.speed * 1.1
      const vLen = Math.sqrt(vx * vx + vy * vy)
      if (vLen > maxSpeed && vLen > 0) {
        const k = maxSpeed / vLen
        vx *= k
        vy *= k
      }

      body.setVelocity(vx, vy)

      // 所有怪物都朝向玩家同步武器
      enemy.aimWeaponAt(dx, dy)

      enemy.updateEnemy(delta)

      // 接触攻击（所有类型近身都有微量伤害；大蛋卷伤害更高、间隔更短）
      const contactKey = 'contactCd'
      let contactCd = (enemy.getData(contactKey) as number) ?? 0
      contactCd = Math.max(0, contactCd - delta)

      const contactRange = this.player.radius + enemy.radius
      if (dist < contactRange && contactCd <= 0) {
        const isBigDanjuan = enemy.enemyType === 'bigDanjuan'
        const dmg = isBigDanjuan
          ? getMeleeEnemyAttackDamage(level)
          : Math.round(3 + 0.3 * level)
        const interval = isBigDanjuan
          ? getMeleeEnemyAttackIntervalMs(level)
          : 950

        this.player.takeDamage(dmg)
        this.player.showSpeech(PLAYER_HIT_SPEECHES[Math.floor(Math.random() * PLAYER_HIT_SPEECHES.length)])
        this.emitState()

        enemy.setData(contactKey, interval)
      } else {
        enemy.setData(contactKey, contactCd)
      }

      // 弓箭手（原近战）：远程射箭
      if (enemy.enemyType === 'melee') {
        this.tryEnemyShoot(enemy, dx, dy, dist, delta, 'px-arrow', 0)
      }

      // 射击怪：定时射击
      if (enemy.enemyType === 'shooter') {
        this.tryEnemyShoot(enemy, dx, dy, dist, delta, 'px-bullet', 0x60a5fa)
      }

      // 丢大便怪：定时投掷落点 AOE
      if (enemy.enemyType === 'thrower') {
        this.tryEnemyThrow(enemy, dist, delta)
      }
    }
  }

  private tryEnemyShoot(
    enemy: Enemy, dx: number, dy: number, dist: number, delta: number,
    textureKey = 'px-bullet', tint = 0x60a5fa
  ): void {
    const key = 'shootCd'
    let cd = (enemy.getData(key) as number) ?? Phaser.Math.Between(0, 250)
    cd = Math.max(0, cd - delta)

    if (cd > 0) {
      enemy.setData(key, cd)
      return
    }

    // 距离门槛：使用视口范围，只有屏幕可见范围内的敌人才能射击
    const cam = this.cameras.main
    const fireRange = getViewportFireRange(cam.width, cam.height)
    if (dist > fireRange) {
      enemy.setData(key, 100) // 距离过远时轻缓 CD，避免高频检测
      return
    }

    if (dist <= 0) {
      enemy.setData(key, getShooterEnemyShootIntervalMs(this.level))
      return
    }

    // 上限保护：避免敌方子弹无限堆积导致卡死
    if (this.enemyBullets.getLength() >= 280) {
      enemy.setData(key, getShooterEnemyShootIntervalMs(this.level))
      return
    }

    const speed = getShooterEnemyBulletSpeed(this.level)
    const damage = getShooterEnemyBulletDamage(this.level)

    // 轻微散布，让弹幕没那么"锁死"
    const baseAngle = Math.atan2(dy, dx)
    const angle = baseAngle + Phaser.Math.FloatBetween(-0.12, 0.12)
    const dirX = Math.cos(angle)
    const dirY = Math.sin(angle)

    // 从武器枪口/箭尖发射
    const muzzle = enemy.getWeaponMuzzleWorld()

    const bullet = new EnemyBullet(this, muzzle.x, muzzle.y, Math.max(3, scaleSize(6)), dirX, dirY, speed, damage, ENEMY_BULLET_MAX_RANGE, textureKey, tint)
    this.enemyBullets.add(bullet)
    bullet.initPhysics()

    enemy.setData(key, getShooterEnemyShootIntervalMs(this.level))
  }

  private tryEnemyThrow(enemy: Enemy, dist: number, delta: number): void {
    const key = 'throwCd'
    let cd = (enemy.getData(key) as number) ?? Phaser.Math.Between(0, 350)
    cd = Math.max(0, cd - delta)

    if (cd > 0) {
      enemy.setData(key, cd)
      return
    }

    // 距离门槛：使用视口范围，只有屏幕可见范围内的敌人才能投掷
    const cam = this.cameras.main
    const fireRange = getViewportFireRange(cam.width, cam.height)
    if (dist > fireRange) {
      enemy.setData(key, 100)
      return
    }

    // 上限保护：避免投掷物堆积
    if (this.poopProjectiles.getLength() >= 60) {
      enemy.setData(key, getThrowerEnemyThrowIntervalMs(this.level))
      return
    }

    const speed = getShooterEnemyBulletSpeed(this.level)
    // 从武器位置发射
    const muzzle = enemy.getWeaponMuzzleWorld()
    const poop = new PoopProjectile(this, {
      x: muzzle.x,
      y: muzzle.y,
      targetX: this.player.x,
      targetY: this.player.y,
      speed,
      radius: scaleSize(12),
      impactRadius: THROWER_POOP_IMPACT_RADIUS,
      impactDamage: getThrowerEnemyImpactDamage(this.level),
      fieldDurationMs: POOP_FIELD_DURATION_MS,
      fieldTickMs: POOP_FIELD_TICK_MS,
      fieldTickDamage: getPoopFieldTickDamage(this.level),
    })

    this.poopProjectiles.add(poop)
    poop.initPhysics()
    enemy.setData(key, getThrowerEnemyThrowIntervalMs(this.level))
  }

  private updateEnemyBullets(_delta: number): void {
    const worldW = this.registry.get('worldWidth') || WORLD_WIDTH
    const worldH = this.registry.get('worldHeight') || WORLD_HEIGHT

    this.enemyBullets.getChildren().forEach((obj) => {
      const bullet = obj as EnemyBullet
      if (!bullet.active) return

      // 综合判断：出界 / 射程超限 → 销毁
      if (bullet.shouldDestroy(worldW, worldH)) {
        bullet.destroy()
        this.enemyBullets.remove(bullet, true, true)
        return
      }

      const dx = this.player.x - bullet.x
      const dy = this.player.y - bullet.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < this.player.radius + 8) {
        this.player.takeDamage(bullet.damage)
        this.player.showSpeech(PLAYER_HIT_SPEECHES[Math.floor(Math.random() * PLAYER_HIT_SPEECHES.length)])
        bullet.destroy()
        this.enemyBullets.remove(bullet, true, true)
        this.emitState()
      }
    })
  }

  private updatePoopProjectiles(delta: number): void {
    const worldW = this.registry.get('worldWidth') || WORLD_WIDTH
    const worldH = this.registry.get('worldHeight') || WORLD_HEIGHT

    this.poopProjectiles.getChildren().forEach((obj) => {
      const poop = obj as PoopProjectile
      if (!poop.active) return

      if (poop.isOutOfBounds(worldW, worldH)) {
        poop.destroy()
        this.poopProjectiles.remove(poop, true, true)
        return
      }

      // 飞行 → arming → fuse 到期 → 起爆结算
      const shouldExplode = poop.updatePoop(delta)
      if (shouldExplode) {
        this.onPoopImpact(poop)
        poop.destroy()
        this.poopProjectiles.remove(poop, true, true)
      }
    })
  }

  private onPoopImpact(poop: PoopProjectile): void {
    // 落点瞬间伤害
    new ExplosionFx(this, { x: poop.x, y: poop.y, radius: poop.impactRadius, color: 0xf59e0b, durationMs: 220 })

    // "屎炸了！" 飘字提示
    const tip = this.add.text(poop.x, poop.y, '💩 屎炸了！', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fbbf24',
      stroke: '#1a1a2e',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100)

    this.tweens.add({
      targets: tip,
      y: poop.y - 60,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => { if (tip.active) tip.destroy() },
    })

    const dx = this.player.x - poop.x
    const dy = this.player.y - poop.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < poop.impactRadius + this.player.radius) {
      this.player.takeDamage(poop.impactDamage)
      this.player.showSpeech(PLAYER_HIT_SPEECHES[Math.floor(Math.random() * PLAYER_HIT_SPEECHES.length)])
      this.emitState()
    }

    // 残留区（低频 tick）
    // 上限保护：避免残留区过多导致每帧遍历卡顿
    if (this.aoeFields.getLength() >= 30) return

    const field = new AoeField(this, {
      x: poop.x,
      y: poop.y,
      radius: Math.max(50, poop.impactRadius - 10),
      durationMs: poop.fieldDurationMs,
      tickMs: poop.fieldTickMs,
      tickDamage: poop.fieldTickDamage,
      color: 0xf59e0b,
    })
    this.aoeFields.add(field)
  }

  private updateAoeFields(delta: number): void {
    this.aoeFields.getChildren().forEach((obj) => {
      const field = obj as AoeField
      if (!field.active) return

      const done = field.updateField(delta, this.player.x, this.player.y, (amount) => {
        this.player.takeDamage(amount)
        this.emitState()
      })

      if (done) {
        this.aoeFields.remove(field, true, true)
      }
    })
  }

  /** 更新 Boss */
  private updateBoss(delta: number): void {
    if (!this.boss) return

    this.boss.chaseTarget(this.player.x, this.player.y)
    this.boss.updateBoss(delta)

    // 射击
    if (this.boss.canShoot()) {
      this.bossShoot()
    }

    // 检测触碰伤害
    const dx = this.player.x - this.boss.x
    const dy = this.player.y - this.boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < this.player.radius + this.boss.radius) {
      if (this.player.bossTouchCooldown <= 0) {
        this.player.takeDamage(BOSS_TOUCH_DAMAGE)
        this.player.bossTouchCooldown = BOSS_TOUCH_COOLDOWN
        this.player.showSpeech(PLAYER_HIT_SPEECHES[Math.floor(Math.random() * PLAYER_HIT_SPEECHES.length)])

        // 弹开玩家
        const knockX = (dx / dist) * BOSS_KNOCKBACK_DISTANCE
        const knockY = (dy / dist) * BOSS_KNOCKBACK_DISTANCE
        this.player.x += knockX
        this.player.y += knockY

        // 限制在世界边界内
        this.player.x = clamp(this.player.x, this.player.radius, WORLD_WIDTH - this.player.radius)
        this.player.y = clamp(this.player.y, this.player.radius, WORLD_HEIGHT - this.player.radius)

        this.emitState() // 更新 UI 血条
      }
    }
  }

  /** Boss 射击 */
  private bossShoot(): void {
    if (!this.boss) return

    // 上限保护：避免 Boss 弹幕堆积
    if (this.bossBullets.getLength() >= 160) return

    this.boss.startShoot()

    // 计算朝向玩家的方向
    const dx = this.player.x - this.boss.x
    const dy = this.player.y - this.boss.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0) {
      const bullet = new BossBullet(
        this,
        this.boss.x,
        this.boss.y,
        this.boss.bulletRadius,
        dx / dist,
        dy / dist,
        this.boss.bulletSpeed,
        this.boss.bulletDamage
      )
      this.bossBullets.add(bullet)
      bullet.initPhysics()

    }
  }

  /** 更新 Boss 子弹 */
  private updateBossBullets(_delta: number): void {
    const worldW = this.registry.get('worldWidth') || WORLD_WIDTH
    const worldH = this.registry.get('worldHeight') || WORLD_HEIGHT

    this.bossBullets.getChildren().forEach((obj) => {
      const bullet = obj as BossBullet
      if (!bullet.active) return

      // 检测出界
      if (bullet.isOutOfBounds(worldW, worldH)) {
        bullet.destroy()
        this.bossBullets.remove(bullet, true, true)
        return
      }

      // 检测命中玩家
      const dx = this.player.x - bullet.x
      const dy = this.player.y - bullet.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < this.player.radius + 8) {
        this.player.takeDamage(bullet.damage)
        this.player.showSpeech(PLAYER_HIT_SPEECHES[Math.floor(Math.random() * PLAYER_HIT_SPEECHES.length)])
        bullet.destroy()
        this.bossBullets.remove(bullet, true, true)
        this.emitState() // 更新 UI 血条
      }
    })
  }

  /**
   * 将枪械系统的实时数值同步到旧字段（临时兼容 React HUD / 存档结构）。
   * 后续会在类型与 UI 层面做一次性迁移。
   */
  private syncGunStatsToLegacyFields(): void {
    const stats = this.gunSystem.getComputedStats()
    this.weaponDamage = stats.bulletDamage
    this.weaponRange = stats.range
    this.weaponRotationSpeed = stats.fireRate
  }

  /** 玩家子弹命中 Boss（Boss 不是 group，走轻量判定） */
  private checkPlayerShotsHitBoss(): void {
    if (!this.boss) return

    // 普通子弹
    this.playerBullets.getChildren().forEach((obj) => {
      const bullet = obj as PlayerBullet
      if (!bullet.active || !this.boss) return

      const dx = this.boss.x - bullet.x
      const dy = this.boss.y - bullet.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < this.boss.radius + 8) {
        const isDead = this.boss.takeDamage(bullet.damage)
        bullet.destroy()
        this.playerBullets.remove(bullet, true, true)

        if (isDead) {
          this.onBossKilled()
        }
        this.emitState()
      }
    })

    // 爆炸投射物
    this.playerProjectiles.getChildren().forEach((obj) => {
      const proj = obj as PlayerExplosiveProjectile
      if (!proj.active || !this.boss) return

      const dx = this.boss.x - proj.x
      const dy = this.boss.y - proj.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < this.boss.radius + 10) {
        this.explodeAt(proj.x, proj.y, proj.explosionRadius, proj.damage)
        proj.destroy()
        this.playerProjectiles.remove(proj, true, true)
        this.emitState()
      }
    })
  }

  /** 爆炸：对范围内敌人/Boss 造成伤害（无衰减，便于初版平衡） */
  private explodeAt(x: number, y: number, radius: number, damage: number): void {
    new ExplosionFx(this, { x, y, radius })

    // 普通敌人
    const victims: Enemy[] = []
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Enemy
      if (!enemy.active) return

      const dx = enemy.x - x
      const dy = enemy.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < radius + enemy.radius) {
        victims.push(enemy)
      }
    })

    victims.forEach((enemy) => {
      if (!enemy.active) return
      const isDead = enemy.takeDamage(damage)
      if (isDead) {
        this.onEnemyKilled(enemy)
      }
    })

    // Boss（若存在）
    if (this.boss && this.boss.active) {
      const dx = this.boss.x - x
      const dy = this.boss.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < radius + this.boss.radius) {
        const isDead = this.boss.takeDamage(damage)
        if (isDead) {
          this.onBossKilled()
        }
        this.emitState()
      }
    }
  }

  /** 敌人被击杀 */
  private onEnemyKilled(enemy: Enemy): void {
    enemy.destroy()
    this.enemies.remove(enemy)

    this.kills++
    this.totalKills++
    this.score += 10

    this.emitState()
  }

  /** 检查升级 */
  private checkUpgrade(): void {
    if (this.gameState !== 'playing') return

    const upgradesEarned = Math.floor(this.totalKills / KILLS_PER_UPGRADE)
    const newPending = upgradesEarned - (this.playerLevel - 1 + this.pendingUpgrades)

    if (newPending > 0) {
      this.pendingUpgrades += newPending
      this.showUpgradeMenu()
    }
  }

  /** 显示升级菜单 */
  private showUpgradeMenu(): void {
    if (this.pendingUpgrades > 0 && this.gameState === 'playing') {
      this.gameState = 'upgrading'

      // 升级界面期间：暂停刷怪计时器，避免 time.addEvent 继续刷怪导致实体堆积
      this.spawnSystem.pause()

      // 暂停物理引擎，停止所有物体移动
      this.physics.pause()

      emitNeedUpgrade(this.generateUpgradeOptions())
      this.emitState()
    }
  }

  /** 检查 Boss 生成 */
  private checkBossSpawn(): void {
    if (this.bossSpawned) return
    if (this.boss) return
    if (this.kills < ENEMIES_PER_LEVEL) return
    if (this.gameState !== 'playing') return
    if (this.pendingUpgrades > 0) return

    this.spawnBoss()
  }

  /** 击杀目标达成 */
  private onKillTargetReached(): void {
    // 停止刷怪（由 SpawnSystem 自动处理）
  }

  /** 生成 Boss */
  private spawnBoss(): void {
    this.bossSpawned = true
    this.spawnSystem.stopSpawning()

    // 清理剩余敌人/投射物（进入 Boss 战前收干净，避免干扰）
    this.enemies.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.poopProjectiles.clear(true, true)
    this.aoeFields.clear(true, true)

    // 在玩家上方生成 Boss（确保不出生在阻挡地形上）
    const gunMul = this.gunSystem.getMultipliers()
    const bossHp = getBossHpByLevel(this.level, gunMul.damageMul, gunMul.fireRateMul)
    const desiredX = clamp(this.player.x, 100, WORLD_WIDTH - 100)
    const desiredY = clamp(this.player.y - 300, 100, WORLD_HEIGHT - 100)
    const spawnPos = this.findFreePosition(desiredX, desiredY)

    this.boss = new Boss(this, spawnPos.x, spawnPos.y, bossHp)

    // 让枪械系统也能索敌到 Boss
    this.gunSystem.setBoss(this.boss)

    // 地形碰撞：Boss 也会被地形挡住（避免穿墙贴脸）
    this.physics.add.collider(this.boss, this.terrainLayer)

    this.emitState()
  }

  /** Boss 被击杀 */
  private onBossKilled(): void {
    if (this.boss) {
      this.boss.destroy()
      this.boss = null
    }
    // 清除枪械系统的 Boss 引用
    this.gunSystem.setBoss(null)

    this.score += 100

    // 检查是否通关
    if (this.level >= TOTAL_LEVELS) {
      this.onVictory()
      return
    }

    // 进入下一关
    this.level++

    const mul = this.gunSystem.getMultipliers()
    SaveSystem.saveProgress({
      currentLevel: this.level,
      score: this.score,
      playerLevel: this.playerLevel,
      gunKey: this.gunSystem.getGunId(),
      gunDamageMul: mul.damageMul,
      gunFireRateMul: mul.fireRateMul,
      gunRangeMul: mul.rangeMul,
      evolveMisses: this.evolveMisses,
      dualWield: this.dualWield,
      hasTankPet: this.hasTankPet,
      // 旧字段（兼容）
      weaponDamage: this.weaponDamage,
      weaponRange: this.weaponRange,
      weaponRotationSpeed: this.weaponRotationSpeed,
      weaponCount: this.weaponCount,
    })

    this.startLevel()
    this.emitState()
  }

  /** 玩家死亡 */
  private onPlayerDead(): void {
    this.gameState = 'dead'
    SaveSystem.updateHighScore(this.score)
    emitPlayerDead()
    this.emitState()
  }

  /** 通关 */
  private onVictory(): void {
    this.gameState = 'victory'
    SaveSystem.updateHighScore(this.score)
    emitVictory()
    this.emitState()
  }

  /** 绑定事件总线 */
  private bindEvents(): void {
    eventBus.on<MoveVector>(Events.MOVE, (v) => {
      this.moveVector = v
    })

    eventBus.on(Events.PAUSE, () => {
      this.scene.pause()
      this.physics.pause()
      this.spawnSystem.pause()
    })

    eventBus.on(Events.RESUME, () => {
      this.scene.resume()
      // 先恢复物理引擎，再恢复刷怪（resume 内部会处理定时器丢失的情况）
      this.physics.resume()
      this.spawnSystem.resume()
      if (this.gameState === 'upgrading' && this.pendingUpgrades <= 0) {
        this.gameState = 'playing'
      }
      this.emitState()
    })

    eventBus.on<UpgradeOption>(Events.APPLY_UPGRADE, (option) => {
      this.applyUpgrade(option)
    })

    eventBus.on(Events.RESTART, () => {
      this.restartGame()
    })

    eventBus.on(Events.SKIP_LEVEL, () => {
      this.skipLevel()
    })

    eventBus.on(Events.KILL_ALL, () => {
      this.killAllEnemies()
    })
  }

  /** 生成"随机 3 选 1 + 稀有度 + 进化保底"的升级选项 */
  private generateUpgradeOptions(): UpgradeOption[] {
    const nextLevel = this.playerLevel + 1
    const evolveInfo = this.getEvolveInfoForNextLevel(nextLevel)
    const canEvolve = Boolean(evolveInfo)

    const options: UpgradeOption[] = []

    // 进化保底：达到门槛后，连续 N 次没刷到/没选到进化则必出
    const forceEvolve = canEvolve && this.evolveMisses >= EVOLVE_PITY_AFTER_MISSES
    if (forceEvolve && evolveInfo) {
      options.push(this.buildEvolveOption(evolveInfo))
    }

    const kindPool: UpgradeKind[] = ['damageMul', 'fireRateMul', 'rangeMul']
    if (canEvolve && !forceEvolve) {
      // 非保底情况下：让进化以较低权重出现
      kindPool.push('evolve')
    }

    // 双持选项：尚未激活时可以出现，前两次升级概率高
    const canDualWield = !this.dualWield
    if (canDualWield) {
      kindPool.push('dualWield')
    }

    // 坦克宠物选项：尚未获得时可以出现（玩家等级 >= 10）
    const canTankPet = !this.hasTankPet && this.playerLevel >= 10
    if (canTankPet) {
      kindPool.push('tankPet')
    }

    const pickedKinds = new Set<UpgradeKind>(options.map((o) => o.kind))

    const pickKind = (): UpgradeKind => {
      const candidates = kindPool
        .filter((k) => !pickedKinds.has(k))
        .map((k) => {
          if (k === 'evolve') return { item: k, weight: 0.35 }
          if (k === 'dualWield') {
            // 前两次升级给较高概率（upgradeCount = playerLevel - 1）
            const upgradeCount = this.playerLevel - 1
            return { item: k, weight: upgradeCount < 2 ? 1.8 : 0.4 }
          }
          if (k === 'tankPet') return { item: k, weight: 0.5 }
          return { item: k, weight: 1 }
        })

      return this.weightedPick(candidates)
    }

    // 填满 3 个不重复 kind 的选项
    for (let i = 0; i < 24 && options.length < 3; i++) {
      const kind = pickKind()
      pickedKinds.add(kind)

      if (kind === 'evolve') {
        if (evolveInfo) {
          options.push(this.buildEvolveOption(evolveInfo))
        }
        continue
      }

      if (kind === 'dualWield') {
        options.push({
          id: 'dualWield',
          kind: 'dualWield',
          rarity: 'epic',
          title: '双持武器',
          desc: '双手持枪，同时发射两把武器',
        })
        continue
      }

      if (kind === 'tankPet') {
        options.push({
          id: 'tankPet',
          kind: 'tankPet',
          rarity: 'epic',
          title: '坦克宠物',
          desc: '召唤一辆坦克跟随你，自动发射范围爆炸炮弹',
        })
        continue
      }

      const rarity = this.rollRarity()
      options.push(this.buildStatOption(kind, rarity))
    }

    return options.slice(0, 3)
  }

  private getEvolveInfoForNextLevel(nextLevel: number): {
    fromKey: keyof typeof GUN_BASE
    toKey: keyof typeof GUN_BASE
    requiredLevel: number
  } | null {
    const current = this.gunSystem.getGunId()

    if (current === 'pistol') {
      return nextLevel >= EVOLVE_AT_PLAYER_LEVEL.smg
        ? { fromKey: 'pistol', toKey: 'smg', requiredLevel: EVOLVE_AT_PLAYER_LEVEL.smg }
        : null
    }

    if (current === 'smg') {
      return nextLevel >= EVOLVE_AT_PLAYER_LEVEL.grenadeMg
        ? { fromKey: 'smg', toKey: 'grenadeMg', requiredLevel: EVOLVE_AT_PLAYER_LEVEL.grenadeMg }
        : null
    }

    // grenadeMg 是枪械进化终点，cannon 改为坦克宠物
    return null
  }

  private buildEvolveOption(info: { fromKey: keyof typeof GUN_BASE; toKey: keyof typeof GUN_BASE }): UpgradeOption {
    const fromTitle = GUN_BASE[info.fromKey].title
    const toTitle = GUN_BASE[info.toKey].title

    return {
      id: `evolve:${String(info.toKey)}`,
      kind: 'evolve',
      rarity: 'epic',
      title: '进化',
      desc: `${fromTitle} → ${toTitle}`,
      evolveToGunId: info.toKey,
    }
  }

  private buildStatOption(kind: Exclude<UpgradeKind, 'evolve' | 'dualWield' | 'tankPet'>, rarity: UpgradeRarity): UpgradeOption {
    const labelMap: Record<Exclude<UpgradeKind, 'evolve' | 'dualWield' | 'tankPet'>, { title: string; descPrefix: string; key: keyof typeof STAT_UPGRADE_VALUES }> = {
      damageMul: { title: '攻击力提升', descPrefix: '攻击力', key: 'damageMul' },
      fireRateMul: { title: '攻速提升', descPrefix: '攻速', key: 'fireRateMul' },
      rangeMul: { title: '射程提升', descPrefix: '射程', key: 'rangeMul' },
    }

    const meta = labelMap[kind]
    const value = STAT_UPGRADE_VALUES[meta.key][rarity]

    return {
      id: `${kind}:${rarity}`,
      kind,
      rarity,
      title: meta.title,
      desc: `${meta.descPrefix} +${Math.round(value * 100)}%`,
      value,
    }
  }

  private rollRarity(): UpgradeRarity {
    return this.weightedPick([
      { item: 'common', weight: UPGRADE_RARITY_WEIGHTS.common },
      { item: 'rare', weight: UPGRADE_RARITY_WEIGHTS.rare },
      { item: 'epic', weight: UPGRADE_RARITY_WEIGHTS.epic },
    ])
  }

  private weightedPick<T>(list: Array<{ item: T; weight: number }>): T {
    const total = list.reduce((sum, x) => sum + x.weight, 0)
    let r = Phaser.Math.FloatBetween(0, total)
    for (const x of list) {
      r -= x.weight
      if (r <= 0) return x.item
    }
    return list[list.length - 1].item
  }

  /** 应用升级（React 选择某一张卡片后回传） */
  private applyUpgrade(option: UpgradeOption): void {
    const nextLevel = this.playerLevel + 1
    const evolveInfo = this.getEvolveInfoForNextLevel(nextLevel)
    const canEvolve = Boolean(evolveInfo)

    const mul = this.gunSystem.getMultipliers()

    // 进化保底计数：达到门槛后，选了非进化就累计；选进化则清零
    if (canEvolve) {
      if (option.kind === 'evolve') {
        this.evolveMisses = 0
      } else {
        this.evolveMisses++
      }
    }

    switch (option.kind) {
      case 'damageMul': {
        const v = option.value ?? 0
        this.gunSystem.setMultipliers({ damageMul: mul.damageMul * (1 + v) })
        break
      }
      case 'fireRateMul': {
        const v = option.value ?? 0
        this.gunSystem.setMultipliers({ fireRateMul: mul.fireRateMul * (1 + v) })
        break
      }
      case 'rangeMul': {
        const v = option.value ?? 0
        this.gunSystem.setMultipliers({ rangeMul: mul.rangeMul * (1 + v) })
        break
      }
      case 'evolve': {
        if (option.evolveToGunId) {
          this.gunSystem.setGunId(option.evolveToGunId)
        }
        this.evolveMisses = 0
        break
      }
      case 'dualWield': {
        this.dualWield = true
        this.gunSystem.setDualWield(true)
        this.player.enableDualWield()
        break
      }
      case 'tankPet': {
        this.hasTankPet = true
        this.tankPet = new TankPet(this, this.player.x - 60, this.player.y + 30, this.playerProjectiles)
        break
      }
    }

    this.playerLevel++
    this.pendingUpgrades--

    this.syncGunStatsToLegacyFields()

    if (this.pendingUpgrades > 0) {
      // 还有待处理的升级：继续停在升级界面，并下发下一轮 3 选 1
      emitNeedUpgrade(this.generateUpgradeOptions())
      this.emitState()
    } else {
      // 所有升级完成，恢复物理引擎
      this.physics.resume()

      // 恢复刷怪（resume 内部会自动处理定时器丢失的情况）
      this.spawnSystem.resume()

      this.gameState = 'playing'
      this.emitState()
      this.checkBossSpawn()
    }
  }

  /** 重开游戏 */
  private restartGame(): void {
    // 重置所有状态
    this.level = 1
    this.score = 0
    this.kills = 0
    this.totalKills = 0
    this.playerLevel = 1
    this.pendingUpgrades = 0
    this.evolveMisses = 0
    this.weaponDamage = INITIAL_WEAPON_DAMAGE
    this.weaponRange = INITIAL_WEAPON_RANGE
    this.weaponRotationSpeed = INITIAL_WEAPON_ROTATION_SPEED
    this.weaponCount = INITIAL_WEAPON_COUNT
    this.bossSpawned = false
    this.dualWield = false
    this.hasTankPet = false

    // 销毁坦克宠物
    if (this.tankPet) {
      this.tankPet.destroy()
      this.tankPet = null
    }

    // 重置玩家
    this.player.hp = PLAYER_MAX_HP
    const startPos = this.findFreePosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2)
    this.player.x = startPos.x
    this.player.y = startPos.y
    this.player.setHit(false)

    // 重置枪械
    this.gunSystem.reset()
    this.playerBullets.clear(true, true)
    this.playerProjectiles.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.poopProjectiles.clear(true, true)
    this.aoeFields.clear(true, true)
    this.syncGunStatsToLegacyFields()
    this.weaponCount = 1

    // 清理 Boss
    if (this.boss) {
      this.boss.destroy()
      this.boss = null
    }

    // 重置存档
    SaveSystem.reset()

    // 开始游戏
    this.gameState = 'playing'
    this.startLevel()
    this.emitState()
  }

  /** 跳关（调试用） */
  private skipLevel(): void {
    if (this.level >= TOTAL_LEVELS) {
      this.onVictory()
      return
    }

    this.level++
    this.kills = 0
    this.bossSpawned = false

    if (this.boss) {
      this.boss.destroy()
      this.boss = null
    }

    this.startLevel()
    this.emitState()
  }

  /** 击杀全部敌人（调试用） */
  private killAllEnemies(): void {
    const count = this.enemies.getLength()
    this.enemies.clear(true, true)

    // 顺手清理屏幕上的敌方投射物/残留区，避免"清屏后被阴"
    this.enemyBullets.clear(true, true)
    this.poopProjectiles.clear(true, true)
    this.aoeFields.clear(true, true)

    this.kills += count
    this.totalKills += count
    this.score += count * 10
    this.emitState()
  }

  /** 推送状态到 React */
  private emitState(): void {
    const gunStats = this.gunSystem.getComputedStats()
    const gunMul = this.gunSystem.getMultipliers()

    const snapshot: GameSnapshot = {
      hp: this.player?.hp ?? PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      score: this.score,
      kills: this.totalKills,
      level: this.level,
      killsNeeded: ENEMIES_PER_LEVEL,
      bossHp: this.boss?.hp ?? 0,
      bossMaxHp: this.boss?.maxHp ?? 0,
      gameState: this.gameState,

      playerLevel: this.playerLevel,

      gunKey: this.gunSystem.getGunId(),
      gunTitle: gunStats.gunTitle,
      gunDamageMul: gunMul.damageMul,
      gunFireRateMul: gunMul.fireRateMul,
      gunRangeMul: gunMul.rangeMul,
      evolveMisses: this.evolveMisses,
      dualWield: this.dualWield,
      hasTankPet: this.hasTankPet,

      weaponDamage: this.weaponDamage,
      weaponRange: this.weaponRange,
      weaponRotationSpeed: this.weaponRotationSpeed,
      weaponCount: this.weaponCount,
    }
    emitStateUpdate(snapshot)
  }
}
