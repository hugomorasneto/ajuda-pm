import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { APP_NAME } from '../constants/app'
import { trackEvent } from '../services/analyticsService'

function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setInfoMessage('')

    trackEvent({
      event_name: 'signup_started',
      event_category: 'auth',
      page_path: '/signup',
    })

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    if (data.session) {
      trackEvent({
        event_name: 'signup_completed',
        event_category: 'auth',
        page_path: '/signup',
      })
      navigate('/tool', { replace: true })
      return
    }

    trackEvent({
      event_name: 'signup_completed',
      event_category: 'auth',
      page_path: '/signup',
      metadata: { confirmation_pending: true },
    })
    setInfoMessage('Cadastro realizado. Verifique seu email para confirmar a conta.')
    setIsSubmitting(false)
  }

  return (
    <div className="page auth-page">
      <section className="panel auth-panel">
        <p className="eyebrow">Cadastro</p>
        <h1>Criar conta no {APP_NAME}</h1>
        <p className="auth-description">
          Salve versões, mantenha seu histórico e continue a revisão depois.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">E-mail</label>
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
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        {infoMessage ? <p className="auth-info">{infoMessage}</p> : null}

        <p className="auth-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </div>
  )
}

export default SignupPage
