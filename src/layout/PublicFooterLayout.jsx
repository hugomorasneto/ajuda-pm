import { Outlet, useLocation } from 'react-router-dom'
import PublicFooter from '../components/navigation/PublicFooter'
import '../styles/public.css'

function PublicFooterLayout() {
  const location = useLocation()
  const hideFooter = ['/login', '/signup'].includes(location.pathname)

  return (
    <div className="public-footer-layout theme-forge">
      <main className="public-footer-layout__main">
        <Outlet />
      </main>
      {hideFooter ? null : <PublicFooter />}
    </div>
  )
}

export default PublicFooterLayout
