import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

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
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          message: 'Sua sessão expirou ou você precisa entrar para acessar a ferramenta.',
        }}
      />
    )
  }

  return children
}

export default ProtectedRoute
