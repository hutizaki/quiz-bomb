import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Layout } from './components/Layout'
import { RoomProvider } from './contexts/RoomContext'
import { ShakeProvider } from './contexts/ShakeContext'
import { Home } from './pages/Home'
import { Play } from './pages/Play'
import { Leaderboard } from './pages/Leaderboard'
import { History } from './pages/History'
import { NotFound } from './pages/NotFound'
import { TestBomb } from './pages/TestBomb'
import { TestArrow } from './pages/TestArrow'
import { TestLobbyProvider } from './contexts/TestLobbyContext'
import { TestUserCircle } from './pages/TestUserCircle'
import { TestAvatar } from './pages/TestAvatar'
import { TestTyping } from './pages/TestTyping'

function App() {
  const location = useLocation()
  return (
    <RoomProvider>
      <ShakeProvider>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/test-bomb" element={<TestBomb />} />
            <Route path="/test-arrow" element={<TestArrow />} />
            <Route path="/test-usercircle" element={<TestLobbyProvider><TestUserCircle /></TestLobbyProvider>} />
            <Route path="/test-avatar" element={<TestAvatar />} />
            <Route path="/test-typing" element={<TestTyping />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Layout>
      </ShakeProvider>
    </RoomProvider>
  )
}

export default App
