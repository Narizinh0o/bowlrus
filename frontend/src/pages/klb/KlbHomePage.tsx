import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchKlbMeta } from '../../api/klb'

export default function KlbHomePage() {
  const [meta, setMeta] = useState<{ counts: Record<string, number> } | null>(null)

  useEffect(() => {
    fetchKlbMeta().then(setMeta).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-10">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
          КЛБ
        </h1>
        <p className="text-slate-400">Континентальная Лига Боулинга</p>
        {meta && (
          <p className="text-slate-500 text-sm mt-1">
            {meta.counts.seasons} сезона · {meta.counts.personal_players} игроков · {meta.counts.teams} команд
          </p>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-xs md:w-auto md:max-w-none">
        <Link
          to="/klb/personal/players"
          className="group bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full md:w-72 hover:border-amber-500 transition-all duration-200"
        >
          <div className="text-4xl mb-4">🎳</div>
          <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
            Личный
          </h2>
          <p className="text-slate-400 text-sm mb-4">Личный зачёт игроков</p>
          {meta && (
            <div className="text-xs text-slate-500">
              {meta.counts.personal_players} игроков · {meta.counts.personal_tournaments} турниров
            </div>
          )}
        </Link>

        <Link
          to="/klb/team/teams"
          className="group bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full md:w-72 hover:border-amber-500 transition-all duration-200"
        >
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
            Командный
          </h2>
          <p className="text-slate-400 text-sm mb-4">Командный зачёт</p>
          {meta && (
            <div className="text-xs text-slate-500">
              {meta.counts.teams} команд · {meta.counts.team_tournaments} турниров
            </div>
          )}
        </Link>
      </div>
    </div>
  )
}
