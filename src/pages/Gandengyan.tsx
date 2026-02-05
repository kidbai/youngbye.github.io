import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Gandengyan.module.css'

interface Player {
  loss: string
  profit: number
}

function Gandengyan() {
  const navigate = useNavigate()
  const [playerCount, setPlayerCount] = useState('4')
  const [players, setPlayers] = useState<Player[]>([
    { loss: '0', profit: 0 },
    { loss: '0', profit: 0 },
    { loss: '0', profit: 0 },
    { loss: '0', profit: 0 }
  ])
  const [calculated, setCalculated] = useState(false)

  const updatePlayerCount = useCallback(() => {
    const count = parseInt(playerCount)
    if (isNaN(count) || count < 2 || count > 20) {
      alert('请输入2-20之间的人数')
      return
    }
    
    setPlayers(Array.from({ length: count }, () => ({ loss: '0', profit: 0 })))
    setCalculated(false)
  }, [playerCount])

  const updatePlayerLoss = (index: number, value: string) => {
    const newPlayers = [...players]
    newPlayers[index] = { ...newPlayers[index], loss: value }
    setPlayers(newPlayers)
    setCalculated(false)
  }

  const calculateProfit = () => {
    const newPlayers = players.map((player, i) => {
      let profit = 0
      const myLoss = parseInt(player.loss) || 0
      
      players.forEach((otherPlayer, j) => {
        if (i !== j) {
          const otherLoss = parseInt(otherPlayer.loss) || 0
          profit += otherLoss - myLoss
        }
      })
      
      return { ...player, profit }
    })
    
    setPlayers(newPlayers)
    setCalculated(true)
  }

  const resetAll = () => {
    setPlayers(players.map(p => ({ ...p, loss: '0', profit: 0 })))
    setCalculated(false)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        calculateProfit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [players])

  const totalLoss = players.reduce((sum, p) => sum + (parseInt(p.loss) || 0), 0)
  const totalProfit = players.reduce((sum, p) => sum + p.profit, 0)

  return (
    <div className={styles.container}>
      <button className="back-btn" onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <header className={styles.header}>
        <h1 className={styles.title}>干瞪眼计算器</h1>
        <p className={styles.subtitle}>快速计算多人游戏的收益</p>
      </header>

      <main className={styles.main}>
        <div className={styles.configCard}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>玩家人数</label>
            <div className={styles.inputRow}>
              <input
                type="number"
                min="2"
                max="20"
                value={playerCount}
                onChange={(e) => setPlayerCount(e.target.value)}
                className={styles.input}
              />
              <button className={styles.updateBtn} onClick={updatePlayerCount}>
                更新
              </button>
            </div>
          </div>
        </div>

        <div className={styles.playerList}>
          {players.map((player, index) => (
            <div 
              key={index} 
              className={styles.playerCard}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={styles.playerHeader}>
                <span className={styles.playerAvatar}>
                  {index + 1}
                </span>
                <span className={styles.playerName}>玩家 {index + 1}</span>
              </div>
              <div className={styles.playerInputs}>
                <div className={styles.inputField}>
                  <label>亏分</label>
                  <input
                    type="number"
                    value={player.loss}
                    onChange={(e) => updatePlayerLoss(index, e.target.value)}
                    className={styles.lossInput}
                  />
                </div>
                <div className={styles.inputField}>
                  <label>收益</label>
                  <div className={`${styles.profitDisplay} ${player.profit > 0 ? styles.positive : player.profit < 0 ? styles.negative : ''}`}>
                    {calculated ? (player.profit > 0 ? '+' : '') + player.profit : '-'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {calculated && (
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span>总亏分</span>
              <span className={styles.summaryValue}>{totalLoss}</span>
            </div>
            <div className={styles.summaryItem}>
              <span>校验和</span>
              <span className={`${styles.summaryValue} ${totalProfit === 0 ? styles.valid : styles.invalid}`}>
                {totalProfit === 0 ? '✓ 正确' : `✗ ${totalProfit}`}
              </span>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <button className={styles.calcBtn} onClick={calculateProfit}>
          <span>💰</span>
          <span>计算收益</span>
        </button>
        <button className={styles.resetBtn} onClick={resetAll}>
          <span>🔄</span>
          <span>重置</span>
        </button>
      </footer>
    </div>
  )
}

export default Gandengyan
