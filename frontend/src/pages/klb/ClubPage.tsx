import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchKlbClub } from '../../api/klb'
import type { KlbClub, KlbPlayerBase, KlbTeamBase } from '../../types/klb'
import SortableTable, { type Column } from '../../components/SortableTable'
import LoadingSpinner from '../../components/LoadingSpinner'

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

const playerColumns: Column<KlbPlayerBase & Record<string, unknown>>[] = [
  {
    key: 'player_name',
    label: 'Имя',
    render: row => <span className="font-medium text-white capitalize">{row.player_name as string}</span>,
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
    render: row => <span className="text-green-400">{fmt(row.best_game as number | null, 0)}</span>,
  },
  { key: 'tournaments_played', label: 'Турниров', numeric: true },
]

const teamColumns: Column<KlbTeamBase & Record<string, unknown>>[] = [
  {
    key: 'team_name',
    label: 'Команда',
    render: row => <span className="font-medium text-white">{row.team_name as string}</span>,
  },
  {
    key: 'seasons_list',
    label: 'Сезоны',
    render: row => <span className="text-slate-300">{row.seasons_list as string}</span>,
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
    render: row => <span className="text-green-400">{fmt(row.best_game as number | null, 0)}</span>,
  },
]

export default function ClubPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<KlbClub | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<'teams' | 'players'>('teams')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchKlbClub(Number(id))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error || !data) return (
    <div className="text-center py-20 text-slate-400">
      Клуб не найден.{' '}
      <Link to="/klb/clubs" className="text-amber-500 hover:underline">Вернуться к клубам</Link>
    </div>
  )

  const tabCls = (active: boolean) =>
    `px-5 py-2 text-sm font-medium rounded-t transition-colors ${
      active
        ? 'bg-slate-800 text-white border border-b-0 border-slate-700'
        : 'text-slate-400 hover:text-white'
    }`

  return (
    <div>
      <div className="flex items-center gap-4 mb-1">
        <Link to="/klb/clubs" className="text-slate-400 hover:text-amber-500 transition-colors">
          ← Клубы
        </Link>
        <h1 className="text-3xl font-bold text-white capitalize">{data.club_name}</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6 ml-16">
        {data.players_count} игроков · {data.teams_count} команд · последний сезон: {data.latest_season_with_team ?? '—'}
      </p>

      <div className="flex gap-1 mb-0">
        <button className={tabCls(tab === 'teams')} onClick={() => setTab('teams')}>
          Команды ({data.teams.length})
        </button>
        <button className={tabCls(tab === 'players')} onClick={() => setTab('players')}>
          Игроки ({data.players.length})
        </button>
      </div>

      {tab === 'teams' ? (
        <SortableTable
          rows={data.teams as (KlbTeamBase & Record<string, unknown>)[]}
          columns={teamColumns}
          getKey={r => r.team_id}
          defaultSortKey="avg_total"
          defaultSortDir="desc"
          onRowClick={r => navigate(`/klb/team/teams/${r.team_id}`)}
        />
      ) : (
        <SortableTable
          rows={data.players as (KlbPlayerBase & Record<string, unknown>)[]}
          columns={playerColumns}
          getKey={r => r.player_id}
          defaultSortKey="avg_total"
          defaultSortDir="desc"
          onRowClick={r => navigate(`/klb/personal/players/${r.player_id}`)}
        />
      )}
    </div>
  )
}
