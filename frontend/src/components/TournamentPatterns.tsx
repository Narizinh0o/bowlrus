import { useEffect, useState } from 'react'
import { fetchKlbPatterns, fetchKlbTournamentsMeta } from '../api/klb'
import type { KlbPattern, KlbPatterns, KlbTournamentsMeta } from '../types/klb'

function OilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5s6 6.8 6 11a6 6 0 1 1-12 0c0-4.2 6-11 6-11z" />
    </svg>
  )
}

function PatternModal({ pattern, title, onClose }: { pattern: KlbPattern; title: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-w-3xl w-full rounded-lg border border-slate-700 bg-slate-900 p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-400">{title}</div>
            <h3 className="text-lg font-semibold text-white">{pattern.name}</h3>
            <p className="text-sm text-slate-400 mt-1">
              Длина: {pattern.length} фт · Объём: {pattern.volume} мл · Ратио:{' '}
              {pattern.ratio != null ? pattern.ratio : '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none px-2"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        {pattern.photo ? (
          <img
            src={pattern.photo}
            alt={pattern.name}
            className="w-full rounded border border-slate-700 bg-slate-800"
          />
        ) : (
          <div className="text-slate-500 text-sm py-10 text-center">Фото программы не загружено.</div>
        )}
      </div>
    </div>
  )
}

/**
 * Иконки-ссылки на фото программ масла для турнира.
 * Сам грузит patterns.json и tournaments.json по tid.
 * Если у турнира своя PTQ-прога (ptq != null и != main) — две иконки.
 */
export default function TournamentPatterns({ tid }: { tid: number }) {
  const [patterns, setPatterns] = useState<KlbPatterns | null>(null)
  const [meta, setMeta] = useState<KlbTournamentsMeta | null>(null)
  const [active, setActive] = useState<{ pattern: KlbPattern; title: string } | null>(null)

  useEffect(() => {
    Promise.all([fetchKlbPatterns(), fetchKlbTournamentsMeta()])
      .then(([p, m]) => {
        setPatterns(p)
        setMeta(m)
      })
      .catch(console.error)
  }, [])

  if (!patterns || !meta) return null
  const tmeta = meta[String(tid)]
  if (!tmeta) return null

  const mainP = tmeta.main != null ? patterns[String(tmeta.main)] : null
  const ptqIsSeparate = tmeta.ptq != null && tmeta.ptq !== tmeta.main
  const ptqP = ptqIsSeparate && tmeta.ptq != null ? patterns[String(tmeta.ptq)] : null

  if (!mainP && !ptqP) return null

  const btnCls =
    'inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-amber-400 hover:border-amber-500/50 transition-colors'

  return (
    <div className="flex items-center gap-2">
      {mainP && (
        <button
          className={btnCls}
          onClick={() => setActive({ pattern: mainP, title: ptqP ? 'Основная' : 'Программа' })}
          title={mainP.name}
        >
          <OilIcon />
          {ptqP ? 'Основная' : 'Программа'}
        </button>
      )}
      {ptqP && (
        <button className={btnCls} onClick={() => setActive({ pattern: ptqP, title: 'PTQ' })} title={ptqP.name}>
          <OilIcon />
          PTQ
        </button>
      )}
      {active && <PatternModal pattern={active.pattern} title={active.title} onClose={() => setActive(null)} />}
    </div>
  )
}
