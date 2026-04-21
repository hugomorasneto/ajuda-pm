import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { APP_NAME } from '../constants/app'
import { trackEvent } from '../services/analyticsService'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stateMessage = location.state?.message ?? ''
  const redirectTo = location.state?.from ?? '/tool'

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    trackEvent({
      event_name: 'login_completed',
      event_category: 'auth',
      page_path: '/login',
    })

    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="page auth-page">
      <section className="panel auth-panel">
        <p className="eyebrow">Acesso</p>
        <h1>Entrar no {APP_NAME}</h1>
        <p className="auth-description">Acesse seu workspace e historico de user stories.</p>
        {stateMessage ? <p className="auth-info">{stateMessage}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <p className="auth-switch">
          Nao tem conta? <Link to="/signup">Criar conta</Link>
        </p>
      </section>
    </div>
  )
}

export default LoginPage
