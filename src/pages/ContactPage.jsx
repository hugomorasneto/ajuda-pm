import { Trans } from 'react-i18next'
import { useCopy, useLanguage } from '../i18n/context'
import { useRef, useState } from 'react'
import Link from '../i18n/LocalizedLink'
import { formatPublicDate, usePublicPageMetadata } from '../hooks/usePublicPageMetadata'
import { sendContactMessage } from '../services/contactService'

const CONTACT_LAST_UPDATED = '2026-05-06'
const CONTACT_EMAIL = 'contato@techtupa.com.br'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_ERROR_MESSAGE = 'contactPage_nao_foi_possivel_enviar_agora'

const INITIAL_FORM_VALUES = {
  name: '',
  email: '',
  category: 'suporte',
  subject: '',
  message: '',
  company_site: '',
}

const CONTACT_FIELD_LIMITS = {
  name: 120,
  email: 180,
  subject: 160,
  message: 4000,
}

const getContactCategoryOptions = (t) => [
  { value: 'suporte', label: t('contactPage_suporte_e_duvidas_gerais') },
  { value: 'privacidade', label: t('contactPage_privacidade_e_dados') },
  { value: 'feedback', label: t('contactPage_feedback_sobre_o_produto') },
  { value: 'parceria', label: t('contactPage_parcerias_ou_conversas_profissionais') },
  { value: 'outro', label: t('contactPage_outro') },
]

const getContactChannels = (t) => [
  {
    eyebrow: t('contactPage_acesso_e_uso'),
    title: t('contactPage_suporte_e_duvidas_gerais'),
    description:
      t('contactPage_para_duvidas_sobre_cadastro_login'),
    category: 'suporte',
    suggestedSubject: t('contactPage_suporte_e_duvidas_gerais_sobre'),
    actionLabel: t('contactPage_selecionar_suporte'),
  },
  {
    eyebrow: 'LGPD',
    title: t('contactPage_privacidade_e_dados'),
    description:
      t('contactPage_para_solicitacoes_sobre_dados_pessoais'),
    category: 'privacidade',
    suggestedSubject: t('contactPage_privacidade_e_dados_no_prodforge'),
    actionLabel: t('contactPage_selecionar_privacidade'),
  },
  {
    eyebrow: t('contactPage_evolucao'),
    title: t('contactPage_feedback_sobre_o_produto'),
    description:
      t('contactPage_para_compartilhar_sugestoes_problemas_de'),
    category: 'feedback',
    suggestedSubject: t('contactPage_feedback_sobre_o_produto_prodforge'),
    actionLabel: t('contactPage_selecionar_feedback'),
  },
  {
    eyebrow: t('contactPage_profissional'),
    title: t('contactPage_parcerias_ou_conversas_profissionais'),
    description:
      t('contactPage_para_falar_sobre_parcerias_adocao'),
    category: 'parceria',
    suggestedSubject: t('contactPage_parcerias_ou_conversa_profissional_sobre'),
    actionLabel: t('contactPage_selecionar_parceria'),
  },
]

const getContactReasons = (t) => [
  t('contactPage_duvidas_sobre_o_produto'),
  t('contactPage_suporte_de_acesso'),
  t('contactPage_solicitacoes_sobre_dados_e_privacidade'),
  t('contactPage_feedback_de_usuarios'),
  t('contactPage_interesse_em_testar_o_produto'),
  t('contactPage_contato_profissional_com_o_projeto'),
]

const getQuickLinks = (t) => [
  { label: t('contactPage_politica_de_privacidade'), to: '/politica-de-privacidade' },
  { label: t('contactPage_termos_de_uso'), to: '/termos-de-uso' },
  { label: t('contactPage_preferencias_de_privacidade'), to: '/preferencias-de-privacidade' },
]

function validateContactForm(values, contactCategoryOptions) {
  const errors = {}
  const normalizedEmail = values.email.trim()

  if (!values.name.trim()) {
    errors.name = 'contactPage_informe_seu_nome'
  } else if (values.name.trim().length > CONTACT_FIELD_LIMITS.name) {
    errors.name = 'contactPage_use_ate_120_caracteres'
  }

  if (!normalizedEmail) {
    errors.email = 'contactPage_informe_seu_e_mail'
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = 'contactPage_informe_um_e_mail_valido'
  } else if (normalizedEmail.length > CONTACT_FIELD_LIMITS.email) {
    errors.email = 'contactPage_use_ate_180_caracteres'
  }

  if (!contactCategoryOptions.some((option) => option.value === values.category)) {
    errors.category = 'contactPage_escolha_uma_categoria'
  }

  if (!values.subject.trim()) {
    errors.subject = 'contactPage_informe_o_assunto'
  } else if (values.subject.trim().length > CONTACT_FIELD_LIMITS.subject) {
    errors.subject = 'contactPage_use_ate_160_caracteres'
  }

  if (!values.message.trim()) {
    errors.message = 'contactPage_escreva_sua_mensagem'
  } else if (values.message.trim().length > CONTACT_FIELD_LIMITS.message) {
    errors.message = 'contactPage_use_ate_4000_caracteres'
  }

  return errors
}

const serverFieldMessages = new Map([
  ["Informe seu nome.", 'contactPage_informe_seu_nome'],
  ["Use até 120 caracteres.", 'contactPage_use_ate_120_caracteres'],
  ["Informe seu e-mail.", 'contactPage_informe_seu_e_mail'],
  ["Informe um e-mail válido.", 'contactPage_informe_um_e_mail_valido'],
  ["Use até 180 caracteres.", 'contactPage_use_ate_180_caracteres'],
  ["Escolha uma categoria.", 'contactPage_escolha_uma_categoria'],
  ["Informe o assunto.", 'contactPage_informe_o_assunto'],
  ["Use até 160 caracteres.", 'contactPage_use_ate_160_caracteres'],
  ["Escreva sua mensagem.", 'contactPage_escreva_sua_mensagem'],
  ["Use até 4000 caracteres.", 'contactPage_use_ate_4000_caracteres'],
  ["Escolha uma categoria válida.", 'contactPage_escolha_uma_categoria'],
])
const contactFields = Object.keys(CONTACT_FIELD_LIMITS).concat('category')

function localizeServerErrors(errors) {
  return Object.fromEntries(contactFields.flatMap((field) => {
    const message = errors[field]
    return message ? [[field, serverFieldMessages.get(message) ?? 'invalidField']] : []
  }))
}

function ContactPage() {
  const t = useCopy('contactPage')
  const { language } = useLanguage()
  const quickLinks = getQuickLinks(t)
  const contactReasons = getContactReasons(t)
  const contactChannels = getContactChannels(t)
  const contactCategoryOptions = getContactCategoryOptions(t)
  const formRef = useRef(null)
  const subjectRef = useRef(null)
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  usePublicPageMetadata('contact')

  function updateField(field, value) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))

    setErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors

      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      return nextErrors
    })

    if (feedback) {
      setFeedback(null)
    }
  }

  function focusContactForm() {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      subjectRef.current?.focus({ preventScroll: true })
    }, 0)
  }

  function handleChannelSelect(channel) {
    setFormValues((currentValues) => ({
      ...currentValues,
      category: channel.category,
      subject: currentValues.subject.trim() ? currentValues.subject : channel.suggestedSubject,
    }))
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.category
      delete nextErrors.subject
      return nextErrors
    })
    setFeedback(null)
    focusContactForm()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) return

    const nextErrors = validateContactForm(formValues, contactCategoryOptions)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setFeedback({ tone: 'error', message: 'contactPage_revise_os_campos_destacados_antes' })
      return
    }

    setErrors({})
    setFeedback(null)
    setIsSubmitting(true)

    try {
      await sendContactMessage(formValues)
      setFormValues(INITIAL_FORM_VALUES)
      setFeedback({
        tone: 'success',
        message: 'contactPage_mensagem_enviada_vamos_analisar_e',
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error?.code === 'INVALID_INPUT' ? 'contactPage_revise_os_campos_destacados_antes' : CONTACT_ERROR_MESSAGE,
      })
      if (error?.details?.fieldErrors) {
        setErrors(localizeServerErrors(error.details.fieldErrors))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page privacy-policy-page contact-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('contactPage_canal_oficial')}</p>
          <h1>{t('contactPage_fale_com_o_prodforge')}</h1>
          <p>{t('contactPage_tire_duvidas_envie_feedback_ou')}</p>

          <div className="privacy-policy-hero__actions">
            <a
              className="forge-button forge-button--metal forge-button--md"
              href="#formulario-contato"
              aria-label={t('contactPage_ir_para_o_formulario_de')}
              onClick={focusContactForm}
            >
              {t('contactPage_enviar_mensagem')}
            </a>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/politica-de-privacidade">
              {t('contactPage_ver_politica_de_privacidade')}
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary contact-page__summary" aria-label={t('contactPage_resumo_do_canal_de_contato')}>
          <p className="privacy-policy-hero__summary-label">{t('contactPage_canal_alternativo')}</p>
          <p className="contact-page__email">
            <a href={`mailto:${CONTACT_EMAIL}`} aria-label={t('contactPage_enviar_e_mail_para', { p1: CONTACT_EMAIL })}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>{t('contactPage_use_o_formulario_para_enviar')}</p>
          <ul className="contact-page__reason-list" aria-label={t('contactPage_assuntos_aceitos_pelo_canal_de')}>
            {contactReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="privacy-policy-hero__summary-date">{t('contactPage_atualizado_em')} {formatPublicDate(CONTACT_LAST_UPDATED, language)}</p>
        </aside>
      </section>

      <div className="contact-page__grid">
        <section className="contact-page__channels" aria-labelledby="contact-channels-title">
          <div className="contact-page__section-header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">{t('contactPage_bancada_de_atendimento')}</p>
            <h2 id="contact-channels-title">{t('contactPage_como_podemos_ajudar')}</h2>
            <p>{t('contactPage_escolha_o_assunto_mais_proximo')}</p>
          </div>

          <div className="contact-page__cards">
            {contactChannels.map((channel) => (
              <article className="contact-card forge-panel forge-panel--metal" key={channel.category}>
                <div className="contact-card__copy">
                  <p className="contact-card__eyebrow">{channel.eyebrow}</p>
                  <h3>{channel.title}</h3>
                  <p>{channel.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChannelSelect(channel)}
                  aria-label={`${channel.actionLabel}: ${channel.title}`}
                >
                  {channel.actionLabel}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section
          id="formulario-contato"
          className="contact-page__mail-panel forge-panel forge-panel--metal"
          aria-labelledby="contact-form-title"
        >
          <div className="contact-page__section-header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">{t('contactPage_formulario_seguro')}</p>
            <h2 id="contact-form-title">{t('contactPage_envie_sua_mensagem')}</h2>
            <p>{t('contactPage_o_contato_sera_registrado_com')}</p>
          </div>

          <form className="contact-page__form" ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="contact-page__form-grid">
              <div className="contact-page__field">
                <label htmlFor="contact-name">{t('contactPage_nome')}</label>
                <input
                  id="contact-name"
                  type="text"
                  placeholder={t('contactPage_seu_nome')}
                  autoComplete="name"
                  value={formValues.name}
                  maxLength={CONTACT_FIELD_LIMITS.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  disabled={isSubmitting}
                />
                {errors.name ? (
                  <p id="contact-name-error" className="contact-page__field-error" role="alert">
                    {t(errors.name)}
                  </p>
                ) : null}
              </div>

              <div className="contact-page__field">
                <label htmlFor="contact-email">{t('contactPage_e_mail')}</label>
                <input
                  id="contact-email"
                  type="email"
                  placeholder={t('contactPage_seu_email_empresa_com')}
                  autoComplete="email"
                  value={formValues.email}
                  maxLength={CONTACT_FIELD_LIMITS.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  disabled={isSubmitting}
                />
                {errors.email ? (
                  <p id="contact-email-error" className="contact-page__field-error" role="alert">
                    {t(errors.email)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="contact-page__field">
              <label htmlFor="contact-category">{t('contactPage_categoria')}</label>
              <select
                id="contact-category"
                value={formValues.category}
                onChange={(event) => updateField('category', event.target.value)}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={errors.category ? 'contact-category-error' : undefined}
                disabled={isSubmitting}
              >
                {contactCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p id="contact-category-error" className="contact-page__field-error" role="alert">
                  {t(errors.category)}
                </p>
              ) : null}
            </div>

            <div className="contact-page__field">
              <label htmlFor="contact-subject">{t('contactPage_assunto')}</label>
              <input
                id="contact-subject"
                ref={subjectRef}
                type="text"
                placeholder={t('contactPage_resumo_da_solicitacao')}
                value={formValues.subject}
                maxLength={CONTACT_FIELD_LIMITS.subject}
                onChange={(event) => updateField('subject', event.target.value)}
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.subject ? (
                <p id="contact-subject-error" className="contact-page__field-error" role="alert">
                  {t(errors.subject)}
                </p>
              ) : null}
            </div>

            <div className="contact-page__field">
              <label htmlFor="contact-message">{t('contactPage_mensagem')}</label>
              <textarea
                id="contact-message"
                placeholder={t('contactPage_conte_o_contexto_e_como')}
                rows={7}
                value={formValues.message}
                maxLength={CONTACT_FIELD_LIMITS.message}
                onChange={(event) => updateField('message', event.target.value)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error contact-message-counter' : 'contact-message-counter'}
                disabled={isSubmitting}
              />
              <div className="contact-page__field-footer">
                {errors.message ? (
                  <p id="contact-message-error" className="contact-page__field-error" role="alert">
                    {t(errors.message)}
                  </p>
                ) : (
                  <span />
                )}
                <p id="contact-message-counter" className="contact-page__counter">
                  {formValues.message.length}/{CONTACT_FIELD_LIMITS.message}
                </p>
              </div>
            </div>

            <div className="contact-page__honeypot" aria-hidden="true">
              <label htmlFor="contact-company-site">{t('contactPage_site_da_empresa')}</label>
              <input
                id="contact-company-site"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={formValues.company_site}
                onChange={(event) => updateField('company_site', event.target.value)}
              />
            </div>

            {feedback ? (
              <p
                className={`contact-page__feedback contact-page__feedback--${feedback.tone}`}
                role={feedback.tone === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                {t(feedback.message)}
              </p>
            ) : null}

            <button
              type="submit"
              className="forge-button forge-button--ember forge-button--md contact-page__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('contactPage_enviando') : t('contactPage_enviar_mensagem')}
            </button>
          </form>

          <div className="contact-page__mail-actions" aria-label={t('contactPage_canal_alternativo_por_e_mail')}>
            <a className="contact-page__plain-mail" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </div>

          <p className="contact-page__privacy-note">
            <Trans t={t} ns="contactPage" i18nKey="privacyNote" components={{
              policy: <Link to="/politica-de-privacidade" />,
            }} />
          </p>
        </section>

        <aside className="contact-page__quick-links forge-panel forge-panel--metal" aria-labelledby="contact-links-title">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--neutral">{t('contactPage_links_rapidos')}</p>
          <h2 id="contact-links-title">{t('contactPage_documentos_uteis')}</h2>
          <p>
            {t('contactPage_consulte_os_documentos_publicos_antes')}
          </p>
          <nav aria-label={t('contactPage_links_uteis_de_contato')}>
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  )
}

export default ContactPage
