interface Props { rank: number }

export default function MedalBadge({ rank }: Props) {
  if (rank === 1) return <span className="text-yellow-400 text-base">🥇</span>
  if (rank === 2) return <span className="text-slate-300 text-base">🥈</span>
  if (rank === 3) return <span className="text-amber-600 text-base">🥉</span>
  return <span className="text-slate-500 text-sm">{rank}</span>
}
