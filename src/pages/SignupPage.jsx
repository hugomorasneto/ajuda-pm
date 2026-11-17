import { Trans } from 'react-i18next'
import AuthBrandBar from '../components/auth/AuthBrandBar'
import AuthStoryExample from '../components/auth/AuthStoryExample'
import { useAuthJourney } from '../hooks/useAuthJourney'
import { useCopy, useLanguage } from '../i18n/context'
import AuthReturnContext from '../components/auth/AuthReturnContext'
import { getAuthErrorKey, isValidAuthEmail } from '../utils/authErrors'
import { useState } from 'react'
import Link from '../i18n/LocalizedLink'
import { PRO_PLAN_NAME } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'
import '../styles/pages.css'
import { signUpWithEmail } from '../services/authService'
import { trackEvent } from '../services/analyticsService'
import { localLegalAssertion } from '../services/legalConsentService'

function SignupPage() {
  const t = useCopy('auth')
  const { preview } = useLanguage()
  const { context, emailRedirectTo, from, language, location, pathTo, showCheckEmail } = useAuthJourney()
  const isPlanningInvite = context === 'planning'
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  usePageMetadata({
    language,
    title: t('signupTitle'),
    description: t('signupMetadata'),
    path: '/signup',
    robots: 'noindex,follow',
  })

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const normalizedEmail = email.trim()
    const nextFieldErrors = {}

    if (!normalizedEmail) {
      nextFieldErrors.email = 'emailRequired'
    } else if (!isValidAuthEmail(normalizedEmail)) {
      nextFieldErrors.email = 'emailInvalid'
    }

    if (!password) {
      nextFieldErrors.password = 'passwordRequired'
    } else if (password.length < 6) {
      nextFieldErrors.password = 'passwordShort'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      event.currentTarget.querySelector(nextFieldErrors.email ? '#email' : '#password')?.focus()
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
      redirectTo: emailRedirectTo,
      ...(preview ? { legalAcceptance: localLegalAssertion(language) } : {}),
    })

    if (error) {
      setErrorMessage(getAuthErrorKey(error))
      setIsSubmitting(false)
      return
    }

    const isExistingUser =
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0

    if (isExistingUser) {
      setErrorMessage('alreadyRegistered')
      setIsSubmitting(false)
      return
    }

    if (data.session) {
      trackEvent({ event_name: 'signup_completed', event_category: 'auth', page_path: '/signup' })
      return
    }

    trackEvent({
      event_name: 'signup_completed',
      event_category: 'auth',
      page_path: '/signup',
      metadata: { confirmation_pending: true },
    })
    showCheckEmail(normalizedEmail)
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
        <AuthBrandBar />

        <div className="auth-card__header">
          <p className="auth-card__eyebrow">{t('signupEyebrow')}</p>
          <h1 className="auth-card__title">{t('signupHeading')}</h1>
          <p className="auth-card__description">
            {isPlanningInvite
              ? t('signupPlanning')
              : t('signupIntro')}
          </p>
        </div>

        <AuthReturnContext destination={context} heading="afterConfirmation" />

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
              aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
              required
            />
            {fieldErrors.email ? (
              <p className="auth-card__field-error" id="signup-email-error">{t(fieldErrors.email)}</p>
            ) : null}
          </div>

          <div className="auth-card__field">
            <label className="auth-card__label" htmlFor="password">
              {t('password')}
              <span className="auth-card__label-hint">{t('passwordHint')}</span>
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
              <p className="auth-card__field-error" id="signup-password-error">{t(fieldErrors.password)}</p>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="auth-card__error" role="alert">{t(errorMessage)}</p>
          ) : null}

          <button
            type="submit"
            className="auth-card__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('creating') : t('createFree')}
          </button>

          <p className="auth-card__terms" id="uso-de-dados">
            <Trans
              t={t}
              ns="auth"
              i18nKey="signupTerms"
              components={{
                terms: <Link to="/termos-de-uso" className="auth-card__link" {...(preview ? {
                  target: '_blank', rel: 'noreferrer', 'aria-label': t('legalTermsNewTab'),
                } : {})} />,
                privacy: <Link to="/politica-de-privacidade" className="auth-card__link" {...(preview ? {
                  target: '_blank', rel: 'noreferrer', 'aria-label': t('legalPrivacyNewTab'),
                } : {})} />,
              }}
            />
          </p>
        </form>

        <p className="auth-card__switch">
          {t('hasAccount')}{' '}
          <Link to={pathTo('/login')} className="auth-card__link" state={{ from, email: email.trim() }}>
            {t('signIn')}
          </Link>
        </p>
      </div>

      <aside className="auth-side">
        <div className="auth-side__content">
          <p className="auth-side__eyebrow">{t('signupSideLabel')}</p>
          <h2 className="auth-side__title">
            {t('signupSideTitle')}
          </h2>
          <ul className="auth-side__list">
            <li>{t('signupSideTrial')}</li>
            <li>{t('signupSideCriteria')}</li>
            <li>{t('signupSideHistory')}</li>
            <li>{t('signupSideMarkdown')}</li>
          </ul>
          <AuthStoryExample label="signupExample" />
          <div className="auth-side__upgrade">
            <p className="auth-side__upgrade-label">{t('moreScale')}</p>
            <p>{t('planDetails', { plan: PRO_PLAN_NAME })}</p>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default SignupPage
