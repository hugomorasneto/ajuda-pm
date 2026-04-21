const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type GenerationMeta = {
  generated_by: 'gemini'
  model_used: string
  quality_score: number
  guardrails_applied: boolean
}

type GenerationResponse = {
  title: string
  objective: string
  user_story: string
  acceptance_criteria: string[]
  notes: string
  business_rules: string[]
  gaps: string[]
  qa_checklist: string[]
  generation_meta: GenerationMeta
}

const PROMPT_TEMPLATE = `
Você é um Product Manager sênior e deve gerar uma user story profissional em português brasileiro.

Objetivo:
- Produzir uma user story clara, específica e pronta para refinamento técnico.

Regras obrigatórias:
1) Responda SOMENTE com JSON válido.
2) NÃO use markdown, texto explicativo, comentários ou campos extras.
3) Use EXATAMENTE este contrato:
{
  "title": "string",
  "objective": "string",
  "user_story": "string",
  "acceptance_criteria": ["string"],
  "notes": "string",
  "business_rules": ["string"],
  "gaps": ["string"],
  "qa_checklist": ["string"]
}
4) title: específico, sem genéricos como "Melhorar experiência" ou "Ajustes gerais".
5) user_story: obrigatoriamente no padrão "Como <ator>, quero <necessidade>, para <benefício>".
6) acceptance_criteria: no mínimo 3 itens, observáveis e testáveis, sem itens vagos.
7) business_rules: incluir apenas quando houver regra implícita ou explícita; caso contrário [].
8) gaps: apontar apenas lacunas relevantes e acionáveis; se não houver, [].
9) qa_checklist: itens práticos e verificáveis para QA (mínimo 3).
10) texto objetivo, sem prolixidade.

Contexto:
{{input_context}}

Requisitos:
{{input_requirements}}
`

const GENERIC_TITLE_PATTERNS = [
  /^melhorar experiência/i,
  /^melhorar experiencia/i,
  /^ajustes? gerais/i,
  /^refinar fluxo$/i,
  /^história de usuário/i,
  /^historia de usuario/i,
]

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeModelName(model: string): string {
  const trimmed = model.trim()
  return trimmed.startsWith('models/') ? trimmed.replace(/^models\//, '') : trimmed
}

function parseModelList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => normalizeModelName(item))
    .filter(Boolean)
}

function shouldTryNextModel(status: number, payload: unknown): boolean {
  const errorCode = (payload as { error?: { status?: string } } | null)?.error?.status
  if (status === 404 || status === 429 || status >= 500) return true
  if (errorCode === 'NOT_FOUND' || errorCode === 'RESOURCE_EXHAUSTED') return true
  return false
}

function responseJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function safeJsonParse(text: string): unknown {
  const trimmed = text.trim()
  const withoutCodeFence = trimmed.replace(/^```(?:json)?\s*|\s*```$/g, '')

  try {
    return JSON.parse(withoutCodeFence)
  } catch {
    const firstBrace = withoutCodeFence.indexOf('{')
    const lastBrace = withoutCodeFence.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = withoutCodeFence.slice(firstBrace, lastBrace + 1)
      return JSON.parse(candidate)
    }
    throw new Error('invalid_json')
  }
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 3).trim()}...`
}

function buildPrompt(inputContext: string, inputRequirements: string): string {
  return PROMPT_TEMPLATE.replace('{{input_context}}', inputContext).replace(
    '{{input_requirements}}',
    inputRequirements,
  )
}

function buildFallbackTitle(inputContext: string): string {
  const context = inputContext.split(/\s+/).slice(0, 8).join(' ')
  return `Aprimorar fluxo para ${context || 'resolver problema de produto'}`
}

function isGenericTitle(title: string): boolean {
  if (!title) return true
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title))
}

function isUserStoryWellFormed(userStory: string): boolean {
  const text = userStory.toLowerCase()
  const hasActor = text.includes('como ')
  const hasNeed = text.includes(' quero ')
  const hasBenefit = text.includes(' para ')
  return hasActor && hasNeed && hasBenefit
}

function isObservableCriterion(item: string): boolean {
  const text = item.toLowerCase()
  const observableHints = ['deve', 'quando', 'então', 'validar', 'exibir', 'registrar', 'bloquear']
  return observableHints.some((hint) => text.includes(hint))
}

function ensureMinAcceptanceCriteria(
  criteria: string[],
  inputContext: string,
  inputRequirements: string,
): string[] {
  const cleaned = criteria.map((item) => truncate(item, 220)).filter(Boolean)
  const fallback = [
    `Quando o cenário "${truncate(inputContext, 90)}" ocorrer, o sistema deve exibir comportamento consistente para o usuário.`,
    `O requisito "${truncate(inputRequirements, 90)}" deve ser atendido de forma observável e verificável em teste funcional.`,
    'A operação deve registrar evidências suficientes para validação em revisão de produto e QA.',
  ]

  while (cleaned.length < 3) {
    cleaned.push(fallback[cleaned.length])
  }

  return cleaned.slice(0, 6)
}

function sanitizeList(items: string[], limit = 6): string[] {
  const seen = new Set<string>()
  const cleaned: string[] = []

  for (const raw of items) {
    const item = truncate(raw.trim(), 220)
    const key = item.toLowerCase()
    if (!item || seen.has(key)) continue
    seen.add(key)
    cleaned.push(item)
    if (cleaned.length >= limit) break
  }

  return cleaned
}

function shouldKeepRulesOrGaps(items: string[]): boolean {
  if (items.length === 0) return false
  const genericOnly = items.every((item) => /não há|nenhum|n\/a/i.test(item))
  return !genericOnly
}

function computeQualityScore(output: Omit<GenerationResponse, 'generation_meta'>): number {
  let score = 0

  if (output.title && !isGenericTitle(output.title)) score += 20
  if (output.objective.length >= 25) score += 10
  if (isUserStoryWellFormed(output.user_story)) score += 30
  if (output.acceptance_criteria.length >= 3) score += 20
  if (output.acceptance_criteria.filter(isObservableCriterion).length >= 2) score += 10
  if (output.qa_checklist.length >= 3) score += 10

  return Math.min(score, 100)
}

function normalizeOutput(
  payload: unknown,
  inputContext: string,
  inputRequirements: string,
  modelUsed: string,
): GenerationResponse {
  const raw = (payload ?? {}) as Record<string, unknown>
  let guardrailsApplied = false

  let title = asString(raw.title)
  if (!title || isGenericTitle(title)) {
    title = buildFallbackTitle(inputContext)
    guardrailsApplied = true
  }

  let objective = asString(raw.objective)
  if (!objective) {
    objective = `Garantir solução clara para "${truncate(inputContext, 90)}" atendendo "${truncate(inputRequirements, 90)}".`
    guardrailsApplied = true
  }
  objective = truncate(objective, 280)

  let userStory = asString(raw.user_story)
  if (!isUserStoryWellFormed(userStory)) {
    userStory = `Como PM responsável pelo fluxo, quero resolver "${truncate(inputContext, 80)}", para garantir que "${truncate(inputRequirements, 80)}" gere resultado consistente para o negócio.`
    guardrailsApplied = true
  }
  userStory = truncate(userStory, 380)

  let acceptanceCriteria = ensureMinAcceptanceCriteria(
    asArray(raw.acceptance_criteria),
    inputContext,
    inputRequirements,
  )
  if (acceptanceCriteria.length < 3) {
    guardrailsApplied = true
  }
  acceptanceCriteria = sanitizeList(acceptanceCriteria, 6)
  if (acceptanceCriteria.filter(isObservableCriterion).length < 2) {
    acceptanceCriteria = ensureMinAcceptanceCriteria(acceptanceCriteria, inputContext, inputRequirements)
    guardrailsApplied = true
  }

  let notes = asString(raw.notes)
  if (!notes) {
    notes = 'Conteúdo gerado por IA e validado por guardrails de qualidade.'
    guardrailsApplied = true
  }
  notes = truncate(notes, 280)

  let businessRules = sanitizeList(asArray(raw.business_rules), 5)
  if (!shouldKeepRulesOrGaps(businessRules)) businessRules = []

  let gaps = sanitizeList(asArray(raw.gaps), 5)
  if (!shouldKeepRulesOrGaps(gaps)) gaps = []

  let qaChecklist = sanitizeList(asArray(raw.qa_checklist), 6)
  if (qaChecklist.length < 3) {
    qaChecklist = sanitizeList(
      [
        ...qaChecklist,
        'Confirmar que todos os critérios de aceitação podem ser reproduzidos em teste.',
        'Verificar logs/evidências para auditoria da regra implementada.',
        'Validar cenário positivo, negativo e limite operacional do fluxo.',
      ],
      6,
    )
    guardrailsApplied = true
  }

  const baseOutput = {
    title,
    objective,
    user_story: userStory,
    acceptance_criteria: acceptanceCriteria,
    notes,
    business_rules: businessRules,
    gaps,
    qa_checklist: qaChecklist,
  }

  const qualityScore = computeQualityScore(baseOutput)

  return {
    ...baseOutput,
    generation_meta: {
      generated_by: 'gemini',
      model_used: modelUsed,
      quality_score: qualityScore,
      guardrails_applied: guardrailsApplied,
    },
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return responseJson({ error: 'Método não permitido.' }, 405)
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const geminiModelRaw = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'
    const fallbackModelsRaw = Deno.env.get('GEMINI_FALLBACK_MODELS')

    if (!geminiApiKey) {
      return responseJson({ error: 'Variável GEMINI_API_KEY não configurada.' }, 500)
    }

    const payload = await req.json().catch(() => ({}))
    const inputContext = asString(payload?.input_context)
    const inputRequirements = asString(payload?.input_requirements)

    if (!inputContext || !inputRequirements) {
      return responseJson(
        { error: 'Campos obrigatórios: input_context e input_requirements.' },
        400,
      )
    }

    const candidateModels = [
      normalizeModelName(geminiModelRaw),
      ...parseModelList(fallbackModelsRaw),
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ].filter((item, index, arr) => item && arr.indexOf(item) === index)

    const prompt = buildPrompt(inputContext, inputRequirements)
    let rawText = ''
    let usedModel = ''
    let success = false
    let lastErrorStatus = 502
    let lastErrorPayload: unknown = null

    for (const model of candidateModels) {
      usedModel = model
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.25,
              topP: 0.9,
              responseMimeType: 'application/json',
            },
          }),
        },
      )

      const geminiPayload = await geminiResponse.json().catch(() => null)
      if (geminiResponse.ok) {
        rawText = (geminiPayload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
          ?.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part?.text ?? '')
          .join('\n')
          .trim()
        success = true
        break
      }

      lastErrorStatus = geminiResponse.status
      lastErrorPayload = geminiPayload
      if (!shouldTryNextModel(geminiResponse.status, geminiPayload)) {
        break
      }
    }

    if (!success) {
      return responseJson(
        {
          error: `Falha ao chamar Gemini (model: ${usedModel}).`,
          details: lastErrorPayload,
          tried_models: candidateModels,
        },
        lastErrorStatus >= 400 ? lastErrorStatus : 502,
      )
    }

    if (!rawText) {
      return responseJson({ error: 'Gemini retornou resposta vazia.' }, 502)
    }

    let parsed: unknown = null
    try {
      parsed = safeJsonParse(rawText)
    } catch {
      parsed = null
    }

    const normalized = normalizeOutput(parsed, inputContext, inputRequirements, usedModel)
    return responseJson(normalized)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno inesperado.'
    return responseJson({ error: message }, 500)
  }
})

