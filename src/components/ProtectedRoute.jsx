import LanguageSwitcher from '../i18n/LanguageSwitcher'
import { useCopy, useLanguage } from '../i18n/context'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { buildAuthPath, getAuthDestinationLanguage, getAuthRedirectContext } from '../utils/authRedirect'

function ProtectedRoute({ children }) {
  const { user, isAuthLoading, signOutDestination } = useAuth()
  const t = useCopy('common')
  const { preview } = useLanguage()
  const location = useLocation()

  if (isAuthLoading) {
    return (
      <div className="page auth-loading-page">
        {preview && <div className="language-switcher--loading"><LanguageSwitcher /></div>}
        <section className="panel panel-muted">
          <h2>{t('checkingSession')}</h2>
        </section>
      </div>
    )
  }

  if (!user) {
    if (signOutDestination?.locationKey === location.key) {
      return <Navigate to={signOutDestination.path} replace state={{ notice: 'noticeSignedOut' }} />
    }

    const from = `${location.pathname}${location.search}${location.hash}`
    const destination = getAuthRedirectContext(from)
    const notice = { planning: 'noticePlanning', admin: 'noticeAdmin' }[destination] ?? 'noticeAccess'
    const language = preview ? getAuthDestinationLanguage(from) : undefined

    return (
      <Navigate
        to={buildAuthPath('/login', from, language)}
        replace
        state={{ from, notice }}
      />
    )
  }

  return children
}

export default ProtectedRoute
