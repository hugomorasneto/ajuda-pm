import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { APP_NAME, BRAND_LOGO_HORIZONTAL_SRC, PRO_PLAN_NAME } from '../constants/app'
import { useAuth } from '../hooks/useAuth'
import { usePageMetadata } from '../hooks/usePageMetadata'
import '../styles/pages.css'
import { getAuthErrorMessage, signUpWithEmail } from '../services/authService'
import { trackEvent } from '../services/analyticsService'
import { buildAuthPath, clearAuthRedirect, getAuthRedirectFromLocation } from '../utils/authRedirect'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthLoading } = useAuth()
  const redirectTo = useMemo(() => getAuthRedirectFromLocation(location), [location])
  const isPlanningInvite = redirectTo.includes('/roda')
  const loginPath = useMemo(() => buildAuthPath('/login', redirectTo), [redirectTo])
  const checkEmailPath = useMemo(() => buildAuthPath('/check-email', redirectTo), [redirectTo])
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  usePageMetadata({
    title: 'Criar conta no ProdForge',
    description: 'Crie sua conta para testar a Bancada do ProdForge e gerar histórias de usuário com IA.',
    path: '/signup',
    ogTitle: 'Criar conta no ProdForge',
    ogDescription: 'Crie sua conta para testar a Bancada do ProdForge e gerar histórias de usuário com IA.',
    twitterTitle: 'Criar conta no ProdForge',
    twitterDescription: 'Crie sua conta para testar a Bancada do ProdForge e gerar histórias de usuário com IA.',
    robots: 'noindex,follow',
  })

  useEffect(() => {
    if (!isAuthLoading && user) {
      clearAuthRedirect()
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthLoading, navigate, redirectTo, user])

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
    } else if (password.length < 6) {
      nextFieldErrors.password = 'Use pelo menos 6 caracteres.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setErrorMessage('')
      return
    }

    setFieldErrors({})
    setErrorMessage('')
    setIsSubmitting(true)

    trackEvent({ event_name: 'signup_started', event_category: 'auth', page_path: '/signup' })

    const { data, error } = await signUpWithEmail({
      email: normalizedEmail,
      password,
      redirectTo,
    })

    if (error) {
      setErrorMessage(getAuthErrorMessage(error))
      setIsSubmitting(false)
      return
    }

    const isExistingUser =
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0

    if (isExistingUser) {
      setErrorMessage('Este e-mail já está cadastrado. Entre para continuar.')
      setIsSubmitting(false)
      return
    }

    if (data.session) {
      trackEvent({ event_name: 'signup_completed', event_category: 'auth', page_path: '/signup' })
      clearAuthRedirect()
      navigate(redirectTo, { replace: true })
      return
    }

    trackEvent({
      event_name: 'signup_completed',
      event_category: 'auth',
      page_path: '/signup',
      metadata: { confirmation_pending: true },
    })
    navigate(checkEmailPath, {
      replace: true,
      state: { email: normalizedEmail, from: redirectTo, pendingConfirmation: true },
    })
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

  return (
    <div className="auth-shell auth-shell--signup">
      <div className="auth-card">
        <div className="auth-card__topbar">
          <Link to="/" className="auth-card__brand" aria-label="Voltar para o início do ProdForge">
            <img
              src={BRAND_LOGO_HORIZONTAL_SRC}
              alt={APP_NAME}
              className="auth-card__brand-logo"
              loading="eager"
            />
          </Link>
          <Link to="/" className="auth-card__home-link">
            Início
          </Link>
        </div>

        <div className="auth-card__header">
          <p className="auth-card__eyebrow">Cadastro gratuito</p>
          <h1 className="auth-card__title">Crie sua conta grátis</h1>
          <p className="auth-card__description">
            {isPlanningInvite
              ? 'Crie sua conta para voltar ao convite da Roda da Fogueira depois da confirmação.'
              : 'Transforme briefings em user stories claras, com critérios de aceite e prontas para backlog.'}
          </p>
        </div>

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
              aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
              required
            />
            {fieldErrors.email ? (
              <p className="auth-card__field-error" id="signup-email-error">{fieldErrors.email}</p>
            ) : null}
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
              onChange={handlePasswordChange}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
              required
            />
            {fieldErrors.password ? (
              <p className="auth-card__field-error" id="signup-password-error">{fieldErrors.password}</p>
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
            {isSubmitting ? 'Criando conta...' : 'Criar conta grátis'}
          </button>

          <p className="auth-card__terms" id="uso-de-dados">
            Ao criar conta, você concorda com os{' '}
            <Link to="/termos-de-uso" className="auth-card__link">Termos de Uso</Link>
            {' '}e a{' '}
            <Link to="/politica-de-privacidade" className="auth-card__link">Política de Privacidade</Link>.
          </p>
        </form>

        <p className="auth-card__switch">
          Já tem conta?{' '}
          <Link to={loginPath} className="auth-card__link" state={{ from: redirectTo, email: email.trim() }}>
            Entrar
          </Link>
        </p>
      </div>

      <aside className="auth-side">
        <div className="auth-side__content">
          <p className="auth-side__eyebrow">Grátis para começar</p>
          <h2 className="auth-side__title">
            Transforme briefings em user stories claras antes da próxima sprint.
          </h2>
          <ul className="auth-side__list">
            <li>Teste grátis a criação de user stories</li>
            <li>Critérios de aceite e riscos de implementação</li>
            <li>Histórico com versões por feature</li>
            <li>Cópia em Markdown para uso no backlog</li>
          </ul>
          <div className="auth-side__preview">
            <p className="auth-side__preview-label">O que você vai gerar</p>
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
          <div className="auth-side__upgrade">
            <p className="auth-side__upgrade-label">Precisa de mais escala?</p>
            <p>O plano {PRO_PLAN_NAME} entra quando você precisar de mais volume, versões e recursos avançados.</p>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default SignupPage
