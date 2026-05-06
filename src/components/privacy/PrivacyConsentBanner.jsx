import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  '/admin',
  '/preferencias-de-privacidade',
  '/preferencias-de-cookies',
]

function isPublicConsentPath(pathname) {
  return !CONSENT_PUBLIC_BLOCKLIST.some((path) =>
    pathname === path || pathname.startsWith(`${path}/`)
  )
}

function PrivacyConsentBanner() {
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
        <p className="privacy-consent-banner__eyebrow">Privacidade na forja</p>
        <h2 id="privacy-consent-title">Controle de dados opcionais</h2>
        <p id="privacy-consent-description">
          Usamos tecnologias essenciais para manter o ProdForge funcionando e, futuramente, poderemos
          usar cookies analíticos para melhorar a experiência, entender uso do produto e evoluir
          nossas ferramentas com IA. Você pode aceitar, recusar ou ajustar recursos opcionais.
        </p>
        <p className="privacy-consent-banner__links">
          <Link to="/politica-de-privacidade">Política de Privacidade</Link>
          <span aria-hidden="true">·</span>
          <Link to="/termos-de-uso">Termos de Uso</Link>
        </p>
      </div>

      <div className="privacy-consent-banner__actions" aria-label="Ações de consentimento">
        <button
          type="button"
          className="forge-button forge-button--ember forge-button--sm"
          onClick={() => handleDecision(PRIVACY_CONSENT_STATUS.accepted)}
        >
          Aceitar todos
        </button>
        <button
          type="button"
          className="forge-button forge-button--metal forge-button--sm"
          onClick={() => handleDecision(PRIVACY_CONSENT_STATUS.essentialOnly)}
        >
          Recusar opcionais
        </button>
        <Link className="forge-button forge-button--ghost forge-button--sm" to="/preferencias-de-privacidade">
          Gerenciar preferências
        </Link>
      </div>
    </section>
  )
}

export default PrivacyConsentBanner
