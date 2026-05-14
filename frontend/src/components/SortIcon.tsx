import type { SortDirection } from '../types'

interface Props {
  active: boolean
  direction: SortDirection
}

export default function SortIcon({ active, direction }: Props) {
  if (!active) return <span className="text-slate-600 ml-1">⇅</span>
  return <span className="text-amber-500 ml-1">{direction === 'asc' ? '↑' : '↓'}</span>
}
