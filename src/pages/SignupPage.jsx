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

    trackEvent({ event_name: 'signup_started', event_category: 'auth', page_path: '/signup' })

    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    if (data.session) {
      trackEvent({ event_name: 'signup_completed', event_category: 'auth', page_path: '/signup' })
      navigate('/tool', { replace: true })
      return
    }

    trackEvent({
      event_name: 'signup_completed',
      event_category: 'auth',
      page_path: '/signup',
      metadata: { confirmation_pending: true },
    })
    setInfoMessage('Cadastro realizado. Verifique seu e-mail para confirmar a conta.')
    setIsSubmitting(false)
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
          <p className="auth-card__eyebrow">Cadastro gratuito</p>
          <h1 className="auth-card__title">Criar sua conta</h1>
          <p className="auth-card__description">
            Salve versões, mantenha histórico e continue a revisão quando quiser.
          </p>
        </div>

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
            <label className="auth-card__label" htmlFor="password">
              Senha
              <span className="auth-card__label-hint">mínimo 6 caracteres</span>
            </label>
            <input
              id="password"
              className="auth-card__input"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMessage ? (
            <p className="auth-card__error" role="alert">{errorMessage}</p>
          ) : null}

          {infoMessage ? (
            <p className="auth-card__info" role="status">{infoMessage}</p>
          ) : null}

          <button
            type="submit"
            className="auth-card__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Criando conta…' : 'Criar conta grátis'}
          </button>

          <p className="auth-card__terms">
            Ao criar conta, você concorda com o uso dos dados para melhorar o produto.
          </p>
        </form>

        {/* Footer */}
        <p className="auth-card__switch">
          Já tem conta?{' '}
          <Link to="/login" className="auth-card__link">Entrar</Link>
        </p>
      </div>

      {/* Side panel — value prop */}
      <aside className="auth-side">
        <div className="auth-side__content">
          <p className="auth-side__eyebrow">Plano gratuito inclui</p>
          <h2 className="auth-side__title">
            Tudo que você precisa para começar.
          </h2>
          <ul className="auth-side__list">
            <li>8 gerações de user story por conta</li>
            <li>Critérios de aceite e checklist de QA</li>
            <li>Histórico de versões salvo</li>
            <li>Exportação em Markdown e texto simples</li>
          </ul>
          <div className="auth-side__upgrade">
            <p className="auth-side__upgrade-label">Precisa de mais?</p>
            <p>O plano Pro libera gerações ilimitadas e recursos avançados.</p>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default SignupPage
