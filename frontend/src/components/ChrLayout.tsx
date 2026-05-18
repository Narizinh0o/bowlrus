import { Outlet } from 'react-router-dom'
import Layout from './Layout'

const CHR_NAV = [
  { to: '/chr/players', label: 'Игроки' },
  { to: '/chr/tournament', label: 'Турнир' },
]

export default function ChrLayout() {
  return (
    <Layout navItems={CHR_NAV}>
      <Outlet />
    </Layout>
  )
}
