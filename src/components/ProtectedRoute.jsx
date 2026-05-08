import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { buildAuthPath } from '../utils/authRedirect'

function ProtectedRoute({ children }) {
  const { user, isAuthLoading } = useAuth()
  const location = useLocation()

  if (isAuthLoading) {
    return (
      <div className="page auth-loading-page">
        <section className="panel panel-muted">
          <h2>Validando sessão...</h2>
        </section>
      </div>
    )
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`
    const isPlanningRoute = from.includes('/roda')

    return (
      <Navigate
        to={buildAuthPath('/login', from)}
        replace
        state={{
          from,
          message: isPlanningRoute
            ? 'Entre para acessar a Roda da Fogueira.'
            : 'Entre para acessar sua bancada.',
        }}
      />
    )
  }

  return children
}

export default ProtectedRoute
