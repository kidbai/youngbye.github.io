import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './GrassCutter.module.css'
import minionImg1 from '../assets/minion.png'
import minionImg2 from '../assets/minion2.png'
import monsterImg from '../assets/monster.png'
import yuanxiaoImg from '../assets/yuanxiao.png'
import yuanxiaoShotedImg from '../assets/yuanxiao-shoted.png'
import bossImg from '../assets/boss.png'
import bossShotImg from '../assets/boss-shot.png'
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ENEMIES_PER_LEVEL,
  clamp,
  getBossHpByLevel,
  getLevelConfig,
} from './grasscutter/balance'

// ==================== 类型定义 ====================

interface Player {
  x: number
  y: number
  radius: number
  hp: number
  maxHp: number
  speed: number
  bossTouchCooldown: number // 触碰 Boss 的掉血冷却，避免每帧叠加秒死
  isHit: boolean // 受击状态
  hitTimer: number // 受击动画计时器
  speech: string // 被击中时的重庆话骚话
  speechTimer: number // 骚话显示计时器
}

interface Weapon {
  angle: number
  range: number
  damage: number
  rotationSpeed: number
  width: number
}

interface WeaponState {
  weapons: Weapon[]
  baseDamage: number
  baseRange: number
  baseRotationSpeed: number
}

interface Enemy {
  id: number
  x: number
  y: number
  radius: number
  hp: number
  maxHp: number
  speed: number
  hitFlash: number
  imageIndex: number // 随机选择的图片索引
  speech: string // 随机话术
  speechTimer: number // 话术显示计时器
}

// Boss 类型
interface Boss {
  x: number
  y: number
  radius: number
  hp: number
  maxHp: number
  speed: number
  hitFlash: number
  speech: string
  speechTimer: number
  shootTimer: number // 射击冷却计时器
  speechCooldown: number // 骚话冷却计时器
  isShooting: boolean // 射击中（用于切图）
  shootingTimer: number // 射击动画计时器
}

// Boss 子弹类型
interface BossBullet {
  id: number
  x: number
  y: number
  radius: number
  dirX: number // 方向向量 X
  dirY: number // 方向向量 Y
  speed: number
  damage: number
}

interface LevelConfig {
  level: number
  enemyHp: number
  enemySpeed: number
  spawnInterval: number
  killTarget: number
}

interface GameSave {
  currentLevel: number
  highScore: number
  weaponDamage: number
  weaponRange: number
  weaponRotationSpeed: number
  weaponCount: number
  playerLevel: number
}

interface JoystickState {
  active: boolean
  startX: number
  startY: number
  currentX: number
  currentY: number
  dirX: number
  dirY: number
  offsetX: number
  offsetY: number
}

type UpgradeOption = 'damage' | 'range' | 'speed' | 'weapon'
type GameState = 'playing' | 'paused' | 'upgrading' | 'levelComplete' | 'dead' | 'victory' | 'settings' | 'confirmExit' | 'confirmRestart'

// ==================== 常量配置 ====================

const STORAGE_KEY = 'grasscutter_save'

// 小蛋卷的随机话术
const ENEMY_SPEECHES = [
  '我特喵来了！',
  '小贼喵往哪里跑！',
  '汝竟然是厚颜无耻之喵',
]
const SPEECH_DURATION = 2000 // 话术显示时长（毫秒）

// 元宵被击中时的重庆话骚话
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
  '瓜皮，敢打老子脑壳！',
  '莫挨老子，老子要爆炸！',
]
const PLAYER_SPEECH_DURATION = 1500 // 元宵话术显示时长（毫秒）

// 蛋卷大魔王的骚话（10种）
const BOSS_SPEECHES = [
  '本喵王驾到，还不速速跪下！',
  '小小元宵，竟敢挑战本王！',
  '看我的无敌喵喵拳！',
  '哼，你的攻击给本王挠痒痒呢~',
  '本王今天心情不好，拿你出气！',
  '颤抖吧！蛋卷大魔王参上！',
  '你已经被本王盯上了，逃不掉的！',
  '就这？就这？就这？',
  '本王的子弹可是会转弯的...骗你的！',
  '元宵？听起来很好吃的样子！',
]
const BOSS_SPEECH_INTERVAL = 4000 // Boss 骚话间隔（毫秒）

// Boss 配置
const BOSS_CONFIG = {
  radius: 50, // 100px 直径
  baseHp: 2000, // 仅用于参考；实际血量按关卡动态计算
  speed: 1.2,
  shootInterval: 1500, // 射击间隔（毫秒）
  bulletSpeed: 4,
  bulletDamage: 15,
  bulletRadius: 8,
}

// 触碰 Boss：伤害必须大于子弹伤害（bulletDamage=15），但要有冷却避免一贴就瞬间掉完血
const BOSS_TOUCH_DAMAGE = 25
const BOSS_TOUCH_COOLDOWN = 650 // ms
const BOSS_KNOCKBACK_DISTANCE = 40 // 弹开后额外拉开距离（像素）

const INITIAL_WEAPON = {
  angle: 0,
  range: 80,
  damage: 10,
  rotationSpeed: 3,
  width: 8,
}

const MAX_WEAPONS = 6 // 最多6把武器

const INITIAL_PLAYER = {
  radius: 30, // 60px 直径（元宵）
  hp: 100,
  maxHp: 100,
  speed: 5, // 提高玩家速度以保持平衡
  bossTouchCooldown: 0,
  isHit: false,
  hitTimer: 0,
  speech: '',
  speechTimer: 0,
}

const UPGRADE_DAMAGE_INCREASE = 3
const UPGRADE_RANGE_INCREASE = 10
const UPGRADE_SPEED_INCREASE = 0.5
const KILLS_PER_UPGRADE = 5

// ==================== 工具函数 ====================

function loadGameSave(): GameSave | null {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    return JSON.parse(saved)
  }
  return null
}

function saveGame(save: GameSave): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
}

function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// 创建均匀分布的武器数组
function createWeapons(count: number, damage: number, range: number, rotationSpeed: number): Weapon[] {
  const weapons: Weapon[] = []
  const angleStep = 360 / count
  for (let i = 0; i < count; i++) {
    weapons.push({
      angle: i * angleStep,
      range,
      damage,
      rotationSpeed,
      width: INITIAL_WEAPON.width,
    })
  }
  return weapons
}

// 绘制猫爪（用于武器/子弹样式）
function drawPawWeapon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleDeg: number,
  size: number,
  mainColor: string,
  padColor: string,
  strokeColor: string
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((angleDeg * Math.PI) / 180)

  // 轮廓
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // 主掌垫
  ctx.beginPath()
  ctx.ellipse(0, size * 0.12, size * 0.38, size * 0.32, 0, 0, Math.PI * 2)
  ctx.fillStyle = mainColor
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = Math.max(2, size * 0.08)
  ctx.stroke()

  // 掌垫细节
  ctx.beginPath()
  ctx.ellipse(0, size * 0.12, size * 0.28, size * 0.22, 0, 0, Math.PI * 2)
  ctx.fillStyle = padColor
  ctx.fill()

  // 四个趾垫
  const toeY = -size * 0.24
  const toeX = [-size * 0.32, -size * 0.12, size * 0.12, size * 0.32]
  const toeR = [0.16, 0.18, 0.18, 0.16].map(v => v * size)

  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.ellipse(toeX[i], toeY, toeR[i] * 0.9, toeR[i], 0, 0, Math.PI * 2)
    ctx.fillStyle = mainColor
    ctx.fill()
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = Math.max(2, size * 0.07)
    ctx.stroke()

    ctx.beginPath()
    ctx.ellipse(toeX[i], toeY, toeR[i] * 0.62, toeR[i] * 0.7, 0, 0, Math.PI * 2)
    ctx.fillStyle = padColor
    ctx.fill()
  }

  ctx.restore()
}

// ==================== 主组件 ====================

function GrassCutter() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 游戏运行时数据 (使用 ref 避免重渲染)
  const playerRef = useRef<Player>({
    x: 0,
    y: 0,
    ...INITIAL_PLAYER,
  })
  const weaponStateRef = useRef<WeaponState>({
    weapons: [{ ...INITIAL_WEAPON }],
    baseDamage: INITIAL_WEAPON.damage,
    baseRange: INITIAL_WEAPON.range,
    baseRotationSpeed: INITIAL_WEAPON.rotationSpeed,
  })
  const enemiesRef = useRef<Enemy[]>([])
  const joystickRef = useRef<JoystickState>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    dirX: 0,
    dirY: 0,
    offsetX: 0,
    offsetY: 0,
  })
  const gameLoopRef = useRef<number>(0)
  const spawnTimerRef = useRef<number>(0)
  const keysRef = useRef<Set<string>>(new Set()) // WASD 键盘状态
  const enemyIdCounter = useRef(0)
  const bulletIdCounter = useRef(0)
  const lastTimeRef = useRef(0)
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const cameraRef = useRef({ x: 0, y: 0 })
  const spawnedEnemiesRef = useRef(0) // 本关已生成的小怪数量（最多 100）
  const bossShouldSpawnRef = useRef(false) // 达到击杀目标后，等待升级弹窗结束再刷出 Boss
  const bossMaxHpRef = useRef(0)
  const nextLevelCallbackRef = useRef<() => void>(() => {})
  // 用 ref 持有最新的 gameLoop，避免 rAF 递归调度导致闭包拿到旧 state（切关后 Boss/逻辑不生效）
  const gameLoopCallbackRef = useRef<(timestamp: number) => void>(() => {})
  const minionImagesRef = useRef<HTMLImageElement[]>([])
  const playerImageRef = useRef<HTMLImageElement | null>(null)
  const playerShotedImageRef = useRef<HTMLImageElement | null>(null)
  const bossImageRef = useRef<HTMLImageElement | null>(null)
  const bossShotImageRef = useRef<HTMLImageElement | null>(null)
  
  // Boss 相关
  const bossRef = useRef<Boss | null>(null)
  const bossBulletsRef = useRef<BossBullet[]>([])
  
  // UI 状态 (使用 state 触发重渲染)
  const [gameState, setGameState] = useState<GameState>('playing')
  const [currentLevel, setCurrentLevel] = useState(1) // 恢复默认第1关
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [killCount, setKillCount] = useState(0)
  const [totalKills, setTotalKills] = useState(0)
  const [playerLevel, setPlayerLevel] = useState(1)
  const [playerHp, setPlayerHp] = useState(INITIAL_PLAYER.hp)
  const [pendingUpgrades, setPendingUpgrades] = useState(0)
  const [joystickOffset, setJoystickOffset] = useState({ x: 0, y: 0 })
  const [showDevMenu, setShowDevMenu] = useState(false) // 开发者菜单
  const [bossHp, setBossHp] = useState(0) // Boss 当前血量显示
  const [bossMaxHp, setBossMaxHp] = useState(0) // Boss 最大血量显示

  // 初始化游戏
  const initGame = useCallback((levelNum: number, loadSave: boolean = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // 关键：按设备像素比设置 canvas 实际分辨率，避免移动端插值导致图片/圆形头像边缘发糊
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1))
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    canvas.style.width = `${Math.round(rect.width)}px`
    canvas.style.height = `${Math.round(rect.height)}px`
    canvasSizeRef.current = { width: rect.width, height: rect.height, dpr }

    // 预先设置坐标系（后续 renderGame 里也会再次保证 transform 正确）
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    }

    console.log('[Init] Canvas initialized:', { width: rect.width, height: rect.height, dpr })

    // 初始化玩家位置到“世界地图”中央（屏幕将作为摄像机视口跟随）
    const startX = WORLD_WIDTH / 2
    const startY = WORLD_HEIGHT / 2
    playerRef.current = {
      ...INITIAL_PLAYER,
      x: startX,
      y: startY,
    }
    cameraRef.current = {
      x: clamp(startX - rect.width / 2, 0, Math.max(0, WORLD_WIDTH - rect.width)),
      y: clamp(startY - rect.height / 2, 0, Math.max(0, WORLD_HEIGHT - rect.height)),
    }

    // 加载存档或重置武器
    if (loadSave) {
      const save = loadGameSave()
      if (save) {
        setCurrentLevel(save.currentLevel)
        setHighScore(save.highScore)
        setPlayerLevel(save.playerLevel)
        const damage = save.weaponDamage
        const range = save.weaponRange
        const rotationSpeed = save.weaponRotationSpeed || INITIAL_WEAPON.rotationSpeed
        const weaponCount = save.weaponCount || 1
        weaponStateRef.current = {
          weapons: createWeapons(weaponCount, damage, range, rotationSpeed),
          baseDamage: damage,
          baseRange: range,
          baseRotationSpeed: rotationSpeed,
        }
        levelNum = save.currentLevel
      }
    }

    // 重置敌人
    enemiesRef.current = []
    enemyIdCounter.current = 0

    // 重置本关刷怪/ Boss 状态
    spawnedEnemiesRef.current = 0
    bossShouldSpawnRef.current = false
    bossRef.current = null
    bossBulletsRef.current = []
    bossMaxHpRef.current = 0
    setBossHp(0)
    setBossMaxHp(0)

    // 重置击杀计数
    setKillCount(0)
    setTotalKills(0)
    setScore(0)
    setPlayerHp(INITIAL_PLAYER.hp)
    playerRef.current.hp = INITIAL_PLAYER.hp
    playerRef.current.bossTouchCooldown = 0
    playerRef.current.isHit = false
    playerRef.current.hitTimer = 0
    playerRef.current.speech = ''
    playerRef.current.speechTimer = 0
    setGameState('playing')
    setPendingUpgrades(0)
    
    console.log('[Init] Game initialized, levelNum:', levelNum)
  }, [])

  // 生成敌人（每关最多 100 只；Boss 出现后不再刷怪）
  const spawnEnemy = useCallback(() => {
    if (bossRef.current) return
    if (spawnedEnemiesRef.current >= ENEMIES_PER_LEVEL) return

    const { width: viewW, height: viewH } = canvasSizeRef.current
    if (viewW === 0 || viewH === 0) return

    const config = getLevelConfig(currentLevel)

    // 以当前玩家位置计算摄像机（用于把“屏幕边缘刷怪”转换为世界坐标）
    const player = playerRef.current
    const cam = {
      x: clamp(player.x - viewW / 2, 0, Math.max(0, WORLD_WIDTH - viewW)),
      y: clamp(player.y - viewH / 2, 0, Math.max(0, WORLD_HEIGHT - viewH)),
    }
    cameraRef.current = cam

    const side = Math.floor(Math.random() * 4) // 0:上 1:右 2:下 3:左
    let sx: number, sy: number

    const margin = 30
    switch (side) {
      case 0: // 上
        sx = Math.random() * viewW
        sy = -margin
        break
      case 1: // 右
        sx = viewW + margin
        sy = Math.random() * viewH
        break
      case 2: // 下
        sx = Math.random() * viewW
        sy = viewH + margin
        break
      default: // 左
        sx = -margin
        sy = Math.random() * viewH
    }

    const radius = 30 // 60px 直径（小蛋卷）
    const x = clamp(cam.x + sx, radius, WORLD_WIDTH - radius)
    const y = clamp(cam.y + sy, radius, WORLD_HEIGHT - radius)

    const enemy: Enemy = {
      id: enemyIdCounter.current++,
      x,
      y,
      radius,
      hp: config.enemyHp,
      maxHp: config.enemyHp,
      speed: config.enemySpeed,
      hitFlash: 0,
      imageIndex: Math.floor(Math.random() * 3), // 随机选择 0/1/2（含 monster）
      speech: ENEMY_SPEECHES[Math.floor(Math.random() * ENEMY_SPEECHES.length)],
      speechTimer: SPEECH_DURATION, // 初始显示话术
    }

    enemiesRef.current.push(enemy)
    spawnedEnemiesRef.current += 1

    // 达到本关上限后立即停掉刷怪定时器
    if (spawnedEnemiesRef.current >= ENEMIES_PER_LEVEL && spawnTimerRef.current) {
      clearInterval(spawnTimerRef.current)
      spawnTimerRef.current = 0
    }
  }, [currentLevel])

  // 生成 Boss（每关：击杀 100 小怪后刷出）
  const spawnBossForLevel = useCallback((level: number) => {
    const { width: viewW, height: viewH } = canvasSizeRef.current
    if (viewW === 0 || viewH === 0) return

    const hp = getBossHpByLevel(level)
    bossMaxHpRef.current = hp
    setBossMaxHp(hp)

    const player = playerRef.current

    // Boss 默认从“玩家上方”刷出，但要保证在世界边界内
    const spawnX = clamp(player.x, BOSS_CONFIG.radius, WORLD_WIDTH - BOSS_CONFIG.radius)
    const spawnY = clamp(
      player.y - Math.min(450, viewH * 0.8),
      BOSS_CONFIG.radius,
      WORLD_HEIGHT - BOSS_CONFIG.radius
    )

    const boss: Boss = {
      x: spawnX,
      y: spawnY,
      radius: BOSS_CONFIG.radius,
      hp,
      maxHp: hp,
      speed: BOSS_CONFIG.speed,
      hitFlash: 0,
      speech: BOSS_SPEECHES[Math.floor(Math.random() * BOSS_SPEECHES.length)],
      speechTimer: SPEECH_DURATION,
      shootTimer: BOSS_CONFIG.shootInterval,
      speechCooldown: BOSS_SPEECH_INTERVAL,
      isShooting: false,
      shootingTimer: 0,
    }

    bossRef.current = boss
    bossBulletsRef.current = []
    setBossHp(hp)
  }, [])

  // 检测单把武器与敌人的碰撞
  const checkSingleWeaponCollision = useCallback((enemy: Enemy, weapon: Weapon): boolean => {
    const player = playerRef.current
    
    // 武器端点位置
    const angleRad = (weapon.angle * Math.PI) / 180
    const weaponEndX = player.x + Math.cos(angleRad) * weapon.range
    const weaponEndY = player.y + Math.sin(angleRad) * weapon.range

    // 计算敌人到武器线段的距离
    const dx = weaponEndX - player.x
    const dy = weaponEndY - player.y
    const len = Math.sqrt(dx * dx + dy * dy)
    
    if (len === 0) return false

    // 点到线段的最近点
    const t = Math.max(0, Math.min(1, 
      ((enemy.x - player.x) * dx + (enemy.y - player.y) * dy) / (len * len)
    ))
    
    const closestX = player.x + t * dx
    const closestY = player.y + t * dy
    
    const distance = getDistance(enemy.x, enemy.y, closestX, closestY)
    
    return distance < enemy.radius + weapon.width / 2
  }, [])

  // 检测所有武器与敌人的碰撞，返回总伤害
  const checkWeaponCollision = useCallback((enemy: Enemy): number => {
    const weapons = weaponStateRef.current.weapons
    let totalDamage = 0
    
    for (const weapon of weapons) {
      if (checkSingleWeaponCollision(enemy, weapon)) {
        totalDamage += weapon.damage
      }
    }
    
    return totalDamage
  }, [checkSingleWeaponCollision])

  // 检测玩家与敌人的碰撞
  const checkPlayerCollision = useCallback((enemy: Enemy): boolean => {
    const player = playerRef.current
    const distance = getDistance(player.x, player.y, enemy.x, enemy.y)
    return distance < player.radius + enemy.radius
  }, [])

  // 更新游戏逻辑
  const updateGame = useCallback((deltaTime: number) => {
    if (gameState !== 'playing') return

    const player = playerRef.current
    const weaponState = weaponStateRef.current
    const joystick = joystickRef.current
    const { width, height } = canvasSizeRef.current

    // 更新玩家位置
    if (joystick.active && (joystick.dirX !== 0 || joystick.dirY !== 0)) {
      const moveX = joystick.dirX * player.speed
      const moveY = joystick.dirY * player.speed
      
      player.x = clamp(player.x + moveX, player.radius, WORLD_WIDTH - player.radius)
      player.y = clamp(player.y + moveY, player.radius, WORLD_HEIGHT - player.radius)
    }

    // 更新所有武器角度
    for (const weapon of weaponState.weapons) {
      weapon.angle = (weapon.angle + weapon.rotationSpeed) % 360
    }

    // 更新敌人位置和检测碰撞
    const enemies = enemiesRef.current
    const killedEnemyIds: number[] = []
    const removedEnemyIds: number[] = []
    let damageToPlayer = 0

    for (const enemy of enemies) {
      // 敌人向玩家移动
      const dx = player.x - enemy.x
      const dy = player.y - enemy.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed
        enemy.y += (dy / dist) * enemy.speed
      }

      // 减少受击闪烁计时
      if (enemy.hitFlash > 0) {
        enemy.hitFlash -= deltaTime
      }

      // 减少话术显示计时
      if (enemy.speechTimer > 0) {
        enemy.speechTimer -= deltaTime
      }

      // 检测武器碰撞（返回总伤害）
      const weaponDamage = checkWeaponCollision(enemy)
      if (weaponDamage > 0) {
        enemy.hp -= weaponDamage
        enemy.hitFlash = 100 // 闪烁100ms

        if (enemy.hp <= 0) {
          killedEnemyIds.push(enemy.id)
        }
      }

      // 检测玩家碰撞
      if (checkPlayerCollision(enemy)) {
        damageToPlayer += 10
        removedEnemyIds.push(enemy.id) // 敌人撞到玩家后消失（不计入“击杀”）
      }
    }

    // 移除本帧死亡/消失的敌人
    const deadIds = [...new Set([...killedEnemyIds, ...removedEnemyIds])]
    if (deadIds.length > 0) {
      enemiesRef.current = enemies.filter(e => !deadIds.includes(e.id))

      // 仅“武器击杀”计入击杀与升级
      const killsThisFrame = killedEnemyIds.length
      if (killsThisFrame > 0) {
        setKillCount(prev => {
          const newCount = prev + killsThisFrame
          const newUpgrades =
            Math.floor(newCount / KILLS_PER_UPGRADE) - Math.floor(prev / KILLS_PER_UPGRADE)
          if (newUpgrades > 0) {
            setPendingUpgrades(p => p + newUpgrades)
          }
          return newCount
        })

        setTotalKills(prev => {
          const next = prev + killsThisFrame

          // 达到本关目标：停止刷怪，并准备刷 Boss
          if (next >= ENEMIES_PER_LEVEL) {
            bossShouldSpawnRef.current = true
            spawnedEnemiesRef.current = ENEMIES_PER_LEVEL
            if (spawnTimerRef.current) {
              clearInterval(spawnTimerRef.current)
              spawnTimerRef.current = 0
            }
          }

          return next
        })

        setScore(prev => prev + killsThisFrame * 10 * currentLevel)
      }
    }

    // ==================== Boss 战斗逻辑 ====================
    const boss = bossRef.current
    if (boss) {
      // Boss 移动（缓慢追踪玩家，但保持一定距离）
      const bossTargetDist = 200 // Boss 与玩家保持的距离
      const dx = player.x - boss.x
      const dy = player.y - boss.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist > bossTargetDist + 50) {
        // 靠近玩家
        boss.x += (dx / dist) * boss.speed
        boss.y += (dy / dist) * boss.speed
      } else if (dist < bossTargetDist - 50) {
        // 远离玩家
        boss.x -= (dx / dist) * boss.speed * 0.5
        boss.y -= (dy / dist) * boss.speed * 0.5
      }
      
      // 限制 Boss 在世界边界内
      boss.x = clamp(boss.x, boss.radius, WORLD_WIDTH - boss.radius)
      boss.y = clamp(boss.y, boss.radius, WORLD_HEIGHT - boss.radius)

      // 减少受击闪烁计时
      if (boss.hitFlash > 0) {
        boss.hitFlash -= deltaTime
      }

      // 减少话术显示计时
      if (boss.speechTimer > 0) {
        boss.speechTimer -= deltaTime
      }

      // Boss 射击切图计时
      if (boss.isShooting) {
        boss.shootingTimer -= deltaTime
        if (boss.shootingTimer <= 0) {
          boss.isShooting = false
        }
      }

      // Boss 骚话冷却
      boss.speechCooldown -= deltaTime
      if (boss.speechCooldown <= 0) {
        boss.speech = BOSS_SPEECHES[Math.floor(Math.random() * BOSS_SPEECHES.length)]
        boss.speechTimer = SPEECH_DURATION
        boss.speechCooldown = BOSS_SPEECH_INTERVAL
      }

      // Boss 射击冷却
      boss.shootTimer -= deltaTime
      if (boss.shootTimer <= 0) {
        // 计算射击方向（瞄准玩家当前位置，不追踪）
        const shootDx = player.x - boss.x
        const shootDy = player.y - boss.y
        const shootDist = Math.sqrt(shootDx * shootDx + shootDy * shootDy)
        
        if (shootDist > 0) {
          const bullet: BossBullet = {
            id: bulletIdCounter.current++,
            x: boss.x,
            y: boss.y,
            radius: BOSS_CONFIG.bulletRadius,
            dirX: shootDx / shootDist,
            dirY: shootDy / shootDist,
            speed: BOSS_CONFIG.bulletSpeed,
            damage: BOSS_CONFIG.bulletDamage,
          }
          bossBulletsRef.current.push(bullet)

          // 射击切图动画
          boss.isShooting = true
          boss.shootingTimer = 260
        }
        
        boss.shootTimer = BOSS_CONFIG.shootInterval
      }

      // 检测武器对 Boss 的伤害
      for (const weapon of weaponState.weapons) {
        const angleRad = (weapon.angle * Math.PI) / 180
        const weaponEndX = player.x + Math.cos(angleRad) * weapon.range
        const weaponEndY = player.y + Math.sin(angleRad) * weapon.range

        // 计算 Boss 到武器线段的距离
        const wdx = weaponEndX - player.x
        const wdy = weaponEndY - player.y
        const wlen = Math.sqrt(wdx * wdx + wdy * wdy)
        
        if (wlen > 0) {
          const t = Math.max(0, Math.min(1, 
            ((boss.x - player.x) * wdx + (boss.y - player.y) * wdy) / (wlen * wlen)
          ))
          
          const closestX = player.x + t * wdx
          const closestY = player.y + t * wdy
          
          const hitDist = getDistance(boss.x, boss.y, closestX, closestY)
          
          if (hitDist < boss.radius + weapon.width / 2) {
            boss.hp -= weapon.damage
            boss.hitFlash = 100
            setBossHp(boss.hp)
            
            if (boss.hp <= 0 && bossRef.current === boss) {
              bossRef.current = null
              bossBulletsRef.current = []
              setBossHp(0)
              setBossMaxHp(0)
              bossMaxHpRef.current = 0
              bossShouldSpawnRef.current = false

              // Boss 被击败：自动进入下一关
              setTimeout(() => nextLevelCallbackRef.current(), 0)
            }
          }
        }
      }

      // 检测玩家与 Boss 碰撞（高伤害，但带冷却，避免每帧叠加导致“一碰就死”）
      const playerBossDist = getDistance(player.x, player.y, boss.x, boss.y)
      const collideDist = player.radius + boss.radius
      if (playerBossDist < collideDist) {
        // 受伤被弹开：强制把玩家推到 "碰撞距离 + 额外安全距离" 的位置，确保弹开后有明显间隔
        let nx = 1
        let ny = 0
        if (playerBossDist > 0) {
          nx = (player.x - boss.x) / playerBossDist
          ny = (player.y - boss.y) / playerBossDist
        }
        const desiredDist = collideDist + BOSS_KNOCKBACK_DISTANCE
        player.x = clamp(boss.x + nx * desiredDist, player.radius, WORLD_WIDTH - player.radius)
        player.y = clamp(boss.y + ny * desiredDist, player.radius, WORLD_HEIGHT - player.radius)

        if (player.bossTouchCooldown <= 0) {
          damageToPlayer += BOSS_TOUCH_DAMAGE
          player.bossTouchCooldown = BOSS_TOUCH_COOLDOWN
        }
      }
    }

    // ==================== Boss 子弹更新 ====================
    const bullets = bossBulletsRef.current
    const deadBullets: number[] = []

    for (const bullet of bullets) {
      // 子弹移动（直线，不追踪）
      bullet.x += bullet.dirX * bullet.speed
      bullet.y += bullet.dirY * bullet.speed

      // 检测子弹是否出界（世界边界）
      if (bullet.x < -50 || bullet.x > WORLD_WIDTH + 50 || bullet.y < -50 || bullet.y > WORLD_HEIGHT + 50) {
        deadBullets.push(bullet.id)
        continue
      }

      // 检测子弹与玩家碰撞
      const bulletDist = getDistance(player.x, player.y, bullet.x, bullet.y)
      if (bulletDist < player.radius + bullet.radius) {
        damageToPlayer += bullet.damage
        deadBullets.push(bullet.id)
      }
    }

    // 移除出界或命中的子弹
    if (deadBullets.length > 0) {
      bossBulletsRef.current = bullets.filter(b => !deadBullets.includes(b.id))
    }

    // 应用伤害
    if (damageToPlayer > 0) {
      player.hp -= damageToPlayer
      // 元宵受击动效 + 换图 + 重庆话骚话
      player.isHit = true
      player.hitTimer = 300 // 300ms 受击动画
      player.speech = PLAYER_HIT_SPEECHES[Math.floor(Math.random() * PLAYER_HIT_SPEECHES.length)]
      player.speechTimer = PLAYER_SPEECH_DURATION

      setPlayerHp(player.hp)

      if (player.hp <= 0) {
        setGameState('dead')
      }
    }

    // 更新 Boss 触碰冷却
    if (player.bossTouchCooldown > 0) {
      player.bossTouchCooldown -= deltaTime
    }

    // 更新元宵受击状态
    if (player.isHit) {
      player.hitTimer -= deltaTime
      if (player.hitTimer <= 0) {
        player.isHit = false
      }
    }

    // 更新元宵骚话计时器
    if (player.speechTimer > 0) {
      player.speechTimer -= deltaTime
    }

    // 更新摄像机（跟随玩家，裁剪到世界边界）
    const { width: viewW, height: viewH } = canvasSizeRef.current
    cameraRef.current = {
      x: clamp(player.x - viewW / 2, 0, Math.max(0, WORLD_WIDTH - viewW)),
      y: clamp(player.y - viewH / 2, 0, Math.max(0, WORLD_HEIGHT - viewH)),
    }
  }, [gameState, currentLevel, checkWeaponCollision, checkPlayerCollision])

  // 渲染游戏
  const renderGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height, dpr } = canvasSizeRef.current

    // 每帧确保 transform 正确（避免后续代码更改了 transform 或移动端动态 DPR 变化）
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const player = playerRef.current
    const weaponState = weaponStateRef.current
    const enemies = enemiesRef.current

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 绘制背景渐变
    const bgGradient = ctx.createLinearGradient(0, 0, width, height)
    bgGradient.addColorStop(0, '#0A0E27')
    bgGradient.addColorStop(1, '#1A1F3A')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // 计算摄像机（视口左上角，裁剪到世界边界）
    const camera = {
      x: clamp(player.x - width / 2, 0, Math.max(0, WORLD_WIDTH - width)),
      y: clamp(player.y - height / 2, 0, Math.max(0, WORLD_HEIGHT - height)),
    }
    cameraRef.current = camera

    // 世界坐标绘制：通过 translate 实现摄像机跟随
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // 绘制网格背景（与世界坐标对齐，仅绘制当前视口范围）
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)'
    ctx.lineWidth = 1
    const gridSize = 50

    const startX = Math.floor(camera.x / gridSize) * gridSize
    const endX = camera.x + width
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, camera.y)
      ctx.lineTo(x, camera.y + height)
      ctx.stroke()
    }

    const startY = Math.floor(camera.y / gridSize) * gridSize
    const endY = camera.y + height
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(camera.x, y)
      ctx.lineTo(camera.x + width, y)
      ctx.stroke()
    }

    // 绘制敌人
    for (const enemy of enemies) {
      const minionImages = minionImagesRef.current
      const minionImage = minionImages[enemy.imageIndex]
      
      // 如果图片已加载，使用图片绘制
      if (minionImage && minionImage.complete) {
        ctx.save()
        
        // 受击闪烁效果
        if (enemy.hitFlash > 0) {
          ctx.globalAlpha = 0.6
        }
        
        // 绘制圆形裁剪的图片（保持比例）
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        
        // 计算保持比例的绘制尺寸
        const imgW = minionImage.naturalWidth
        const imgH = minionImage.naturalHeight
        const imgAspect = imgW / imgH
        const targetSize = enemy.radius * 2
        
        let drawWidth: number, drawHeight: number, drawX: number, drawY: number
        
        if (imgAspect > 1) {
          drawHeight = targetSize
          drawWidth = targetSize * imgAspect
          drawX = enemy.x - drawWidth / 2
          drawY = enemy.y - drawHeight / 2
        } else {
          drawWidth = targetSize
          drawHeight = targetSize / imgAspect
          drawX = enemy.x - drawWidth / 2
          drawY = enemy.y - drawHeight / 2
        }
        
        ctx.drawImage(minionImage, drawX, drawY, drawWidth, drawHeight)
        
        ctx.restore()
        
        // 受击时绘制红色边框
        if (enemy.hitFlash > 0) {
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2)
          ctx.strokeStyle = '#FF4757'
          ctx.lineWidth = 3
          ctx.stroke()
        }
      } else {
        // 图片未加载时使用默认黑球
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2)
        
        if (enemy.hitFlash > 0) {
          ctx.fillStyle = '#FF4757'
        } else {
          ctx.fillStyle = '#1a1a2e'
          ctx.shadowColor = '#FF4757'
          ctx.shadowBlur = 10
        }
        ctx.fill()
        ctx.shadowBlur = 0

        // 敌人外圈
        ctx.strokeStyle = enemy.hitFlash > 0 ? '#FF6B7A' : '#4a4a6a'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // 血条背景
      const hpBarWidth = enemy.radius * 2
      const hpBarHeight = 4
      const hpBarX = enemy.x - hpBarWidth / 2
      const hpBarY = enemy.y - enemy.radius - 10

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight)

      // 血条
      const hpPercent = enemy.hp / enemy.maxHp
      ctx.fillStyle = hpPercent > 0.5 ? '#2ED573' : hpPercent > 0.25 ? '#FFA502' : '#FF4757'
      ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight)

      // 绘制话术气泡
      if (enemy.speechTimer > 0 && enemy.speech) {
        ctx.save()
        
        // 气泡位置（在敌人头顶上方）
        const bubbleX = enemy.x
        const bubbleY = enemy.y - enemy.radius - 30
        
        // 测量文本宽度
        ctx.font = 'bold 12px "PingFang SC", sans-serif'
        const textWidth = ctx.measureText(enemy.speech).width
        const padding = 10
        const bubbleWidth = textWidth + padding * 2
        const bubbleHeight = 24
        
        // 计算透明度（最后500ms淡出）
        const fadeStart = 500
        const alpha = enemy.speechTimer < fadeStart ? enemy.speechTimer / fadeStart : 1
        
        // 绘制气泡背景
        ctx.globalAlpha = alpha
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
        ctx.beginPath()
        const cornerRadius = 8
        ctx.roundRect(
          bubbleX - bubbleWidth / 2,
          bubbleY - bubbleHeight / 2,
          bubbleWidth,
          bubbleHeight,
          cornerRadius
        )
        ctx.fill()
        
        // 绘制小三角（指向敌人）
        ctx.beginPath()
        ctx.moveTo(bubbleX - 6, bubbleY + bubbleHeight / 2)
        ctx.lineTo(bubbleX + 6, bubbleY + bubbleHeight / 2)
        ctx.lineTo(bubbleX, bubbleY + bubbleHeight / 2 + 8)
        ctx.closePath()
        ctx.fill()
        
        // 绘制文本
        ctx.fillStyle = '#1a1a2e'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(enemy.speech, bubbleX, bubbleY)
        
        ctx.restore()
      }
    }

    // 绘制所有武器（猫爪样式：元宵白色系）
    const playerPawColors = {
      main: '#FFFFFF',
      pad: '#111827',
      stroke: '#111827',
    }

    for (let i = 0; i < weaponState.weapons.length; i++) {
      const weapon = weaponState.weapons[i]
      const angleRad = (weapon.angle * Math.PI) / 180
      const weaponEndX = player.x + Math.cos(angleRad) * weapon.range
      const weaponEndY = player.y + Math.sin(angleRad) * weapon.range

      // 轻微的“抓痕轨迹”，不加光晕，保证边界清晰
      ctx.save()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
      ctx.lineWidth = Math.max(1, weapon.width * 0.25)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(player.x, player.y)
      ctx.lineTo(weaponEndX, weaponEndY)
      ctx.stroke()
      ctx.restore()

      // 在末端绘制猫爪
      drawPawWeapon(
        ctx,
        weaponEndX,
        weaponEndY,
        weapon.angle + 90,
        weapon.width * 3,
        playerPawColors.main,
        playerPawColors.pad,
        playerPawColors.stroke
      )
    }

    // 绘制玩家（元宵）
    const playerImage = playerImageRef.current
    const playerShotedImage = playerShotedImageRef.current
    const currentPlayerImage = player.isHit && playerShotedImage?.complete ? playerShotedImage : playerImage

    if (currentPlayerImage && currentPlayerImage.complete) {
      // 受击时红色告警光效
      if (player.isHit) {
        ctx.beginPath()
        ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 50, 50, 0.35)'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(player.x, player.y, player.radius + 16, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'
        ctx.lineWidth = 3
        ctx.stroke()
      } else {
        // 正常外发光
        ctx.beginPath()
        ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.shadowColor = '#FFFFFF'
        ctx.shadowBlur = 15
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // 绘制圆形裁剪的玩家图片（保持比例，居中裁剪）
      ctx.save()
      ctx.beginPath()
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      // 计算保持比例的绘制尺寸
      const imgW = currentPlayerImage.naturalWidth
      const imgH = currentPlayerImage.naturalHeight
      const imgAspect = imgW / imgH
      const targetSize = player.radius * 2

      let drawWidth: number, drawHeight: number, drawX: number, drawY: number

      if (imgAspect > 1) {
        // 图片较宽，以高度为准
        drawHeight = targetSize
        drawWidth = targetSize * imgAspect
        drawX = player.x - drawWidth / 2
        drawY = player.y - drawHeight / 2
      } else {
        // 图片较高或正方形，以宽度为准
        drawWidth = targetSize
        drawHeight = targetSize / imgAspect
        drawX = player.x - drawWidth / 2
        drawY = player.y - drawHeight / 2
      }

      ctx.drawImage(currentPlayerImage, drawX, drawY, drawWidth, drawHeight)
      ctx.restore()

      // 玩家边框（受击时红色）
      ctx.beginPath()
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
      ctx.strokeStyle = player.isHit ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = player.isHit ? 3 : 2
      ctx.stroke()
    } else {
      // 图片未加载时使用默认白球
      ctx.beginPath()
      ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2)
      ctx.fillStyle = player.isHit ? 'rgba(255, 50, 50, 0.25)' : 'rgba(255, 255, 255, 0.1)'
      ctx.fill()

      // 玩家身体
      ctx.beginPath()
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
      const playerGradient = ctx.createRadialGradient(
        player.x - 5, player.y - 5, 0,
        player.x, player.y, player.radius
      )
      playerGradient.addColorStop(0, '#FFFFFF')
      playerGradient.addColorStop(1, '#B8C5D6')
      ctx.fillStyle = playerGradient
      ctx.shadowColor = '#FFFFFF'
      ctx.shadowBlur = 20
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // 元宵被击中时的重庆话骚话气泡
    if (player.speechTimer > 0 && player.speech) {
      ctx.save()

      ctx.font = 'bold 14px "PingFang SC", sans-serif'
      const textWidth = ctx.measureText(player.speech).width
      const padding = 12
      const bubbleWidth = textWidth + padding * 2
      const bubbleHeight = 28
      const bubbleX = player.x
      const bubbleY = player.y - player.radius - 45

      const fadeStart = 300
      const alpha = player.speechTimer < fadeStart ? player.speechTimer / fadeStart : 1
      ctx.globalAlpha = alpha

      // 红色告警气泡
      ctx.fillStyle = 'rgba(220, 38, 38, 0.95)'
      ctx.strokeStyle = 'rgba(252, 165, 165, 0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(
        bubbleX - bubbleWidth / 2,
        bubbleY - bubbleHeight / 2,
        bubbleWidth,
        bubbleHeight,
        8
      )
      ctx.fill()
      ctx.stroke()

      // 小三角（指向元宵）
      ctx.beginPath()
      ctx.moveTo(bubbleX - 6, bubbleY + bubbleHeight / 2)
      ctx.lineTo(bubbleX + 6, bubbleY + bubbleHeight / 2)
      ctx.lineTo(bubbleX, bubbleY + bubbleHeight / 2 + 8)
      ctx.closePath()
      ctx.fill()

      // 文本
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(player.speech, bubbleX, bubbleY)

      ctx.restore()
    }

    // ==================== 绘制 Boss ====================
    const boss = bossRef.current
    const bossImage = bossImageRef.current
    const bossShotImage = bossShotImageRef.current
    
    const currentBossImage = boss?.isShooting && bossShotImage?.complete ? bossShotImage : bossImage
    
    if (boss) {
      // Boss 本体
      if (currentBossImage && currentBossImage.complete) {
        ctx.save()
        
        // 受击闪烁效果
        if (boss.hitFlash > 0) {
          ctx.globalAlpha = 0.6
        }
        
        // 绘制 Boss 外发光（射击时偏橙/金）
        ctx.beginPath()
        ctx.arc(boss.x, boss.y, boss.radius + 8, 0, Math.PI * 2)
        if (boss.isShooting) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.45)'
          ctx.shadowColor = '#F59E0B'
          ctx.shadowBlur = 32
        } else {
          ctx.fillStyle = 'rgba(255, 71, 87, 0.3)'
          ctx.shadowColor = '#FF4757'
          ctx.shadowBlur = 25
        }
        ctx.fill()
        ctx.shadowBlur = 0
        
        // 绘制圆形裁剪的 Boss 图片（保持比例）
        ctx.beginPath()
        ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        
        // 计算保持比例的绘制尺寸
        const imgW = currentBossImage.naturalWidth
        const imgH = currentBossImage.naturalHeight
        const imgAspect = imgW / imgH
        const targetSize = boss.radius * 2
        
        let drawWidth: number, drawHeight: number, drawX: number, drawY: number
        
        if (imgAspect > 1) {
          drawHeight = targetSize
          drawWidth = targetSize * imgAspect
          drawX = boss.x - drawWidth / 2
          drawY = boss.y - drawHeight / 2
        } else {
          drawWidth = targetSize
          drawHeight = targetSize / imgAspect
          drawX = boss.x - drawWidth / 2
          drawY = boss.y - drawHeight / 2
        }
        
        ctx.drawImage(currentBossImage, drawX, drawY, drawWidth, drawHeight)
        
        ctx.restore()
        
        // 受击时绘制红色边框
        if (boss.hitFlash > 0) {
          ctx.beginPath()
          ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2)
          ctx.strokeStyle = '#FF4757'
          ctx.lineWidth = 5
          ctx.stroke()
        } else {
          // 正常边框（金色）
          ctx.beginPath()
          ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2)
          ctx.strokeStyle = '#FFD700'
          ctx.lineWidth = 3
          ctx.stroke()
        }
      } else {
        // 图片未加载时使用默认样式
        ctx.beginPath()
        ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2)
        ctx.fillStyle = boss.hitFlash > 0 ? '#FF4757' : '#8B0000'
        ctx.shadowColor = '#FF4757'
        ctx.shadowBlur = 20
        ctx.fill()
        ctx.shadowBlur = 0
        
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 4
        ctx.stroke()
      }

      // Boss 话术气泡
      if (boss.speechTimer > 0 && boss.speech) {
        ctx.save()
        
        const bubbleX = boss.x
        const bubbleY = boss.y - boss.radius - 40
        
        ctx.font = 'bold 14px "PingFang SC", sans-serif'
        const textWidth = ctx.measureText(boss.speech).width
        const padding = 12
        const bubbleWidth = textWidth + padding * 2
        const bubbleHeight = 30
        
        const fadeStart = 500
        const alpha = boss.speechTimer < fadeStart ? boss.speechTimer / fadeStart : 1
        
        // Boss 气泡使用红色调
        ctx.globalAlpha = alpha
        ctx.fillStyle = 'rgba(255, 71, 87, 0.95)'
        ctx.beginPath()
        ctx.roundRect(
          bubbleX - bubbleWidth / 2,
          bubbleY - bubbleHeight / 2,
          bubbleWidth,
          bubbleHeight,
          10
        )
        ctx.fill()
        
        ctx.beginPath()
        ctx.moveTo(bubbleX - 8, bubbleY + bubbleHeight / 2)
        ctx.lineTo(bubbleX + 8, bubbleY + bubbleHeight / 2)
        ctx.lineTo(bubbleX, bubbleY + bubbleHeight / 2 + 10)
        ctx.closePath()
        ctx.fill()
        
        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(boss.speech, bubbleX, bubbleY)
        
        ctx.restore()
      }
    }

    // ==================== 绘制 Boss 子弹（猫爪：橙/金系） ====================
    const bullets = bossBulletsRef.current
    const bossPawColors = {
      main: '#FCD34D',
      pad: '#F97316',
      stroke: '#92400E',
    }

    for (const bullet of bullets) {
      const angle = (Math.atan2(bullet.dirY, bullet.dirX) * 180) / Math.PI
      drawPawWeapon(
        ctx,
        bullet.x,
        bullet.y,
        angle,
        Math.max(18, bullet.radius * 2.4),
        bossPawColors.main,
        bossPawColors.pad,
        bossPawColors.stroke
      )
    }

    // 结束世界坐标绘制（撤销摄像机 translate）
    ctx.restore()

  }, [currentLevel])

  // 游戏主循环
  const gameLoop = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp
    }
    
    const deltaTime = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp

    if (gameState === 'playing') {
      updateGame(deltaTime)
    }
    
    renderGame()
    
    // 关键：递归调度时不要直接引用闭包里的 gameLoop
    gameLoopRef.current = requestAnimationFrame((ts) => gameLoopCallbackRef.current(ts))
  }, [gameState, updateGame, renderGame])

  // 同步最新 gameLoop 到 ref，避免切关后 rAF 仍跑旧逻辑
  useEffect(() => {
    gameLoopCallbackRef.current = gameLoop
  }, [gameLoop])

  // 处理升级选择
  const handleUpgrade = useCallback((option: UpgradeOption) => {
    const weaponState = weaponStateRef.current
    
    if (option === 'damage') {
      weaponState.baseDamage += UPGRADE_DAMAGE_INCREASE
      // 更新所有武器的伤害
      for (const weapon of weaponState.weapons) {
        weapon.damage = weaponState.baseDamage
      }
    } else if (option === 'range') {
      weaponState.baseRange += UPGRADE_RANGE_INCREASE
      // 更新所有武器的范围
      for (const weapon of weaponState.weapons) {
        weapon.range = weaponState.baseRange
      }
    } else if (option === 'speed') {
      weaponState.baseRotationSpeed += UPGRADE_SPEED_INCREASE
      // 更新所有武器的旋转速度
      for (const weapon of weaponState.weapons) {
        weapon.rotationSpeed = weaponState.baseRotationSpeed
      }
    } else if (option === 'weapon') {
      // 增加一把新武器
      const newCount = weaponState.weapons.length + 1
      weaponState.weapons = createWeapons(
        newCount,
        weaponState.baseDamage,
        weaponState.baseRange,
        weaponState.baseRotationSpeed
      )
    }
    
    setPlayerLevel(prev => prev + 1)
    setPendingUpgrades(prev => {
      const remaining = prev - 1
      if (remaining <= 0) {
        setGameState('playing')
      }
      return remaining
    })
  }, [])

  // 放弃本次升级
  const handleSkipUpgrade = useCallback(() => {
    setPendingUpgrades(prev => {
      const remaining = prev - 1
      if (remaining <= 0) {
        setGameState('playing')
      }
      return remaining
    })
  }, [])

  // 进入下一关（Boss 被击败后自动触发）
  const handleNextLevel = useCallback(() => {
    const newLevel = currentLevel + 1
    console.log('[Game] Advancing to level:', newLevel)

    // 保存进度
    const weaponState = weaponStateRef.current
    saveGame({
      currentLevel: newLevel,
      highScore: Math.max(highScore, score),
      weaponDamage: weaponState.baseDamage,
      weaponRange: weaponState.baseRange,
      weaponRotationSpeed: weaponState.baseRotationSpeed,
      weaponCount: weaponState.weapons.length,
      playerLevel,
    })

    // 重置关卡（回到“小怪阶段”）
    enemiesRef.current = []
    bossRef.current = null
    bossBulletsRef.current = []
    spawnedEnemiesRef.current = 0
    bossShouldSpawnRef.current = false
    bossMaxHpRef.current = 0

    setBossHp(0)
    setBossMaxHp(0)
    setKillCount(0)
    setTotalKills(0)
    setPendingUpgrades(0)

    // 回血（保留玩家位置与武器升级）
    playerRef.current.hp = INITIAL_PLAYER.maxHp
    playerRef.current.bossTouchCooldown = 0
    playerRef.current.isHit = false
    playerRef.current.hitTimer = 0
    playerRef.current.speech = ''
    playerRef.current.speechTimer = 0
    setPlayerHp(INITIAL_PLAYER.maxHp)

    // 设置新关卡
    setCurrentLevel(newLevel)
    setGameState('playing')
  }, [currentLevel, highScore, score, playerLevel])

  // 同步最新“自动下一关”回调，避免在主循环里拿到旧闭包
  useEffect(() => {
    nextLevelCallbackRef.current = handleNextLevel
  }, [handleNextLevel])

  // 死亡后重试
  const handleRetry = useCallback(() => {
    console.log('[Game] Retrying level:', currentLevel)

    // 重置当前关卡，保留武器升级
    enemiesRef.current = []
    bossRef.current = null
    bossBulletsRef.current = []
    spawnedEnemiesRef.current = 0
    bossShouldSpawnRef.current = false
    bossMaxHpRef.current = 0

    setBossHp(0)
    setBossMaxHp(0)
    setKillCount(0)
    setTotalKills(0)
    setPendingUpgrades(0)

    // 玩家回满血，并回到世界中心（方便继续体验地图）
    playerRef.current.hp = INITIAL_PLAYER.maxHp
    playerRef.current.bossTouchCooldown = 0
    playerRef.current.isHit = false
    playerRef.current.hitTimer = 0
    playerRef.current.speech = ''
    playerRef.current.speechTimer = 0
    playerRef.current.x = WORLD_WIDTH / 2
    playerRef.current.y = WORLD_HEIGHT / 2
    setPlayerHp(INITIAL_PLAYER.maxHp)

    setGameState('playing')
  }, [currentLevel])

  // 保存当前游戏进度
  const saveCurrentProgress = useCallback(() => {
    const weaponState = weaponStateRef.current
    saveGame({
      currentLevel,
      highScore: Math.max(highScore, score),
      weaponDamage: weaponState.baseDamage,
      weaponRange: weaponState.baseRange,
      weaponRotationSpeed: weaponState.baseRotationSpeed,
      weaponCount: weaponState.weapons.length,
      playerLevel,
    })
  }, [currentLevel, highScore, score, playerLevel])

  // 打开设置菜单
  const handleOpenSettings = useCallback(() => {
    setGameState('settings')
  }, [])

  // 关闭设置菜单，继续游戏
  const handleCloseSettings = useCallback(() => {
    setGameState('playing')
  }, [])

  // 请求重新开始游戏
  const handleRequestRestart = useCallback(() => {
    setGameState('confirmRestart')
  }, [])

  // 确认重新开始
  const handleConfirmRestart = useCallback(() => {
    // 重置所有游戏数据
    weaponStateRef.current = {
      weapons: [{ ...INITIAL_WEAPON }],
      baseDamage: INITIAL_WEAPON.damage,
      baseRange: INITIAL_WEAPON.range,
      baseRotationSpeed: INITIAL_WEAPON.rotationSpeed,
    }
    setCurrentLevel(1)
    setPlayerLevel(1)
    setKillCount(0)
    setTotalKills(0)
    setScore(0)
    setPendingUpgrades(0)
    enemiesRef.current = []
    bossRef.current = null
    bossBulletsRef.current = []
    spawnedEnemiesRef.current = 0
    bossShouldSpawnRef.current = false
    bossMaxHpRef.current = 0
    setBossHp(0)
    setBossMaxHp(0)

    playerRef.current.hp = INITIAL_PLAYER.maxHp
    playerRef.current.bossTouchCooldown = 0
    playerRef.current.isHit = false
    playerRef.current.hitTimer = 0
    playerRef.current.speech = ''
    playerRef.current.speechTimer = 0
    playerRef.current.x = WORLD_WIDTH / 2
    playerRef.current.y = WORLD_HEIGHT / 2
    setPlayerHp(INITIAL_PLAYER.maxHp)
    
    // 清除存档
    localStorage.removeItem(STORAGE_KEY)
    
    setGameState('playing')
  }, [])

  // 请求退出游戏
  const handleRequestExit = useCallback(() => {
    setGameState('confirmExit')
  }, [])

  // 确认退出游戏
  const handleConfirmExit = useCallback(() => {
    saveCurrentProgress()
    navigate('/')
  }, [navigate, saveCurrentProgress])

  // 取消确认弹窗，返回设置
  const handleCancelConfirm = useCallback(() => {
    setGameState('settings')
  }, [])

  // ==================== 开发者调试功能 ====================
  
  // 切换开发者菜单
  const toggleDevMenu = useCallback(() => {
    setShowDevMenu(prev => !prev)
  }, [])

  // 跳转到指定关卡
  const handleJumpToLevel = useCallback((targetLevel: number) => {
    console.log('[Dev] ========== Jumping to level:', targetLevel, '==========')

    // 重置游戏状态
    enemiesRef.current = []
    bossRef.current = null
    bossBulletsRef.current = []
    spawnedEnemiesRef.current = 0
    bossShouldSpawnRef.current = false
    bossMaxHpRef.current = 0

    setBossHp(0)
    setBossMaxHp(0)
    setKillCount(0)
    setTotalKills(0)
    setPendingUpgrades(0)

    playerRef.current.hp = INITIAL_PLAYER.maxHp
    playerRef.current.bossTouchCooldown = 0
    playerRef.current.isHit = false
    playerRef.current.hitTimer = 0
    playerRef.current.speech = ''
    playerRef.current.speechTimer = 0
    playerRef.current.x = WORLD_WIDTH / 2
    playerRef.current.y = WORLD_HEIGHT / 2
    setPlayerHp(INITIAL_PLAYER.maxHp)

    setShowDevMenu(false)

    // 设置关卡（进入小怪阶段；击杀满 100 才会刷 Boss）
    setCurrentLevel(targetLevel)
    setGameState('playing')
  }, [])

  // 给予满级武器（用于测试）
  const handleMaxWeapons = useCallback(() => {
    const weaponState = weaponStateRef.current
    weaponState.baseDamage = 50
    weaponState.baseRange = 120
    weaponState.baseRotationSpeed = 6
    weaponState.weapons = createWeapons(
      MAX_WEAPONS,
      weaponState.baseDamage,
      weaponState.baseRange,
      weaponState.baseRotationSpeed
    )
    setPlayerLevel(20)
    setShowDevMenu(false)
  }, [])

  // 摇杆事件处理 - 使用 ref 存储回调以便在 useEffect 中使用
  const joystickAreaRef = useRef<HTMLDivElement>(null)
  const touchIdRef = useRef<number | null>(null)
  
  const handleJoystickStart = useCallback((clientX: number, clientY: number, touchId?: number) => {
    const joystick = joystickRef.current
    const joystickArea = joystickAreaRef.current
    if (!joystickArea) return
    
    const rect = joystickArea.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    joystick.active = true
    joystick.startX = centerX
    joystick.startY = centerY
    joystick.currentX = clientX
    joystick.currentY = clientY
    
    if (touchId !== undefined) {
      touchIdRef.current = touchId
    }
    
    // 立即计算偏移
    const dx = clientX - centerX
    const dy = clientY - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = 40
    
    if (dist > 0) {
      const clampedDist = Math.min(dist, maxDist)
      joystick.offsetX = (dx / dist) * clampedDist
      joystick.offsetY = (dy / dist) * clampedDist
      joystick.dirX = (dx / dist) * (clampedDist / maxDist)
      joystick.dirY = (dy / dist) * (clampedDist / maxDist)
    }
    
    setJoystickOffset({ x: joystick.offsetX, y: joystick.offsetY })
  }, [])

  const handleJoystickMove = useCallback((clientX: number, clientY: number) => {
    const joystick = joystickRef.current
    if (!joystick.active) return
    
    joystick.currentX = clientX
    joystick.currentY = clientY
    
    // 计算方向向量和偏移
    const dx = clientX - joystick.startX
    const dy = clientY - joystick.startY
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    const maxDist = 40
    if (dist > 0) {
      const clampedDist = Math.min(dist, maxDist)
      joystick.offsetX = (dx / dist) * clampedDist
      joystick.offsetY = (dy / dist) * clampedDist
      joystick.dirX = (dx / dist) * (clampedDist / maxDist)
      joystick.dirY = (dy / dist) * (clampedDist / maxDist)
    } else {
      joystick.offsetX = 0
      joystick.offsetY = 0
      joystick.dirX = 0
      joystick.dirY = 0
    }
    
    setJoystickOffset({ x: joystick.offsetX, y: joystick.offsetY })
  }, [])

  const handleJoystickEnd = useCallback(() => {
    const joystick = joystickRef.current
    joystick.active = false
    joystick.dirX = 0
    joystick.dirY = 0
    joystick.offsetX = 0
    joystick.offsetY = 0
    touchIdRef.current = null
    setJoystickOffset({ x: 0, y: 0 })
  }, [])

  // 全局触摸/鼠标事件监听 - 防止移出摇杆区域后卡住
  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!joystickRef.current.active) return
      
      // 找到对应的触摸点
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i]
        if (touchIdRef.current === null || touch.identifier === touchIdRef.current) {
          e.preventDefault() // 阻止滚动
          handleJoystickMove(touch.clientX, touch.clientY)
          break
        }
      }
    }
    
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!joystickRef.current.active) return
      
      // 检查是否还有对应的触摸点
      let found = false
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          found = true
          break
        }
      }
      
      if (!found) {
        handleJoystickEnd()
      }
    }
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!joystickRef.current.active) return
      handleJoystickMove(e.clientX, e.clientY)
    }
    
    const handleGlobalMouseUp = () => {
      if (!joystickRef.current.active) return
      handleJoystickEnd()
    }
    
    // 添加全局事件监听
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })
    document.addEventListener('touchend', handleGlobalTouchEnd)
    document.addEventListener('touchcancel', handleGlobalTouchEnd)
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    
    return () => {
      document.removeEventListener('touchmove', handleGlobalTouchMove)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
      document.removeEventListener('touchcancel', handleGlobalTouchEnd)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [handleJoystickMove, handleJoystickEnd])

  // WASD 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        keysRef.current.add(key)
        updateKeyboardDirection()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        keysRef.current.delete(key)
        updateKeyboardDirection()
      }
    }

    const updateKeyboardDirection = () => {
      const keys = keysRef.current
      const joystick = joystickRef.current

      // 如果触摸摇杆正在使用，键盘不覆盖
      if (joystick.active && touchIdRef.current !== null) return

      let dirX = 0
      let dirY = 0

      if (keys.has('a')) dirX -= 1
      if (keys.has('d')) dirX += 1
      if (keys.has('w')) dirY -= 1
      if (keys.has('s')) dirY += 1

      // 归一化斜方向
      if (dirX !== 0 && dirY !== 0) {
        const len = Math.sqrt(dirX * dirX + dirY * dirY)
        dirX /= len
        dirY /= len
      }

      if (dirX !== 0 || dirY !== 0) {
        joystick.active = true
        joystick.dirX = dirX
        joystick.dirY = dirY
        // 更新摇杆视觉偏移（满幅 40）
        const maxDist = 40
        setJoystickOffset({ x: dirX * maxDist, y: dirY * maxDist })
      } else {
        joystick.active = false
        joystick.dirX = 0
        joystick.dirY = 0
        setJoystickOffset({ x: 0, y: 0 })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // 摇杆区域的 touch/mouse start 事件
  const onJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleJoystickStart(touch.clientX, touch.clientY, touch.identifier)
  }, [handleJoystickStart])

  const onJoystickMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleJoystickStart(e.clientX, e.clientY)
  }, [handleJoystickStart])

  // 检查升级触发
  useEffect(() => {
    if (pendingUpgrades > 0 && gameState === 'playing') {
      setGameState('upgrading')
    }
  }, [pendingUpgrades, gameState])

  // 触发 Boss：击杀满 100 小怪后（并且没有升级弹窗挡着）刷出 Boss
  useEffect(() => {
    if (gameState !== 'playing') return
    if (pendingUpgrades !== 0) return
    if (bossRef.current) return

    if (bossShouldSpawnRef.current && totalKills >= ENEMIES_PER_LEVEL) {
      bossShouldSpawnRef.current = false
      spawnBossForLevel(currentLevel)
    }
  }, [totalKills, currentLevel, gameState, pendingUpgrades, spawnBossForLevel])

  // 初始化和游戏循环
  useEffect(() => {
    // 加载玩家图片（元宵）
    const playerImg = new Image()
    playerImg.src = yuanxiaoImg
    playerImg.onload = () => {
      playerImageRef.current = playerImg
    }

    // 加载玩家受击图片（元宵被打）
    const playerShotedImg = new Image()
    playerShotedImg.src = yuanxiaoShotedImg
    playerShotedImg.onload = () => {
      playerShotedImageRef.current = playerShotedImg
    }
    
    // 加载小兵图片（小蛋卷 + monster，多个样式）
    const minionSrcs = [minionImg1, minionImg2, monsterImg]
    const loadedImages: HTMLImageElement[] = []
    
    minionSrcs.forEach((src, index) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        loadedImages[index] = img
        minionImagesRef.current = [...loadedImages]
      }
    })
    
    // 加载 Boss 图片（蛋卷大魔王）
    const bossImage = new Image()
    bossImage.src = bossImg
    bossImage.onload = () => {
      bossImageRef.current = bossImage
    }

    // 加载 Boss 射击图片
    const bossShotImage = new Image()
    bossShotImage.src = bossShotImg
    bossShotImage.onload = () => {
      bossShotImageRef.current = bossShotImage
    }
    
    initGame(currentLevel, true)
    
    // 启动前先写入最新 gameLoop，避免首次调度拿到空函数
    gameLoopCallbackRef.current = gameLoop
    gameLoopRef.current = requestAnimationFrame((ts) => gameLoopCallbackRef.current(ts))
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current)
      }
    }
  }, [])

  // 敌人生成定时器（每关最多生成 100 只；Boss 出现后不再刷怪）
  useEffect(() => {
    console.log('[Spawn] useEffect triggered:', {
      gameState,
      currentLevel,
      bossExists: !!bossRef.current,
      spawned: spawnedEnemiesRef.current,
    })

    if (gameState !== 'playing') return

    // Boss 出现时/或已刷满 100：确保停掉刷怪定时器
    if (bossRef.current || spawnedEnemiesRef.current >= ENEMIES_PER_LEVEL) {
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current)
        spawnTimerRef.current = 0
      }
      return
    }

    const config = getLevelConfig(currentLevel)
    console.log('[Spawn] Setting up enemy spawn timer for level', currentLevel, 'interval', config.spawnInterval)

    if (spawnTimerRef.current) {
      clearInterval(spawnTimerRef.current)
      spawnTimerRef.current = 0
    }

    spawnTimerRef.current = window.setInterval(spawnEnemy, config.spawnInterval)

    return () => {
      console.log('[Spawn] Cleanup: clearing spawn timer')
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current)
        spawnTimerRef.current = 0
      }
    }
  }, [gameState, currentLevel, spawnEnemy])

  const levelConfig = getLevelConfig(currentLevel)

  return (
    <div className={styles.container} ref={containerRef}>
      {/* 返回按钮 */}
      <button className={styles.backBtn} onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* 设置按钮 */}
      <button className={styles.settingBtn} onClick={handleOpenSettings}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* 开发者调试按钮 */}
      <button className={styles.devBtn} onClick={toggleDevMenu}>
        🛠️
      </button>

      {/* 开发者菜单 */}
      {showDevMenu && (
        <div className={styles.devMenu}>
          <div className={styles.devMenuHeader}>
            <span>🛠️ 开发者调试</span>
            <button className={styles.devCloseBtn} onClick={toggleDevMenu}>×</button>
          </div>
          <div className={styles.devMenuSection}>
            <span className={styles.devMenuLabel}>关卡跳转</span>
            <div className={styles.devLevelGrid}>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
                <button
                  key={level}
                  className={`${styles.devLevelBtn} ${currentLevel === level ? styles.active : ''}`}
                  onClick={() => handleJumpToLevel(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.devMenuSection}>
            <span className={styles.devMenuLabel}>快捷操作</span>
            <button className={styles.devActionBtn} onClick={handleMaxWeapons}>
              🚀 满级武器
            </button>
          </div>
          <div className={styles.devMenuInfo}>
            <span>当前: 第{currentLevel}关 · Lv.{playerLevel}</span>
            <span>武器: {weaponStateRef.current.weapons.length}把</span>
          </div>
        </div>
      )}

      {/* 左侧状态面板（关卡 + 等级 + 经验） */}
      <div className={styles.leftPanel}>
        <div className={styles.levelCard}>
          <div className={styles.levelRow}>
            <div className={styles.levelBadge}>Lv.{playerLevel}</div>
            <div className={styles.stageBadge}>第{currentLevel}关</div>
          </div>
          <div className={styles.expRow}>
            <div className={styles.expBarOuter}>
              <div 
                className={styles.expBarInner} 
                style={{ width: `${(killCount % KILLS_PER_UPGRADE) / KILLS_PER_UPGRADE * 100}%` }}
              />
            </div>
            <span className={styles.expText}>{killCount % KILLS_PER_UPGRADE}/{KILLS_PER_UPGRADE}</span>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>击杀</span>
              <span className={styles.statValue}>{totalKills}/{levelConfig.killTarget}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>积分</span>
              <span className={styles.statValue}>{score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部血条（横向） */}
      <div className={styles.bottomHpBar}>
        <span className={styles.hpLabel}>HP</span>
        <div className={styles.playerHpBar}>
          <div 
            className={styles.playerHpFill} 
            style={{ width: `${(playerHp / INITIAL_PLAYER.maxHp) * 100}%` }}
          />
        </div>
        <span className={styles.playerHpText}>{playerHp}/{INITIAL_PLAYER.maxHp}</span>
      </div>

      {/* Boss 血条（每关：击杀 100 小怪后出现） */}
      {bossRef.current && bossMaxHp > 0 && (
        <div className={styles.bossHpContainer}>
          <div className={styles.bossName}>👑 蛋卷大魔王</div>
          <div className={styles.bossHpBar}>
            <div
              className={styles.bossHpFill}
              style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
            />
            <span className={styles.bossHpText}>{bossHp} / {bossMaxHp}</span>
          </div>
        </div>
      )}

      {/* 游戏画布 */}
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* 虚拟摇杆 */}
      <div 
        ref={joystickAreaRef}
        className={styles.joystick}
        onTouchStart={onJoystickTouchStart}
        onMouseDown={onJoystickMouseDown}
      >
        <div className={styles.joystickOuter}>
          <div 
            className={styles.joystickInner}
            style={{
              transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)`,
            }}
          />
        </div>
      </div>

      {/* 升级弹窗 */}
      {gameState === 'upgrading' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>选择升级</h2>
            <p className={styles.modalSubtitle}>等级 {playerLevel} → {playerLevel + 1}</p>
            <div className={styles.upgradeOptions}>
              <button 
                className={styles.upgradeBtn}
                onClick={() => handleUpgrade('damage')}
              >
                <span className={styles.upgradeIcon}>⚔️</span>
                <span className={styles.upgradeName}>攻击力</span>
                <span className={styles.upgradeValue}>
                  {weaponStateRef.current.baseDamage} → {weaponStateRef.current.baseDamage + UPGRADE_DAMAGE_INCREASE}
                </span>
              </button>
              <button 
                className={styles.upgradeBtn}
                onClick={() => handleUpgrade('range')}
              >
                <span className={styles.upgradeIcon}>📏</span>
                <span className={styles.upgradeName}>攻击范围</span>
                <span className={styles.upgradeValue}>
                  {weaponStateRef.current.baseRange} → {weaponStateRef.current.baseRange + UPGRADE_RANGE_INCREASE}
                </span>
              </button>
              <button 
                className={styles.upgradeBtn}
                onClick={() => handleUpgrade('speed')}
              >
                <span className={styles.upgradeIcon}>⚡</span>
                <span className={styles.upgradeName}>攻击速度</span>
                <span className={styles.upgradeValue}>
                  {weaponStateRef.current.baseRotationSpeed.toFixed(1)} → {(weaponStateRef.current.baseRotationSpeed + UPGRADE_SPEED_INCREASE).toFixed(1)}
                </span>
              </button>
              <button 
                className={styles.upgradeBtn}
                onClick={() => handleUpgrade('weapon')}
                disabled={weaponStateRef.current.weapons.length >= MAX_WEAPONS}
              >
                <span className={styles.upgradeIcon}>🗡️</span>
                <span className={styles.upgradeName}>增加武器</span>
                <span className={styles.upgradeValue}>
                  {weaponStateRef.current.weapons.length >= MAX_WEAPONS 
                    ? `已满 ${MAX_WEAPONS}` 
                    : `${weaponStateRef.current.weapons.length} → ${weaponStateRef.current.weapons.length + 1}`}
                </span>
              </button>
            </div>
            <button 
              className={styles.skipBtn}
              onClick={handleSkipUpgrade}
            >
              放弃本次升级
            </button>
          </div>
        </div>
      )}


      {/* 死亡弹窗 */}
      {gameState === 'dead' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>💀 游戏结束</h2>
            <p className={styles.modalSubtitle}>第 {currentLevel} 关</p>
            <div className={styles.resultStats}>
              <div className={styles.resultItem}>
                <span>本次积分</span>
                <span>{score}</span>
              </div>
              <div className={styles.resultItem}>
                <span>最高积分</span>
                <span>{Math.max(highScore, score)}</span>
              </div>
            </div>
            <button className={styles.actionBtn} onClick={handleRetry}>
              重新挑战第 {currentLevel} 关
            </button>
          </div>
        </div>
      )}

      {/* 胜利弹窗 */}
      {gameState === 'victory' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>🏆 通关成功!</h2>
            <p className={styles.modalSubtitle}>恭喜通过全部10关</p>
            <div className={styles.resultStats}>
              <div className={styles.resultItem}>
                <span>总击杀数</span>
                <span>{totalKills}</span>
              </div>
              <div className={styles.resultItem}>
                <span>最终积分</span>
                <span>{score}</span>
              </div>
              <div className={styles.resultItem}>
                <span>玩家等级</span>
                <span>Lv.{playerLevel}</span>
              </div>
            </div>
            <button className={styles.actionBtn} onClick={() => navigate('/')}>
              返回游戏中心
            </button>
          </div>
        </div>
      )}

      {/* 设置菜单弹窗 */}
      {gameState === 'settings' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>⚙️ 游戏设置</h2>
            <p className={styles.modalSubtitle}>第 {currentLevel} 关 · Lv.{playerLevel}</p>
            <div className={styles.settingBtnGroup}>
              <button 
                className={`${styles.settingMenuBtn} ${styles.primary}`}
                onClick={handleCloseSettings}
              >
                继续游戏
              </button>
              <button 
                className={`${styles.settingMenuBtn} ${styles.danger}`}
                onClick={handleRequestRestart}
              >
                重新开始
              </button>
              <button 
                className={`${styles.settingMenuBtn} ${styles.secondary}`}
                onClick={handleRequestExit}
              >
                退出游戏
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认重新开始弹窗 */}
      {gameState === 'confirmRestart' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>🔄 重新开始</h2>
            <p className={styles.confirmText}>
              确定要重新开始游戏吗？<br />
              <span className={styles.warning}>这将清除所有当前进度和升级！</span>
            </p>
            <div className={styles.confirmBtnGroup}>
              <button 
                className={`${styles.settingMenuBtn} ${styles.secondary}`}
                onClick={handleCancelConfirm}
              >
                取消
              </button>
              <button 
                className={`${styles.settingMenuBtn} ${styles.danger}`}
                onClick={handleConfirmRestart}
              >
                确认重新开始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认退出弹窗 */}
      {gameState === 'confirmExit' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>🚪 退出游戏</h2>
            <p className={styles.confirmText}>
              确定要退出游戏吗？<br />
              <span className={styles.warning}>当前进度将自动保存，下次可继续游戏。</span>
            </p>
            <div className={styles.confirmBtnGroup}>
              <button 
                className={`${styles.settingMenuBtn} ${styles.secondary}`}
                onClick={handleCancelConfirm}
              >
                取消
              </button>
              <button 
                className={`${styles.settingMenuBtn} ${styles.primary}`}
                onClick={handleConfirmExit}
              >
                保存并退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GrassCutter
