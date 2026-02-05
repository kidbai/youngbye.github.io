import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import GameCenter from './pages/GameCenter'
import PokerGame from './pages/PokerGame'
import Gandengyan from './pages/Gandengyan'
import Dice from './pages/Dice'

// 懒加载 Phaser 割草游戏以减少首屏体积
const GrassCutter = lazy(() => import('./pages/GrassCutter'))

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<GameCenter />} />
        <Route path="/pokergame" element={<PokerGame />} />
        <Route path="/gandengyan" element={<Gandengyan />} />
        <Route path="/dice" element={<Dice />} />
        <Route
          path="/grasscutter"
          element={
            <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', paddingTop: '40vh' }}>加载中…</div>}>
              <GrassCutter />
            </Suspense>
          }
        />
      </Routes>
    </div>
  )
}

export default App
