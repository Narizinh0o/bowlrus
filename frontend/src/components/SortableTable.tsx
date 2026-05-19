import { useMemo, useState, type ReactNode } from 'react'
import MedalBadge from './MedalBadge'
import SortIcon from './SortIcon'

export interface Column<T> {
  key: string
  label: ReactNode
  numeric?: boolean
  sortable?: boolean
  render?: (row: T) => ReactNode
}

interface Props<T extends Record<string, unknown>> {
  rows: T[]
  columns: Column<T>[]
  getKey: (row: T) => string | number
  defaultSortKey: string
  defaultSortDir?: 'asc' | 'desc'
  onRowClick?: (row: T) => void
  showMedals?: boolean
}

export default function SortableTable<T extends Record<string, unknown>>({
  rows,
  columns,
  getKey,
  defaultSortKey,
  defaultSortDir = 'desc',
  onRowClick,
  showMedals = true,
}: Props<T>) {
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir)

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv, 'ru') : bv.localeCompare(av, 'ru')
      }
      const an = av == null ? -Infinity : Number(av)
      const bn = bv == null ? -Infinity : Number(bv)
      return sortDir === 'asc' ? an - bn : bn - an
    })
  }, [rows, sortKey, sortDir])

  function handleSort(key: string, isNumeric: boolean) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(isNumeric ? 'desc' : 'asc')
    }
  }

  const thCls = 'px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide select-none whitespace-nowrap'
  const tdCls = 'px-3 py-2 text-sm'
  const tdNumCls = 'px-3 py-2 text-sm text-right tabular-nums'

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-800 border-b border-slate-700">
            {showMedals && <th className={`${thCls} w-8 text-left`}>#</th>}
            {columns.map(col => (
              <th
                key={col.key}
                className={`${thCls} ${col.numeric ? 'text-right' : 'text-left'} ${col.sortable !== false ? 'cursor-pointer hover:text-white' : ''}`}
                onClick={() => col.sortable !== false && handleSort(col.key, !!col.numeric)}
              >
                {col.label}
                {col.sortable !== false && (
                  <SortIcon active={sortKey === col.key} direction={sortDir} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={getKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-700/50 transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              } ${i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60'} hover:bg-slate-700/70`}
            >
              {showMedals && (
                <td className={`${tdCls} text-center`}>
                  <MedalBadge rank={i + 1} />
                </td>
              )}
              {columns.map(col => (
                <td key={col.key} className={col.numeric ? tdNumCls : tdCls}>
                  {col.render
                    ? col.render(row)
                    : col.numeric
                      ? (row[col.key] == null ? '—' : String(row[col.key]))
                      : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
