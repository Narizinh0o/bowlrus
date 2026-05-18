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

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-8">
          <Link to="/" className="text-amber-500 font-bold text-xl tracking-tight">
            🎳 BowlRus Stats
          </Link>
          {navItems && navItems.length > 0 && (
            <nav className="flex gap-1">
              {navItems.map(item => (
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
        </div>
      </header>
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}
