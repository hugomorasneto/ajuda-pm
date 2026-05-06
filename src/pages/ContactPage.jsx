import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants/app'
import { usePageMetadata } from '../hooks/usePageMetadata'
import { sendContactMessage } from '../services/contactService'

const CONTACT_LAST_UPDATED = '06/05/2026'
const CONTACT_EMAIL = 'contato@techtupa.com.br'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_ERROR_MESSAGE =
  'Não foi possível enviar agora. Tente novamente em instantes ou envie e-mail para contato@techtupa.com.br.'

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

const contactCategoryOptions = [
  { value: 'suporte', label: 'Suporte e dúvidas gerais' },
  { value: 'privacidade', label: 'Privacidade e dados' },
  { value: 'feedback', label: 'Feedback sobre o produto' },
  { value: 'parceria', label: 'Parcerias ou conversas profissionais' },
  { value: 'outro', label: 'Outro' },
]

const contactChannels = [
  {
    eyebrow: 'Acesso e uso',
    title: 'Suporte e dúvidas gerais',
    description:
      'Para dúvidas sobre cadastro, login, acesso à Bancada, histórico, limites de uso ou funcionamento esperado da plataforma.',
    category: 'suporte',
    suggestedSubject: 'Suporte e dúvidas gerais sobre o ProdForge',
    actionLabel: 'Selecionar suporte',
  },
  {
    eyebrow: 'LGPD',
    title: 'Privacidade e dados',
    description:
      'Para solicitações sobre dados pessoais, preferências de privacidade, informações de conta ou uso de dados no ProdForge.',
    category: 'privacidade',
    suggestedSubject: 'Privacidade e dados no ProdForge',
    actionLabel: 'Selecionar privacidade',
  },
  {
    eyebrow: 'Evolução',
    title: 'Feedback sobre o produto',
    description:
      'Para compartilhar sugestões, problemas de uso, ideias para user stories, critérios de aceite, IA ou materiais de aprendizado.',
    category: 'feedback',
    suggestedSubject: 'Feedback sobre o produto ProdForge',
    actionLabel: 'Selecionar feedback',
  },
  {
    eyebrow: 'Profissional',
    title: 'Parcerias ou conversas profissionais',
    description:
      'Para falar sobre parcerias, adoção em times de produto, treinamentos, interesse em testar o produto ou conversas sobre o projeto.',
    category: 'parceria',
    suggestedSubject: 'Parcerias ou conversa profissional sobre o ProdForge',
    actionLabel: 'Selecionar parceria',
  },
]

const contactReasons = [
  'Dúvidas sobre o produto',
  'Suporte de acesso',
  'Solicitações sobre dados e privacidade',
  'Feedback de usuários',
  'Interesse em testar o produto',
  'Contato profissional com o projeto',
]

const quickLinks = [
  { label: 'Política de Privacidade', to: '/politica-de-privacidade' },
  { label: 'Termos de Uso', to: '/termos-de-uso' },
  { label: 'Preferências de Privacidade', to: '/preferencias-de-privacidade' },
]

function validateContactForm(values) {
  const errors = {}
  const normalizedEmail = values.email.trim()

  if (!values.name.trim()) {
    errors.name = 'Informe seu nome.'
  } else if (values.name.trim().length > CONTACT_FIELD_LIMITS.name) {
    errors.name = 'Use até 120 caracteres.'
  }

  if (!normalizedEmail) {
    errors.email = 'Informe seu e-mail.'
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = 'Informe um e-mail válido.'
  } else if (normalizedEmail.length > CONTACT_FIELD_LIMITS.email) {
    errors.email = 'Use até 180 caracteres.'
  }

  if (!contactCategoryOptions.some((option) => option.value === values.category)) {
    errors.category = 'Escolha uma categoria.'
  }

  if (!values.subject.trim()) {
    errors.subject = 'Informe o assunto.'
  } else if (values.subject.trim().length > CONTACT_FIELD_LIMITS.subject) {
    errors.subject = 'Use até 160 caracteres.'
  }

  if (!values.message.trim()) {
    errors.message = 'Escreva sua mensagem.'
  } else if (values.message.trim().length > CONTACT_FIELD_LIMITS.message) {
    errors.message = 'Use até 4000 caracteres.'
  }

  return errors
}

function ContactPage() {
  const formRef = useRef(null)
  const subjectRef = useRef(null)
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pageDescription =
    'Entre em contato com o ProdForge para dúvidas, suporte, privacidade, sugestões de melhoria, parcerias ou assuntos comerciais.'

  usePageMetadata({
    title: 'Contato | ProdForge',
    description: pageDescription,
    path: '/contato',
    ogTitle: 'Contato | ProdForge',
    ogDescription: pageDescription,
    twitterTitle: 'Contato | ProdForge',
    twitterDescription: pageDescription,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contato',
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

    const nextErrors = validateContactForm(formValues)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setFeedback({ tone: 'error', message: 'Revise os campos destacados antes de enviar.' })
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
        message: 'Mensagem enviada. Vamos analisar e responder pelo e-mail informado.',
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error?.message || CONTACT_ERROR_MESSAGE,
      })
      if (error?.details?.fieldErrors) {
        setErrors(error.details.fieldErrors)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page privacy-policy-page contact-page">
      <section className="privacy-policy-hero forge-panel forge-panel--metal forge-texture-layer">
        <div className="privacy-policy-hero__copy">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Canal oficial</p>
          <h1>Fale com o ProdForge</h1>
          <p>Tire dúvidas, envie feedback ou fale sobre acesso, privacidade e evolução do produto.</p>

          <div className="privacy-policy-hero__actions">
            <a
              className="forge-button forge-button--metal forge-button--md"
              href="#formulario-contato"
              aria-label="Ir para o formulário de contato"
              onClick={focusContactForm}
            >
              Enviar mensagem
            </a>
            <Link className="forge-button forge-button--ghost forge-button--md" to="/politica-de-privacidade">
              Ver Política de Privacidade
            </Link>
          </div>
        </div>

        <aside className="privacy-policy-hero__summary contact-page__summary" aria-label="Resumo do canal de contato">
          <p className="privacy-policy-hero__summary-label">Canal alternativo</p>
          <p className="contact-page__email">
            <a href={`mailto:${CONTACT_EMAIL}`} aria-label={`Enviar e-mail para ${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>Use o formulário para enviar sua mensagem ou mantenha o e-mail como alternativa.</p>
          <ul className="contact-page__reason-list" aria-label="Assuntos aceitos pelo canal de contato">
            {contactReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="privacy-policy-hero__summary-date">Atualizado em {CONTACT_LAST_UPDATED}</p>
        </aside>
      </section>

      <div className="contact-page__grid">
        <section className="contact-page__channels" aria-labelledby="contact-channels-title">
          <div className="contact-page__section-header">
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--tech">Bancada de atendimento</p>
            <h2 id="contact-channels-title">Como podemos ajudar</h2>
            <p>Escolha o assunto mais próximo para preencher o formulário com o contexto inicial.</p>
          </div>

          <div className="contact-page__cards">
            {contactChannels.map((channel) => (
              <article className="contact-card forge-panel forge-panel--metal" key={channel.title}>
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
            <p className="privacy-policy-page__eyebrow forge-badge forge-badge--ember">Formulário seguro</p>
            <h2 id="contact-form-title">Envie sua mensagem</h2>
            <p>O contato será registrado com segurança para análise da equipe ProdForge.</p>
          </div>

          <form className="contact-page__form" ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="contact-page__form-grid">
              <div className="contact-page__field">
                <label htmlFor="contact-name">Nome</label>
                <input
                  id="contact-name"
                  type="text"
                  placeholder="Seu nome"
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
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <div className="contact-page__field">
                <label htmlFor="contact-email">E-mail</label>
                <input
                  id="contact-email"
                  type="email"
                  placeholder="seu.email@empresa.com"
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
                    {errors.email}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="contact-page__field">
              <label htmlFor="contact-category">Categoria</label>
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
                  {errors.category}
                </p>
              ) : null}
            </div>

            <div className="contact-page__field">
              <label htmlFor="contact-subject">Assunto</label>
              <input
                id="contact-subject"
                ref={subjectRef}
                type="text"
                placeholder="Resumo da solicitação"
                value={formValues.subject}
                maxLength={CONTACT_FIELD_LIMITS.subject}
                onChange={(event) => updateField('subject', event.target.value)}
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.subject ? (
                <p id="contact-subject-error" className="contact-page__field-error" role="alert">
                  {errors.subject}
                </p>
              ) : null}
            </div>

            <div className="contact-page__field">
              <label htmlFor="contact-message">Mensagem</label>
              <textarea
                id="contact-message"
                placeholder="Conte o contexto e como podemos ajudar."
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
                    {errors.message}
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
              <label htmlFor="contact-company-site">Site da empresa</label>
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
                {feedback.message}
              </p>
            ) : null}

            <button
              type="submit"
              className="forge-button forge-button--ember forge-button--md contact-page__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </form>

          <div className="contact-page__mail-actions" aria-label="Canal alternativo por e-mail">
            <a className="contact-page__plain-mail" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </div>

          <p className="contact-page__privacy-note">
            Ao enviar, seus dados serão usados apenas para responder à solicitação,
            conforme a <Link to="/politica-de-privacidade">Política de Privacidade</Link>.
          </p>
        </section>

        <aside className="contact-page__quick-links forge-panel forge-panel--metal" aria-labelledby="contact-links-title">
          <p className="privacy-policy-page__eyebrow forge-badge forge-badge--neutral">Links rápidos</p>
          <h2 id="contact-links-title">Documentos úteis</h2>
          <p>
            Consulte os documentos públicos antes de enviar sua mensagem, especialmente em assuntos ligados
            a privacidade, dados e uso da plataforma.
          </p>
          <nav aria-label="Links úteis de contato">
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
