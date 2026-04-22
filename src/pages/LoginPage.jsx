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

    trackEvent({ event_name: 'login_completed', event_category: 'auth', page_path: '/login' })
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-card__brand">
          <span className="auth-card__brand-mark" />
          <span className="auth-card__brand-name">{APP_NAME}</span>
        </div>

        {/* Header */}
        <div className="auth-card__header">
          <p className="auth-card__eyebrow">Acesso</p>
          <h1 className="auth-card__title">Entrar na sua conta</h1>
          <p className="auth-card__description">
            Acesse sua área de trabalho e o histórico de user stories.
          </p>
        </div>

        {/* Info (redirect message) */}
        {stateMessage ? (
          <p className="auth-card__info">{stateMessage}</p>
        ) : null}

        {/* Form */}
        <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="email">E-mail</label>
            <input
              id="email"
              className="auth-card__input"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="password">Senha</label>
            <input
              id="password"
              className="auth-card__input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMessage ? (
            <p className="auth-card__error" role="alert">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            className="auth-card__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {/* Footer */}
        <p className="auth-card__switch">
          Não tem conta?{' '}
          <Link to="/signup" className="auth-card__link">Criar conta grátis</Link>
        </p>
      </div>

      {/* Side panel — value prop */}
      <aside className="auth-side">
        <div className="auth-side__content">
          <p className="auth-side__eyebrow">Para PMs e POs</p>
          <h2 className="auth-side__title">
            Do brief disperso ao documento pronto para revisão.
          </h2>
          <ul className="auth-side__list">
            <li>User story com critérios de aceite</li>
            <li>Checklist de QA integrado</li>
            <li>Histórico de versões por feature</li>
            <li>Exportação em Markdown e texto simples</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

export default LoginPage
