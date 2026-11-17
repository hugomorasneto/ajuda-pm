import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useCopy, useLanguage } from '../i18n/context'
import { localizeHref } from '../i18n/routes'
import { buildAuthPath, getAuthDestinationLanguage } from '../utils/authRedirect'
import { useAuth } from '../hooks/useAuth'
import { getUserProfile } from '../services/userProfilesService'

function AdminRoute({ children }) {
  const { user, isAuthLoading } = useAuth()
  const t = useCopy('auth')
  const { language, preview } = useLanguage()
  const { pathname, search, hash } = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true

    async function checkAdmin() {
      if (!user?.id) {
        if (active) {
          setIsAdmin(false)
          setIsChecking(false)
        }
        return
      }

      const profile = await getUserProfile(user.id)
      if (!active) return
      setIsAdmin(profile.success && profile.data?.role === 'admin')
      setIsChecking(false)
    }

    if (!isAuthLoading) {
      checkAdmin()
    }

    return () => {
      active = false
    }
  }, [isAuthLoading, user?.id])

  if (isAuthLoading || isChecking) {
    return (
      <div className="page auth-loading-page">
        <section className="panel panel-muted">
          <h2>{t('checkingAdmin')}</h2>
        </section>
      </div>
    )
  }

  if (!user) {
    const from = pathname + search + hash
    const language = preview ? getAuthDestinationLanguage(from) : undefined
    return <Navigate to={buildAuthPath('/login', from, language)} replace state={{ from, notice: 'noticeAdmin' }} />
  }

  if (!isAdmin) {
    return <Navigate to={preview ? localizeHref('/', language) : '/'} replace />
  }

  return children
}

export default AdminRoute
