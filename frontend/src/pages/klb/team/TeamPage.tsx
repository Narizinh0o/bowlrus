import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchKlbTeam } from '../../../api/klb'
import type { KlbTeam } from '../../../types/klb'
import StatCard from '../../../components/StatCard'
import LoadingSpinner from '../../../components/LoadingSpinner'

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

function formatSeasons(list: string): string {
  if (!list) return '—'
  return list
    .split(',')
    .map(s => s.trim())
    .join(', ')
}

export default function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<KlbTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchKlbTeam(Number(id))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error || !data) return (
    <div className="text-center py-20 text-slate-400">
      Команда не найдена.{' '}
      <Link to="/klb/team/teams" className="text-amber-500 hover:underline">
        Вернуться к командам
      </Link>
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <Link to="/klb/team/teams" className="text-slate-400 hover:text-amber-500 transition-colors">
          ← Команды
        </Link>
        <h1 className="text-3xl font-bold text-white">{data.team_name}</h1>
      </div>

      <div className="flex gap-4 text-sm text-slate-400 mb-8 ml-16">
        <span>
          Клуб:{' '}
          <Link to={`/klb/clubs/${data.club_id}`} className="text-amber-500 hover:underline capitalize">
            {data.club_name}
          </Link>
        </span>
        <span>·</span>
        <span>Сезоны: {formatSeasons(data.seasons_list)}</span>
      </div>

      {/* Итого */}
      <h2 className="text-lg font-semibold text-slate-300 mb-3">Итого</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Игр" value={data.games_total} />
        <StatCard label="Средний" value={fmt(data.avg_total)} />
        <StatCard label="Лучшая (плейофф)" value={fmt(data.best_game, 0)} />
      </div>

      {/* Квалификация */}
      {data.quals_games > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-300 mb-3">Квалификация</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Игр" value={data.quals_games} />
            <StatCard label="Средний" value={fmt(data.quals_avg)} />
          </div>
        </>
      )}

      {/* Round Robin */}
      {data.rr_games > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-300 mb-3">Round Robin</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Игр" value={data.rr_games} />
            <StatCard label="Средний" value={fmt(data.rr_avg)} />
          </div>
        </>
      )}

      {/* Плей-офф */}
      {data.po_games > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-300 mb-3">Плей-офф</h2>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Игр" value={data.po_games} />
            <StatCard label="Средний" value={fmt(data.po_avg)} />
            <StatCard label="Лучшая" value={fmt(data.po_best, 0)} />
          </div>
        </>
      )}

      {/* Ролл-офф */}
      {data.rolloff && data.rolloff.matches_total > 0 && (
        <>
          <h2 className="text-lg font-semibold text-slate-300 mb-3">Ролл-офф</h2>
          <div className="grid grid-cols-5 gap-3 mb-6">
            <StatCard label="Матчей" value={data.rolloff.matches_total} />
            <StatCard label="Побед" value={data.rolloff.matches_won} />
            <StatCard label="Винрейт" value={`${fmt(data.rolloff.winrate, 1)}%`} />
            <StatCard label="Бросков" value={data.rolloff.throws_count} />
            <StatCard label="Средний бросок" value={fmt(data.rolloff.throws_avg)} />
          </div>
        </>
      )}
    </div>
  )
}
