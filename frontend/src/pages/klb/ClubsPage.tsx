import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchKlbClubs } from '../../api/klb'
import type { KlbClubSummary } from '../../types/klb'
import SortableTable, { type Column } from '../../components/SortableTable'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function ClubsPage() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState<KlbClubSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKlbClubs()
      .then(setClubs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<KlbClubSummary & Record<string, unknown>>[] = [
    {
      key: 'club_name',
      label: 'Клуб',
      render: row => (
        <span className="font-medium text-white capitalize">{row.club_name as string}</span>
      ),
    },
    { key: 'players_count', label: 'Игроков', numeric: true },
    { key: 'teams_count', label: 'Команд', numeric: true },
    {
      key: 'latest_season_with_team',
      label: 'Последний сезон',
      numeric: true,
      render: row => (
        <span className="text-right tabular-nums">
          {row.latest_season_with_team != null ? String(row.latest_season_with_team) : '—'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-5">Клубы</h1>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <SortableTable
          rows={clubs as (KlbClubSummary & Record<string, unknown>)[]}
          columns={columns}
          getKey={r => r.club_id}
          defaultSortKey="players_count"
          defaultSortDir="desc"
          onRowClick={r => navigate(`/klb/clubs/${r.club_id}`)}
        />
      )}
    </div>
  )
}
