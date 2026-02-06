/**
 * GrassCutter - Phaser 重构版
 * 
 * 保留 React DOM 覆盖 UI（摇杆、弹窗、HUD），
 * 将世界渲染与主循环交由 Phaser 负责。
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './GrassCutter.module.css'
import { createGame, destroyGame } from './grasscutter/phaser/create-game'
import {
  eventBus,
  Events,
  emitMove,
  emitPause,
  emitResume,
  emitApplyUpgrade,
  emitRestart,
  emitSkipLevel,
  emitKillAll,
} from './grasscutter/phaser/events'
import type { GameSnapshot, UpgradeType, MoveVector } from './grasscutter/phaser/types'
import {
  ENEMIES_PER_LEVEL,
  getLevelConfig,
  PLAYER_MAX_HP,
  KILLS_PER_UPGRADE,
  MAX_WEAPONS,
  INITIAL_WEAPON_DAMAGE,
  INITIAL_WEAPON_RANGE,
  INITIAL_WEAPON_ROTATION_SPEED,
  UPGRADE_DAMAGE_INCREASE,
  UPGRADE_RANGE_INCREASE,
  UPGRADE_SPEED_INCREASE,
} from './grasscutter/balance'

// ==================== 常量 ====================

const STORAGE_KEY = 'grasscutter_save'
const INITIAL_MAX_HP = PLAYER_MAX_HP

// ==================== 组件 ====================

function GrassCutter() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)

  // 游戏状态（从 Phaser 同步）
  const [hp, setHp] = useState(INITIAL_MAX_HP)
  const [maxHp, setMaxHp] = useState(INITIAL_MAX_HP)
  const [score, setScore] = useState(0)
  const [kills, setKills] = useState(0)
  const [totalKills, setTotalKills] = useState(0)
  const [level, setLevel] = useState(1)
  const [killsNeeded, setKillsNeeded] = useState(ENEMIES_PER_LEVEL)
  const [bossHp, setBossHp] = useState(0)
  const [bossMaxHp, setBossMaxHp] = useState(0)
  const [gameState, setGameState] = useState<string>('playing')
  const [playerLevel, setPlayerLevel] = useState(1)
  const [weaponDamage, setWeaponDamage] = useState(INITIAL_WEAPON_DAMAGE)
  const [weaponRange, setWeaponRange] = useState(INITIAL_WEAPON_RANGE)
  const [weaponRotationSpeed, setWeaponRotationSpeed] = useState(INITIAL_WEAPON_ROTATION_SPEED)
  const [weaponCount, setWeaponCount] = useState(1)
  const [highScore, setHighScore] = useState(0)

  // UI 状态
  const [showDevMenu, setShowDevMenu] = useState(false)
  const [joystickOffset, setJoystickOffset] = useState({ x: 0, y: 0 })

  // 摇杆相关 ref
  const joystickAreaRef = useRef<HTMLDivElement>(null)
  const joystickActiveRef = useRef(false)
  const joystickStartRef = useRef({ x: 0, y: 0 })

  // 键盘状态
  const keysRef = useRef<Set<string>>(new Set())

  // ==================== 生命周期：创建/销毁 Phaser ====================

  useEffect(() => {
    if (!gameContainerRef.current) return

    // 创建 Phaser Game
    createGame({ parent: gameContainerRef.current })

    // 订阅状态更新
    const handleStateUpdate = (snapshot: GameSnapshot) => {
      setHp(snapshot.hp)
      setMaxHp(snapshot.maxHp)
      setScore(snapshot.score)
      setKills(snapshot.kills)
      setTotalKills(snapshot.kills)
      setLevel(snapshot.level)
      setKillsNeeded(snapshot.killsNeeded)
      setBossHp(snapshot.bossHp)
      setBossMaxHp(snapshot.bossMaxHp)
      setGameState(snapshot.gameState)
      setPlayerLevel(snapshot.playerLevel)
      setWeaponDamage(snapshot.weaponDamage)
      setWeaponRange(snapshot.weaponRange)
      setWeaponRotationSpeed(snapshot.weaponRotationSpeed)
      setWeaponCount(snapshot.weaponCount)
    }

    eventBus.on(Events.STATE_UPDATE, handleStateUpdate)

    // 加载存档高分
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        setHighScore(data.highScore || 0)
      }
    } catch (e) {
      console.warn('[GrassCutter] Failed to load save:', e)
    }

    return () => {
      eventBus.off(Events.STATE_UPDATE, handleStateUpdate)
      eventBus.clear()
      destroyGame()
    }
  }, [])

  // ==================== 键盘输入 ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        keysRef.current.add(key)
        updateMoveVectorFromKeys()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysRef.current.delete(key)
      updateMoveVectorFromKeys()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const updateMoveVectorFromKeys = useCallback(() => {
    if (joystickActiveRef.current) return // 摇杆优先

    let x = 0
    let y = 0
    if (keysRef.current.has('a')) x -= 1
    if (keysRef.current.has('d')) x += 1
    if (keysRef.current.has('w')) y -= 1
    if (keysRef.current.has('s')) y += 1

    emitMove({ x, y })
  }, [])

  // ==================== 虚拟摇杆 ====================

  const JOYSTICK_MAX_OFFSET = 40

  const onJoystickStart = useCallback((clientX: number, clientY: number) => {
    joystickActiveRef.current = true
    joystickStartRef.current = { x: clientX, y: clientY }
  }, [])

  const onJoystickMove = useCallback((clientX: number, clientY: number) => {
    if (!joystickActiveRef.current) return

    const dx = clientX - joystickStartRef.current.x
    const dy = clientY - joystickStartRef.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    let offsetX = dx
    let offsetY = dy

    if (dist > JOYSTICK_MAX_OFFSET) {
      const ratio = JOYSTICK_MAX_OFFSET / dist
      offsetX = dx * ratio
      offsetY = dy * ratio
    }

    setJoystickOffset({ x: offsetX, y: offsetY })

    // 归一化方向
    if (dist > 5) {
      emitMove({ x: dx / dist, y: dy / dist })
    } else {
      emitMove({ x: 0, y: 0 })
    }
  }, [])

  const onJoystickEnd = useCallback(() => {
    joystickActiveRef.current = false
    setJoystickOffset({ x: 0, y: 0 })
    emitMove({ x: 0, y: 0 })
    // 恢复键盘控制
    updateMoveVectorFromKeys()
  }, [updateMoveVectorFromKeys])

  // Touch 事件
  const onJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    onJoystickStart(touch.clientX, touch.clientY)
  }, [onJoystickStart])

  // 全局 touch move/end（防止手指移出摇杆区域后失灵）
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!joystickActiveRef.current) return
      const touch = e.touches[0]
      onJoystickMove(touch.clientX, touch.clientY)
    }

    const handleTouchEnd = () => {
      if (joystickActiveRef.current) {
        onJoystickEnd()
      }
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [onJoystickMove, onJoystickEnd])

  // Mouse 事件（开发调试用）
  const onJoystickMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onJoystickStart(e.clientX, e.clientY)
  }, [onJoystickStart])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!joystickActiveRef.current) return
      onJoystickMove(e.clientX, e.clientY)
    }

    const handleMouseUp = () => {
      if (joystickActiveRef.current) {
        onJoystickEnd()
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onJoystickMove, onJoystickEnd])

  // ==================== UI 交互 ====================

  const toggleDevMenu = useCallback(() => {
    setShowDevMenu((v) => !v)
  }, [])

  const handleOpenSettings = useCallback(() => {
    setGameState('settings')
    emitPause()
  }, [])

  const handleCloseSettings = useCallback(() => {
    setGameState('playing')
    emitResume()
  }, [])

  const handleRequestRestart = useCallback(() => {
    setGameState('confirmRestart')
  }, [])

  const handleRequestExit = useCallback(() => {
    setGameState('confirmExit')
  }, [])

  const handleCancelConfirm = useCallback(() => {
    setGameState('settings')
  }, [])

  const handleConfirmRestart = useCallback(() => {
    emitRestart()
    setGameState('playing')
  }, [])

  const handleConfirmExit = useCallback(() => {
    // 保存存档
    try {
      const saveData = {
        currentLevel: level,
        highScore: Math.max(highScore, score),
        weaponDamage,
        weaponRange,
        weaponRotationSpeed,
        weaponCount,
        playerLevel,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData))
    } catch (e) {
      console.warn('[GrassCutter] Failed to save:', e)
    }
    navigate('/')
  }, [level, highScore, score, weaponDamage, weaponRange, weaponRotationSpeed, weaponCount, playerLevel, navigate])

  const handleUpgrade = useCallback((type: UpgradeType) => {
    emitApplyUpgrade(type)
  }, [])

  const handleRetry = useCallback(() => {
    emitRestart()
    setGameState('playing')
  }, [])

  const handleJumpToLevel = useCallback((targetLevel: number) => {
    // 通过事件桥跳关
    for (let i = level; i < targetLevel; i++) {
      emitSkipLevel()
    }
    setShowDevMenu(false)
  }, [level])

  const handleMaxWeapons = useCallback(() => {
    // 连续应用武器升级直到满
    for (let i = weaponCount; i < MAX_WEAPONS; i++) {
      emitApplyUpgrade('weapon')
    }
  }, [weaponCount])

  // ==================== 渲染 ====================

  const levelConfig = getLevelConfig(level)

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Phaser 游戏容器 */}
      <div
        ref={gameContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />

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
              {Array.from({ length: 20 }, (_, i) => i + 1).map((lv) => (
                <button
                  key={lv}
                  className={`${styles.devLevelBtn} ${level === lv ? styles.active : ''}`}
                  onClick={() => handleJumpToLevel(lv)}
                >
                  {lv}
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
            <span>当前: 第{level}关 · Lv.{playerLevel}</span>
            <span>武器: {weaponCount}把</span>
          </div>
        </div>
      )}

      {/* 左侧状态面板 */}
      <div className={styles.leftPanel}>
        <div className={styles.levelCard}>
          <div className={styles.levelRow}>
            <div className={styles.levelBadge}>Lv.{playerLevel}</div>
            <div className={styles.stageBadge}>第{level}关</div>
          </div>
          <div className={styles.expRow}>
            <div className={styles.expBarOuter}>
              <div 
                className={styles.expBarInner} 
                style={{ width: `${(kills % KILLS_PER_UPGRADE) / KILLS_PER_UPGRADE * 100}%` }}
              />
            </div>
            <span className={styles.expText}>{kills % KILLS_PER_UPGRADE}/{KILLS_PER_UPGRADE}</span>
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

      {/* 底部血条 */}
      <div className={styles.bottomHpBar}>
        <span className={styles.hpLabel}>HP</span>
        <div className={styles.playerHpBar}>
          <div 
            className={styles.playerHpFill} 
            style={{ width: `${(hp / maxHp) * 100}%` }}
          />
        </div>
        <span className={styles.playerHpText}>{hp}/{maxHp}</span>
      </div>

      {/* Boss 血条 */}
      {bossMaxHp > 0 && (
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
                  {weaponDamage} → {weaponDamage + UPGRADE_DAMAGE_INCREASE}
                </span>
              </button>
              <button 
                className={styles.upgradeBtn}
                onClick={() => handleUpgrade('range')}
              >
                <span className={styles.upgradeIcon}>📏</span>
                <span className={styles.upgradeName}>攻击范围</span>
                <span className={styles.upgradeValue}>
                  {weaponRange} → {weaponRange + UPGRADE_RANGE_INCREASE}
                </span>
              </button>
              <button 
                className={styles.upgradeBtn}
                onClick={() => handleUpgrade('speed')}
              >
                <span className={styles.upgradeIcon}>⚡</span>
                <span className={styles.upgradeName}>攻击速度</span>
                <span className={styles.upgradeValue}>
                  {weaponRotationSpeed.toFixed(1)} → {(weaponRotationSpeed + UPGRADE_SPEED_INCREASE).toFixed(1)}
                </span>
              </button>
              <button 
                className={styles.upgradeBtn}
                onClick={() => handleUpgrade('weapon')}
                disabled={weaponCount >= MAX_WEAPONS}
              >
                <span className={styles.upgradeIcon}>🗡️</span>
                <span className={styles.upgradeName}>增加武器</span>
                <span className={styles.upgradeValue}>
                  {weaponCount >= MAX_WEAPONS 
                    ? `已满 ${MAX_WEAPONS}` 
                    : `${weaponCount} → ${weaponCount + 1}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 死亡弹窗 */}
      {gameState === 'dead' && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>💀 游戏结束</h2>
            <p className={styles.modalSubtitle}>第 {level} 关</p>
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
              重新挑战第 {level} 关
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
            <p className={styles.modalSubtitle}>第 {level} 关 · Lv.{playerLevel}</p>
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
