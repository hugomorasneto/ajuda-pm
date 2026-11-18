import AuthBrandBar from '../components/auth/AuthBrandBar'
import AuthStoryExample from '../components/auth/AuthStoryExample'
import { useAuthJourney } from '../hooks/useAuthJourney'
import { useCopy } from '../i18n/context'
import AuthReturnContext from '../components/auth/AuthReturnContext'
import { getAuthErrorKey, isValidAuthEmail } from '../utils/authErrors'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageMetadata } from '../hooks/usePageMetadata'
import '../styles/pages.css'
import {
  resendSignupConfirmation,
  signInWithEmail,
} from '../services/authService'
import { trackEvent } from '../services/analyticsService'

function LoginPage() {
  const t = useCopy('auth')
  const { context, emailRedirectTo, from, language, location, pathTo } = useAuthJourney()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState(location.state?.notice ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [canResendConfirmation, setCanResendConfirmation] = useState(false)

  const isPlanningInvite = context === 'planning'

  usePageMetadata({
    language,
    title: t('loginTitle'),
    description: t('loginMetadata'),
    path: '/login',
    robots: 'noindex,follow',
  })

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting || isResending) return

    const normalizedEmail = email.trim()
    const nextFieldErrors = {}

    if (!normalizedEmail) {
      nextFieldErrors.email = 'emailRequired'
    } else if (!isValidAuthEmail(normalizedEmail)) {
      nextFieldErrors.email = 'emailInvalid'
    }

    if (!password) {
      nextFieldErrors.password = 'passwordRequired'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      event.currentTarget.querySelector(nextFieldErrors.email ? '#email' : '#password')?.focus()
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
      const errorKey = getAuthErrorKey(error)
      const needsConfirmation = errorKey === 'notConfirmed'
      setErrorMessage(errorKey)
      setInfoMessage(needsConfirmation ? 'resendPrompt' : '')
      setCanResendConfirmation(needsConfirmation && Boolean(email.trim()))
      setIsSubmitting(false)
      return
    }

    trackEvent({ event_name: 'login_completed', event_category: 'auth', page_path: '/login' })
  }

  function handleEmailChange(event) {
    setEmail(event.target.value)
    setCanResendConfirmation(false)
    setInfoMessage('')
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
    if (!normalizedEmail || isSubmitting || isResending) return

    setIsResending(true)
    setErrorMessage('')

    const { error } = await resendSignupConfirmation(normalizedEmail, emailRedirectTo)
    setIsResending(false)

    if (error) {
      setErrorMessage(getAuthErrorKey(error))
      return
    }

    setInfoMessage('emailResent')
    trackEvent({
      event_name: 'signup_confirmation_resent',
      event_category: 'auth',
      page_path: '/login',
    })
  }

  return (
    <div className="auth-shell auth-shell--login">
      <div className="auth-card">
        <AuthBrandBar />

        <div className="auth-card__header">
          <p className="auth-card__eyebrow">{t('loginEyebrow')}</p>
          <h1 className="auth-card__title">{t('loginHeading')}</h1>
          <p className="auth-card__description">
            {isPlanningInvite
              ? t('loginPlanning')
              : t('loginIntro')}
          </p>
        </div>

        <AuthReturnContext destination={context} heading="afterLogin" />

        {infoMessage ? (
          <p className="auth-card__info" role="status">{t(infoMessage, { target: t('destinations.' + context + '.target') })}</p>
        ) : null}

        <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="email">{t('email')}</label>
            <input
              id="email"
              className="auth-card__input"
              type="email"
              autoComplete="email"
              placeholder={t('emailExample')}
              value={email}
              onChange={handleEmailChange}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              required
            />
            {fieldErrors.email ? (
              <p className="auth-card__field-error" id="login-email-error">{t(fieldErrors.email)}</p>
            ) : null}
          </div>

          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="password">{t('password')}</label>
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
              <p className="auth-card__field-error" id="login-password-error">{t(fieldErrors.password)}</p>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="auth-card__error" role="alert">{t(errorMessage)}</p>
          ) : null}

          <button
            type="submit"
            className="auth-card__submit"
            disabled={isSubmitting || isResending}
          >
            {isSubmitting ? t('signingIn') : t('signIn')}
          </button>

          {canResendConfirmation ? (
            <button
              type="button"
              className="auth-card__submit auth-card__submit--secondary"
              onClick={handleResendConfirmation}
              disabled={isResending || isSubmitting}
            >
              {isResending ? t('resending') : t('resendConfirmation')}
            </button>
          ) : null}
        </form>

        <p className="auth-card__switch">
          {t('noAccount')}{' '}
          <Link
            to={pathTo('/signup')}
            className="auth-card__link"
            state={{ from, email: email.trim() }}
          >
            {t('createFree')}
          </Link>
        </p>
      </div>

      <aside className="auth-side">
        <div className="auth-side__content">
          <p className="auth-side__eyebrow">{t('loginSideLabel')}</p>
          <h2 className="auth-side__title">
            {t('loginSideTitle')}
          </h2>
          <ul className="auth-side__list">
            <li>{t('loginSideHistory')}</li>
            <li>{t('loginSideVersions')}</li>
            <li>{t('loginSideCriteria')}</li>
            <li>{t('loginSideOutput')}</li>
          </ul>
          <AuthStoryExample label="loginExample" />
        </div>
      </aside>
    </div>
  )
}

export default LoginPage
