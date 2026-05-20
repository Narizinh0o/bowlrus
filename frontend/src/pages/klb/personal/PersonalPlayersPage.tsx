import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchKlbPersonalPlayers } from '../../../api/klb'
import type { KlbPlayerBase } from '../../../types/klb'
import SortableTable, { type Column } from '../../../components/SortableTable'
import LoadingSpinner from '../../../components/LoadingSpinner'

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

const columns: Column<KlbPlayerBase & Record<string, unknown>>[] = [
  {
    key: 'player_name',
    label: 'Имя',
    render: row => (
      <span className="font-medium text-white capitalize">{row.player_name as string}</span>
    ),
  },
  {
    key: 'current_club_name',
    label: 'Клуб',
    render: row => (
      <span className="text-slate-300 capitalize">{row.current_club_name as string}</span>
    ),
  },
  { key: 'games_total', label: 'Игр', numeric: true },
  {
    key: 'avg_total',
    label: 'Средняя',
    numeric: true,
    render: row => (
      <span className="font-semibold text-amber-400">{fmt(row.avg_total as number | null)}</span>
    ),
  },
  {
    key: 'best_game',
    label: 'Лучшая',
    numeric: true,
    render: row => (
      <span className="text-green-400">{fmt(row.best_game as number | null, 0)}</span>
    ),
  },
  {
    key: 'worst_game',
    label: 'Худшая',
    numeric: true,
    render: row => (
      <span className="text-red-400">{fmt(row.worst_game as number | null, 0)}</span>
    ),
  },
  { key: 'tournaments_played', label: 'Турниров', numeric: true },
]

export default function PersonalPlayersPage() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<KlbPlayerBase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKlbPersonalPlayers()
      .then(setPlayers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-white">Игроки</h1>
        <span className="text-slate-500 text-sm">{players.length} игроков</span>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <SortableTable
          rows={players as (KlbPlayerBase & Record<string, unknown>)[]}
          columns={columns}
          getKey={r => r.player_id}
          defaultSortKey="avg_total"
          defaultSortDir="desc"
          onRowClick={r => navigate(`/klb/personal/players/${r.player_id}`)}
        />
      )}
    </div>
  )
}
