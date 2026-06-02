import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchKlbTeamTournament } from '../../../api/klb'
import type { KlbTeamTournament, KlbTeamResult } from '../../../types/klb'
import SortableTable, { type Column } from '../../../components/SortableTable'
import LoadingSpinner from '../../../components/LoadingSpinner'
import TournamentPatterns from '../../../components/TournamentPatterns'

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

const columns: Column<KlbTeamResult & Record<string, unknown>>[] = [
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
  { key: 'games_total', label: 'Игр', numeric: true },
  {
    key: 'avg_total',
    label: 'Средний',
    numeric: true,
    render: row => (
      <span className="font-semibold text-amber-400">{fmt(row.avg_total as number | null)}</span>
    ),
  },
  {
    key: 'best_game',
    label: 'Лучшая (плейофф)',
    numeric: true,
    render: row => (
      <span className="text-green-400">{fmt(row.best_game as number | null, 0)}</span>
    ),
  },
  {
    key: 'rr_avg',
    label: <>RR<br />средний</>,
    numeric: true,
    render: row => <span>{fmt(row.rr_avg as number | null)}</span>,
  },
  {
    key: 'po_avg',
    label: <>ПО<br />средний</>,
    numeric: true,
    render: row => <span>{fmt(row.po_avg as number | null)}</span>,
  },
]

export default function TeamTournamentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<KlbTeamTournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchKlbTeamTournament(Number(id))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error || !data) return (
    <div className="text-center py-20 text-slate-400">
      Турнир не найден.{' '}
      <Link to="/klb/team/tournaments" className="text-amber-500 hover:underline">
        Вернуться к турнирам
      </Link>
    </div>
  )

  const { tournament, results } = data

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <Link to="/klb/team/tournaments" className="text-slate-400 hover:text-amber-500 transition-colors">
          ← Турниры
        </Link>
        <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
        <TournamentPatterns tid={tournament.tournament_id} />
      </div>
      <p className="text-slate-500 text-sm mb-6 ml-16">
        Сезон {tournament.season} · Этап {tournament.stage} · {tournament.year} г. · {results.length} команд
      </p>

      <SortableTable
        rows={results as (KlbTeamResult & Record<string, unknown>)[]}
        columns={columns}
        getKey={r => r.team_id}
        defaultSortKey="avg_total"
        defaultSortDir="desc"
        onRowClick={r => navigate(`/klb/team/teams/${r.team_id}`)}
      />
    </div>
  )
}
