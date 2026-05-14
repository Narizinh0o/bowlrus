import { useNavigate } from 'react-router-dom'

const CARDS = [
  {
    to: '/players',
    title: 'Игроки',
    desc: 'Полная статистика по каждому участнику: средний, страйки, спэа, single pin',
    icon: '👤',
  },
  {
    to: '/tournament',
    title: 'Турнир',
    desc: 'Сводные данные по Чемпионату России 2026, таблицы по зачётам',
    icon: '🏆',
  },
  {
    to: '/players',
    title: 'Статистика',
    desc: 'Рейтинги, лидеры по категориям, сравнение показателей',
    icon: '📊',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-12">
      {/* Hero */}
      <div className="text-center">
        <div className="text-7xl mb-4">🎳</div>
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-3">
          BowlRus Stats
        </h1>
        <p className="text-xl text-slate-400">
          Bowling Russian Stats — официальная статистика турниров
        </p>
        <div className="mt-3 inline-block bg-slate-800 border border-slate-700 rounded-full px-5 py-2 text-amber-500 font-medium text-sm">
          Чемпионат России 2026 · 2–7 мая 2026
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
        {CARDS.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.to)}
            className="group bg-slate-800 border border-slate-700 rounded-2xl p-8 text-left hover:border-amber-500 hover:bg-slate-750 transition-all duration-200 cursor-pointer"
          >
            <div className="text-5xl mb-4">{card.icon}</div>
            <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
              {card.title}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
