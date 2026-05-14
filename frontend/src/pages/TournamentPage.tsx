import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTournament, fetchPlayers } from '../api/client'
import type { Tournament, PlayerStats } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import MedalBadge from '../components/MedalBadge'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center">
      <div className="text-3xl font-extrabold text-amber-400 mb-1">{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  )
}

function EventTable({ title, players, onClickPlayer }: { title: string; players: PlayerStats[]; onClickPlayer: (id: number) => void }) {
  const sorted = [...players].sort((a, b) => b.average_score - a.average_score)
  const tdNum = 'px-3 py-2 text-sm text-right tabular-nums'
  const td = 'px-3 py-2 text-sm'

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-slate-400 text-sm">{sorted.length} игроков</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-slate-700/50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-8">#</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Игрок</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Игр</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Средний</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Лучшая</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Худшая</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">X %</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Спэа %</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr
              key={p.player_id}
              onClick={() => onClickPlayer(p.player_id)}
              className={`border-b border-slate-700/50 cursor-pointer transition-colors ${
                i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60'
              } hover:bg-slate-700/70`}
            >
              <td className={`${td} text-center`}><MedalBadge rank={i + 1} /></td>
              <td className={`${td} font-medium text-white`}>{p.player_name}</td>
              <td className={tdNum}>{p.games_played}</td>
              <td className={`${tdNum} font-semibold text-amber-400`}>{p.average_score.toFixed(2)}</td>
              <td className={`${tdNum} text-green-400`}>{p.best_game}</td>
              <td className={`${tdNum} text-red-400`}>{p.worst_game}</td>
              <td className={`${tdNum} text-amber-300`}>{p.strike_percent?.toFixed(2)}%</td>
              <td className={`${tdNum} text-amber-300`}>{p.spare_conversion_percent?.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TournamentPage() {
  const navigate = useNavigate()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [doublesPlayers, setDoublesPlayers] = useState<PlayerStats[]>([])
  const [mixPlayers, setMixPlayers] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchTournament(),
      fetchPlayers('doubles'),
      fetchPlayers('doubles mix'),
    ]).then(([t, dp, mp]) => {
      setTournament(t)
      setDoublesPlayers(dp)
      setMixPlayers(mp)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!tournament) return null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">{tournament.name}</h1>
        <p className="text-slate-400">
          {new Date(tournament.date_start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })} —{' '}
          {new Date(tournament.date_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Всего игр" value={tournament.summary.games_count} />
        <StatCard label="Участников" value={tournament.summary.players_count} />
        <StatCard label="Средний счёт" value={tournament.summary.avg_score?.toFixed(2) ?? '—'} />
        <StatCard label="Всего кеглей" value={tournament.summary.total_pins?.toLocaleString('ru-RU') ?? '—'} />
      </div>

      <div className="flex flex-col gap-6">
        <EventTable title="Doubles" players={doublesPlayers} onClickPlayer={id => navigate(`/players/${id}`)} />
        <EventTable title="Doubles Mix" players={mixPlayers} onClickPlayer={id => navigate(`/players/${id}`)} />
      </div>
    </div>
  )
}
