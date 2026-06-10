import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { fetchPlayer } from '../api/client'
import type { PlayerDetail } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const EVENT_LABELS: Record<string, string> = {
  doubles: 'Парный',
  'doubles mix': 'Пары микс',
  single: 'Личный',
}
const eventLabel = (e: string) => EVENT_LABELS[e] ?? e

const RANK_LABELS: Record<string, string> = {
  '1': '1 разряд',
  кмс: 'КМС',
  мс: 'МС',
}
const rankLabel = (r: string) => RANK_LABELS[r] ?? r

const fmtPct = (v: number | null) => (v == null ? '—' : `${v.toFixed(2)}%`)

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="text-slate-400 text-sm mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
    </div>
  )
}

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PlayerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchPlayer(Number(id))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error || !data) return (
    <div className="text-center py-20 text-slate-400">
      Игрок не найден. <Link to="/chr/players" className="text-amber-500 hover:underline">Вернуться к списку</Link>
    </div>
  )

  const { games } = data
  const chartData = games.map((g, i) => ({
    name: `#${i + 1}`,
    score: g.total_score,
    event: g.event,
  }))
  const avgLine = data.average_score

  const tdCls = 'px-3 py-2 text-sm border-b border-slate-700/50'
  const tdNumCls = 'px-3 py-2 text-sm text-right tabular-nums border-b border-slate-700/50'

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Link to="/chr/players" className="text-slate-400 hover:text-amber-500 transition-colors shrink-0">
            ← Игроки
          </Link>
          <h1 className="text-3xl font-bold text-white">{data.player_name}</h1>
        </div>
        {(data.sport_rank || data.region) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400">
            {data.sport_rank && (
              <span className="rounded bg-slate-700 px-2 py-0.5 text-xs font-medium text-amber-300">
                {rankLabel(data.sport_rank)}
              </span>
            )}
            {data.region && <span>{data.region}</span>}
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
        <StatCard label="Средний" value={data.average_score.toFixed(2)} sub={`${data.games_played} игр`} />
        <StatCard label="Лучшая игра" value={data.best_game} />
        <StatCard label="Страйк %" value={fmtPct(data.strike_percent)} sub={`${data.strikes} из ${data.strike_attempts}`} />
        <StatCard label="Спэа %" value={fmtPct(data.spare_conversion_percent)} sub={`${data.spares} спэа`} />
        <StatCard label="Single pin %" value={fmtPct(data.single_pin_percent)} sub={`${data.singles_converted} из ${data.singles_left}`} />
        <StatCard label="Худшая игра" value={data.worst_game} />
        <StatCard label="Разброс" value={data.score_diff} sub="лучшая − худшая" />
        <StatCard label="Зачётов" value={data.events_played} />
      </div>

      {data.blocks_with_frames > 0 && (
        <p className="text-xs text-slate-500 mb-8">
          Средний и количество игр — по всем {data.events_played}&nbsp;блокам ({data.games_played} игр).
          Страйки, спэа и одиночки рассчитаны по {data.blocks_with_frames}&nbsp;блокам с раскадровкой по фреймам.
        </p>
      )}

      {/* Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Динамика счёта по играм</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#f59e0b' }}
              formatter={(val) => [val, 'Счёт']}
            />
            <ReferenceLine y={avgLine} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Ср. ${avgLine.toFixed(0)}`, fill: '#f59e0b', fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Games table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Все игры</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700/50">
              {['Дата', 'Событие', '№ игры', 'Дорожка', 'Начало', 'Конец', 'Счёт'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((g, i) => (
              <tr
                key={g.game_id}
                onClick={() => navigate(`/chr/games/${g.game_id}`)}
                className={`cursor-pointer transition-colors hover:bg-slate-700/70 ${
                  i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60'
                }`}
              >
                <td className={tdCls}>{g.play_date ?? '—'}</td>
                <td className={tdCls}>{eventLabel(g.event)}</td>
                <td className={tdNumCls}>{g.game_number}</td>
                <td className={tdNumCls}>{g.lane ?? '—'}</td>
                <td className={tdCls}>{g.time_start ?? '—'}</td>
                <td className={tdCls}>{g.time_end ?? '—'}</td>
                <td className={`${tdNumCls} font-bold text-amber-400 text-base`}>{g.total_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
