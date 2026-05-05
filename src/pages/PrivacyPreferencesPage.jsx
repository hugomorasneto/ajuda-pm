import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'
import {
  clearPrivacyConsent,
  getPrivacyConsent,
  PRIVACY_CONSENT_STATUS,
  setPrivacyConsent,
} from '../utils/privacyConsent'

const STATUS_COPY = {
  [PRIVACY_CONSENT_STATUS.accepted]: {
    label: 'Aceito',
    tone: 'accepted',
    description: 'Você autorizou o uso de tecnologias essenciais e recursos não essenciais.',
  },
  [PRIVACY_CONSENT_STATUS.essentialOnly]: {
    label: 'Apenas essenciais',
    tone: 'essential',
    description: 'Você autorizou somente tecnologias necessárias para o funcionamento básico.',
  },
  none: {
    label: 'Nenhuma escolha registrada',
    tone: 'empty',
    description: 'Ainda não há uma decisão de consentimento salva neste navegador.',
  },
}

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

function PrivacyPreferencesPage() {
  const [consent, setConsent] = useState(() => getPrivacyConsent())
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
      dateModified: '2026-05-05',
    },
  })

  function handleSetConsent(status) {
    const nextConsent = setPrivacyConsent(status)

    if (!nextConsent) {
      setFeedbackMessage('Não foi possível salvar sua preferência neste navegador.')
      return
    }

    setConsent(nextConsent)
    setFeedbackMessage(
      status === PRIVACY_CONSENT_STATUS.accepted
        ? 'Preferência atualizada: todos os recursos foram aceitos.'
        : 'Preferência atualizada: apenas recursos essenciais serão usados.',
    )
  }

  function handleClearConsent() {
    const wasCleared = clearPrivacyConsent()

    if (!wasCleared) {
      setFeedbackMessage('Não foi possível redefinir sua escolha neste navegador.')
      return
    }

    setConsent(null)
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
        <section className="privacy-preferences-card forge-panel forge-panel--metal" aria-labelledby="privacy-preferences-current-title">
          <div className="privacy-preferences-card__header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">Escolha salva</p>
            <h2 id="privacy-preferences-current-title">Preferência registrada neste navegador</h2>
            <p>
              Use este painel para consultar a decisão atual, alterar a preferência ou remover a
              escolha salva para ver o aviso novamente.
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

          {feedbackMessage ? (
            <p className="privacy-preferences-feedback" role="status" aria-live="polite">
              {feedbackMessage}
            </p>
          ) : null}
        </section>

        <section className="privacy-preferences-card forge-panel forge-panel--metal" aria-labelledby="privacy-preferences-actions-title">
          <div className="privacy-preferences-card__header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Ajuste rápido</p>
            <h2 id="privacy-preferences-actions-title">Alterar preferência</h2>
            <p>
              Você pode trocar sua decisão a qualquer momento. Não há categorias avançadas nesta fase.
            </p>
          </div>

          <div className="privacy-preferences-actions" aria-label="Ações de preferências de privacidade">
            <button
              type="button"
              className="forge-button forge-button--ember forge-button--md"
              onClick={() => handleSetConsent(PRIVACY_CONSENT_STATUS.accepted)}
            >
              Aceitar todos
            </button>
            <button
              type="button"
              className="forge-button forge-button--tech forge-button--md"
              onClick={() => handleSetConsent(PRIVACY_CONSENT_STATUS.essentialOnly)}
            >
              Usar apenas essenciais
            </button>
            <button
              type="button"
              className="forge-button forge-button--metal forge-button--md"
              onClick={handleClearConsent}
            >
              Redefinir escolha
            </button>
          </div>
        </section>

        <section className="privacy-preferences-card privacy-preferences-card--wide forge-panel forge-panel--metal" aria-labelledby="privacy-preferences-info-title">
          <div className="privacy-preferences-card__header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--neutral">Como funciona</p>
            <h2 id="privacy-preferences-info-title">O que esta escolha controla</h2>
          </div>

          <div className="privacy-preferences-explainer">
            <article>
              <h3>Tecnologias essenciais</h3>
              <p>
                São necessárias para manter o site, autenticação, segurança, sessão e funcionamento
                básico do ProdForge. Elas não são bloqueadas por esta preferência.
              </p>
            </article>
            <article>
              <h3>Recursos não essenciais</h3>
              <p>
                Podem ser usados futuramente para analytics, melhoria de produto, personalização e
                evolução das ferramentas com IA, sem integrar ferramentas externas nesta etapa.
              </p>
            </article>
            <article>
              <h3>Este navegador</h3>
              <p>
                Sua escolha fica salva apenas neste navegador e neste dispositivo. Se você usar outro
                navegador, limpar dados locais ou trocar de aparelho, poderá escolher novamente.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PrivacyPreferencesPage
