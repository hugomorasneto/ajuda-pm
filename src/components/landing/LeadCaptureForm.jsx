import { useState } from 'react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INITIAL_FORM_VALUES = {
  name: '',
  email: '',
}

function validateLeadForm(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Informe seu nome.'
  }

  if (!values.email.trim()) {
    errors.email = 'Informe seu e-mail.'
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Informe um e-mail válido.'
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
      setFeedbackMessage('Interesse registrado. Vamos avisar quando houver novidades.')
      trackEvent({
        event_name: 'lead_capture_submitted',
        event_category: 'public',
        metadata: { email_domain: emailDomain },
      })
    } else if (result.duplicate) {
      setIsSubmitted(true)
      setFeedbackTone('info')
      setFeedbackMessage('Este e-mail já está na lista. Avisaremos por lá quando houver novidades.')
      trackEvent({
        event_name: 'lead_capture_duplicate',
        event_category: 'public',
        metadata: { email_domain: emailDomain },
      })
    } else {
      setIsSubmitted(false)
      setFeedbackTone('error')
      setFeedbackMessage('Não foi possível registrar seu interesse agora. Tente novamente em instantes.')
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
        <label htmlFor="lead-name">Nome</label>
        <input
          id="lead-name"
          type="text"
          placeholder="Seu nome"
          value={formValues.name}
          onChange={(event) => updateField('name', event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'lead-name-error' : undefined}
          disabled={isSubmitting}
        />
        {errors.name ? (
          <p id="lead-name-error" className="landing-lead-capture__field-error" role="alert">
            {errors.name}
          </p>
        ) : null}

        <label htmlFor="lead-email">E-mail</label>
        <input
          id="lead-email"
          type="email"
          placeholder="voce@empresa.com"
          value={formValues.email}
          onChange={(event) => updateField('email', event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'lead-email-error' : undefined}
          disabled={isSubmitting}
        />
        {errors.email ? (
          <p id="lead-email-error" className="landing-lead-capture__field-error" role="alert">
            {errors.email}
          </p>
        ) : null}

        {feedbackMessage ? (
          <p
            className={`landing-lead-capture__feedback landing-lead-capture__feedback--${feedbackTone}`}
            role="status"
            aria-live="polite"
          >
            {feedbackMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="landing-button forge-button forge-button--ember forge-button--block forge-button--lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Registrando...' : isSubmitted ? 'Interesse registrado' : 'Avisar quando abrir'}
        </button>

        <p className="landing-lead-capture__note">{content.note}</p>
      </form>
    </section>
  )
}

export default LeadCaptureForm
