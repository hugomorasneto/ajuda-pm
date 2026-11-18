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

Ajuste adicional (opcional):
{{input_adjustment}}
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

const uuidPattern = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i

async function getAuthenticatedUser(req: Request, url: string, anonKey: string) {
  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
    signal: AbortSignal.timeout(5000),
  })
  if ([400, 401, 403, 404].includes(response.status)) return null
  if (!response.ok) throw new Error('Auth service unavailable')

  const user = await response.json()
  return typeof user?.id === 'string' && uuidPattern.test(user.id) ? user.id : null
}

async function fingerprint(input: object) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(input)))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

type GenerationStoreResult = {
  code: string
  attempt_id?: string
  story?: Record<string, unknown>
  usage?: Record<string, unknown>
  generation_meta?: GenerationMeta
}

const storeErrorStatuses: Record<string, number> = {
  QUOTA_EXHAUSTED: 403,
  TARGET_UNAVAILABLE: 409,
  GENERATION_IN_PROGRESS: 409,
  REQUEST_CONFLICT: 409,
  RESERVATION_EXPIRED: 409,
  STORY_REMOVED: 409,
}

function storeError(result: GenerationStoreResult) {
  return responseJson(
    { code: result.code, usage: result.usage },
    storeErrorStatuses[result.code] ?? 500,
  )
}

function replayStory(result: GenerationStoreResult) {
  const story = result.story ?? {}
  return responseJson({ ...story, story, generation_meta: result.generation_meta })
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

function buildPrompt(inputContext: string, inputRequirements: string, inputAdjustment: string): string {
  return PROMPT_TEMPLATE.replace('{{input_context}}', inputContext).replace(
    '{{input_requirements}}',
    inputRequirements,
  ).replace('{{input_adjustment}}', inputAdjustment || 'Sem ajuste adicional.')
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

  let releaseReservation: (() => Promise<unknown>) | undefined
  try {
    if (req.method !== 'POST') {
      return responseJson({ error: 'Método não permitido.' }, 405)
    }

    const url = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !anonKey || !serviceKey) {
      return responseJson({ code: 'PROVIDER_UNAVAILABLE' }, 500)
    }

    const userId = await getAuthenticatedUser(req, url, anonKey)
    if (!userId) {
      return responseJson({ error: 'Autenticação obrigatória para gerar user stories.' }, 401)
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const geminiModelRaw = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'
    const fallbackModelsRaw = Deno.env.get('GEMINI_FALLBACK_MODELS') ?? null

    const payload = await req.json().catch(() => ({}))
    const requestId = asString(payload?.request_id).toLowerCase()
    const projectId = asString(payload?.project_id).toLowerCase() || null
    const previousVersionId = asString(payload?.previous_version_id).toLowerCase() || null
    const inputContext = asString(payload?.input_context)
    const inputRequirements = asString(payload?.input_requirements)
    const inputAdjustment = asString(payload?.input_adjustment)
    const input = {
      input_context: inputContext,
      input_requirements: inputRequirements,
      input_adjustment: inputAdjustment,
      regeneration_instruction: asString(payload?.regeneration_instruction) || null,
      project_id: projectId,
      previous_version_id: previousVersionId,
    }

    if (!inputContext || typeof payload?.input_requirements !== 'string' ||
      !uuidPattern.test(requestId) ||
      (payload?.project_id != null && (!projectId || !uuidPattern.test(projectId))) ||
      (payload?.previous_version_id != null && (!previousVersionId || !uuidPattern.test(previousVersionId)))) {
      return responseJson({ code: 'INVALID_INPUT' }, 400)
    }

    const requestIdentity = { p_user_id: userId, p_request_id: requestId }
    const rpc = async (name: string, args: object) => {
      const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ ...requestIdentity, ...args }),
        signal: AbortSignal.timeout(8000),
      })
      if (!response.ok) throw new Error(`Database RPC ${name} failed (${response.status})`)
      return response.status === 204 ? null : await response.json()
    }

    let reservation: GenerationStoreResult
    try {
      reservation = await rpc('reserve_story_generation', {
        p_fingerprint: await fingerprint(input),
        p_project_id: projectId,
        p_previous_version_id: previousVersionId,
      })
    } catch {
      return responseJson({ code: 'SAVE_FAILED' }, 503)
    }
    if (reservation.code === 'SAVED') return replayStory(reservation)
    if (reservation.code !== 'RESERVED' || !reservation.attempt_id) return storeError(reservation)

    const attempt = { p_attempt_id: reservation.attempt_id }
    releaseReservation = () => rpc('release_story_generation', attempt)
    if (!geminiApiKey) return responseJson({ code: 'PROVIDER_UNAVAILABLE' }, 500)

    const candidateModels = [
      normalizeModelName(geminiModelRaw),
      ...parseModelList(fallbackModelsRaw),
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ].filter((item, index, arr) => item && arr.indexOf(item) === index)

    const prompt = buildPrompt(inputContext, inputRequirements, inputAdjustment)
    let rawText = ''
    let usedModel = ''
    let success = false
    let lastErrorStatus = 502
    const providerTimeout = AbortSignal.timeout(30000)

    for (const model of candidateModels) {
      usedModel = model
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: providerTimeout,
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
          .trim() ?? ''
        success = true
        break
      }

      lastErrorStatus = geminiResponse.status
      if (!shouldTryNextModel(geminiResponse.status, geminiPayload)) {
        break
      }
    }

    if (!success) {
      return lastErrorStatus === 429
        ? responseJson({ code: 'RATE_LIMIT' }, 429)
        : responseJson({ code: 'PROVIDER_UNAVAILABLE' }, 502)
    }

    if (!rawText) {
      return responseJson({ error: 'Gemini retornou resposta vazia.' }, 502)
    }

    const parsed = safeJsonParse(rawText) as Partial<GenerationResponse> | null
    if (!asString(parsed?.user_story)) {
      return responseJson({ code: 'PROVIDER_UNAVAILABLE' }, 502)
    }

    const normalized = normalizeOutput(parsed, inputContext, inputRequirements, usedModel)
    const toNullableText = (items: string[]) => items.length ? items.join('\n') : null
    const output = {
      ...normalized,
      acceptance_criteria: toNullableText(normalized.acceptance_criteria),
      business_rules: toNullableText(normalized.business_rules),
      gaps: toNullableText(normalized.gaps),
      qa_checklist: toNullableText(normalized.qa_checklist),
    }
    let saved: GenerationStoreResult
    try {
      saved = await rpc('save_story_generation', { ...attempt, p_input: input, p_output: output })
    } catch {
      return responseJson({ code: 'SAVE_FAILED' }, 503)
    }
    if (saved.code !== 'SAVED' || !saved.story?.id) return storeError(saved)
    releaseReservation = undefined
    return responseJson({ ...normalized, story: saved.story })
  } catch {
    return responseJson({ code: 'PROVIDER_UNAVAILABLE' }, 502)
  } finally {
    if (releaseReservation) {
      try {
        await releaseReservation()
      } catch {
        // The reservation expires on its own if the database is unavailable.
        console.error('Could not release story generation reservation')
      }
    }
  }
})
