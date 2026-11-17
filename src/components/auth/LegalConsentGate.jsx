import { useEffect, useRef, useState } from 'react'
import { useCopy, useLanguage } from '../../i18n/context'
import LanguageSwitcher from '../../i18n/LanguageSwitcher'
import Link from '../../i18n/LocalizedLink'
import { acceptLocalLegalTerms, getLocalLegalStatus } from '../../services/legalConsentService'
import release from '../../content/legalRelease.json'
import AuthBrandBar from './AuthBrandBar'
import { usePageMetadata } from '../../hooks/usePageMetadata'
import '../../styles/pages.css'

export default function LegalConsentGate({ children }) {
  const t = useCopy('auth')
  const { language } = useLanguage()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  usePageMetadata({
    enabled: status?.accepted !== true,
    language,
    title: t('legalHeading'),
    description: t('legalDescription', { version: release.version }),
    path: window.location.pathname,
    robots: 'noindex,follow',
  })

  useEffect(() => {
    let active = true
    getLocalLegalStatus().then((nextStatus) => {
      if (active) {
        setStatus(nextStatus)
        setLoading(false)
      }
    }).catch(() => {
      if (active) {
        setError('legalLoadFailed')
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [reload])

  function retry() {
    setLoading(true)
    setError('')
    setReload((current) => current + 1)
  }

  async function accept() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      setStatus(await acceptLocalLegalTerms(language))
    } catch {
      setError('legalSaveFailed')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (status?.accepted === true) return children

  return (
    <div className="auth-shell auth-shell--signup">
      <section className="auth-card" aria-labelledby="legal-acceptance-title">
        <AuthBrandBar />
        <LanguageSwitcher />
        <div className="auth-card__header">
          <h1 id="legal-acceptance-title" className="auth-card__title">{t('legalHeading')}</h1>
          <p className="auth-card__description">{t('legalDescription', { version: release.version })}</p>
        </div>
        <p className="auth-card__terms">
          <Link to="/termos-de-uso" target="_blank" rel="noreferrer" aria-label={t('legalTermsNewTab')}>{t('legalTerms')}</Link>
          {' · '}
          <Link to="/politica-de-privacidade" target="_blank" rel="noreferrer" aria-label={t('legalPrivacyNewTab')}>{t('legalPrivacy')}</Link>
        </p>
        <p className="auth-card__description">{t('legalPrivacyNotice')}</p>
        {error && <p className="auth-card__error" role="alert">{t(error)}</p>}
        {loading ? <p role="status">{t('legalLoading')}</p> : status ? (
          <button type="button" className="auth-card__submit" onClick={accept} disabled={saving}>
            {t(saving ? 'legalSaving' : 'legalAccept')}
          </button>
        ) : (
          <button type="button" className="auth-card__submit" onClick={retry}>{t('legalRetry')}</button>
        )}
      </section>
    </div>
  )
}
