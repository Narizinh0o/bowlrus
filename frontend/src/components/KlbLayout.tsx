import { useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)

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

  const mainNav = [
    { to: '/klb/personal/players', label: 'Личный', active: inPersonal },
    { to: '/klb/team/teams', label: 'Командный', active: inTeam },
    { to: '/klb/clubs', label: 'Клубы', active: inClubs },
  ]

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-6">
          <Link to="/" className="text-amber-500 font-bold text-xl tracking-tight shrink-0">
            🎳 BowlRus Stats
          </Link>

          {/* Десктопная навигация */}
          <nav className="hidden md:flex gap-1">
            {mainNav.map(item => (
              <Link key={item.to} to={item.to} className={navCls(item.active)}>
                {item.label}
              </Link>
            ))}
          </nav>
          {subNav.length > 0 && (
            <nav className="hidden md:flex gap-1 border-l border-slate-600 pl-6">
              {subNav.map(item => (
                <Link key={item.to} to={item.to} className={subNavCls(pathname.startsWith(item.to))}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Мобильный гамбургер */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden ml-auto flex h-10 w-10 items-center justify-center rounded text-slate-200 hover:bg-slate-700"
            aria-label="Меню"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Мобильное выезжающее меню */}
        {menuOpen && (
          <nav className="md:hidden border-t border-slate-700 bg-slate-800 px-4 py-2">
            {mainNav.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`block py-2.5 text-base font-medium ${
                  item.active ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {subNav.length > 0 && (
              <div className="mt-1 border-t border-slate-700 pt-1">
                {subNav.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={`block py-2.5 pl-3 text-sm ${
                      pathname.startsWith(item.to) ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        )}
      </header>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
