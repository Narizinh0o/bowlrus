import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchKlbTeams } from '../../../api/klb'
import type { KlbTeamBase } from '../../../types/klb'
import SortableTable, { type Column } from '../../../components/SortableTable'
import LoadingSpinner from '../../../components/LoadingSpinner'

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

const columns: Column<KlbTeamBase & Record<string, unknown>>[] = [
  {
    key: 'team_name',
    label: 'Команда',
    render: row => (
      <span className="font-medium text-white">{row.team_name as string}</span>
    ),
  },
  {
    key: 'club_name',
    label: 'Клуб',
    render: row => (
      <span className="text-slate-300 capitalize">{row.club_name as string}</span>
    ),
  },
  {
    key: 'seasons_list',
    label: 'Сезоны',
    sortable: false,
    render: row => (
      <span className="text-slate-400 text-xs">{row.seasons_list as string}</span>
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
]

export default function TeamTeamsPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<KlbTeamBase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKlbTeams()
      .then(setTeams)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-white">Команды</h1>
        <span className="text-slate-500 text-sm">{teams.length} команд</span>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <SortableTable
          rows={teams as (KlbTeamBase & Record<string, unknown>)[]}
          columns={columns}
          getKey={r => r.team_id}
          defaultSortKey="avg_total"
          defaultSortDir="desc"
          onRowClick={r => navigate(`/klb/team/teams/${r.team_id}`)}
        />
      )}
    </div>
  )
}
