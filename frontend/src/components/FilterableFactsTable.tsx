import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchKlbPlayerFacts,
  fetchKlbTeamFacts,
  fetchKlbPlayersLookup,
  fetchKlbTeamsLookup,
  fetchKlbPatterns,
  fetchKlbTournamentsMeta,
} from '../api/klb'
import type {
  KlbPatterns,
  KlbTournamentsMeta,
} from '../types/klb'
import SortableTable, { type Column } from './SortableTable'
import LoadingSpinner from './LoadingSpinner'
import {
  MultiSelect,
  SearchableMultiSelect,
  RangeSlider,
  BreakdownToggle,
  type Breakdown,
  type Option,
} from './Filters'

type Mode = 'personal' | 'team'

// Единый внутренний формат строки-факта (личный и командный приведены к нему)
interface ERow {
  entityId: number
  name: string
  club: string | null
  gender: string | null
  hand: string | null
  tid: number
  season: number
  st: string
  g: number
  ss: number
  bg: number | null
  wg: number | null
  patt: number | null
  pLen: number | null
  pVol: number | null
  pRatio: number | null
}

type TableRow = Record<string, unknown>

const round1 = (x: number) => Math.round(x * 10) / 10
const fmtAvg = (v: number | null) => (v == null ? '—' : v.toFixed(2))
const fmtInt = (v: number | null) => (v == null ? '—' : String(v))

// Порядок стадий для удобной сортировки в фильтре
const STAGE_ORDER = [
  'PTQ', 'Основная квалификация', 'VPTQ',
  'RR', 'RR_A', 'RR_B', 'RR_C',
  '1 этап', '2 этап', 'double elimination',
  'Четвертьфинал', 'Полуфинал', 'Финал', 'Матч за 3 место', 'Степледдер',
]
const stageRank = (s: string) => {
  const i = STAGE_ORDER.indexOf(s)
  return i === -1 ? 999 : i
}

export default function FilterableFactsTable({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ERow[]>([])
  const [patterns, setPatterns] = useState<KlbPatterns>({})
  const [tmeta, setTmeta] = useState<KlbTournamentsMeta>({})

  // Фильтры
  const [seasons, setSeasons] = useState<Set<string>>(new Set())
  const [tids, setTids] = useState<Set<string>>(new Set())
  const [stages, setStages] = useState<Set<string>>(new Set())
  const [patts, setPatts] = useState<Set<string>>(new Set())
  const [clubs, setClubs] = useState<Set<string>>(new Set())
  const [players, setPlayers] = useState<Set<string>>(new Set())
  const [genders, setGenders] = useState<Set<string>>(new Set())
  const [hands, setHands] = useState<Set<string>>(new Set())
  const [breakdown, setBreakdown] = useState<Breakdown>('none')

  // Диапазоны (null = ещё не инициализированы из данных)
  const [lenR, setLenR] = useState<[number, number] | null>(null)
  const [volR, setVolR] = useState<[number, number] | null>(null)
  const [ratioR, setRatioR] = useState<[number, number] | null>(null)

  // ── Загрузка ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    const common = Promise.all([fetchKlbPatterns(), fetchKlbTournamentsMeta()])
    if (mode === 'personal') {
      Promise.all([fetchKlbPlayerFacts(), fetchKlbPlayersLookup(), common])
        .then(([facts, lookup, [pat, tm]]) => {
          setPatterns(pat)
          setTmeta(tm)
          setRows(
            facts.map(f => {
              const p = f.patt != null ? pat[String(f.patt)] : undefined
              const l = lookup[String(f.pid)]
              return {
                entityId: f.pid,
                name: l?.name ?? '—',
                club: f.club,
                gender: l?.gender ?? null,
                hand: l?.hand ?? null,
                tid: f.tid,
                season: f.season,
                st: f.st,
                g: f.g,
                ss: f.ss,
                bg: f.bg,
                wg: f.wg,
                patt: f.patt,
                pLen: p?.length ?? null,
                pVol: p?.volume ?? null,
                pRatio: p?.ratio ?? null,
              }
            }),
          )
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      Promise.all([fetchKlbTeamFacts(), fetchKlbTeamsLookup(), common])
        .then(([facts, lookup, [pat, tm]]) => {
          setPatterns(pat)
          setTmeta(tm)
          setRows(
            facts.map(f => {
              const p = f.patt != null ? pat[String(f.patt)] : undefined
              const l = lookup[String(f.teamid)]
              return {
                entityId: f.teamid,
                name: l?.name ?? '—',
                club: l?.club ?? null,
                gender: null,
                hand: null,
                tid: f.tid,
                season: f.season,
                st: f.st,
                g: f.g,
                ss: f.ss,
                bg: f.bg,
                wg: f.wg,
                patt: f.patt,
                pLen: p?.length ?? null,
                pVol: p?.volume ?? null,
                pRatio: p?.ratio ?? null,
              }
            }),
          )
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [mode])

  // ── Границы диапазонов из программ, встречающихся в фактах ───────────
  const bounds = useMemo(() => {
    const lens: number[] = []
    const vols: number[] = []
    const ratios: number[] = []
    const seen = new Set<number>()
    for (const r of rows) {
      if (r.patt == null || seen.has(r.patt)) continue
      seen.add(r.patt)
      if (r.pLen != null) lens.push(r.pLen)
      if (r.pVol != null) vols.push(r.pVol)
      if (r.pRatio != null) ratios.push(r.pRatio)
    }
    const mm = (a: number[]): [number, number] =>
      a.length ? [Math.min(...a), Math.max(...a)] : [0, 0]
    return { len: mm(lens), vol: mm(vols), ratio: mm(ratios) }
  }, [rows])

  // Инициализация диапазонов после загрузки
  useEffect(() => {
    if (rows.length === 0) return
    setLenR(bounds.len)
    setVolR(bounds.vol)
    setRatioR(bounds.ratio)
  }, [bounds, rows.length])

  // ── Списки опций фильтров ────────────────────────────────────────────
  const opts = useMemo(() => {
    const seasonSet = new Set<number>()
    const tidSet = new Set<number>()
    const stageSet = new Set<string>()
    const pattSet = new Set<number>()
    const clubSet = new Set<string>()
    const playerMap = new Map<number, string>()
    const genderSet = new Set<string>()
    const handSet = new Set<string>()
    for (const r of rows) {
      seasonSet.add(r.season)
      tidSet.add(r.tid)
      stageSet.add(r.st)
      if (r.patt != null) pattSet.add(r.patt)
      if (r.club) clubSet.add(r.club)
      if (mode === 'personal') {
        playerMap.set(r.entityId, r.name)
        if (r.gender) genderSet.add(r.gender)
        if (r.hand) handSet.add(r.hand)
      }
    }
    const seasonOpts: Option[] = [...seasonSet]
      .sort((a, b) => b - a)
      .map(s => ({ value: String(s), label: `Сезон ${s}` }))
    const tidOpts: Option[] = [...tidSet]
      .sort((a, b) => {
        const ta = tmeta[String(a)]
        const tb = tmeta[String(b)]
        const ya = ta ? ta.year * 10 + ta.season : 0
        const yb = tb ? tb.year * 10 + tb.season : 0
        return yb - ya
      })
      .map(t => ({ value: String(t), label: tmeta[String(t)]?.name ?? `Турнир ${t}` }))
    const stageOpts: Option[] = [...stageSet]
      .sort((a, b) => stageRank(a) - stageRank(b))
      .map(s => ({ value: s, label: s }))
    const pattOpts: Option[] = [...pattSet]
      .map(p => ({ value: String(p), label: patterns[String(p)]?.name ?? `#${p}` }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
    const clubOpts: Option[] = [...clubSet]
      .sort((a, b) => a.localeCompare(b, 'ru'))
      .map(c => ({ value: c, label: c }))
    const playerOpts: Option[] = [...playerMap.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'ru'))
      .map(([id, name]) => ({ value: String(id), label: name }))
    const genderOpts: Option[] = [...genderSet].sort().map(g => ({ value: g, label: g }))
    const handOpts: Option[] = [...handSet].sort().map(h => ({ value: h, label: h }))
    return { seasonOpts, tidOpts, stageOpts, pattOpts, clubOpts, playerOpts, genderOpts, handOpts }
  }, [rows, tmeta, patterns, mode])

  // ── Фильтрация ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (seasons.size && !seasons.has(String(r.season))) return false
      if (tids.size && !tids.has(String(r.tid))) return false
      if (stages.size && !stages.has(r.st)) return false
      if (patts.size && (r.patt == null || !patts.has(String(r.patt)))) return false
      if (clubs.size && (!r.club || !clubs.has(r.club))) return false
      if (players.size && !players.has(String(r.entityId))) return false
      if (genders.size && (!r.gender || !genders.has(r.gender))) return false
      if (hands.size && (!r.hand || !hands.has(r.hand))) return false
      if (lenR && r.pLen != null && (r.pLen < lenR[0] || r.pLen > lenR[1])) return false
      if (volR && r.pVol != null && (r.pVol < volR[0] || r.pVol > volR[1])) return false
      if (ratioR && r.pRatio != null && (r.pRatio < ratioR[0] || r.pRatio > ratioR[1])) return false
      return true
    })
  }, [rows, seasons, tids, stages, patts, clubs, players, genders, hands, lenR, volR, ratioR])

  // ── Агрегация по ключу группировки ──────────────────────────────────
  const tableRows = useMemo(() => {
    interface Acc {
      entityId: number
      name: string
      season: number | null
      tid: number | null
      ss: number
      g: number
      bg: number | null
      wg: number | null
      tidSet: Set<number>
      seasonSet: Set<number>
      maxTid: number
      clubAtMax: string | null
    }
    const groups = new Map<string, Acc>()
    for (const r of filtered) {
      const key =
        breakdown === 'none'
          ? String(r.entityId)
          : breakdown === 'season'
            ? `${r.entityId}|s${r.season}`
            : `${r.entityId}|t${r.tid}`
      let a = groups.get(key)
      if (!a) {
        a = {
          entityId: r.entityId,
          name: r.name,
          season: breakdown === 'season' ? r.season : null,
          tid: breakdown === 'tid' ? r.tid : null,
          ss: 0,
          g: 0,
          bg: null,
          wg: null,
          tidSet: new Set(),
          seasonSet: new Set(),
          maxTid: -1,
          clubAtMax: null,
        }
        groups.set(key, a)
      }
      a.ss += r.ss
      a.g += r.g
      if (r.bg != null) a.bg = a.bg == null ? r.bg : Math.max(a.bg, r.bg)
      if (r.wg != null) a.wg = a.wg == null ? r.wg : Math.min(a.wg, r.wg)
      a.tidSet.add(r.tid)
      a.seasonSet.add(r.season)
      if (r.tid >= a.maxTid) {
        a.maxTid = r.tid
        a.clubAtMax = r.club
      }
    }

    const out: TableRow[] = []
    for (const [key, a] of groups) {
      const seasonsList = [...a.seasonSet].sort((x, y) => x - y).join(', ')
      out.push({
        _key: key,
        entityId: a.entityId,
        name: a.name,
        club: a.clubAtMax,
        season: a.season,
        tname: a.tid != null ? tmeta[String(a.tid)]?.name ?? `Турнир ${a.tid}` : null,
        seasonsList,
        games: a.g,
        avg: a.g > 0 ? round1(a.ss / a.g) : null,
        best: a.bg,
        worst: a.wg,
        tournaments: a.tidSet.size,
      })
    }
    return out
  }, [filtered, breakdown, tmeta, mode])

  // ── Колонки ──────────────────────────────────────────────────────────
  const columns = useMemo(() => {
    const cols: Column<TableRow>[] = []
    cols.push({
      key: 'name',
      label: mode === 'personal' ? 'Имя' : 'Команда',
      render: r => <span className="font-medium text-white capitalize">{r.name as string}</span>,
    })
    cols.push({
      key: 'club',
      label: 'Клуб',
      render: r => <span className="text-slate-300 capitalize">{(r.club as string) ?? '—'}</span>,
    })
    if (breakdown === 'season') {
      cols.push({ key: 'season', label: 'Сезон', numeric: true })
    } else if (breakdown === 'tid') {
      cols.push({
        key: 'tname',
        label: 'Турнир',
        render: r => <span className="text-slate-300 text-xs">{(r.tname as string) ?? '—'}</span>,
      })
    } else if (mode === 'team') {
      cols.push({
        key: 'seasonsList',
        label: 'Сезоны',
        sortable: false,
        render: r => <span className="text-slate-400 text-xs">{r.seasonsList as string}</span>,
      })
    }
    cols.push({ key: 'games', label: 'Игр', numeric: true })
    cols.push({
      key: 'avg',
      label: 'Средний',
      numeric: true,
      render: r => <span className="font-semibold text-amber-400">{fmtAvg(r.avg as number | null)}</span>,
    })
    cols.push({
      key: 'best',
      label: mode === 'team' ? 'Лучшая (плейофф)' : 'Лучшая',
      numeric: true,
      render: r => <span className="text-green-400">{fmtInt(r.best as number | null)}</span>,
    })
    if (mode === 'personal') {
      cols.push({
        key: 'worst',
        label: 'Худшая',
        numeric: true,
        render: r => <span className="text-red-400">{fmtInt(r.worst as number | null)}</span>,
      })
    }
    if (breakdown !== 'tid') {
      cols.push({ key: 'tournaments', label: 'Турниров', numeric: true })
    }
    return cols
  }, [mode, breakdown])

  function resetAll() {
    setSeasons(new Set())
    setTids(new Set())
    setStages(new Set())
    setPatts(new Set())
    setClubs(new Set())
    setPlayers(new Set())
    setGenders(new Set())
    setHands(new Set())
    setLenR(bounds.len)
    setVolR(bounds.vol)
    setRatioR(bounds.ratio)
    setBreakdown('none')
  }

  const activeFilters =
    seasons.size + tids.size + stages.size + patts.size + clubs.size + players.size + genders.size + hands.size

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {/* Панель фильтров */}
      <div className="flex flex-wrap items-start gap-2 mb-3">
        <MultiSelect label="Сезоны" options={opts.seasonOpts} selected={seasons} onChange={setSeasons} />
        <MultiSelect label="Турниры" options={opts.tidOpts} selected={tids} onChange={setTids} />
        <MultiSelect label="Стадии" options={opts.stageOpts} selected={stages} onChange={setStages} />
        <MultiSelect label="Программа" options={opts.pattOpts} selected={patts} onChange={setPatts} />
        <MultiSelect label="Клуб" options={opts.clubOpts} selected={clubs} onChange={setClubs} />
        {mode === 'personal' && (
          <>
            <SearchableMultiSelect label="Игроки" options={opts.playerOpts} selected={players} onChange={setPlayers} />
            <MultiSelect label="Пол" options={opts.genderOpts} selected={genders} onChange={setGenders} />
            <MultiSelect label="Рука" options={opts.handOpts} selected={hands} onChange={setHands} />
          </>
        )}
      </div>

      {/* Бегунки + разбивка */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {lenR && (
          <RangeSlider
            label="Длина"
            min={bounds.len[0]}
            max={bounds.len[1]}
            lo={lenR[0]}
            hi={lenR[1]}
            unit=" фт"
            onChange={(lo, hi) => setLenR([lo, hi])}
          />
        )}
        {volR && (
          <RangeSlider
            label="Объём"
            min={bounds.vol[0]}
            max={bounds.vol[1]}
            lo={volR[0]}
            hi={volR[1]}
            step={0.01}
            unit=" мл"
            onChange={(lo, hi) => setVolR([lo, hi])}
          />
        )}
        {ratioR && (
          <RangeSlider
            label="Ратио"
            min={bounds.ratio[0]}
            max={bounds.ratio[1]}
            lo={ratioR[0]}
            hi={ratioR[1]}
            step={0.01}
            onChange={(lo, hi) => setRatioR([lo, hi])}
          />
        )}
        <BreakdownToggle value={breakdown} onChange={setBreakdown} />
        {(activeFilters > 0 || breakdown !== 'none') && (
          <button onClick={resetAll} className="text-xs text-amber-400 hover:underline">
            Сбросить всё
          </button>
        )}
      </div>

      <div className="mb-2 text-sm text-slate-500">{tableRows.length} строк</div>

      <SortableTable
        rows={tableRows}
        columns={columns}
        getKey={r => r._key as string}
        defaultSortKey="avg"
        defaultSortDir="desc"
        onRowClick={r =>
          navigate(
            mode === 'personal'
              ? `/klb/personal/players/${r.entityId}`
              : `/klb/team/teams/${r.entityId}`,
          )
        }
      />
    </div>
  )
}
