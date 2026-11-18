import { useCopy } from '../../i18n/context'
import { useState } from 'react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INITIAL_FORM_VALUES = {
  name: '',
  email: '',
}

function validateLeadForm(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'leadCaptureForm_informe_seu_nome'
  }

  if (!values.email.trim()) {
    errors.email = 'leadCaptureForm_informe_seu_e_mail'
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'leadCaptureForm_informe_um_e_mail_valido'
  }

  return errors
}

async function loadLeadCaptureServices() {
  const [{ trackEvent }, { createLead }] = await Promise.all([
    import('../../services/analyticsService'),
    import('../../services/leadsService'),
  ])

  return { trackEvent, createLead }
}

function LeadCaptureForm({ content }) {
  const t = useCopy('leadCaptureForm')
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [errors, setErrors] = useState({})
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackTone, setFeedbackTone] = useState('info')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

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

    if (feedbackMessage) {
      setFeedbackMessage('')
      setFeedbackTone('info')
    }

    if (isSubmitted) {
      setIsSubmitted(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) return

    const nextErrors = validateLeadForm(formValues)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setIsSubmitted(false)
      return
    }

    setErrors({})
    setIsSubmitting(true)
    setFeedbackMessage('')

    const { createLead, trackEvent } = await loadLeadCaptureServices()
    const result = await createLead(formValues)
    const emailDomain = formValues.email.trim().toLowerCase().split('@')[1] ?? null

    if (result.success) {
      setIsSubmitted(true)
      setFeedbackTone('success')
      setFeedbackMessage('leadCaptureForm_interesse_registrado_vamos_avisar_quando')
      trackEvent({
        event_name: 'lead_capture_submitted',
        event_category: 'public',
        metadata: { email_domain: emailDomain },
      })
    } else if (result.duplicate) {
      setIsSubmitted(true)
      setFeedbackTone('info')
      setFeedbackMessage('leadCaptureForm_este_e_mail_ja_esta')
      trackEvent({
        event_name: 'lead_capture_duplicate',
        event_category: 'public',
        metadata: { email_domain: emailDomain },
      })
    } else {
      setIsSubmitted(false)
      setFeedbackTone('error')
      setFeedbackMessage('leadCaptureForm_nao_foi_possivel_registrar_seu')
      trackEvent({
        event_name: 'lead_capture_failed',
        event_category: 'public',
        metadata: { email_domain: emailDomain },
      })
    }

    setIsSubmitting(false)
  }

  return (
    <section className="landing-section landing-lead-capture" aria-labelledby="lead-capture-title">
      <div className="landing-lead-capture__copy">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2 id="lead-capture-title">{content.title}</h2>
        <p>{content.description}</p>
      </div>

      <form className="landing-lead-capture__form" onSubmit={handleSubmit} noValidate>
        <div className="landing-lead-capture__form-header">
          <span className="landing-lead-capture__form-badge">{t('leadCaptureForm_plano_pro')}</span>
          <h3>{content.formTitle}</h3>
          <p>{content.formDescription}</p>
        </div>

        <div className="landing-lead-capture__field">
          <label htmlFor="lead-name">{t('leadCaptureForm_nome')}</label>
          <input
            id="lead-name"
            type="text"
            placeholder={t('leadCaptureForm_seu_nome')}
            value={formValues.name}
            onChange={(event) => updateField('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'lead-name-error' : undefined}
            disabled={isSubmitting}
          />
          {errors.name ? (
            <p id="lead-name-error" className="landing-lead-capture__field-error" role="alert">
              {t(errors.name)}
            </p>
          ) : null}
        </div>

        <div className="landing-lead-capture__field">
          <label htmlFor="lead-email">{t('leadCaptureForm_e_mail')}</label>
          <input
            id="lead-email"
            type="email"
            placeholder={t('leadCaptureForm_seu_email_empresa_com')}
            value={formValues.email}
            onChange={(event) => updateField('email', event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'lead-email-error' : undefined}
            disabled={isSubmitting}
          />
          {errors.email ? (
            <p id="lead-email-error" className="landing-lead-capture__field-error" role="alert">
              {t(errors.email)}
            </p>
          ) : null}
        </div>

        {feedbackMessage ? (
          <p
            className={`landing-lead-capture__feedback landing-lead-capture__feedback--${feedbackTone}`}
            role="status"
            aria-live="polite"
          >
            {t(feedbackMessage)}
          </p>
        ) : null}

        <button
          type="submit"
          className="landing-button forge-button forge-button--ember forge-button--block forge-button--lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? t('leadCaptureForm_registrando') : isSubmitted ? t('leadCaptureForm_interesse_registrado') : content.buttonLabel}
        </button>

        <p className="landing-lead-capture__note">{content.note}</p>
      </form>
    </section>
  )
}

export default LeadCaptureForm
