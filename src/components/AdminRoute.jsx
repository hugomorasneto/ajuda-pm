import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getUserProfile } from '../services/userProfilesService'

function AdminRoute({ children }) {
  const { user, isAuthLoading } = useAuth()
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
          <h2>Validando acesso administrativo...</h2>
        </section>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ message: 'Entre para acessar a area admin.' }} />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute

