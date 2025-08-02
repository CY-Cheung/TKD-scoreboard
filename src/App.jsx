import './App.css'
import Home from './Home/Home'
import Remote from './Remote/Remote'
import ScoreBoard from './ScoreBoard/ScoreBoard'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/remote" element={<Remote />} />
        <Route path="/scoreboard" element={<ScoreBoard />} />
      </Routes>
    </Router>
  )
}

export default App
