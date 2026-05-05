import { Outlet } from 'react-router-dom'
import PublicFooter from '../components/navigation/PublicFooter'
import '../styles/public.css'

function PublicFooterLayout() {
  return (
    <div className="public-footer-layout theme-forge">
      <main className="public-footer-layout__main">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

export default PublicFooterLayout
