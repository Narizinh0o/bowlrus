import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchKlbPersonalTournaments } from '../../../api/klb'
import type { KlbTournamentInfo } from '../../../types/klb'
import LoadingSpinner from '../../../components/LoadingSpinner'

export default function PersonalTournamentsPage() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState<KlbTournamentInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKlbPersonalTournaments()
      .then(setTournaments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const bySeason = tournaments.reduce<Record<number, KlbTournamentInfo[]>>((acc, t) => {
    ;(acc[t.season] ??= []).push(t)
    return acc
  }, {})

  const seasons = Object.keys(bySeason)
    .map(Number)
    .sort((a, b) => b - a)

  const th = 'px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide'
  const td = 'px-4 py-2 text-sm'

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-5">Турниры · Личный зачёт</h1>
      <div className="flex flex-col gap-6">
        {seasons.map(season => (
          <div key={season} className="rounded-lg border border-slate-700 overflow-hidden">
            <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-white font-semibold">Сезон {season}</h2>
              <span className="text-slate-500 text-sm">{bySeason[season].length} этапов</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className={th}>Название</th>
                  <th className={`${th} text-right`}>Год</th>
                  <th className={`${th} text-right`}>Этап</th>
                </tr>
              </thead>
              <tbody>
                {bySeason[season]
                  .slice()
                  .sort((a, b) => a.stage - b.stage)
                  .map((t, i) => (
                    <tr
                      key={t.tournament_id}
                      onClick={() => navigate(`/klb/personal/tournaments/${t.tournament_id}`)}
                      className={`border-b border-slate-700/50 cursor-pointer transition-colors hover:bg-slate-700/70 ${
                        i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60'
                      }`}
                    >
                      <td className={`${td} font-medium text-white`}>{t.name}</td>
                      <td className={`${td} text-right tabular-nums text-slate-300`}>{t.year}</td>
                      <td className={`${td} text-right tabular-nums text-slate-300`}>{t.stage}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
