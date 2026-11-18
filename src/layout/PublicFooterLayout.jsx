import LanguageSwitcher from '../i18n/LanguageSwitcher'
import { useLanguage } from '../i18n/context'
import { Outlet, useLocation } from 'react-router-dom'
import PublicFooter from '../components/navigation/PublicFooter'
import '../styles/public.css'

function PublicFooterLayout() {
  const { preview } = useLanguage()
  const location = useLocation()
  const hideFooter = ['/login', '/signup'].includes(location.pathname.replace(/\/+$/, ''))

  return (
    <div className="public-footer-layout theme-forge">
      {preview && <div className="public-footer-layout__language"><LanguageSwitcher /></div>}
      <main className="public-footer-layout__main">
        <Outlet />
      </main>
      {hideFooter ? null : <PublicFooter />}
    </div>
  )
}

export default PublicFooterLayout
