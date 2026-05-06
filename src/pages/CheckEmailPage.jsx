import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { APP_NAME, FREE_GENERATION_LIMIT } from '../constants/app'
import { useAuth } from '../hooks/useAuth'
import { usePageMetadata } from '../hooks/usePageMetadata'
import '../styles/pages.css'
import { getAuthErrorMessage, maskEmail, resendSignupConfirmation } from '../services/authService'
import { trackEvent } from '../services/analyticsService'

function CheckEmailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthLoading } = useAuth()
  const email = typeof location.state?.email === 'string' ? location.state.email.trim() : ''
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackTone, setFeedbackTone] = useState('info')
  const [isResending, setIsResending] = useState(false)

  usePageMetadata({
    title: 'Verifique seu e-mail | ProdForge',
    description: 'Confirme seu e-mail para liberar o acesso à Bancada do ProdForge.',
    path: '/check-email',
    ogTitle: 'Verifique seu e-mail | ProdForge',
    ogDescription: 'Confirme seu e-mail para liberar o acesso à Bancada do ProdForge.',
    twitterTitle: 'Verifique seu e-mail | ProdForge',
    twitterDescription: 'Confirme seu e-mail para liberar o acesso à Bancada do ProdForge.',
    robots: 'noindex,follow',
  })

  const maskedEmail = useMemo(() => maskEmail(email), [email])

  useEffect(() => {
    if (!isAuthLoading && user) {
      navigate('/tool', { replace: true })
    }
  }, [isAuthLoading, navigate, user])

  async function handleResend() {
    if (!email) return

    setIsResending(true)
    setFeedbackMessage('')
    setFeedbackTone('info')

    const { error } = await resendSignupConfirmation(email)
    setIsResending(false)

    if (error) {
      setFeedbackTone('error')
      setFeedbackMessage(getAuthErrorMessage(error))
      return
    }

    trackEvent({
      event_name: 'signup_confirmation_resent',
      event_category: 'auth',
      page_path: '/check-email',
    })
    setFeedbackTone('info')
    setFeedbackMessage('Enviamos um novo link de confirmação para o seu e-mail.')
  }

  if (isAuthLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-card__brand">
            <span className="auth-card__brand-mark" />
            <span className="auth-card__brand-name">{APP_NAME}</span>
          </div>
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Validando sessão</p>
            <h1 className="auth-card__title">Carregando acesso</h1>
            <p className="auth-card__description">
              Aguarde enquanto verificamos sua sessão atual.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="auth-card__brand-mark" />
          <span className="auth-card__brand-name">{APP_NAME}</span>
        </div>

        <div className="auth-card__header">
          <p className="auth-card__eyebrow">Confirme seu acesso</p>
          <h1 className="auth-card__title">Verifique seu e-mail</h1>
          <p className="auth-card__description">
            Enviamos um link de confirmação para finalizar o cadastro e liberar sua bancada.
          </p>
        </div>

        <p className="auth-card__info" role="status">
          {maskedEmail
            ? `E-mail enviado para ${maskedEmail}. Depois de confirmar, você volta para a Bancada.`
            : 'Abra o e-mail usado no cadastro, confirme a conta e depois entre para acessar a bancada.'}
        </p>

        {feedbackMessage ? (
          <p
            className={feedbackTone === 'error' ? 'auth-card__error' : 'auth-card__info'}
            role={feedbackTone === 'error' ? 'alert' : 'status'}
          >
            {feedbackMessage}
          </p>
        ) : null}

        <div className="auth-card__helper-block">
          <p className="auth-card__helper-title">Próximos passos</p>
          <ul className="auth-card__helper-list">
            <li>Abra o e-mail mais recente enviado pelo ProdForge.</li>
            <li>Clique no link de confirmação para ativar a conta.</li>
            <li>Se não encontrar a mensagem, confira spam ou promoções.</li>
          </ul>
        </div>

        <div className="auth-card__actions">
          <button
            type="button"
            className="auth-card__submit"
            onClick={handleResend}
            disabled={isResending || !email}
          >
            {isResending ? 'Reenviando…' : 'Reenviar e-mail'}
          </button>

          <Link
            to="/login"
            replace
            state={{
              email,
              message: 'Depois de confirmar o e-mail, entre para acessar a bancada.',
            }}
            className="auth-card__submit auth-card__submit--secondary"
          >
            Ir para o login
          </Link>
        </div>
      </div>

      <aside className="auth-side">
        <div className="auth-side__content">
          <p className="auth-side__eyebrow">O que você libera ao entrar</p>
          <h2 className="auth-side__title">
            Bancada, peças salvas e inspeção no mesmo fluxo.
          </h2>
          <ul className="auth-side__list">
            <li>{FREE_GENERATION_LIMIT} gerações iniciais para validar o produto.</li>
            <li>User story com objetivo, critérios, trincas e teste de resistência.</li>
            <li>Peças forjadas salvas por usuário para continuar o refinamento.</li>
            <li>Cópia rápida para levar a saída ao backlog.</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

export default CheckEmailPage
