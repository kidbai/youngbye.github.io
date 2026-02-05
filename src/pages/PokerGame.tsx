import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PokerGame.module.css'

type CardValue = number | 'J' | 'Q' | 'K'

const suits = ['♠', '♥', '♦', '♣'] as const
const suitColors: Record<string, string> = {
  '♠': '#1a1a2e',
  '♥': '#e74c3c',
  '♦': '#e74c3c',
  '♣': '#1a1a2e'
}

function PokerGame() {
  const navigate = useNavigate()
  const [cards, setCards] = useState<{ value: CardValue; suit: string }[]>([
    { value: 1, suit: '♠' },
    { value: 2, suit: '♥' },
    { value: 3, suit: '♦' },
    { value: 4, suit: '♣' }
  ])
  const [isShuffling, setIsShuffling] = useState(false)

  const generateCard = useCallback((): { value: CardValue; suit: string } => {
    const num = Math.floor(Math.random() * 13) + 1
    const suit = suits[Math.floor(Math.random() * 4)]
    
    let value: CardValue
    if (num === 11) value = 'J'
    else if (num === 12) value = 'Q'
    else if (num === 13) value = 'K'
    else value = num
    
    return { value, suit }
  }, [])

  const shuffle = useCallback(() => {
    if (isShuffling) return
    
    setIsShuffling(true)
    
    const interval = setInterval(() => {
      setCards([
        generateCard(),
        generateCard(),
        generateCard(),
        generateCard()
      ])
    }, 50)

    setTimeout(() => {
      clearInterval(interval)
      setIsShuffling(false)
    }, 1000)
  }, [isShuffling, generateCard])

  const displayValue = (value: CardValue) => {
    if (value === 1) return 'A'
    return value
  }

  return (
    <div className={styles.container}>
      <button className="back-btn" onClick={() => navigate('/')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <header className={styles.header}>
        <h1 className={styles.title}>24点</h1>
        <p className={styles.subtitle}>用四张牌通过加减乘除算出24</p>
      </header>

      <main className={styles.cardArea}>
        <div className={styles.cardGrid}>
          {cards.map((card, index) => (
            <div
              key={index}
              className={`${styles.card} ${isShuffling ? styles.shuffling : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={styles.cardInner}>
                <span 
                  className={styles.cardSuit} 
                  style={{ color: suitColors[card.suit] }}
                >
                  {card.suit}
                </span>
                <span 
                  className={styles.cardValue}
                  style={{ color: suitColors[card.suit] }}
                >
                  {displayValue(card.value)}
                </span>
                <span 
                  className={styles.cardSuitBottom} 
                  style={{ color: suitColors[card.suit] }}
                >
                  {card.suit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <button 
          className={`${styles.shuffleBtn} ${isShuffling ? styles.shuffling : ''}`}
          onClick={shuffle}
          disabled={isShuffling}
        >
          <span className={styles.btnIcon}>🔄</span>
          <span>{isShuffling ? '洗牌中...' : '换一组'}</span>
        </button>
      </footer>
    </div>
  )
}

export default PokerGame
