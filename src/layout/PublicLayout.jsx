import { Outlet, useLocation } from 'react-router-dom'
import PublicHeader from '../components/navigation/PublicHeader'
import PublicFooter from '../components/navigation/PublicFooter'
import '../styles/public.css'

function PublicLayout() {
  const location = useLocation()
  const isHomeRoute = location.pathname === '/'
  const isLearningRoute = location.pathname.startsWith('/aprender')
  const layoutClassName = [
    'page-shell',
    'public-layout',
    isHomeRoute ? 'public-layout--home-forge theme-forge' : '',
    isLearningRoute ? 'public-layout--academy-forge theme-forge' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={layoutClassName}>
      <PublicHeader isHomeRoute={isHomeRoute} isLearningRoute={isLearningRoute} />
      <main className="public-layout__main">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

export default PublicLayout
