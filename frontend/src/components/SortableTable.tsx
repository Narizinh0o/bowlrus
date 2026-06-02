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
  /**
   * Мобильный режим: на узком экране таблица скроллится по горизонтали
   * внутри контейнера, шапка липнет сверху, а первый столбец — слева
   * (с угловой ячейкой). На десктопе (md+) поведение прежнее: страничный
   * скролл, липкая только шапка, горизонтального скролла нет.
   */
  mobileSticky?: boolean
}

// Непрозрачные эквиваленты «зебры» (bg-slate-800/30 и /60 поверх slate-900) —
// нужны липкому первому столбцу на мобиле, чтобы под ним не просвечивали строки.
const STICKY_BG_EVEN = 'bg-[#141c2f]'
const STICKY_BG_ODD = 'bg-[#182234]'

export default function SortableTable<T extends Record<string, unknown>>({
  rows,
  columns,
  getKey,
  defaultSortKey,
  defaultSortDir = 'desc',
  onRowClick,
  showMedals = true,
  mobileSticky = false,
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

  const thCls = 'bg-slate-800 px-2 py-2 md:px-3 text-xs font-semibold text-slate-400 uppercase tracking-wide select-none whitespace-nowrap'
  const tdCls = 'px-2 py-2 text-xs md:px-3 md:text-sm'
  const tdNumCls = 'px-2 py-2 text-xs text-right tabular-nums md:px-3 md:text-sm'

  // На мобиле контейнер сам скроллится (обе оси) и ограничен по высоте, чтобы
  // sticky-шапка липла к его верху. На десктопе — без ограничений (страничный
  // скролл, шапка липнет к top-[61px] под шапкой сайта, как раньше).
  const wrapCls = mobileSticky
    ? 'rounded-lg border border-slate-700 overflow-auto max-h-[78vh] md:max-h-none md:overflow-visible'
    : 'rounded-lg border border-slate-700'
  const theadCls = mobileSticky ? 'sticky top-0 md:top-[61px] z-20' : 'sticky top-[61px] z-20'

  // Классы для медальной колонки (на мобиле прячем, чтобы первым липким
  // столбцом стало имя/команда).
  const medalHide = mobileSticky ? 'hidden md:table-cell' : ''
  // Угловая ячейка (заголовок первого столбца): липкая по двум осям, z выше всех.
  const cornerCls = mobileSticky ? 'sticky left-0 z-30 md:static md:z-auto' : ''
  // Тело первого столбца: липкое слева, непрозрачный фон, z ниже шапки.
  // На мобиле ширина ограничена (max-w), чтобы длинные имена не съедали экран —
  // не влезающий текст переносится на доп. строку (см. whitespace-normal ниже).
  const firstColCls = (i: number) =>
    mobileSticky
      ? `sticky left-0 z-10 max-w-[140px] md:max-w-none ${i % 2 === 0 ? STICKY_BG_EVEN : STICKY_BG_ODD} md:static md:z-auto md:bg-transparent`
      : ''

  return (
    <div className={wrapCls}>
      <table className="w-full border-collapse">
        <thead className={theadCls}>
          <tr className="bg-slate-800 border-b border-slate-700">
            {showMedals && <th className={`${thCls} ${medalHide} w-8 text-left`}>#</th>}
            {columns.map((col, idx) => (
              <th
                key={col.key}
                className={`${thCls} ${idx === 0 ? cornerCls : ''} ${col.numeric ? 'text-right' : 'text-left'} ${col.sortable !== false ? 'cursor-pointer hover:text-white' : ''}`}
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
                <td className={`${tdCls} ${medalHide} text-center`}>
                  <MedalBadge rank={i + 1} />
                </td>
              )}
              {columns.map((col, idx) => (
                <td
                  key={col.key}
                  className={`${col.numeric ? tdNumCls : tdCls} ${mobileSticky ? (idx === 0 ? 'whitespace-normal' : 'whitespace-nowrap md:whitespace-normal') : ''} ${idx === 0 ? firstColCls(i) : ''}`}
                >
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
