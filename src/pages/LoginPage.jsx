import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { useAuth } from '../hooks/useAuth'
import '../styles/pages.css'
import {
  getAuthErrorMessage,
  isEmailConfirmationError,
  resendSignupConfirmation,
  signInWithEmail,
} from '../services/authService'
import { trackEvent } from '../services/analyticsService'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthLoading } = useAuth()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState(location.state?.message ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [canResendConfirmation, setCanResendConfirmation] = useState(false)

  const redirectTo = location.state?.from ?? '/tool'

  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate('/tool', { replace: true })
    }
  }, [isAuthLoading, navigate, user])

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setInfoMessage('')
    setCanResendConfirmation(false)

    const { error } = await signInWithEmail({
      email: email.trim(),
      password,
    })

    if (error) {
      const needsConfirmation = isEmailConfirmationError(error)
      setErrorMessage(getAuthErrorMessage(error))
      setInfoMessage(
        needsConfirmation
          ? 'Confirme seu e-mail para entrar. Se necessário, reenvie a mensagem de confirmação.'
          : '',
      )
      setCanResendConfirmation(needsConfirmation && Boolean(email.trim()))
      setIsSubmitting(false)
      return
    }

    trackEvent({ event_name: 'login_completed', event_category: 'auth', page_path: '/login' })
    navigate(redirectTo, { replace: true })
  }

  async function handleResendConfirmation() {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) return

    setIsResending(true)
    setErrorMessage('')

    const { error } = await resendSignupConfirmation(normalizedEmail)
    setIsResending(false)

    if (error) {
      setErrorMessage(getAuthErrorMessage(error))
      return
    }

    setInfoMessage('Enviamos um novo link de confirmação para o seu e-mail.')
    trackEvent({
      event_name: 'signup_confirmation_resent',
      event_category: 'auth',
      page_path: '/login',
    })
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
            Acesse sua bancada, as peças forjadas e as inspeções salvas.
          </p>
        </div>

        {/* Info (redirect message) */}
        {infoMessage ? (
          <p className="auth-card__info" role="status">{infoMessage}</p>
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

          {canResendConfirmation ? (
            <button
              type="button"
              className="auth-card__submit auth-card__submit--secondary"
              onClick={handleResendConfirmation}
              disabled={isResending}
            >
              {isResending ? 'Reenviando…' : 'Reenviar confirmação'}
            </button>
          ) : null}
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
          <p className="auth-side__eyebrow">Para PMs e POs iniciantes</p>
          <h2 className="auth-side__title">
            Escreva user stories que devs entendem na primeira leitura.
          </h2>
          <ul className="auth-side__list">
            <li>User story estruturada com critérios de aceite</li>
            <li>Trincas e teste de resistência no mesmo fluxo</li>
            <li>Peças forjadas com versões por feature</li>
            <li>Exportação em Markdown e texto simples</li>
            <li>Guia do ferreiro PM na Academia ProdForge</li>
          </ul>
          <div className="auth-side__preview">
            <p className="auth-side__preview-label">Exemplo de saída</p>
            <div className="auth-side__preview-card">
              <p className="auth-side__preview-story">
                "Como <em>responsável pelo cadastro</em>, quero{' '}
                <em>validar o domínio corporativo</em> para concluir o
                registro com menos retrabalho."
              </p>
              <ul className="auth-side__preview-criteria">
                <li>Bloquear avanço com domínio inválido</li>
                <li>Exibir mensagem orientando a correção</li>
                <li>Registrar falha para análise do funil</li>
              </ul>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default LoginPage
