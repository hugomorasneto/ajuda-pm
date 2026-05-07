import { supabase } from '../lib/supabaseClient'

const INVITE_EMAIL_TIMEOUT_MS = 20000

function createInviteError(code, message, details = {}) {
  const error = new Error(message)
  error.code = code
  error.details = details
  return error
}

function normalizeInvitePayload({ email, projectId, sessionId, inviteUrl }) {
  return {
    email: String(email ?? '').trim().toLowerCase(),
    project_id: projectId,
    session_id: sessionId,
    invite_url: inviteUrl,
  }
}

function mapInviteFunctionError(error, payload) {
  const message =
    payload?.error ||
    error?.message ||
    'Não foi possível enviar o convite por e-mail agora.'

  return createInviteError('INVITE_EMAIL_FAILED', message, {
    payload,
    cause: error?.message ?? null,
  })
}

export async function sendPlanningPokerInviteEmail({ email, projectId, sessionId, inviteUrl }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const payload = normalizeInvitePayload({ email, projectId, sessionId, inviteUrl })

  if (!payload.email) {
    return {
      success: false,
      error: createInviteError('MISSING_EMAIL', 'Informe o e-mail do participante.'),
      data: null,
    }
  }

  if (!payload.project_id || !payload.session_id || !payload.invite_url) {
    return {
      success: false,
      error: createInviteError('MISSING_CONTEXT', 'Convite sem contexto suficiente para envio.'),
      data: null,
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      error: createInviteError(
        'MISSING_CONFIG',
        'Configuração do Supabase ausente para enviar o convite.',
      ),
      data: null,
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return {
      success: false,
      error: createInviteError('UNAUTHENTICATED', 'Entre novamente para enviar o convite.'),
      data: null,
    }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), INVITE_EMAIL_TIMEOUT_MS)

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/planning-poker-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || data?.success === false) {
      return {
        success: false,
        error: mapInviteFunctionError(null, data),
        data: null,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error?.name === 'AbortError'
          ? createInviteError(
              'INVITE_EMAIL_TIMEOUT',
              'O envio do convite demorou mais que o esperado. Copie o link e envie manualmente.',
            )
          : mapInviteFunctionError(error, null),
      data: null,
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}
