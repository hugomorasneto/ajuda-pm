const CONTACT_MESSAGE_TIMEOUT_MS = 15000

function normalizeContactPayload(values) {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    category: values.category,
    subject: values.subject.trim(),
    message: values.message.trim(),
    page_url: values.page_url || window.location.href,
    company_site: values.company_site?.trim() ?? '',
  }
}

function createContactError(code, message, details = {}) {
  const error = new Error(message)
  error.code = code
  error.details = details
  return error
}

function mapContactHttpError(response, payload) {
  if (response.status === 400) {
    return createContactError(
      'INVALID_INPUT',
      payload?.error || 'Revise os campos destacados antes de enviar.',
      { status: response.status, fieldErrors: payload?.field_errors ?? {} },
    )
  }

  if (response.status === 405) {
    return createContactError(
      'METHOD_NOT_ALLOWED',
      'Não foi possível enviar agora. Tente novamente em instantes ou envie e-mail para contato@techtupa.com.br.',
      { status: response.status },
    )
  }

  return createContactError(
    'CONTACT_FAILED',
    'Não foi possível enviar agora. Tente novamente em instantes ou envie e-mail para contato@techtupa.com.br.',
    { status: response.status, payload },
  )
}

export async function sendContactMessage(values) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createContactError(
      'MISSING_CONFIG',
      'Não foi possível enviar agora. Tente novamente em instantes ou envie e-mail para contato@techtupa.com.br.',
    )
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), CONTACT_MESSAGE_TIMEOUT_MS)

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/contact-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(normalizeContactPayload(values)),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || payload?.success === false) {
      throw mapContactHttpError(response, payload)
    }

    return payload
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createContactError(
        'TIMEOUT',
        'Não foi possível enviar agora. Tente novamente em instantes ou envie e-mail para contato@techtupa.com.br.',
      )
    }

    if (error instanceof Error && error.code) {
      throw error
    }

    throw createContactError(
      'NETWORK',
      'Não foi possível enviar agora. Tente novamente em instantes ou envie e-mail para contato@techtupa.com.br.',
      { cause: error instanceof Error ? error.message : null },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
