import { useCopy } from '../../i18n/context'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Link from '../../i18n/LocalizedLink'
import { getPilotPage } from '../../i18n/routes'
import {
  getPrivacyConsent,
  PRIVACY_CONSENT_CHANGE_EVENT,
  PRIVACY_CONSENT_STATUS,
  setPrivacyConsent,
} from '../../utils/privacyConsent'

const CONSENT_PUBLIC_BLOCKLIST = [
  '/tool',
  '/historico',
  '/projetos',
  '/times',
  '/roda',
  '/admin',
  '/preferencias-de-privacidade',
  '/preferencias-de-cookies',
]

function isPublicConsentPath(pathname) {
  if (getPilotPage(pathname)?.id === 'preferences') return false
  return !CONSENT_PUBLIC_BLOCKLIST.some((path) =>
    pathname === path || pathname.startsWith(`${path}/`)
  )
}

function PrivacyConsentBanner() {
  const t = useCopy('privacy')
  const location = useLocation()
  const [hasDecision, setHasDecision] = useState(() => Boolean(getPrivacyConsent()))

  useEffect(() => {
    function syncConsentState() {
      setHasDecision(Boolean(getPrivacyConsent()))
    }

    window.addEventListener(PRIVACY_CONSENT_CHANGE_EVENT, syncConsentState)
    window.addEventListener('storage', syncConsentState)

    return () => {
      window.removeEventListener(PRIVACY_CONSENT_CHANGE_EVENT, syncConsentState)
      window.removeEventListener('storage', syncConsentState)
    }
  }, [])

  if (hasDecision || !isPublicConsentPath(location.pathname)) {
    return null
  }

  function handleDecision(status) {
    const consent = setPrivacyConsent(status)
    if (consent) {
      setHasDecision(true)
    }
  }

  return (
    <section
      className="privacy-consent-banner theme-forge"
      aria-labelledby="privacy-consent-title"
      aria-describedby="privacy-consent-description"
    >
      <div className="privacy-consent-banner__signal" aria-hidden="true" />

      <div className="privacy-consent-banner__content">
        <p className="privacy-consent-banner__eyebrow">{t('eyebrow')}</p>
        <h2 id="privacy-consent-title">{t('title')}</h2>
        <p id="privacy-consent-description">
          {t('description')}
        </p>
        <p className="privacy-consent-banner__links">
          <Link to="/politica-de-privacidade">{t('policy')}</Link>
          <span aria-hidden="true">·</span>
          <Link to="/termos-de-uso">{t('terms')}</Link>
        </p>
      </div>

      <div className="privacy-consent-banner__actions" aria-label={t('actions')}>
        <button
          type="button"
          className="forge-button forge-button--ember forge-button--sm"
          onClick={() => handleDecision(PRIVACY_CONSENT_STATUS.accepted)}
        >
          {t('accept')}
        </button>
        <button
          type="button"
          className="forge-button forge-button--metal forge-button--sm"
          onClick={() => handleDecision(PRIVACY_CONSENT_STATUS.essentialOnly)}
        >
          {t('reject')}
        </button>
        <Link className="forge-button forge-button--ghost forge-button--sm" to="/preferencias-de-privacidade">
          {t('manage')}
        </Link>
      </div>
    </section>
  )
}

export default PrivacyConsentBanner
