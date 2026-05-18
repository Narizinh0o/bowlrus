import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import ChrLayout from './components/ChrLayout'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import PlayerPage from './pages/PlayerPage'
import TournamentPage from './pages/TournamentPage'

function PlayerIdRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/chr/players/${id}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><HomePage /></Layout>} />

      {/* ЧР */}
      <Route element={<ChrLayout />}>
        <Route path="/chr" element={<Navigate to="/chr/players" replace />} />
        <Route path="/chr/players" element={<PlayersPage />} />
        <Route path="/chr/players/:id" element={<PlayerPage />} />
        <Route path="/chr/tournament" element={<TournamentPage />} />
      </Route>

      {/* Редиректы со старых URL */}
      <Route path="/players" element={<Navigate to="/chr/players" replace />} />
      <Route path="/players/:id" element={<PlayerIdRedirect />} />
      <Route path="/tournament" element={<Navigate to="/chr/tournament" replace />} />
    </Routes>
  )
}
