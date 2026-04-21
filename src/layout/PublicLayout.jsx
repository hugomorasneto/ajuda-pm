import { Outlet } from 'react-router-dom'
import PublicHeader from '../components/navigation/PublicHeader'
import PublicFooter from '../components/navigation/PublicFooter'

function PublicLayout() {
  return (
    <div className="page-shell public-layout">
      <PublicHeader />
      <main className="public-layout__main">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

export default PublicLayout
