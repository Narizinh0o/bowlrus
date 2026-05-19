import type { Frame } from '../types'

interface FrameCellProps {
  frame: Frame
}

function throwColor(sym: string): string {
  if (sym === 'X' || sym === '/') return 'text-amber-400'
  if (sym === 'F') return 'text-red-400'
  if (sym === '-') return 'text-slate-500'
  return 'text-white'
}

export default function FrameCell({ frame }: FrameCellProps) {
  const isTenth = frame.frame_number === 10
  const cellCount = isTenth ? 3 : 2

  return (
    <div className="border border-slate-600 rounded overflow-hidden bg-slate-800">
      <div className="bg-slate-700 text-amber-500 text-center text-xs font-semibold py-1 border-b border-slate-600">
        {frame.frame_number}
      </div>
      <div className={`grid ${isTenth ? 'grid-cols-3' : 'grid-cols-2'} divide-x divide-slate-600`}>
        {Array.from({ length: cellCount }).map((_, i) => {
          const sym: string | undefined = frame.throws[i]
          const isSplit = frame.splits[i] === true
          return (
            <div key={i} className="h-14 flex items-center justify-center text-2xl font-semibold">
              {sym !== undefined && (
                <span
                  className={`${throwColor(sym)} ${
                    isSplit
                      ? 'inline-flex items-center justify-center w-9 h-9 rounded-full border border-amber-500'
                      : ''
                  }`}
                >
                  {sym}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
