import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APP_NAME, FREE_GENERATION_LIMIT, PRO_PLAN_NAME } from '../constants/app'
import { useAuth } from '../hooks/useAuth'
import '../styles/pages.css'
import { getAuthErrorMessage, signUpWithEmail } from '../services/authService'
import { trackEvent } from '../services/analyticsService'

function SignupPage() {
  const navigate = useNavigate()
  const { user, isAuthLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate('/tool', { replace: true })
    }
  }, [isAuthLoading, navigate, user])

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    trackEvent({ event_name: 'signup_started', event_category: 'auth', page_path: '/signup' })

    const normalizedEmail = email.trim()
    const { data, error } = await signUpWithEmail({ email: normalizedEmail, password })

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
      navigate('/tool', { replace: true })
      return
    }

    trackEvent({
      event_name: 'signup_completed',
      event_category: 'auth',
      page_path: '/signup',
      metadata: { confirmation_pending: true },
    })
    navigate('/check-email', {
      replace: true,
      state: { email: normalizedEmail, pendingConfirmation: true },
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
          <p className="auth-card__eyebrow">Cadastro gratuito</p>
          <h1 className="auth-card__title">Criar sua conta</h1>
          <p className="auth-card__description">
            Crie sua conta para forjar, salvar versões e continuar a inspeção quando quiser.
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
          <p className="auth-side__eyebrow">Grátis para começar</p>
          <h2 className="auth-side__title">
            Comece agora. Sua primeira user story em 60 segundos.
          </h2>
          <ul className="auth-side__list">
            <li>{FREE_GENERATION_LIMIT} forjas de user story incluídas</li>
            <li>Critérios de aceite e teste de resistência automáticos</li>
            <li>Peças forjadas com versões salvas por feature</li>
            <li>Exportação em Markdown e texto simples</li>
            <li>Acesso ao Campo de Treino ProdForge</li>
          </ul>
          <div className="auth-side__preview">
            <p className="auth-side__preview-label">O que você vai forjar</p>
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
