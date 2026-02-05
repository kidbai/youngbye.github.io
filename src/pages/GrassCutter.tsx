import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './GrassCutter.module.css'
import minionImg1 from '../assets/minion.png'
import minionImg2 from '../assets/minion2.png'

// ==================== 类型定义 ====================

interface Player {
  x: number
  y: number
  radius: number
  hp: number
  maxHp: number
  speed: number
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
type GameState = 'playing' | 'paused' | 'upgrading' | 'levelComplete' | 'dead' | 'victory'

// ==================== 常量配置 ====================

const STORAGE_KEY = 'grasscutter_save'

const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, enemyHp: 30, enemySpeed: 0.8, spawnInterval: 2500, killTarget: 10 },
  { level: 2, enemyHp: 40, enemySpeed: 1.0, spawnInterval: 2200, killTarget: 15 },
  { level: 3, enemyHp: 55, enemySpeed: 1.2, spawnInterval: 2000, killTarget: 20 },
  { level: 4, enemyHp: 75, enemySpeed: 1.4, spawnInterval: 1800, killTarget: 25 },
  { level: 5, enemyHp: 100, enemySpeed: 1.6, spawnInterval: 1600, killTarget: 30 },
  { level: 6, enemyHp: 130, enemySpeed: 1.8, spawnInterval: 1500, killTarget: 35 },
  { level: 7, enemyHp: 170, enemySpeed: 2.0, spawnInterval: 1400, killTarget: 40 },
  { level: 8, enemyHp: 220, enemySpeed: 2.2, spawnInterval: 1300, killTarget: 45 },
  { level: 9, enemyHp: 280, enemySpeed: 2.4, spawnInterval: 1200, killTarget: 50 },
  { level: 10, enemyHp: 350, enemySpeed: 2.6, spawnInterval: 1000, killTarget: 60 },
]

const INITIAL_WEAPON = {
  angle: 0,
  range: 60,
  damage: 10,
  rotationSpeed: 3,
  width: 8,
}

const MAX_WEAPONS = 6 // 最多6把武器

const INITIAL_PLAYER = {
  radius: 15,
  hp: 100,
  maxHp: 100,
  speed: 5, // 提高玩家速度以保持平衡
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
  const enemyIdCounter = useRef(0)
  const lastTimeRef = useRef(0)
  const canvasSizeRef = useRef({ width: 0, height: 0 })
  const minionImagesRef = useRef<HTMLImageElement[]>([])
  
  // UI 状态 (使用 state 触发重渲染)
  const [gameState, setGameState] = useState<GameState>('playing')
  const [currentLevel, setCurrentLevel] = useState(1)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [killCount, setKillCount] = useState(0)
  const [totalKills, setTotalKills] = useState(0)
  const [playerLevel, setPlayerLevel] = useState(1)
  const [playerHp, setPlayerHp] = useState(INITIAL_PLAYER.hp)
  const [pendingUpgrades, setPendingUpgrades] = useState(0)
  const [joystickOffset, setJoystickOffset] = useState({ x: 0, y: 0 })

  // 初始化游戏
  const initGame = useCallback((levelNum: number, loadSave: boolean = false) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    canvasSizeRef.current = { width: rect.width, height: rect.height }

    // 初始化玩家位置到画布中央
    playerRef.current = {
      ...INITIAL_PLAYER,
      x: rect.width / 2,
      y: rect.height / 2,
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

    // 重置击杀计数
    setKillCount(0)
    setTotalKills(0)
    setScore(0)
    setPlayerHp(INITIAL_PLAYER.hp)
    playerRef.current.hp = INITIAL_PLAYER.hp
    setGameState('playing')
    setPendingUpgrades(0)
  }, [])

  // 生成敌人
  const spawnEnemy = useCallback(() => {
    const { width, height } = canvasSizeRef.current
    if (width === 0 || height === 0) return

    const config = LEVEL_CONFIGS[currentLevel - 1]
    const side = Math.floor(Math.random() * 4) // 0:上 1:右 2:下 3:左
    let x: number, y: number

    const margin = 30
    switch (side) {
      case 0: // 上
        x = Math.random() * width
        y = -margin
        break
      case 1: // 右
        x = width + margin
        y = Math.random() * height
        break
      case 2: // 下
        x = Math.random() * width
        y = height + margin
        break
      default: // 左
        x = -margin
        y = Math.random() * height
    }

    const enemy: Enemy = {
      id: enemyIdCounter.current++,
      x,
      y,
      radius: 12,
      hp: config.enemyHp,
      maxHp: config.enemyHp,
      speed: config.enemySpeed,
      hitFlash: 0,
      imageIndex: Math.floor(Math.random() * 2), // 随机选择 0 或 1
    }

    enemiesRef.current.push(enemy)
  }, [currentLevel])

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
      
      player.x = Math.max(player.radius, Math.min(width - player.radius, player.x + moveX))
      player.y = Math.max(player.radius, Math.min(height - player.radius, player.y + moveY))
    }

    // 更新所有武器角度
    for (const weapon of weaponState.weapons) {
      weapon.angle = (weapon.angle + weapon.rotationSpeed) % 360
    }

    // 更新敌人位置和检测碰撞
    const enemies = enemiesRef.current
    const deadEnemies: number[] = []
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

      // 检测武器碰撞（返回总伤害）
      const weaponDamage = checkWeaponCollision(enemy)
      if (weaponDamage > 0) {
        enemy.hp -= weaponDamage
        enemy.hitFlash = 100 // 闪烁100ms

        if (enemy.hp <= 0) {
          deadEnemies.push(enemy.id)
        }
      }

      // 检测玩家碰撞
      if (checkPlayerCollision(enemy)) {
        damageToPlayer += 10
        deadEnemies.push(enemy.id) // 敌人撞到玩家后消失
      }
    }

    // 移除死亡的敌人
    if (deadEnemies.length > 0) {
      enemiesRef.current = enemies.filter(e => !deadEnemies.includes(e.id))
      
      // 计算击杀数（不包括撞到玩家消失的）
      const killsThisFrame = deadEnemies.length
      setKillCount(prev => {
        const newCount = prev + killsThisFrame
        // 检查升级
        const newUpgrades = Math.floor(newCount / KILLS_PER_UPGRADE) - Math.floor(prev / KILLS_PER_UPGRADE)
        if (newUpgrades > 0) {
          setPendingUpgrades(p => p + newUpgrades)
        }
        return newCount
      })
      setTotalKills(prev => prev + killsThisFrame)
      setScore(prev => prev + killsThisFrame * 10 * currentLevel)
    }

    // 应用伤害
    if (damageToPlayer > 0) {
      player.hp -= damageToPlayer
      setPlayerHp(player.hp)

      if (player.hp <= 0) {
        setGameState('dead')
      }
    }
  }, [gameState, currentLevel, checkWeaponCollision, checkPlayerCollision])

  // 渲染游戏
  const renderGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvasSizeRef.current
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

    // 绘制网格背景
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.1)'
    ctx.lineWidth = 1
    const gridSize = 50
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
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
        
        // 绘制圆形裁剪的图片
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        
        // 绘制图片（居中）
        const imgSize = enemy.radius * 2
        ctx.drawImage(
          minionImage,
          enemy.x - enemy.radius,
          enemy.y - enemy.radius,
          imgSize,
          imgSize
        )
        
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
    }

    // 绘制所有武器
    const weaponColors = [
      ['#00D9FF', '#00FF88'],
      ['#FF6B6B', '#FFE66D'],
      ['#A855F7', '#EC4899'],
      ['#22D3EE', '#818CF8'],
      ['#F97316', '#FACC15'],
      ['#10B981', '#3B82F6'],
    ]
    
    for (let i = 0; i < weaponState.weapons.length; i++) {
      const weapon = weaponState.weapons[i]
      const colors = weaponColors[i % weaponColors.length]
      
      const angleRad = (weapon.angle * Math.PI) / 180
      const weaponEndX = player.x + Math.cos(angleRad) * weapon.range
      const weaponEndY = player.y + Math.sin(angleRad) * weapon.range

      // 武器发光效果
      ctx.shadowColor = colors[0]
      ctx.shadowBlur = 15
      
      // 武器主体
      const weaponGradient = ctx.createLinearGradient(player.x, player.y, weaponEndX, weaponEndY)
      weaponGradient.addColorStop(0, colors[0])
      weaponGradient.addColorStop(1, colors[1])
      
      ctx.beginPath()
      ctx.moveTo(player.x, player.y)
      ctx.lineTo(weaponEndX, weaponEndY)
      ctx.strokeStyle = weaponGradient
      ctx.lineWidth = weapon.width
      ctx.lineCap = 'round'
      ctx.stroke()
    }
    
    ctx.shadowBlur = 0

    // 绘制玩家
    // 外发光
    ctx.beginPath()
    ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
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

  }, [])

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
    
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, updateGame, renderGame])

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

    // 检查是否完成关卡
    const config = LEVEL_CONFIGS[currentLevel - 1]
    if (totalKills >= config.killTarget) {
      if (currentLevel >= 10) {
        setGameState('victory')
      } else {
        setGameState('levelComplete')
      }
    }
  }, [currentLevel, totalKills])

  // 进入下一关
  const handleNextLevel = useCallback(() => {
    const newLevel = currentLevel + 1
    setCurrentLevel(newLevel)
    
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
    
    // 重置关卡
    enemiesRef.current = []
    setKillCount(0)
    playerRef.current.hp = INITIAL_PLAYER.maxHp
    setPlayerHp(INITIAL_PLAYER.maxHp)
    setGameState('playing')
  }, [currentLevel, highScore, score, playerLevel])

  // 死亡后重试
  const handleRetry = useCallback(() => {
    // 重置当前关卡，保留武器升级
    enemiesRef.current = []
    setKillCount(0)
    setTotalKills(0)
    playerRef.current.hp = INITIAL_PLAYER.maxHp
    playerRef.current.x = canvasSizeRef.current.width / 2
    playerRef.current.y = canvasSizeRef.current.height / 2
    setPlayerHp(INITIAL_PLAYER.maxHp)
    setGameState('playing')
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

  // 检查关卡完成
  useEffect(() => {
    if (gameState === 'playing') {
      const config = LEVEL_CONFIGS[currentLevel - 1]
      if (totalKills >= config.killTarget && pendingUpgrades === 0) {
        if (currentLevel >= 10) {
          setGameState('victory')
        } else {
          setGameState('levelComplete')
        }
      }
    }
  }, [totalKills, currentLevel, gameState, pendingUpgrades])

  // 初始化和游戏循环
  useEffect(() => {
    // 加载小兵图片（多个样式）
    const minionSrcs = [minionImg1, minionImg2]
    const loadedImages: HTMLImageElement[] = []
    
    minionSrcs.forEach((src, index) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        loadedImages[index] = img
        minionImagesRef.current = [...loadedImages]
      }
    })
    
    initGame(currentLevel, true)
    
    gameLoopRef.current = requestAnimationFrame(gameLoop)
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current)
      }
    }
  }, [])

  // 敌人生成定时器
  useEffect(() => {
    if (gameState === 'playing') {
      const config = LEVEL_CONFIGS[currentLevel - 1]
      spawnTimerRef.current = window.setInterval(spawnEnemy, config.spawnInterval)
      
      return () => {
        if (spawnTimerRef.current) {
          clearInterval(spawnTimerRef.current)
        }
      }
    }
  }, [gameState, currentLevel, spawnEnemy])

  const levelConfig = LEVEL_CONFIGS[currentLevel - 1]

  return (
    <div className={styles.container} ref={containerRef}>
      {/* 返回按钮 */}
      <button className={styles.backBtn} onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* HUD */}
      <div className={styles.hud}>
        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>关卡</span>
          <span className={styles.hudValue}>{currentLevel}</span>
        </div>
        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>击杀</span>
          <span className={styles.hudValue}>{totalKills} / {levelConfig.killTarget}</span>
        </div>
        <div className={styles.hudItem}>
          <span className={styles.hudLabel}>积分</span>
          <span className={styles.hudValue}>{score}</span>
        </div>
      </div>

      {/* 玩家血条 */}
      <div className={styles.playerHpBar}>
        <div 
          className={styles.playerHpFill} 
          style={{ width: `${(playerHp / INITIAL_PLAYER.maxHp) * 100}%` }}
        />
        <span className={styles.playerHpText}>{playerHp} / {INITIAL_PLAYER.maxHp}</span>
      </div>

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
          </div>
        </div>
      )}

      {/* 关卡完成弹窗 */}
      {gameState === 'levelComplete' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>🎉 关卡完成!</h2>
            <p className={styles.modalSubtitle}>第 {currentLevel} 关</p>
            <div className={styles.resultStats}>
              <div className={styles.resultItem}>
                <span>击杀数</span>
                <span>{totalKills}</span>
              </div>
              <div className={styles.resultItem}>
                <span>获得积分</span>
                <span>{score}</span>
              </div>
            </div>
            <button className={styles.actionBtn} onClick={handleNextLevel}>
              进入第 {currentLevel + 1} 关
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
    </div>
  )
}

export default GrassCutter
