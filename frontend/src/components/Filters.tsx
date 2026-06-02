import { useEffect, useRef, useState, type ReactNode } from 'react'

// ── Общая обёртка дропдауна с закрытием по клику вне ───────────────────

function Dropdown({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm transition-colors ${
          count > 0
            ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
        }`}
      >
        {label}
        {count > 0 && <span className="text-xs">({count})</span>}
        <span className="text-[10px] text-slate-500">▼</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 max-h-80 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl">
          {children}
        </div>
      )}
    </div>
  )
}

export interface Option {
  value: string
  label: string
}

// ── Мультивыбор с чекбоксами ──────────────────────────────────────────

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: Option[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
}) {
  function toggle(v: string) {
    const next = new Set(selected)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    onChange(next)
  }

  return (
    <Dropdown label={label} count={selected.size}>
      {selected.size > 0 && (
        <button
          onClick={() => onChange(new Set())}
          className="mb-1 w-full text-left text-xs text-amber-400 hover:underline px-1"
        >
          очистить
        </button>
      )}
      {options.map(opt => (
        <label
          key={opt.value}
          className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-800 cursor-pointer text-sm text-slate-200"
        >
          <input
            type="checkbox"
            checked={selected.has(opt.value)}
            onChange={() => toggle(opt.value)}
            className="accent-amber-500"
          />
          <span className="capitalize">{opt.label}</span>
        </label>
      ))}
    </Dropdown>
  )
}

// ── Поисковый мультивыбор с чипсами (для игроков) ─────────────────────

export function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: Option[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
}) {
  const [query, setQuery] = useState('')

  function toggle(v: string) {
    const next = new Set(selected)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    onChange(next)
  }

  const labelByValue = new Map(options.map(o => [o.value, o.label]))
  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter(o => o.label.toLowerCase().includes(q)).slice(0, 50)
    : options.slice(0, 50)

  return (
    <Dropdown label={label} count={selected.size}>
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {[...selected].map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded bg-amber-500/15 text-amber-300 text-xs px-1.5 py-0.5 capitalize"
            >
              {labelByValue.get(v) ?? v}
              <button onClick={() => toggle(v)} className="hover:text-white" aria-label="убрать">
                ×
              </button>
            </span>
          ))}
          <button onClick={() => onChange(new Set())} className="text-xs text-slate-400 hover:underline">
            сброс
          </button>
        </div>
      )}
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="поиск…"
        className="mb-1 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200 outline-none focus:border-amber-500/60"
      />
      {filtered.map(opt => (
        <label
          key={opt.value}
          className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-800 cursor-pointer text-sm text-slate-200"
        >
          <input
            type="checkbox"
            checked={selected.has(opt.value)}
            onChange={() => toggle(opt.value)}
            className="accent-amber-500"
          />
          <span className="capitalize">{opt.label}</span>
        </label>
      ))}
      {filtered.length === 0 && <div className="text-xs text-slate-500 px-1 py-2">ничего не найдено</div>}
    </Dropdown>
  )
}

// ── Диапазонный слайдер «от-до» ───────────────────────────────────────

export function RangeSlider({
  label,
  min,
  max,
  lo,
  hi,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  min: number
  max: number
  lo: number
  hi: number
  step?: number
  unit?: string
  onChange: (lo: number, hi: number) => void
}) {
  return (
    <div className="rounded border border-slate-700 bg-slate-800 px-3 py-2 w-52">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="text-slate-300">
          {lo}–{hi}
          {unit}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={e => onChange(Math.min(Number(e.target.value), hi), hi)}
          className="w-full accent-amber-500"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={e => onChange(lo, Math.max(Number(e.target.value), lo))}
          className="w-full accent-amber-500"
        />
      </div>
    </div>
  )
}

// ── Переключатель разбивки ────────────────────────────────────────────

export type Breakdown = 'none' | 'season' | 'tid' | 'st'

export function BreakdownToggle({ value, onChange }: { value: Breakdown; onChange: (b: Breakdown) => void }) {
  const opts: { value: Breakdown; label: string }[] = [
    { value: 'none', label: 'нет' },
    { value: 'season', label: 'Сезон' },
    { value: 'tid', label: 'Турнир' },
    { value: 'st', label: 'Стадия' },
  ]
  return (
    <div className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 p-0.5">
      <span className="text-xs text-slate-400 px-2">Разбивка:</span>
      {opts.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            value === o.value ? 'bg-amber-500 text-slate-900 font-medium' : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
