const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ProjectPayload = {
  id?: string
  name?: string
  description?: string | null
}

type StoryPayload = {
  title?: string
  objective?: string
  user_story?: string
  input_context?: string
  acceptance_criteria?: string[] | string
  business_rules?: string[] | string
  gaps?: string[] | string
  qa_checklist?: string[] | string
  estimation_status?: string
  status?: string
}

type ProjectAnalysisResponse = {
  summary: string
  health_label: string
  risks: string[]
  refinement_questions: string[]
  next_actions: string[]
  estimation_candidates: string[]
  meta: {
    generated_by: 'gemini'
    model_used: string
    analyzed_stories: number
    guardrails_applied: boolean
  }
}

const PROMPT_TEMPLATE = `
Você é um Product Manager sênior analisando um projeto dentro do ProdForge.

Objetivo:
- Ler o contexto do projeto e as user stories existentes.
- Gerar um diagnóstico prático para PM/PO decidir próximos passos.
- Priorizar clareza, refinamento, riscos e preparação para estimativa.

Regras obrigatórias:
1) Responda SOMENTE com JSON válido.
2) NÃO use markdown, comentários, texto explicativo ou campos extras.
3) Use EXATAMENTE este contrato:
{
  "summary": "string",
  "health_label": "string",
  "risks": ["string"],
  "refinement_questions": ["string"],
  "next_actions": ["string"],
  "estimation_candidates": ["string"]
}
4) summary: até 420 caracteres, descrevendo a situação do projeto.
5) health_label: rótulo curto em português, por exemplo "Pronto para refinamento", "Precisa de foco" ou "Em organização".
6) risks: até 4 riscos práticos e acionáveis.
7) refinement_questions: até 5 perguntas objetivas para refinamento com stakeholders/dev/QA.
8) next_actions: até 5 próximos passos concretos.
9) estimation_candidates: títulos ou temas de até 5 histórias que parecem boas candidatas para estimativa.
10) Não invente integrações externas, dados de negócio ou métricas que não estejam no contexto.

Projeto:
{{project}}

Resumo quantitativo:
{{metrics}}

Histórias:
{{stories}}
`

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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function isAuthenticatedRequest(req: Request): boolean {
  const authorization = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return false

  const token = authorization.slice('Bearer '.length).trim()
  const payload = decodeJwtPayload(token)
  const role = typeof payload?.role === 'string' ? payload.role : ''
  const userId = typeof payload?.sub === 'string' ? payload.sub : ''

  return role === 'authenticated' && Boolean(userId)
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
      return JSON.parse(withoutCodeFence.slice(firstBrace, lastBrace + 1))
    }
    throw new Error('invalid_json')
  }
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 3).trim()}...`
}

function sanitizeList(items: string[], limit: number): string[] {
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

function formatProject(project: ProjectPayload): string {
  return JSON.stringify({
    nome: truncate(asString(project.name) || 'Projeto sem nome', 140),
    descricao: truncate(asString(project.description) || 'Sem descrição cadastrada.', 600),
  })
}

function formatStory(story: StoryPayload, index: number): Record<string, unknown> {
  return {
    ordem: index + 1,
    titulo: truncate(asString(story.title) || 'História sem título', 160),
    objetivo: truncate(asString(story.objective), 260),
    user_story: truncate(asString(story.user_story), 360),
    contexto: truncate(asString(story.input_context), 320),
    criterios: sanitizeList(asArray(story.acceptance_criteria), 4),
    regras: sanitizeList(asArray(story.business_rules), 3),
    pontos_de_atencao: sanitizeList(asArray(story.gaps), 3),
    qa: sanitizeList(asArray(story.qa_checklist), 3),
    status_estimativa: asString(story.estimation_status) || 'created',
    status: asString(story.status) || 'generated',
  }
}

function buildPrompt({
  project,
  stories,
  storyCount,
  memberCount,
}: {
  project: ProjectPayload
  stories: StoryPayload[]
  storyCount: number
  memberCount: number
}): string {
  const readyCount = stories.filter((story) => story.estimation_status === 'ready_for_estimation').length
  const estimatedCount = stories.filter((story) => story.estimation_status === 'estimated').length
  const payloadStories = stories.slice(0, 30).map(formatStory)

  return PROMPT_TEMPLATE
    .replace('{{project}}', formatProject(project))
    .replace(
      '{{metrics}}',
      JSON.stringify({
        historias_no_projeto: storyCount,
        historias_enviadas_para_analise: payloadStories.length,
        historias_prontas_para_estimativa: readyCount,
        historias_estimadas: estimatedCount,
        membros_do_projeto: memberCount,
      }),
    )
    .replace('{{stories}}', JSON.stringify(payloadStories))
}

function normalizeOutput(rawPayload: unknown, modelUsed: string, analyzedStories: number): ProjectAnalysisResponse {
  const raw = (rawPayload ?? {}) as Record<string, unknown>
  let guardrailsApplied = false

  let summary = truncate(asString(raw.summary), 420)
  if (!summary) {
    summary = 'O projeto possui histórias suficientes para um diagnóstico inicial, mas ainda precisa de revisão humana antes de estimativas e priorização.'
    guardrailsApplied = true
  }

  let healthLabel = truncate(asString(raw.health_label), 80)
  if (!healthLabel) {
    healthLabel = 'Em organização'
    guardrailsApplied = true
  }

  let risks = sanitizeList(asArray(raw.risks), 4)
  if (risks.length === 0) {
    risks = ['Revisar critérios de aceite e pontos de atenção antes de encaminhar histórias para estimativa.']
    guardrailsApplied = true
  }

  let refinementQuestions = sanitizeList(asArray(raw.refinement_questions), 5)
  if (refinementQuestions.length === 0) {
    refinementQuestions = ['Qual é o principal resultado de negócio esperado para este projeto?']
    guardrailsApplied = true
  }

  let nextActions = sanitizeList(asArray(raw.next_actions), 5)
  if (nextActions.length === 0) {
    nextActions = ['Escolher as histórias prioritárias e marcar as que estão prontas para estimativa.']
    guardrailsApplied = true
  }

  const estimationCandidates = sanitizeList(asArray(raw.estimation_candidates), 5)

  return {
    summary,
    health_label: healthLabel,
    risks,
    refinement_questions: refinementQuestions,
    next_actions: nextActions,
    estimation_candidates: estimationCandidates,
    meta: {
      generated_by: 'gemini',
      model_used: modelUsed,
      analyzed_stories: analyzedStories,
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

    if (!isAuthenticatedRequest(req)) {
      return responseJson({ error: 'Autenticação obrigatória para analisar projetos.' }, 401)
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const geminiModelRaw = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'
    const fallbackModelsRaw = Deno.env.get('GEMINI_FALLBACK_MODELS')

    if (!geminiApiKey) {
      return responseJson({ error: 'Variável GEMINI_API_KEY não configurada.' }, 500)
    }

    const payload = await req.json().catch(() => ({}))
    const project = (payload?.project ?? {}) as ProjectPayload
    const stories = Array.isArray(payload?.stories) ? payload.stories as StoryPayload[] : []
    const storyCount = Number(payload?.story_count ?? stories.length)
    const memberCount = Number(payload?.member_count ?? 0)

    if (!asString(project.name) || stories.length === 0) {
      return responseJson(
        { error: 'Campos obrigatórios: project.name e ao menos uma história.' },
        400,
      )
    }

    const candidateModels = [
      normalizeModelName(geminiModelRaw),
      ...parseModelList(fallbackModelsRaw),
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ].filter((item, index, arr) => item && arr.indexOf(item) === index)

    const prompt = buildPrompt({ project, stories, storyCount, memberCount })
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
              temperature: 0.2,
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

    return responseJson(normalizeOutput(parsed, usedModel, Math.min(stories.length, 30)))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno inesperado.'
    return responseJson({ error: message }, 500)
  }
})
