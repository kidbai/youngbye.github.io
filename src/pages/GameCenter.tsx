import { Link } from 'react-router-dom'
import styles from './GameCenter.module.css'

interface GameItem {
  path: string
  name: string
  icon: string
  description: string
  gradient: string
}

const games: GameItem[] = [
  {
    path: '/pokergame',
    name: '24点',
    icon: '🃏',
    description: '随机发四张牌，算出24点',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    path: '/gandengyan',
    name: '干瞪眼',
    icon: '👀',
    description: '计算多人游戏的收益费用',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    path: '/dice',
    name: '骰子',
    icon: '🎲',
    description: '摇骰子，看运气',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    path: '/grasscutter',
    name: '鸡哔蛋卷大魔王',
    icon: '🐔',
    description: '操控白球消灭敌人，10关挑战',
    gradient: 'linear-gradient(135deg, #00D9FF 0%, #00FF88 100%)'
  }
]

function GameCenter() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>🎮</div>
        <h1 className={styles.title}>🎯 干瞪眼小分队</h1>
        <p className={styles.subtitle}>游戏中心</p>
      </header>

      <main className={styles.gameList}>
        {games.map((game) => (
          <Link
            key={game.path}
            to={game.path}
            className={styles.gameCard}
            style={{ '--card-gradient': game.gradient } as React.CSSProperties}
          >
            <div className={styles.cardIcon}>{game.icon}</div>
            <div className={styles.cardContent}>
              <h2 className={styles.cardTitle}>{game.name}</h2>
              <p className={styles.cardDesc}>{game.description}</p>
            </div>
            <div className={styles.cardArrow}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>
        ))}
      </main>

      <footer className={styles.footer}>
        <p>Made with ❤️ by 干瞪眼小分队</p>
      </footer>
    </div>
  )
}

export default GameCenter
