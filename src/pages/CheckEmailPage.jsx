import { useAuthJourney } from '../hooks/useAuthJourney'
import { useCopy } from '../i18n/context'
import AuthReturnContext from '../components/auth/AuthReturnContext'
import { getAuthErrorKey, getConfirmationErrorKey, isValidAuthEmail } from '../utils/authErrors'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME, FREE_GENERATION_LIMIT } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'
import '../styles/pages.css'
import { maskEmail, resendSignupConfirmation } from '../services/authService'
import { trackEvent } from '../services/analyticsService'

function CheckEmailPage() {
  const t = useCopy('auth')
  const { context, emailRedirectTo, from, isAuthLoading, language, location, pathTo } = useAuthJourney()
  const knownEmail = typeof location.state?.email === 'string' ? location.state.email.trim() : ''
  const [email, setEmail] = useState(knownEmail)
  const [sentEmail, setSentEmail] = useState(knownEmail)
  const [callbackError, setCallbackError] = useState(() => getConfirmationErrorKey(location))
  const [fieldError, setFieldError] = useState('')
  const target = t('destinations.' + context + '.target')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackTone, setFeedbackTone] = useState('info')
  const [isResending, setIsResending] = useState(false)

  usePageMetadata({
    language,
    title: t('checkTitle'),
    description: t('checkMetadata'),
    path: '/check-email',
    robots: 'noindex,follow',
  })

  const maskedEmail = maskEmail(sentEmail)

  async function handleResend(event) {
    event.preventDefault()
    if (isResending) return
    const address = email.trim()
    if (!isValidAuthEmail(address)) {
      setFieldError(address ? 'emailInvalid' : 'emailRequired')
      event.currentTarget.querySelector('#resend-email')?.focus()
      return
    }
    setFieldError('')

    setIsResending(true)
    setFeedbackMessage('')
    setFeedbackTone('info')

    const { error } = await resendSignupConfirmation(address, emailRedirectTo)
    setIsResending(false)

    if (error) {
      setFeedbackTone('error')
      setFeedbackMessage(getAuthErrorKey(error))
      return
    }

    trackEvent({
      event_name: 'signup_confirmation_resent',
      event_category: 'auth',
      page_path: '/check-email',
    })
    setFeedbackTone('info')
    setCallbackError('')
    setSentEmail(address)
    setFeedbackMessage('emailResent')
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
            <p className="auth-card__eyebrow">{t('checkingSession')}</p>
            <h1 className="auth-card__title">{t('loadingAccess')}</h1>
            <p className="auth-card__description">
              {t('loadingDetail')}
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
          <p className="auth-card__eyebrow">{t('checkEyebrow')}</p>
          <h1 className="auth-card__title">{t('checkHeading')}</h1>
          <p className="auth-card__description">
            {t(maskedEmail && !callbackError ? 'checkIntro' : 'checkReopen')}
          </p>
        </div>

        <p className="auth-card__info" role="status">
          {maskedEmail
            ? t('checkMasked', { email: maskedEmail, target })
            : t('checkUnmasked', { target })}
        </p>

        <AuthReturnContext destination={context} heading="afterConfirmation" />

        {callbackError && <p className="auth-card__error" role="alert">{t(callbackError)}</p>}

        {feedbackMessage ? (
          <p
            className={feedbackTone === 'error' ? 'auth-card__error' : 'auth-card__info'}
            role={feedbackTone === 'error' ? 'alert' : 'status'}
          >
            {t(feedbackMessage)}
          </p>
        ) : null}

        <div className="auth-card__helper-block">
          <p className="auth-card__helper-title">{t('nextSteps')}</p>
          <ul className="auth-card__helper-list">
            <li>{t('stepInbox')}</li>
            <li>{t('stepConfirm')}</li>
            <li>{t('stepSpam')}</li>
          </ul>
        </div>

        <div className="auth-card__actions">
          <form className="auth-card__form" onSubmit={handleResend} noValidate>
            {!knownEmail && (
              <div className="auth-card__field">
                <label className="auth-card__label" htmlFor="resend-email">{t('email')}</label>
                <input
                  id="resend-email"
                  className="auth-card__input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setFieldError('')
                  }}
                  required
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? 'resend-email-error' : undefined}
                />
                {fieldError && <p className="auth-card__field-error" id="resend-email-error">{t(fieldError)}</p>}
              </div>
            )}
            <button type="submit" className="auth-card__submit" disabled={isResending}>
              {isResending ? t('checkResending') : t('resendEmail')}
            </button>
          </form>

          <Link
            to={pathTo('/login')}
            replace
            state={{
              email: email.trim(),
              from,
              notice: 'noticeConfirmed',
            }}
            className="auth-card__submit auth-card__submit--secondary"
          >
            {t('loginLink')}
          </Link>
        </div>
      </div>

      <aside className="auth-side">
        <div className="auth-side__content">
          <p className="auth-side__eyebrow">{t('checkSideLabel')}</p>
          <h2 className="auth-side__title">
            {t('checkSideTitle')}
          </h2>
          <ul className="auth-side__list">
            <li>{t('checkSideCredits', { count: FREE_GENERATION_LIMIT })}</li>
            <li>{t('checkSideStructure')}</li>
            <li>{t('checkSideSaved')}</li>
            <li>{t('checkSideCopy')}</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

export default CheckEmailPage
