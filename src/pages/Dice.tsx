import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Dice.module.css'

interface DiceData {
  num: number
}

function Dice() {
  const navigate = useNavigate()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [dice, setDice] = useState<DiceData[]>([
    { num: 1 },
    { num: 2 },
    { num: 3 },
    { num: 4 },
    { num: 5 }
  ])
  const [isShaking, setIsShaking] = useState(false)
  const [showShade, setShowShade] = useState(false)

  const generateDiceNum = () => Math.floor(Math.random() * 6) + 1

  const shake = useCallback(() => {
    if (isShaking) return

    setIsShaking(true)
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }

    const interval = setInterval(() => {
      setDice(dice.map(() => ({ num: generateDiceNum() })))
    }, 50)

    setTimeout(() => {
      clearInterval(interval)
      setIsShaking(false)
    }, 1000)
  }, [isShaking, dice.length])

  const renderDiceFace = (num: number) => {
    switch (num) {
      case 1:
        return (
          <div className={`${styles.face} ${styles.face1}`}>
            <span className={styles.pip}></span>
          </div>
        )
      case 2:
        return (
          <div className={`${styles.face} ${styles.face2}`}>
            <span className={styles.pip}></span>
            <span className={styles.pip}></span>
          </div>
        )
      case 3:
        return (
          <div className={`${styles.face} ${styles.face3}`}>
            <span className={styles.pip}></span>
            <span className={styles.pip}></span>
            <span className={styles.pip}></span>
          </div>
        )
      case 4:
        return (
          <div className={`${styles.face} ${styles.face4}`}>
            <div className={styles.column}>
              <span className={styles.pip}></span>
              <span className={styles.pip}></span>
            </div>
            <div className={styles.column}>
              <span className={styles.pip}></span>
              <span className={styles.pip}></span>
            </div>
          </div>
        )
      case 5:
        return (
          <div className={`${styles.face} ${styles.face5}`}>
            <div className={styles.column}>
              <span className={styles.pip}></span>
              <span className={styles.pip}></span>
            </div>
            <div className={styles.columnCenter}>
              <span className={styles.pip}></span>
            </div>
            <div className={styles.column}>
              <span className={styles.pip}></span>
              <span className={styles.pip}></span>
            </div>
          </div>
        )
      case 6:
        return (
          <div className={`${styles.face} ${styles.face6}`}>
            <div className={styles.column}>
              <span className={styles.pip}></span>
              <span className={styles.pip}></span>
              <span className={styles.pip}></span>
            </div>
            <div className={styles.column}>
              <span className={styles.pip}></span>
              <span className={styles.pip}></span>
              <span className={styles.pip}></span>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const totalSum = dice.reduce((sum, d) => sum + d.num, 0)

  return (
    <div className={styles.container}>
      <button className="back-btn" onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <header className={styles.header}>
        <h1 className={styles.title}>骰子</h1>
        <p className={styles.subtitle}>点击摇一摇</p>
      </header>

      <main className={styles.diceArea}>
        <div className={styles.diceWrapper}>
          <div className={styles.diceGrid}>
            {dice.map((d, index) => (
              <div
                key={index}
                className={`${styles.diceContainer} ${isShaking ? styles.shaking : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {renderDiceFace(d.num)}
              </div>
            ))}
          </div>
          {showShade && <div className={styles.shade} onClick={() => setShowShade(false)} />}
        </div>

        <div className={styles.sumDisplay}>
          <span className={styles.sumLabel}>总点数</span>
          <span className={styles.sumValue}>{showShade ? '?' : totalSum}</span>
        </div>
      </main>

      <footer className={styles.footer}>
        <button
          className={`${styles.shakeBtn} ${isShaking ? styles.shaking : ''}`}
          onClick={shake}
          disabled={isShaking}
        >
          <span className={styles.btnIcon}>🎲</span>
          <span>{isShaking ? '摇动中...' : '摇一摇'}</span>
        </button>
        <button
          className={styles.coverBtn}
          onClick={() => setShowShade(!showShade)}
        >
          <span>{showShade ? '👀' : '🙈'}</span>
          <span>{showShade ? '点击揭开' : '点击遮住'}</span>
        </button>
      </footer>

      <audio 
        ref={audioRef} 
        src="https://kidbai.github.io/youngbye.github.io/dist/dice.mp3"
        preload="auto"
      />
    </div>
  )
}

export default Dice
