import { Link, Outlet, useLocation } from 'react-router-dom'

function navCls(active: boolean) {
  return `px-4 py-2 rounded text-sm font-medium transition-colors ${
    active
      ? 'bg-amber-500 text-slate-900'
      : 'text-slate-300 hover:text-white hover:bg-slate-700'
  }`
}

function subNavCls(active: boolean) {
  return `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
    active
      ? 'text-amber-400 bg-slate-700'
      : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
  }`
}

export default function KlbLayout() {
  const { pathname } = useLocation()

  const inPersonal = pathname.startsWith('/klb/personal')
  const inTeam = pathname.startsWith('/klb/team')
  const inClubs = pathname.startsWith('/klb/clubs')

  const subNav = inPersonal
    ? [
        { to: '/klb/personal/players', label: 'Игроки' },
        { to: '/klb/personal/tournaments', label: 'Турниры' },
      ]
    : inTeam
    ? [
        { to: '/klb/team/teams', label: 'Команды' },
        { to: '/klb/team/tournaments', label: 'Турниры' },
      ]
    : []

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-6">
          <Link to="/" className="text-amber-500 font-bold text-xl tracking-tight shrink-0">
            🎳 BowlRus Stats
          </Link>
          <nav className="flex gap-1">
            <Link to="/klb/personal/players" className={navCls(inPersonal)}>Личный</Link>
            <Link to="/klb/team/teams" className={navCls(inTeam)}>Командный</Link>
            <Link to="/klb/clubs" className={navCls(inClubs)}>Клубы</Link>
          </nav>
          {subNav.length > 0 && (
            <nav className="flex gap-1 border-l border-slate-600 pl-6">
              {subNav.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={subNavCls(pathname.startsWith(item.to))}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
