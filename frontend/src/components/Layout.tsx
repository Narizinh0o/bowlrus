import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
}

interface LayoutProps {
  children: React.ReactNode
  navItems?: NavItem[]
}

export default function Layout({ children, navItems }: LayoutProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const hasNav = !!navItems && navItems.length > 0

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-6">
          <Link to="/" className="text-amber-500 font-bold text-xl tracking-tight shrink-0">
            🎳 BowlRus Stats
          </Link>

          {/* Десктопная навигация */}
          {hasNav && (
            <nav className="hidden md:flex gap-1">
              {navItems!.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    location.pathname === item.to
                      ? 'bg-amber-500 text-slate-900'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Мобильный гамбургер */}
          {hasNav && (
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
          )}
        </div>

        {/* Мобильное выезжающее меню */}
        {hasNav && menuOpen && (
          <nav className="md:hidden border-t border-slate-700 bg-slate-800 px-4 py-2">
            {navItems!.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`block py-2.5 text-base font-medium ${
                  location.pathname === item.to ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
