import { useEffect, useState, useMemo, type ReactNode } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { fetchPlayers, fetchEvents } from '../api/client'
import type { PlayerStats, EventInfo, SortDirection } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import MedalBadge from '../components/MedalBadge'
import SortIcon from '../components/SortIcon'

type SortKey = keyof PlayerStats

// Человеческие названия зачётов (в данных — англоязычные коды).
const EVENT_LABELS: Record<string, string> = {
  doubles: 'Парный',
  'doubles mix': 'Пары микс',
  single: 'Личный',
}
const eventLabel = (e: string) => EVENT_LABELS[e] ?? e

const COLUMNS: { key: SortKey; label: ReactNode; title?: string }[] = [
  { key: 'player_name', label: 'Имя' },
  { key: 'games_played', label: 'Игр' },
  { key: 'events_played', label: 'Зачётов' },
  { key: 'average_score', label: 'Средний' },
  { key: 'best_game', label: 'Лучшая' },
  { key: 'worst_game', label: 'Худшая' },
  { key: 'score_diff', label: 'Разница' },
  { key: 'strikes', label: 'X всего' },
  { key: 'strike_percent', label: 'X %' },
  { key: 'spares', label: 'Добито' },
  { key: 'spare_conversion_percent', label: 'Добито %' },
  { key: 'singles_left', label: <>Одиночек<br />осталось</> },
  { key: 'singles_converted', label: <>Одиночек<br />добито</> },
  { key: 'singles_missed', label: <>Одиночек<br />мимо</> },
  { key: 'single_pin_percent', label: '9-pin %' },
]

const NUM_KEYS = new Set<SortKey>([
  'games_played','events_played','average_score','best_game','worst_game','score_diff',
  'strike_attempts','strikes','strike_percent','spares','opens','spare_conversion_percent',
  'singles_left','singles_converted','singles_missed','single_pin_percent','total_pins',
  'blocks_with_frames',
])

const fmtPct = (v: number | null) => (v == null ? '—' : `${v.toFixed(2)}%`)
// Счётчики по фреймам: «—» для игрока без раскадровки (нет ни одной попытки
// страйка → фреймов нет вообще). У того, кто бросал, попыток всегда > 0, так
// что настоящий ноль (0 страйков при попытках) показывается как 0.
const hasFrames = (p: PlayerStats) => p.strike_attempts > 0
const fc = (p: PlayerStats, v: number) => (hasFrames(p) ? String(v) : '—')

interface Totals {
  games_played: number
  average_score: number
  best_game: number
  worst_game: number
  strikes: number
  strike_percent: number | null
  spares: number
  spare_conversion_percent: number | null
  singles_left: number
  singles_converted: number
  singles_missed: number
  single_pin_percent: number | null
}

// Итоги считаем из сумм (а не средним по средним): так корректно при нулевых
// процентах у зачёта 'single' без фреймов — пустые блоки просто не участвуют.
function computeTotals(players: PlayerStats[]): Totals | null {
  if (players.length === 0) return null
  const sum = (f: (p: PlayerStats) => number) => players.reduce((s, p) => s + f(p), 0)
  const games = sum(p => p.games_played)
  const pins = sum(p => p.total_pins)
  const sa = sum(p => p.strike_attempts)
  const strikes = sum(p => p.strikes)
  const spares = sum(p => p.spares)
  const opens = sum(p => p.opens)
  const sl = sum(p => p.singles_left)
  const sc = sum(p => p.singles_converted)
  const pct = (num: number, den: number) => (den > 0 ? (num * 100) / den : null)
  return {
    games_played: games,
    average_score: games > 0 ? pins / games : 0,
    best_game: Math.max(...players.map(p => p.best_game)),
    worst_game: Math.min(...players.map(p => p.worst_game)),
    strikes,
    strike_percent: pct(strikes, sa),
    spares,
    spare_conversion_percent: pct(spares, spares + opens),
    singles_left: sl,
    singles_converted: sc,
    singles_missed: sl - sc,
    single_pin_percent: pct(sc, sl),
  }
}

// Стили вынесены наружу — общие для всех экземпляров таблицы.
const TH = 'bg-slate-800 px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-white whitespace-nowrap'
const TD = 'px-3 py-2 text-sm'
const TD_NUM = 'px-3 py-2 text-sm text-right tabular-nums'
// Липкий первый столбец (имя) на мобиле требует непрозрачного фона —
// эквиваленты «зебры» bg-slate-800/30 и /60 поверх slate-900.
const STICKY_BG_EVEN = 'bg-[#141c2f]'
const STICKY_BG_ODD = 'bg-[#182234]'
const MEDAL_HIDE = 'hidden md:table-cell'
const CORNER = 'sticky left-0 z-30 md:static md:z-auto'
const nameCol = (i: number) =>
  `sticky left-0 z-10 max-w-[150px] whitespace-normal ${i % 2 === 0 ? STICKY_BG_EVEN : STICKY_BG_ODD} md:static md:z-auto md:bg-transparent md:max-w-none`

interface TableProps {
  rows: PlayerStats[]
  title?: string
  sortKey: SortKey
  sortDir: SortDirection
  onSort: (key: SortKey) => void
  navigate: NavigateFunction
}

function PlayersTable({ rows, title, sortKey, sortDir, onSort, navigate }: TableProps) {
  const totals = useMemo(() => computeTotals(rows), [rows])

  return (
    <div>
      {title && <h2 className="text-lg font-semibold text-amber-400 mb-2">{title}</h2>}
      <div className="rounded-lg border border-slate-700 overflow-auto max-h-[78vh] md:max-h-none md:overflow-visible">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 md:top-[61px] z-20">
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className={`${TH} ${MEDAL_HIDE} w-8`}>#</th>
              {COLUMNS.map((col, idx) => (
                <th
                  key={col.key}
                  className={`${TH} ${idx === 0 ? CORNER : ''}`}
                  onClick={() => onSort(col.key)}
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} direction={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((player, i) => (
              <tr
                key={player.player_id}
                onClick={() => navigate(`/chr/players/${player.player_id}`)}
                className={`border-b border-slate-700/50 cursor-pointer transition-colors ${
                  i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60'
                } hover:bg-slate-700/70`}
              >
                <td className={`${TD} ${MEDAL_HIDE} text-center`}>
                  <MedalBadge rank={i + 1} />
                </td>
                <td className={`${TD} font-medium text-white ${nameCol(i)}`}>{player.player_name}</td>
                <td className={TD_NUM}>{player.games_played}</td>
                <td className={TD_NUM}>{player.events_played}</td>
                <td className={`${TD_NUM} font-semibold text-amber-400`}>{player.average_score.toFixed(2)}</td>
                <td className={`${TD_NUM} text-green-400`}>{player.best_game}</td>
                <td className={`${TD_NUM} text-red-400`}>{player.worst_game}</td>
                <td className={TD_NUM}>{player.score_diff}</td>
                <td className={TD_NUM}>{fc(player, player.strikes)}</td>
                <td className={`${TD_NUM} text-amber-300`}>{fmtPct(player.strike_percent)}</td>
                <td className={TD_NUM}>{fc(player, player.spares)}</td>
                <td className={`${TD_NUM} text-amber-300`}>{fmtPct(player.spare_conversion_percent)}</td>
                <td className={TD_NUM}>{fc(player, player.singles_left)}</td>
                <td className={TD_NUM}>{fc(player, player.singles_converted)}</td>
                <td className={`${TD_NUM} text-red-400`}>{fc(player, player.singles_missed)}</td>
                <td className={`${TD_NUM} text-amber-300`}>{fmtPct(player.single_pin_percent)}</td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="bg-slate-700 border-t-2 border-amber-500/50 font-semibold text-slate-200">
                <td className={`${TD} ${MEDAL_HIDE}`}></td>
                <td className={`${TD} text-amber-400 font-bold sticky left-0 z-10 bg-slate-700 md:static md:z-auto md:bg-transparent`}>ИТОГО</td>
                <td className={TD_NUM}>{totals.games_played}</td>
                <td className={TD_NUM}>—</td>
                <td className={`${TD_NUM} text-amber-400`}>{totals.average_score.toFixed(2)}</td>
                <td className={`${TD_NUM} text-green-400`}>{totals.best_game}</td>
                <td className={`${TD_NUM} text-red-400`}>{totals.worst_game}</td>
                <td className={TD_NUM}>—</td>
                <td className={TD_NUM}>{totals.strikes}</td>
                <td className={`${TD_NUM} text-amber-300`}>{fmtPct(totals.strike_percent)}</td>
                <td className={TD_NUM}>{totals.spares}</td>
                <td className={`${TD_NUM} text-amber-300`}>{fmtPct(totals.spare_conversion_percent)}</td>
                <td className={TD_NUM}>{totals.singles_left}</td>
                <td className={TD_NUM}>{totals.singles_converted}</td>
                <td className={`${TD_NUM} text-red-400`}>{totals.singles_missed}</td>
                <td className={`${TD_NUM} text-amber-300`}>{fmtPct(totals.single_pin_percent)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export default function PlayersPage() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [events, setEvents] = useState<EventInfo[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [splitByGender, setSplitByGender] = useState(false)
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
      const an = av == null ? -Infinity : Number(av)
      const bn = bv == null ? -Infinity : Number(bv)
      return sortDir === 'asc' ? an - bn : bn - an
    })
  }, [players, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(NUM_KEYS.has(key) ? 'desc' : 'asc')
    }
  }

  const tableProps = { sortKey, sortDir, onSort: handleSort, navigate }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-white">Игроки</h1>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
          {[{ value: '', label: 'Все' }, ...events.map(e => ({ value: e.event, label: eventLabel(e.event) }))].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedEvent(opt.value)}
              className={`shrink-0 whitespace-nowrap px-4 py-2 rounded text-sm font-medium transition-colors ${
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

      <div className="flex flex-col gap-2 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Средний и количество игр — по всем зачётам. Проценты и счётчики по фреймам (страйки, добитые, одиночки) — только по блокам с раскадровкой (парный и пары микс).
          <br />
          Исключение — Сазонов&nbsp;Иван: раскадровка есть и в личном, поэтому его фреймовые показатели считаются по всем трём блокам.
        </p>
        <button
          onClick={() => setSplitByGender(v => !v)}
          className={`shrink-0 whitespace-nowrap px-4 py-2 rounded text-sm font-medium transition-colors ${
            splitByGender
              ? 'bg-amber-500 text-slate-900'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Разбивка по полу
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : splitByGender ? (
        <div className="flex flex-col gap-8">
          {[{ g: 'М', label: 'Мужчины' }, { g: 'Ж', label: 'Женщины' }]
            .map(({ g, label }) => ({ label, rows: sorted.filter(p => p.gender === g) }))
            .filter(grp => grp.rows.length > 0)
            .map(grp => (
              <PlayersTable key={grp.label} rows={grp.rows} title={grp.label} {...tableProps} />
            ))}
        </div>
      ) : (
        <PlayersTable rows={sorted} {...tableProps} />
      )}
    </div>
  )
}
