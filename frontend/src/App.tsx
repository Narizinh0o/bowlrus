import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import PlayerPage from './pages/PlayerPage'
import TournamentPage from './pages/TournamentPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/players/:id" element={<PlayerPage />} />
        <Route path="/tournament" element={<TournamentPage />} />
      </Routes>
    </Layout>
  )
}
