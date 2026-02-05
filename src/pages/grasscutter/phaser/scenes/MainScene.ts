/**
 * MainScene - 核心玩法场景
 */

import Phaser from 'phaser'
import { eventBus, Events, emitStateUpdate, emitNeedUpgrade, emitPlayerDead, emitVictory } from '../events'
import type { MoveVector, GameSnapshot, UpgradeType } from '../types'
import { WORLD_WIDTH, WORLD_HEIGHT, getLevelConfig, getBossHpByLevel, clamp, ENEMIES_PER_LEVEL } from '../../balance'
import { Player } from '../objects/Player'
import { Enemy } from '../objects/Enemy'
import { Boss } from '../objects/Boss'
import { BossBullet } from '../objects/BossBullet'
import { SpawnSystem } from '../systems/SpawnSystem'
import { WeaponSystem } from '../systems/WeaponSystem'
import { SaveSystem } from '../systems/SaveSystem'

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
const PLAYER_MAX_HP = 100
const KILLS_PER_UPGRADE = 5
const MAX_WEAPONS = 6
const BOSS_TOUCH_DAMAGE = 25
const BOSS_TOUCH_COOLDOWN = 650
const BOSS_KNOCKBACK_DISTANCE = 40
const TOTAL_LEVELS = 10

export class MainScene extends Phaser.Scene {
  // 玩家
  private player!: Player

  // 敌人组
  private enemies!: Phaser.GameObjects.Group

  // Boss
  private boss: Boss | null = null

  // Boss 子弹组
  private bossBullets!: Phaser.GameObjects.Group

  // 系统
  private spawnSystem!: SpawnSystem
  private weaponSystem!: WeaponSystem

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
  private bossSpawned = false

  // 武器属性
  private weaponDamage = 10
  private weaponRange = 80
  private weaponRotationSpeed = 3
  private weaponCount = 1

  // 伤害冷却帧计数（避免每帧重复伤害）
  private weaponHitCooldown: Map<number, number> = new Map()

  constructor() {
    super({ key: 'MainScene' })
  }

  create(): void {
    const worldW = this.registry.get('worldWidth') || WORLD_WIDTH
    const worldH = this.registry.get('worldHeight') || WORLD_HEIGHT

    // 设置世界边界
    this.physics.world.setBounds(0, 0, worldW, worldH)

    // 绘制背景
    this.drawBackground(worldW, worldH)

    // 创建组（使用物理组以支持碰撞）
    this.enemies = this.physics.add.group()
    this.bossBullets = this.add.group()

    // 设置敌人之间的碰撞（防止重叠）
    this.physics.add.collider(this.enemies, this.enemies)

    // 加载存档
    const save = SaveSystem.load()
    this.level = save.currentLevel
    this.weaponDamage = save.weaponDamage
    this.weaponRange = save.weaponRange
    this.weaponRotationSpeed = save.weaponRotationSpeed
    this.weaponCount = save.weaponCount
    this.playerLevel = save.playerLevel

    // 创建玩家
    this.player = new Player(this, {
      x: worldW / 2,
      y: worldH / 2,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
    })

    // 创建武器系统
    this.weaponSystem = new WeaponSystem(this, {
      damage: this.weaponDamage,
      range: this.weaponRange,
      rotationSpeed: this.weaponRotationSpeed,
    })
    this.weaponSystem.initWeapons(this.weaponCount)

    // 创建刷怪系统
    this.spawnSystem = new SpawnSystem(this, this.enemies)

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

    // 更新武器系统
    this.weaponSystem.setPlayerPosition(this.player.x, this.player.y)
    this.weaponSystem.update(delta)

    // 更新敌人
    this.updateEnemies(delta)

    // 更新 Boss
    this.updateBoss(delta)

    // 更新 Boss 子弹
    this.updateBossBullets(delta)

    // 武器命中检测
    this.checkWeaponHits(delta)

    // 检查升级
    this.checkUpgrade()

    // 检查 Boss 生成
    this.checkBossSpawn()

    // 检查死亡
    if (this.player.hp <= 0) {
      this.onPlayerDead()
    }
  }

  /** 绘制世界背景 */
  private drawBackground(w: number, h: number): void {
    const graphics = this.add.graphics()
    graphics.fillGradientStyle(0x2d5a27, 0x2d5a27, 0x1a472a, 0x1a472a, 1)
    graphics.fillRect(0, 0, w, h)

    // 网格线
    graphics.lineStyle(1, 0x3d6a37, 0.3)
    const gridSize = 100
    for (let x = 0; x <= w; x += gridSize) {
      graphics.moveTo(x, 0)
      graphics.lineTo(x, h)
    }
    for (let y = 0; y <= h; y += gridSize) {
      graphics.moveTo(0, y)
      graphics.lineTo(w, y)
    }
    graphics.strokePath()
  }

  /** 开始当前关 */
  private startLevel(): void {
    this.kills = 0
    this.bossSpawned = false
    this.boss = null

    // 清理敌人和子弹
    this.enemies.clear(true, true)
    this.bossBullets.clear(true, true)

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

  /** 更新敌人 */
  private updateEnemies(delta: number): void {
    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Enemy
      if (!enemy.active) return

      enemy.chaseTarget(this.player.x, this.player.y)
      enemy.updateEnemy(delta)

      // 检测与玩家碰撞（接触伤害）
      const dx = this.player.x - enemy.x
      const dy = this.player.y - enemy.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < this.player.radius + enemy.radius) {
        // 敌人碰到玩家时死亡，同时玩家受伤
        this.player.takeDamage(5)
        this.player.showSpeech(PLAYER_HIT_SPEECHES[Math.floor(Math.random() * PLAYER_HIT_SPEECHES.length)])
        enemy.destroy()
        this.enemies.remove(enemy)
        this.emitState() // 更新 UI 血条
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
        this.bossBullets.remove(bullet)
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
        this.bossBullets.remove(bullet)
        this.emitState() // 更新 UI 血条
      }
    })
  }

  /** 武器命中检测 */
  private checkWeaponHits(delta: number): void {
    // 更新冷却
    this.weaponHitCooldown.forEach((cd, id) => {
      if (cd > 0) {
        this.weaponHitCooldown.set(id, cd - delta)
      }
    })

    // 检测敌人
    const hitEnemies = this.weaponSystem.checkHitEnemies(this.enemies)
    hitEnemies.forEach((enemy) => {
      // 检查冷却
      const enemyId = enemy.getData('id') as number || Math.random()
      enemy.setData('id', enemyId)

      const cd = this.weaponHitCooldown.get(enemyId) || 0
      if (cd > 0) return

      this.weaponHitCooldown.set(enemyId, 100) // 100ms 冷却

      const isDead = enemy.takeDamage(this.weaponDamage)
      if (isDead) {
        this.onEnemyKilled(enemy)
      }
    })

    // 检测 Boss
    if (this.boss && this.weaponSystem.checkHitBoss(this.boss)) {
      const bossId = this.boss.getData('id') as number || Math.random()
      this.boss.setData('id', bossId)

      const cd = this.weaponHitCooldown.get(bossId) || 0
      if (cd <= 0) {
        this.weaponHitCooldown.set(bossId, 100)

        const isDead = this.boss.takeDamage(this.weaponDamage)
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
      // 暂停物理引擎，停止所有物体移动
      this.physics.pause()
      emitNeedUpgrade()
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

    // 清理剩余敌人
    this.enemies.clear(true, true)

    // 在玩家上方生成 Boss
    const bossHp = getBossHpByLevel(this.level)
    const spawnX = clamp(this.player.x, 100, WORLD_WIDTH - 100)
    const spawnY = clamp(this.player.y - 300, 100, WORLD_HEIGHT - 100)

    this.boss = new Boss(this, spawnX, spawnY, bossHp)

    this.emitState()
  }

  /** Boss 被击杀 */
  private onBossKilled(): void {
    if (this.boss) {
      this.boss.destroy()
      this.boss = null
    }

    this.score += 100

    // 检查是否通关
    if (this.level >= TOTAL_LEVELS) {
      this.onVictory()
      return
    }

    // 进入下一关
    this.level++
    SaveSystem.saveProgress(
      this.level,
      this.score,
      this.weaponDamage,
      this.weaponRange,
      this.weaponRotationSpeed,
      this.weaponCount,
      this.playerLevel
    )

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
    })

    eventBus.on(Events.RESUME, () => {
      this.scene.resume()
      // 恢复物理引擎
      this.physics.resume()
      if (this.gameState === 'upgrading' && this.pendingUpgrades <= 0) {
        this.gameState = 'playing'
      }
      this.emitState()
    })

    eventBus.on<UpgradeType>(Events.APPLY_UPGRADE, (type) => {
      this.applyUpgrade(type)
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

  /** 应用升级 */
  private applyUpgrade(type: UpgradeType): void {
    switch (type) {
      case 'damage':
        this.weaponDamage += 3
        break
      case 'range':
        this.weaponRange += 10
        break
      case 'speed':
        this.weaponRotationSpeed += 0.5
        break
      case 'weapon':
        if (this.weaponCount < MAX_WEAPONS) {
          this.weaponCount++
          this.weaponSystem.initWeapons(this.weaponCount)
        }
        break
    }

    this.playerLevel++
    this.pendingUpgrades--

    this.weaponSystem.updateConfig({
      damage: this.weaponDamage,
      range: this.weaponRange,
      rotationSpeed: this.weaponRotationSpeed,
    })

    if (this.pendingUpgrades > 0) {
      // 还有待处理的升级
      this.emitState()
    } else {
      // 所有升级完成，恢复物理引擎
      this.physics.resume()
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
    this.weaponDamage = 10
    this.weaponRange = 80
    this.weaponRotationSpeed = 3
    this.weaponCount = 1
    this.bossSpawned = false

    // 重置玩家
    this.player.hp = PLAYER_MAX_HP
    this.player.x = WORLD_WIDTH / 2
    this.player.y = WORLD_HEIGHT / 2
    this.player.setHit(false)

    // 重置武器
    this.weaponSystem.updateConfig({
      damage: this.weaponDamage,
      range: this.weaponRange,
      rotationSpeed: this.weaponRotationSpeed,
    })
    this.weaponSystem.initWeapons(this.weaponCount)

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
    this.kills += count
    this.totalKills += count
    this.score += count * 10
    this.emitState()
  }

  /** 推送状态到 React */
  private emitState(): void {
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
      weaponDamage: this.weaponDamage,
      weaponRange: this.weaponRange,
      weaponRotationSpeed: this.weaponRotationSpeed,
      weaponCount: this.weaponCount,
    }
    emitStateUpdate(snapshot)
  }
}
