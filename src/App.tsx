import { Routes, Route } from 'react-router-dom'
import GameCenter from './pages/GameCenter'
import PokerGame from './pages/PokerGame'
import Gandengyan from './pages/Gandengyan'
import Dice from './pages/Dice'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<GameCenter />} />
        <Route path="/pokergame" element={<PokerGame />} />
        <Route path="/gandengyan" element={<Gandengyan />} />
        <Route path="/dice" element={<Dice />} />
      </Routes>
    </div>
  )
}

export default App
