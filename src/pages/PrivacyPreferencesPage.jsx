import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'
import {
  clearPrivacyConsent,
  getPrivacyConsent,
  PRIVACY_CONSENT_CATEGORIES,
  PRIVACY_CONSENT_CATEGORY_AVAILABILITY,
  PRIVACY_CONSENT_STATUS,
  setPrivacyConsent,
  setPrivacyConsentPreferences,
} from '../utils/privacyConsent'

const STATUS_COPY = {
  [PRIVACY_CONSENT_STATUS.accepted]: {
    label: 'Todos aceitos',
    tone: 'accepted',
    description: 'Você autorizou tecnologias essenciais, analíticas e de marketing neste navegador.',
  },
  [PRIVACY_CONSENT_STATUS.essentialOnly]: {
    label: 'Apenas essenciais',
    tone: 'essential',
    description: 'Você autorizou somente tecnologias necessárias para o funcionamento básico.',
  },
  [PRIVACY_CONSENT_STATUS.custom]: {
    label: 'Preferência personalizada',
    tone: 'custom',
    description: 'Você definiu manualmente quais tecnologias opcionais podem ser usadas.',
  },
  none: {
    label: 'Nenhuma escolha registrada',
    tone: 'empty',
    description: 'Ainda não há uma decisão de consentimento salva neste navegador.',
  },
}

const cookieCategories = [
  {
    id: PRIVACY_CONSENT_CATEGORIES.essential,
    title: 'Cookies essenciais',
    badge: 'Sempre ativos',
    description:
      'Necessários para login, segurança e funcionamento básico do ProdForge.',
    locked: true,
  },
  {
    id: PRIVACY_CONSENT_CATEGORIES.analytics,
    title: 'Cookies analíticos',
    badge: 'Opcional',
    description:
      'Ajudam a entender uso, identificar pontos de fricção e melhorar o produto.',
  },
  {
    id: PRIVACY_CONSENT_CATEGORIES.marketing,
    title: 'Cookies de marketing',
    badge: 'Opcional',
    description:
      'Usados futuramente para campanhas e mensuração. Se ainda não houver recursos opcionais ativos, a escolha fica registrada para uso futuro.',
  },
]

function formatConsentDate(timestamp) {
  if (!timestamp) return 'Não registrada'

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Data indisponível'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getStatusCopy(consent) {
  return consent?.status && STATUS_COPY[consent.status] ? STATUS_COPY[consent.status] : STATUS_COPY.none
}

function getPreferenceFormState(consent) {
  return {
    [PRIVACY_CONSENT_CATEGORIES.essential]: true,
    [PRIVACY_CONSENT_CATEGORIES.analytics]: Boolean(
      consent?.categories?.[PRIVACY_CONSENT_CATEGORIES.analytics],
    ),
    [PRIVACY_CONSENT_CATEGORIES.marketing]: Boolean(
      consent?.categories?.[PRIVACY_CONSENT_CATEGORIES.marketing],
    ),
  }
}

function getCategoryStatusLabel(consent, categoryId) {
  if (categoryId === PRIVACY_CONSENT_CATEGORIES.essential) return 'Sempre ativos'
  if (!PRIVACY_CONSENT_CATEGORY_AVAILABILITY[categoryId]) return 'Indisponíveis'
  return consent?.categories?.[categoryId] ? 'Autorizados' : 'Recusados'
}

function PrivacyPreferencesPage() {
  const [consent, setConsent] = useState(() => getPrivacyConsent())
  const [selectedCategories, setSelectedCategories] = useState(() => getPreferenceFormState(consent))
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const currentStatus = getStatusCopy(consent)

  const consentDetails = useMemo(
    () => [
      { label: 'Status atual', value: currentStatus.label },
      { label: 'Última escolha', value: consent ? formatConsentDate(consent.timestamp) : 'Não registrada' },
      { label: 'Versão do consentimento', value: consent?.version ?? 'Não registrada' },
    ],
    [consent, currentStatus.label],
  )

  const pageDescription =
    'Revise, altere ou redefina sua escolha de consentimento de privacidade salva neste navegador para o ProdForge.'

  usePageMetadata({
    title: 'Preferências de Privacidade | ProdForge',
    description: pageDescription,
    path: '/preferencias-de-privacidade',
    ogTitle: 'Preferências de Privacidade | ProdForge',
    ogDescription: pageDescription,
    twitterTitle: 'Preferências de Privacidade | ProdForge',
    twitterDescription: pageDescription,
    robots: 'noindex,follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Preferências de Privacidade',
      description: pageDescription,
      inLanguage: 'pt-BR',
      isPartOf: {
        '@type': 'WebSite',
        name: APP_NAME,
        url: 'https://prodforge.techtupa.com.br/',
      },
      dateModified: '2026-05-06',
    },
  })

  function syncConsent(nextConsent) {
    setConsent(nextConsent)
    setSelectedCategories(getPreferenceFormState(nextConsent))
  }

  function handleSetConsent(status) {
    const nextConsent = setPrivacyConsent(status)

    if (!nextConsent) {
      setFeedbackMessage('Não foi possível salvar sua preferência neste navegador.')
      return
    }

    syncConsent(nextConsent)
    setFeedbackMessage(
      status === PRIVACY_CONSENT_STATUS.accepted
        ? 'Preferência atualizada: cookies analíticos e de marketing foram aceitos.'
        : 'Preferência atualizada: cookies analíticos e de marketing foram recusados.',
    )
  }

  function handleToggleCategory(categoryId) {
    if (
      categoryId === PRIVACY_CONSENT_CATEGORIES.essential ||
      !PRIVACY_CONSENT_CATEGORY_AVAILABILITY[categoryId]
    ) {
      return
    }

    setSelectedCategories((currentCategories) => ({
      ...currentCategories,
      [categoryId]: !currentCategories[categoryId],
    }))
  }

  function handleSavePreferences() {
    const nextConsent = setPrivacyConsentPreferences(selectedCategories)

    if (!nextConsent) {
      setFeedbackMessage('Não foi possível salvar sua preferência neste navegador.')
      return
    }

    syncConsent(nextConsent)
    setFeedbackMessage('Preferências salvas para este navegador e dispositivo.')
  }

  function handleClearConsent() {
    const wasCleared = clearPrivacyConsent()

    if (!wasCleared) {
      setFeedbackMessage('Não foi possível redefinir sua escolha neste navegador.')
      return
    }

    setConsent(null)
    setSelectedCategories(getPreferenceFormState(null))
    setFeedbackMessage('Escolha redefinida. O aviso voltará a aparecer em outras rotas públicas.')
  }

  return (
    <div className="page privacy-policy-page privacy-preferences-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Controle de privacidade</p>
          <h1>Preferências de Privacidade</h1>
          <p>
            Revise ou altere sua escolha de consentimento do ProdForge. A preferência fica salva
            apenas neste navegador e neste dispositivo.
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--metal forge-button--md" to="/politica-de-privacidade">
              Política de Privacidade
            </Link>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/termos-de-uso">
              Termos de Uso
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary" aria-label="Resumo das preferências">
          <p className="privacy-policy-hero__summary-label">Status atual</p>
          <p className={`privacy-preferences-status privacy-preferences-status--${currentStatus.tone}`}>
            {currentStatus.label}
          </p>
          <p>{currentStatus.description}</p>
        </aside>
      </section>

      <div className="privacy-preferences-grid">
        <section
          className="privacy-preferences-card forge-panel forge-panel--metal"
          aria-labelledby="privacy-preferences-current-title"
        >
          <div className="privacy-preferences-card__header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">Escolha salva</p>
            <h2 id="privacy-preferences-current-title">Preferência registrada neste navegador</h2>
            <p>
              Consulte a decisão atual, veja o status por categoria ou remova a escolha salva para
              exibir o aviso novamente.
            </p>
          </div>

          <dl className="privacy-preferences-details">
            {consentDetails.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="privacy-preferences-category-status" aria-label="Status por categoria">
            {cookieCategories.map((category) => (
              <p key={category.id}>
                <span>{category.title}</span>
                <strong>{getCategoryStatusLabel(consent, category.id)}</strong>
              </p>
            ))}
          </div>

          {feedbackMessage ? (
            <p className="privacy-preferences-feedback" role="status" aria-live="polite">
              {feedbackMessage}
            </p>
          ) : null}
        </section>

        <section
          className="privacy-preferences-card forge-panel forge-panel--metal"
          aria-labelledby="privacy-preferences-actions-title"
        >
          <div className="privacy-preferences-card__header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Ajuste rápido</p>
            <h2 id="privacy-preferences-actions-title">Alterar preferência</h2>
            <p>Escolha como o ProdForge pode usar cookies e tecnologias similares neste navegador.</p>
          </div>

          <div className="privacy-preferences-options" aria-label="Categorias de cookies">
            {cookieCategories.map((category) => {
              const inputId = `privacy-preferences-${category.id}`
              const isDisabled =
                category.locked || category.disabled || !PRIVACY_CONSENT_CATEGORY_AVAILABILITY[category.id]
              const descriptionId = `${inputId}-description`

              return (
                <label
                  className={[
                    'privacy-preferences-option',
                    isDisabled ? 'privacy-preferences-option--disabled' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  htmlFor={inputId}
                  key={category.id}
                >
                  <input
                    aria-describedby={descriptionId}
                    checked={Boolean(selectedCategories[category.id])}
                    className="privacy-preferences-option__input"
                    disabled={isDisabled}
                    id={inputId}
                    onChange={() => handleToggleCategory(category.id)}
                    type="checkbox"
                  />
                  <span className="privacy-preferences-option__switch" aria-hidden="true">
                    <span />
                  </span>
                  <span className="privacy-preferences-option__copy">
                    <span className="privacy-preferences-option__topline">
                      <strong>{category.title}</strong>
                      <em>{category.badge}</em>
                    </span>
                    <span id={descriptionId}>{category.description}</span>
                  </span>
                </label>
              )
            })}
          </div>

          <div className="privacy-preferences-actions" aria-label="Ações de preferências de privacidade">
            <button
              type="button"
              className="forge-button forge-button--ember forge-button--md"
              onClick={handleSavePreferences}
            >
              Salvar preferências
            </button>
            <button
              type="button"
              className="forge-button forge-button--metal forge-button--md"
              onClick={() => handleSetConsent(PRIVACY_CONSENT_STATUS.accepted)}
            >
              Aceitar todos
            </button>
            <button
              type="button"
              className="forge-button forge-button--tech forge-button--md"
              onClick={() => handleSetConsent(PRIVACY_CONSENT_STATUS.essentialOnly)}
            >
              Recusar opcionais
            </button>
            <button
              type="button"
              className="forge-button forge-button--ghost forge-button--md"
              onClick={handleClearConsent}
            >
              Redefinir escolha
            </button>
          </div>
        </section>

        <section
          className="privacy-preferences-card privacy-preferences-card--wide forge-panel forge-panel--metal"
          aria-labelledby="privacy-preferences-info-title"
        >
          <div className="privacy-preferences-card__header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--neutral">Como funciona</p>
            <h2 id="privacy-preferences-info-title">O que esta escolha controla</h2>
          </div>

          <div className="privacy-preferences-explainer">
            <article>
              <h3>Cookies essenciais</h3>
              <p>
                São necessários para login, segurança, sessão e funcionamento básico do ProdForge.
                Eles não são bloqueados por esta preferência.
              </p>
            </article>
            <article>
              <h3>Cookies analíticos</h3>
              <p>
                Ajudam a entender uso, desempenho, erros e oportunidades de melhoria. Eles só devem
                ser usados quando autorizados neste navegador.
              </p>
            </article>
            <article>
              <h3>Cookies de marketing</h3>
              <p>
                São usados futuramente para campanhas e mensuração. Se ainda não houver recursos
                opcionais ativos nessa categoria, a escolha apenas deixa sua preferência registrada
                para uso futuro.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PrivacyPreferencesPage
