import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Meta {
  counts: Record<string, number>
}

export default function HomePage() {
  const [klbMeta, setKlbMeta] = useState<Meta | null>(null)
  const [chrMeta, setChrMeta] = useState<Meta | null>(null)

  useEffect(() => {
    fetch('/data/klb/meta.json').then(r => r.json()).then(setKlbMeta).catch(() => {})
    fetch('/data/chr/meta.json').then(r => r.json()).then(setChrMeta).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-10">
      <div className="text-center">
        <div className="text-6xl mb-4">🎳</div>
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-3">
          BowlRus Stats
        </h1>
        <p className="text-lg text-slate-400">
          Статистика соревнований по боулингу
        </p>
      </div>

      <div className="flex gap-6 mt-2">
        <Link
          to="/klb"
          className="group bg-slate-800 border border-slate-700 rounded-2xl p-8 w-80 hover:border-amber-500 transition-all duration-200"
        >
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
            КЛБ
          </h2>
          <p className="text-slate-400 text-sm mb-4">Континентальная Лига Боулинга</p>
          {klbMeta ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{klbMeta.counts.personal_players} игроков</span>
              <span>·</span>
              <span>{klbMeta.counts.personal_tournaments} турниров</span>
              <span>·</span>
              <span>{klbMeta.counts.teams} команд</span>
              <span>·</span>
              <span>{klbMeta.counts.seasons} сезона</span>
            </div>
          ) : (
            <div className="text-xs text-slate-600">загрузка...</div>
          )}
        </Link>

        <Link
          to="/chr"
          className="group bg-slate-800 border border-slate-700 rounded-2xl p-8 w-80 hover:border-amber-500 transition-all duration-200"
        >
          <div className="text-4xl mb-4">🥇</div>
          <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
            ЧР 2026
          </h2>
          <p className="text-slate-400 text-sm mb-4">Чемпионат России · 2–7 мая 2026</p>
          {chrMeta ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{chrMeta.counts.players} игроков</span>
              <span>·</span>
              <span>{chrMeta.counts.events} зачёта</span>
            </div>
          ) : (
            <div className="text-xs text-slate-600">загрузка...</div>
          )}
        </Link>
      </div>
    </div>
  )
}
