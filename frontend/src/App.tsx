import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import ChrLayout from './components/ChrLayout'
import KlbLayout from './components/KlbLayout'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import PlayerPage from './pages/PlayerPage'
import GamePage from './pages/GamePage'
import TournamentPage from './pages/TournamentPage'
import KlbHomePage from './pages/klb/KlbHomePage'
import ClubsPage from './pages/klb/ClubsPage'
import ClubPage from './pages/klb/ClubPage'
import PersonalPlayersPage from './pages/klb/personal/PersonalPlayersPage'
import PersonalPlayerPage from './pages/klb/personal/PersonalPlayerPage'
import PersonalTournamentsPage from './pages/klb/personal/PersonalTournamentsPage'
import PersonalTournamentPage from './pages/klb/personal/PersonalTournamentPage'
import TeamTeamsPage from './pages/klb/team/TeamTeamsPage'
import TeamPage from './pages/klb/team/TeamPage'
import TeamTournamentsPage from './pages/klb/team/TeamTournamentsPage'
import TeamTournamentPage from './pages/klb/team/TeamTournamentPage'

function PlayerIdRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/chr/players/${id}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><HomePage /></Layout>} />

      {/* КЛБ */}
      <Route element={<KlbLayout />}>
        <Route path="/klb" element={<KlbHomePage />} />
        <Route path="/klb/personal" element={<Navigate to="/klb/personal/players" replace />} />
        <Route path="/klb/personal/players" element={<PersonalPlayersPage />} />
        <Route path="/klb/personal/players/:id" element={<PersonalPlayerPage />} />
        <Route path="/klb/personal/tournaments" element={<PersonalTournamentsPage />} />
        <Route path="/klb/personal/tournaments/:id" element={<PersonalTournamentPage />} />
        <Route path="/klb/team" element={<Navigate to="/klb/team/teams" replace />} />
        <Route path="/klb/team/teams" element={<TeamTeamsPage />} />
        <Route path="/klb/team/teams/:id" element={<TeamPage />} />
        <Route path="/klb/team/tournaments" element={<TeamTournamentsPage />} />
        <Route path="/klb/team/tournaments/:id" element={<TeamTournamentPage />} />
        <Route path="/klb/clubs" element={<ClubsPage />} />
        <Route path="/klb/clubs/:id" element={<ClubPage />} />
      </Route>

      {/* ЧР */}
      <Route element={<ChrLayout />}>
        <Route path="/chr" element={<Navigate to="/chr/players" replace />} />
        <Route path="/chr/players" element={<PlayersPage />} />
        <Route path="/chr/players/:id" element={<PlayerPage />} />
        <Route path="/chr/games/:id" element={<GamePage />} />
        <Route path="/chr/tournament" element={<TournamentPage />} />
      </Route>

      {/* Редиректы со старых URL */}
      <Route path="/players" element={<Navigate to="/chr/players" replace />} />
      <Route path="/players/:id" element={<PlayerIdRedirect />} />
      <Route path="/tournament" element={<Navigate to="/chr/tournament" replace />} />
    </Routes>
  )
}
