import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPlayers, fetchEvents } from '../api/client'
import type { PlayerStats, EventInfo, SortDirection } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import MedalBadge from '../components/MedalBadge'
import SortIcon from '../components/SortIcon'

type SortKey = keyof PlayerStats

const COLUMNS: { key: SortKey; label: string; title?: string }[] = [
  { key: 'player_name', label: 'Имя' },
  { key: 'games_played', label: 'Игр' },
  { key: 'events_played', label: 'Зачётов' },
  { key: 'average_score', label: 'Средний' },
  { key: 'best_game', label: 'Лучшая' },
  { key: 'worst_game', label: 'Худшая' },
  { key: 'score_diff', label: 'Разница' },
  { key: 'strike_attempts', label: 'X попыток' },
  { key: 'strikes', label: 'X закрыто' },
  { key: 'strike_percent', label: 'X %' },
  { key: 'spares', label: 'Спэа' },
  { key: 'spare_conversion_percent', label: 'Спэа %' },
  { key: 'singles_left', label: '9-pin попыток' },
  { key: 'singles_converted', label: '9-pin закрыто' },
  { key: 'singles_missed', label: '9-pin промах' },
  { key: 'single_pin_percent', label: '9-pin %' },
]

const NUM_KEYS = new Set<SortKey>([
  'games_played','events_played','average_score','best_game','worst_game','score_diff',
  'strike_attempts','strikes','strike_percent','spares','opens','spare_conversion_percent',
  'singles_left','singles_converted','singles_missed','single_pin_percent','total_pins',
])

export default function PlayersPage() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [events, setEvents] = useState<EventInfo[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('average_score')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  useEffect(() => {
    fetchEvents().then(setEvents).catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchPlayers(selectedEvent || undefined)
      .then(setPlayers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedEvent])

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv, 'ru') : bv.localeCompare(av, 'ru')
      }
      const an = Number(av) ?? 0
      const bn = Number(bv) ?? 0
      return sortDir === 'asc' ? an - bn : bn - an
    })
  }, [players, sortKey, sortDir])

  const totals = useMemo(() => {
    if (players.length === 0) return null
    return {
      games_played: players.reduce((s, p) => s + p.games_played, 0),
      total_pins: players.reduce((s, p) => s + p.total_pins, 0),
      average_score: players.reduce((s, p) => s + p.average_score, 0) / players.length,
      best_game: Math.max(...players.map(p => p.best_game)),
      worst_game: Math.min(...players.map(p => p.worst_game)),
      strike_attempts: players.reduce((s, p) => s + p.strike_attempts, 0),
      strikes: players.reduce((s, p) => s + p.strikes, 0),
      strike_percent: players.reduce((s, p) => s + p.strike_percent, 0) / players.length,
      spares: players.reduce((s, p) => s + p.spares, 0),
      spare_conversion_percent: players.reduce((s, p) => s + p.spare_conversion_percent, 0) / players.length,
      singles_left: players.reduce((s, p) => s + p.singles_left, 0),
      singles_converted: players.reduce((s, p) => s + p.singles_converted, 0),
      singles_missed: players.reduce((s, p) => s + p.singles_missed, 0),
      single_pin_percent: players.reduce((s, p) => s + p.single_pin_percent, 0) / players.length,
    }
  }, [players])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(NUM_KEYS.has(key) ? 'desc' : 'asc')
    }
  }

  const th = 'px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-white whitespace-nowrap'
  const td = 'px-3 py-2 text-sm'
  const tdNum = 'px-3 py-2 text-sm text-right tabular-nums'

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-white">Игроки</h1>
        <div className="flex gap-2">
          {[{ value: '', label: 'Все' }, ...events.map(e => ({ value: e.event, label: e.event }))].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedEvent(opt.value)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                selectedEvent === opt.value
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                <th className={`${th} w-8`}>#</th>
                {COLUMNS.map(col => (
                  <th key={col.key} className={th} onClick={() => handleSort(col.key)}>
                    {col.label}
                    <SortIcon active={sortKey === col.key} direction={sortDir} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, i) => (
                <tr
                  key={player.player_id}
                  onClick={() => navigate(`/chr/players/${player.player_id}`)}
                  className={`border-b border-slate-700/50 cursor-pointer transition-colors ${
                    i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60'
                  } hover:bg-slate-700/70`}
                >
                  <td className={`${td} text-center`}>
                    <MedalBadge rank={i + 1} />
                  </td>
                  <td className={`${td} font-medium text-white`}>{player.player_name}</td>
                  <td className={tdNum}>{player.games_played}</td>
                  <td className={tdNum}>{player.events_played}</td>
                  <td className={`${tdNum} font-semibold text-amber-400`}>{player.average_score.toFixed(2)}</td>
                  <td className={`${tdNum} text-green-400`}>{player.best_game}</td>
                  <td className={`${tdNum} text-red-400`}>{player.worst_game}</td>
                  <td className={tdNum}>{player.score_diff}</td>
                  <td className={tdNum}>{player.strike_attempts}</td>
                  <td className={tdNum}>{player.strikes}</td>
                  <td className={`${tdNum} text-amber-300`}>{player.strike_percent?.toFixed(2)}%</td>
                  <td className={tdNum}>{player.spares}</td>
                  <td className={`${tdNum} text-amber-300`}>{player.spare_conversion_percent?.toFixed(2)}%</td>
                  <td className={tdNum}>{player.singles_left}</td>
                  <td className={tdNum}>{player.singles_converted}</td>
                  <td className={`${tdNum} text-red-400`}>{player.singles_missed}</td>
                  <td className={`${tdNum} text-amber-300`}>{player.single_pin_percent?.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="bg-slate-700 border-t-2 border-amber-500/50 font-semibold text-slate-200">
                  <td colSpan={2} className={`${td} text-amber-400 font-bold`}>ИТОГО ПО ТУРНИРУ</td>
                  <td className={tdNum}>{totals.games_played}</td>
                  <td className={tdNum}>—</td>
                  <td className={`${tdNum} text-amber-400`}>{totals.average_score.toFixed(2)}</td>
                  <td className={`${tdNum} text-green-400`}>{totals.best_game}</td>
                  <td className={`${tdNum} text-red-400`}>{totals.worst_game}</td>
                  <td className={tdNum}>—</td>
                  <td className={tdNum}>{totals.strike_attempts}</td>
                  <td className={tdNum}>{totals.strikes}</td>
                  <td className={`${tdNum} text-amber-300`}>{totals.strike_percent.toFixed(2)}%</td>
                  <td className={tdNum}>{totals.spares}</td>
                  <td className={`${tdNum} text-amber-300`}>{totals.spare_conversion_percent.toFixed(2)}%</td>
                  <td className={tdNum}>{totals.singles_left}</td>
                  <td className={tdNum}>{totals.singles_converted}</td>
                  <td className={`${tdNum} text-red-400`}>{totals.singles_missed}</td>
                  <td className={`${tdNum} text-amber-300`}>{totals.single_pin_percent.toFixed(2)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
