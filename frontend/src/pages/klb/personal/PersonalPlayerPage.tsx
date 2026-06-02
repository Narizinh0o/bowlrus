import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchKlbPersonalPlayer, fetchKlbClubs } from '../../../api/klb'
import type { KlbPlayer, KlbClubSummary } from '../../../types/klb'
import StatCard from '../../../components/StatCard'
import LoadingSpinner from '../../../components/LoadingSpinner'

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

function handLabel(h: string) {
  return h === 'R' ? 'Правая' : h === 'L' ? 'Левая' : h
}

function genderLabel(g: string) {
  return g === 'М' ? 'Муж.' : g === 'Ж' ? 'Жен.' : g
}

export default function PersonalPlayerPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<KlbPlayer | null>(null)
  const [clubId, setClubId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchKlbPersonalPlayer(Number(id)),
      fetchKlbClubs(),
    ])
      .then(([player, clubs]: [KlbPlayer, KlbClubSummary[]]) => {
        setData(player)
        const match = clubs.find(c => c.club_name === player.current_club_name)
        if (match) setClubId(match.club_id)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error || !data) return (
    <div className="text-center py-20 text-slate-400">
      Игрок не найден.{' '}
      <Link to="/klb/personal/players" className="text-amber-500 hover:underline">
        Вернуться к списку
      </Link>
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <Link to="/klb/personal/players" className="text-slate-400 hover:text-amber-500 transition-colors">
          ← Игроки
        </Link>
        <h1 className="text-3xl font-bold text-white capitalize">{data.player_name}</h1>
      </div>

      <div className="flex gap-4 text-sm text-slate-400 mb-8 ml-16">
        <span>{genderLabel(data.gender)}</span>
        <span>·</span>
        <span>{handLabel(data.hand)} рука</span>
        <span>·</span>
        {clubId != null ? (
          <Link to={`/klb/clubs/${clubId}`} className="text-amber-500 hover:underline capitalize">
            {data.current_club_name}
          </Link>
        ) : (
          <span className="capitalize">{data.current_club_name}</span>
        )}
      </div>

      {/* Итого */}
      <h2 className="text-lg font-semibold text-slate-300 mb-3">Итого</h2>
      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatCard label="Игр" value={data.games_total} sub={`${data.tournaments_played} турниров`} />
        <StatCard label="Средний" value={fmt(data.avg_total)} />
        <StatCard label="Лучшая" value={fmt(data.best_game, 0)} />
        <StatCard label="Худшая" value={fmt(data.worst_game, 0)} />
        <StatCard
          label="Разброс"
          value={data.best_game != null && data.worst_game != null ? data.best_game - data.worst_game : '—'}
          sub="лучшая − худшая"
        />
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
