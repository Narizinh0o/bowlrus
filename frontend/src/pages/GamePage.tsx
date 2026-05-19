import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchGame } from '../api/client'
import type { Game } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import FrameCell from '../components/FrameCell'

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(' г.', '')
}

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : '—'
}

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchGame(Number(id))
      .then(setGame)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error || !game) return (
    <div className="text-center py-20 text-slate-400">
      Игра не найдена.{' '}
      <Link to="/chr/players" className="text-amber-500 hover:underline">
        Вернуться к списку игроков
      </Link>
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Link
          to={`/chr/players/${game.player_id}`}
          className="text-slate-400 hover:text-amber-500 transition-colors"
        >
          ← к игроку
        </Link>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              <Link
                to={`/chr/players/${game.player_id}`}
                className="hover:text-amber-400 transition-colors"
              >
                {game.player_name}
              </Link>
            </h1>
            <div className="text-slate-400 text-sm mt-2">
              {game.event} · игра №{game.game_number} · дорожка {game.lane ?? '—'}
            </div>
            <div className="text-slate-400 text-sm">
              {formatDate(game.play_date)} · {formatTime(game.time_start)}–{formatTime(game.time_end)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-xs uppercase tracking-wide">Итог</div>
            <div className="text-5xl font-bold text-amber-400 tabular-nums">{game.total_score}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 grid-cols-[repeat(9,1fr)_1.5fr]">
        {game.frames.map(f => (
          <FrameCell key={f.frame_number} frame={f} />
        ))}
      </div>
    </div>
  )
}
