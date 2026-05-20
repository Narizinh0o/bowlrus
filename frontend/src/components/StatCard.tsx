interface Props {
  label: string
  value: string | number
  sub?: string
}

export default function StatCard({ label, value, sub }: Props) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="text-slate-400 text-sm mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
    </div>
  )
}
