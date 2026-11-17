import { useCopy, useLanguage } from '../i18n/context'
import { useState } from 'react'
import Link from '../i18n/LocalizedLink'
import { usePublicPageMetadata } from '../hooks/usePublicPageMetadata'
import {
  clearPrivacyConsent,
  getPrivacyConsent,
  PRIVACY_CONSENT_CATEGORIES,
  PRIVACY_CONSENT_CATEGORY_AVAILABILITY,
  PRIVACY_CONSENT_STATUS,
  setPrivacyConsent,
  setPrivacyConsentPreferences,
} from '../utils/privacyConsent'

const getStatuses = (t) => ({
  [PRIVACY_CONSENT_STATUS.accepted]: {
    label: t('privacyPreferencesPage_todos_aceitos'),
    tone: 'accepted',
    description: t('privacyPreferencesPage_voce_autorizou_tecnologias_essenciais_analiticas'),
  },
  [PRIVACY_CONSENT_STATUS.essentialOnly]: {
    label: t('privacyPreferencesPage_apenas_essenciais'),
    tone: 'essential',
    description: t('privacyPreferencesPage_voce_autorizou_somente_tecnologias_necessarias'),
  },
  [PRIVACY_CONSENT_STATUS.custom]: {
    label: t('privacyPreferencesPage_preferencia_personalizada'),
    tone: 'custom',
    description: t('privacyPreferencesPage_voce_definiu_manualmente_quais_tecnologias'),
  },
  none: {
    label: t('privacyPreferencesPage_nenhuma_escolha_registrada'),
    tone: 'empty',
    description: t('privacyPreferencesPage_ainda_nao_ha_uma_decisao'),
  },
})

const getCookieCategories = (t) => [
  {
    id: PRIVACY_CONSENT_CATEGORIES.essential,
    title: t('privacyPreferencesPage_cookies_essenciais'),
    badge: t('privacyPreferencesPage_sempre_ativos'),
    description:
      t('privacyPreferencesPage_necessarios_para_login_seguranca_e'),
    locked: true,
  },
  {
    id: PRIVACY_CONSENT_CATEGORIES.analytics,
    title: t('privacyPreferencesPage_cookies_analiticos'),
    badge: t('privacyPreferencesPage_opcional'),
    description:
      t('privacyPreferencesPage_ajudam_a_entender_uso_identificar'),
  },
  {
    id: PRIVACY_CONSENT_CATEGORIES.marketing,
    title: t('privacyPreferencesPage_cookies_de_marketing'),
    badge: t(PRIVACY_CONSENT_CATEGORY_AVAILABILITY[PRIVACY_CONSENT_CATEGORIES.marketing]
      ? 'privacyPreferencesPage_opcional'
      : 'privacyPreferencesPage_indisponiveis'),
    description:
      t('privacyPreferencesPage_usados_futuramente_para_campanhas_e'),
  },
]

function formatConsentDate(timestamp, language, t) {
  if (!timestamp) return t('privacyPreferencesPage_nao_registrada')

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return t('privacyPreferencesPage_data_indisponivel')

  return new Intl.DateTimeFormat(language, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
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

function getCategoryStatusLabel(consent, categoryId, t) {
  if (categoryId === PRIVACY_CONSENT_CATEGORIES.essential) return t('privacyPreferencesPage_sempre_ativos')
  if (!PRIVACY_CONSENT_CATEGORY_AVAILABILITY[categoryId]) return t('privacyPreferencesPage_indisponiveis')
  return consent?.categories?.[categoryId] ? t('privacyPreferencesPage_autorizados') : t('privacyPreferencesPage_recusados')
}

function PrivacyPreferencesPage() {
  const t = useCopy('privacyPreferencesPage')
  const cookieCategories = getCookieCategories(t)
  const [consent, setConsent] = useState(() => getPrivacyConsent())
  const [selectedCategories, setSelectedCategories] = useState(() => getPreferenceFormState(consent))
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const { language } = useLanguage()
  const statuses = getStatuses(t)
  const currentStatus = statuses[consent?.status] ?? statuses.none

  const consentDetails = [
    { label: t('privacyPreferencesPage_status_atual'), value: currentStatus.label },
    { label: t('privacyPreferencesPage_ultima_escolha'), value: formatConsentDate(consent?.timestamp, language, t) },
    { label: t('privacyPreferencesPage_versao_do_consentimento'), value: consent?.version ?? t('privacyPreferencesPage_nao_registrada') },
  ]

  usePublicPageMetadata('preferences')

  function syncConsent(nextConsent) {
    setConsent(nextConsent)
    setSelectedCategories(getPreferenceFormState(nextConsent))
  }

  function handleSetConsent(status) {
    const nextConsent = setPrivacyConsent(status)

    if (!nextConsent) {
      setFeedbackMessage('privacyPreferencesPage_nao_foi_possivel_salvar_sua')
      return
    }

    syncConsent(nextConsent)
    setFeedbackMessage(
      status === PRIVACY_CONSENT_STATUS.accepted
        ? 'privacyPreferencesPage_preferencia_atualizada_cookies_analiticos_e'
        : 'privacyPreferencesPage_preferencia_atualizada_cookies_analiticos_e_35',
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
      setFeedbackMessage('privacyPreferencesPage_nao_foi_possivel_salvar_sua')
      return
    }

    syncConsent(nextConsent)
    setFeedbackMessage('privacyPreferencesPage_preferencias_salvas_para_este_navegador')
  }

  function handleClearConsent() {
    const wasCleared = clearPrivacyConsent()

    if (!wasCleared) {
      setFeedbackMessage('privacyPreferencesPage_nao_foi_possivel_redefinir_sua')
      return
    }

    setConsent(null)
    setSelectedCategories(getPreferenceFormState(null))
    setFeedbackMessage('privacyPreferencesPage_escolha_redefinida_o_aviso_voltara')
  }

  return (
    <div className="page privacy-policy-page privacy-preferences-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('privacyPreferencesPage_controle_de_privacidade')}</p>
          <h1>{t('privacyPreferencesPage_preferencias_de_privacidade')}</h1>
          <p>
            {t('privacyPreferencesPage_revise_ou_altere_sua_escolha')}
          </p>

          <div className="privacy-policy-hero__actions">
            <Link className="forge-button forge-button--metal forge-button--md" to="/politica-de-privacidade">
              {t('privacyPreferencesPage_politica_de_privacidade')}
            </Link>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/termos-de-uso">
              {t('privacyPreferencesPage_termos_de_uso')}
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary" aria-label={t('privacyPreferencesPage_resumo_das_preferencias')}>
          <p className="privacy-policy-hero__summary-label">{t('privacyPreferencesPage_status_atual')}</p>
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
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">{t('privacyPreferencesPage_escolha_salva')}</p>
            <h2 id="privacy-preferences-current-title">{t('privacyPreferencesPage_preferencia_registrada_neste_navegador')}</h2>
            <p>
              {t('privacyPreferencesPage_consulte_a_decisao_atual_veja')}
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

          <div className="privacy-preferences-category-status" aria-label={t('privacyPreferencesPage_status_por_categoria')}>
            {cookieCategories.map((category) => (
              <p key={category.id}>
                <span>{category.title}</span>
                <strong>{getCategoryStatusLabel(consent, category.id, t)}</strong>
              </p>
            ))}
          </div>

          {feedbackMessage ? (
            <p className="privacy-preferences-feedback" role="status" aria-live="polite">
              {t(feedbackMessage)}
            </p>
          ) : null}
        </section>

        <section
          className="privacy-preferences-card forge-panel forge-panel--metal"
          aria-labelledby="privacy-preferences-actions-title"
        >
          <div className="privacy-preferences-card__header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('privacyPreferencesPage_ajuste_rapido')}</p>
            <h2 id="privacy-preferences-actions-title">{t('privacyPreferencesPage_alterar_preferencia')}</h2>
            <p>{t('privacyPreferencesPage_escolha_como_o_prodforge_pode')}</p>
          </div>

          <div className="privacy-preferences-options" aria-label={t('privacyPreferencesPage_categorias_de_cookies')}>
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

          <div className="privacy-preferences-actions" aria-label={t('privacyPreferencesPage_acoes_de_preferencias_de_privacidade')}>
            <button
              type="button"
              className="forge-button forge-button--ember forge-button--md"
              onClick={handleSavePreferences}
            >
              {t('privacyPreferencesPage_salvar_preferencias')}
            </button>
            <button
              type="button"
              className="forge-button forge-button--metal forge-button--md"
              onClick={() => handleSetConsent(PRIVACY_CONSENT_STATUS.accepted)}
            >
              {t('privacyPreferencesPage_aceitar_todos')}
            </button>
            <button
              type="button"
              className="forge-button forge-button--tech forge-button--md"
              onClick={() => handleSetConsent(PRIVACY_CONSENT_STATUS.essentialOnly)}
            >
              {t('privacyPreferencesPage_recusar_opcionais')}
            </button>
            <button
              type="button"
              className="forge-button forge-button--ghost forge-button--md"
              onClick={handleClearConsent}
            >
              {t('privacyPreferencesPage_redefinir_escolha')}
            </button>
          </div>
        </section>

        <section
          className="privacy-preferences-card privacy-preferences-card--wide forge-panel forge-panel--metal"
          aria-labelledby="privacy-preferences-info-title"
        >
          <div className="privacy-preferences-card__header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--neutral">{t('privacyPreferencesPage_como_funciona')}</p>
            <h2 id="privacy-preferences-info-title">{t('privacyPreferencesPage_o_que_esta_escolha_controla')}</h2>
          </div>

          <div className="privacy-preferences-explainer">
            <article>
              <h3>{t('privacyPreferencesPage_cookies_essenciais')}</h3>
              <p>
                {t('privacyPreferencesPage_sao_necessarios_para_login_seguranca')}
              </p>
            </article>
            <article>
              <h3>{t('privacyPreferencesPage_cookies_analiticos')}</h3>
              <p>
                {t('privacyPreferencesPage_ajudam_a_entender_uso_desempenho')}
              </p>
            </article>
            <article>
              <h3>{t('privacyPreferencesPage_cookies_de_marketing')}</h3>
              <p>
                {t('privacyPreferencesPage_sao_usados_futuramente_para_campanhas')}
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}

export default PrivacyPreferencesPage
