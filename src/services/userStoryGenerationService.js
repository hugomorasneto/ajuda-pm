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

export async function generateUserStory({ input_context, input_requirements }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração Supabase ausente no frontend (URL ou ANON KEY).')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-user-story`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ input_context, input_requirements }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const detailedGeminiMessage =
      payload?.details?.error?.message ??
      payload?.details?.message ??
      payload?.details?.error_description
    const errorMessage =
      detailedGeminiMessage ??
      payload?.error ??
      payload?.message ??
      'Falha na geração via IA. Tente novamente em instantes.'
    throw new Error(errorMessage)
  }

  return normalizeUserStoryGeneration(payload)
}

