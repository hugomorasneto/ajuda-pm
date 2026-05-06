import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { APP_NAME, BRAND_LOGO_HORIZONTAL_SRC } from '../constants/app'
import { useAuth } from '../hooks/useAuth'
import { usePageMetadata } from '../hooks/usePageMetadata'
import '../styles/pages.css'
import {
  getAuthErrorMessage,
  isEmailConfirmationError,
  resendSignupConfirmation,
  signInWithEmail,
} from '../services/authService'
import { trackEvent } from '../services/analyticsService'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthLoading } = useAuth()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState(location.state?.message ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [canResendConfirmation, setCanResendConfirmation] = useState(false)

  const redirectTo = location.state?.from ?? '/tool'

  usePageMetadata({
    title: 'Entrar no ProdForge',
    description: 'Acesse sua conta ProdForge para continuar na Bancada de histórias de usuário com IA.',
    path: '/login',
    ogTitle: 'Entrar no ProdForge',
    ogDescription: 'Acesse sua conta ProdForge para continuar na Bancada de histórias de usuário com IA.',
    twitterTitle: 'Entrar no ProdForge',
    twitterDescription: 'Acesse sua conta ProdForge para continuar na Bancada de histórias de usuário com IA.',
    robots: 'noindex,follow',
  })

  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate('/tool', { replace: true })
    }
  }, [isAuthLoading, navigate, user])

  async function handleSubmit(event) {
    event.preventDefault()

    const normalizedEmail = email.trim()
    const nextFieldErrors = {}

    if (!normalizedEmail) {
      nextFieldErrors.email = 'Informe seu e-mail.'
    } else if (!isValidEmail(normalizedEmail)) {
      nextFieldErrors.email = 'Digite um e-mail válido.'
    }

    if (!password) {
      nextFieldErrors.password = 'A senha é obrigatória.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setErrorMessage('')
      setInfoMessage('')
      setCanResendConfirmation(false)
      return
    }

    setFieldErrors({})
    setErrorMessage('')
    setInfoMessage('')
    setCanResendConfirmation(false)
    setIsSubmitting(true)

    const { error } = await signInWithEmail({
      email: normalizedEmail,
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

  function handleEmailChange(event) {
    setEmail(event.target.value)
    setFieldErrors((current) => ({ ...current, email: '' }))
    setErrorMessage('')
  }

  function handlePasswordChange(event) {
    setPassword(event.target.value)
    setFieldErrors((current) => ({ ...current, password: '' }))
    setErrorMessage('')
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
    <div className="auth-shell auth-shell--login">
      <div className="auth-card">
        <div className="auth-card__topbar">
          <Link to="/" className="auth-card__brand" aria-label="Voltar para a Home do ProdForge">
            <img
              src={BRAND_LOGO_HORIZONTAL_SRC}
              alt={APP_NAME}
              className="auth-card__brand-logo"
              loading="eager"
            />
          </Link>
          <Link to="/" className="auth-card__home-link">
            Home
          </Link>
        </div>

        <div className="auth-card__header">
          <p className="auth-card__eyebrow">Acesso seguro</p>
          <h1 className="auth-card__title">Entre na sua bancada</h1>
          <p className="auth-card__description">
            Continue refinando suas user stories com histórico, versões e critérios de aceite.
          </p>
        </div>

        {infoMessage ? (
          <p className="auth-card__info" role="status">{infoMessage}</p>
        ) : null}

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
              onChange={handleEmailChange}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              required
            />
            {fieldErrors.email ? (
              <p className="auth-card__field-error" id="login-email-error">{fieldErrors.email}</p>
            ) : null}
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
              onChange={handlePasswordChange}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              required
            />
            {fieldErrors.password ? (
              <p className="auth-card__field-error" id="login-password-error">{fieldErrors.password}</p>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="auth-card__error" role="alert">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            className="auth-card__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          {canResendConfirmation ? (
            <button
              type="button"
              className="auth-card__submit auth-card__submit--secondary"
              onClick={handleResendConfirmation}
              disabled={isResending}
            >
              {isResending ? 'Reenviando...' : 'Reenviar confirmação'}
            </button>
          ) : null}
        </form>

        <p className="auth-card__switch">
          Não tem conta?{' '}
          <Link to="/signup" className="auth-card__link">Criar conta grátis</Link>
        </p>
      </div>

      <aside className="auth-side">
        <div className="auth-side__content">
          <p className="auth-side__eyebrow">Continuidade de produto</p>
          <h2 className="auth-side__title">
            Sua bancada pronta para o próximo refinamento.
          </h2>
          <ul className="auth-side__list">
            <li>Histórico preservado por usuário</li>
            <li>Versões salvas por feature</li>
            <li>Critérios de aceite consistentes</li>
            <li>Saída pronta para backlog e Jira</li>
          </ul>
          <div className="auth-side__preview">
            <p className="auth-side__preview-label">Última peça na bancada</p>
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
