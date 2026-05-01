import { supabase } from '../lib/supabaseClient'

const GENERATION_TIMEOUT_MS = 20000

function withFallbackArray(value, fallbackItems) {
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => String(item).trim()).filter(Boolean)
    return cleaned.length > 0 ? cleaned : fallbackItems
  }

  if (typeof value === 'string') {
    const cleaned = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
    return cleaned.length > 0 ? cleaned : fallbackItems
  }

  return fallbackItems
}

function withFallbackString(value, fallbackValue) {
  const cleaned = typeof value === 'string' ? value.trim() : ''
  return cleaned || fallbackValue
}

function withFallbackNumber(value, fallbackValue) {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return parsed
  return fallbackValue
}

function createGenerationError(code, message, details = {}) {
  const error = new Error(message)
  error.code = code
  error.details = details
  return error
}

function mapGenerationHttpError(response, payload) {
  if (response.status === 400) {
    return createGenerationError(
      'INVALID_INPUT',
      'Revise o contexto e os requisitos antes de gerar a user story.',
      { status: response.status, payload },
    )
  }

  if (response.status === 401 || response.status === 403) {
    return createGenerationError(
      'AUTH_REQUIRED',
      'Sua sessão expirou. Entre novamente para continuar.',
      { status: response.status, payload },
    )
  }

  if (response.status === 429) {
    return createGenerationError(
      'RATE_LIMIT',
      'O gerador está com alta demanda agora. Tente novamente em alguns instantes.',
      { status: response.status, payload },
    )
  }

  if (response.status >= 500) {
    return createGenerationError(
      'PROVIDER_UNAVAILABLE',
      'A IA não conseguiu responder com estabilidade agora. Tente novamente em alguns instantes.',
      { status: response.status, payload },
    )
  }

  return createGenerationError(
    'GENERATION_FAILED',
    'Não foi possível concluir a geração agora. Tente novamente em instantes.',
    { status: response.status, payload },
  )
}

export function normalizeUserStoryGeneration(rawResult) {
  const safe = rawResult ?? {}

  const normalized = {
    title: withFallbackString(safe.title, 'História de usuário gerada'),
    objective: withFallbackString(
      safe.objective,
      'Definir objetivo claro para orientar execução e validação do time.',
    ),
    user_story: withFallbackString(
      safe.user_story,
      'Como usuário, quero resolver o problema descrito para alcançar o resultado esperado.',
    ),
    acceptance_criteria: withFallbackArray(safe.acceptance_criteria, [
      'A história deixa claro o usuário e o valor esperado.',
      'Existe ao menos um critério objetivo para validação.',
      'O time consegue verificar o resultado em cenário real.',
    ]),
    notes: withFallbackString(
      safe.notes,
      'Saída normalizada. Pronta para futura evolução da geração de conteúdo.',
    ),
    business_rules: withFallbackArray(safe.business_rules, []),
    gaps: withFallbackArray(safe.gaps, []),
    qa_checklist: withFallbackArray(safe.qa_checklist, [
      'Validar critérios de aceitação em cenário positivo e negativo.',
      'Confirmar rastreabilidade da regra implementada.',
      'Revisar consistência do comportamento para usuário final.',
    ]),
  }

  return {
    ...normalized,
    generation_meta: {
      generated_by: safe?.generation_meta?.generated_by ?? 'gemini',
      model_used: safe?.generation_meta?.model_used ?? null,
      quality_score: withFallbackNumber(safe?.generation_meta?.quality_score, 0),
      guardrails_applied: Boolean(safe?.generation_meta?.guardrails_applied),
    },
  }
}

export async function generateUserStory({ input_context, input_requirements, input_adjustment = '' }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração Supabase ausente no frontend (URL ou ANON KEY).')
  }

  const { data } = await supabase.auth.getSession()
  const accessToken = data?.session?.access_token
  if (!accessToken) {
    throw createGenerationError(
      'AUTH_REQUIRED',
      'Sua sessÃ£o expirou. Entre novamente para continuar.',
    )
  }
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS)

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-user-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ input_context, input_requirements, input_adjustment }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw mapGenerationHttpError(response, payload)
    }

    return normalizeUserStoryGeneration(payload)
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createGenerationError(
        'TIMEOUT',
        'A geração demorou mais do que o esperado. Tente novamente em alguns instantes.',
        { timeout_ms: GENERATION_TIMEOUT_MS },
      )
    }

    if (error instanceof Error && error.code) {
      throw error
    }

    throw createGenerationError(
      'NETWORK',
      'Não foi possível conectar ao gerador agora. Verifique sua conexão e tente novamente.',
      { cause: error instanceof Error ? error.message : null },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
