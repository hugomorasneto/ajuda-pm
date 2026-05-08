import { supabase } from '../lib/supabaseClient'

const PROJECT_ANALYSIS_TIMEOUT_MS = 25000
const projectAnalysisColumns = [
  'id',
  'project_id',
  'created_by',
  'summary',
  'health_label',
  'risks',
  'refinement_questions',
  'next_actions',
  'estimation_candidates',
  'input_story_count',
  'analyzed_story_count',
  'provider',
  'model_used',
  'raw_result',
  'created_at',
].join(', ')

function asString(value, fallback = '') {
  const cleaned = typeof value === 'string' ? value.trim() : ''
  return cleaned || fallback
}

function asArray(value, fallback = []) {
  if (!Array.isArray(value)) return fallback

  const cleaned = value.map((item) => String(item).trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned : fallback
}

function createProjectAnalysisError(code, message, details = {}) {
  const error = new Error(message)
  error.code = code
  error.details = details
  return error
}

function mapProjectAnalysisHttpError(response, payload) {
  if (response.status === 400) {
    return createProjectAnalysisError(
      'INVALID_INPUT',
      'Selecione um projeto com histórias antes de gerar o diagnóstico.',
      { status: response.status, payload },
    )
  }

  if (response.status === 401 || response.status === 403) {
    return createProjectAnalysisError(
      'AUTH_REQUIRED',
      'Sua sessão expirou. Entre novamente para continuar.',
      { status: response.status, payload },
    )
  }

  if (response.status === 429) {
    return createProjectAnalysisError(
      'RATE_LIMIT',
      'A IA está com alta demanda agora. Tente novamente em alguns instantes.',
      { status: response.status, payload },
    )
  }

  if (response.status >= 500) {
    return createProjectAnalysisError(
      'PROVIDER_UNAVAILABLE',
      'A IA não conseguiu analisar o projeto agora. Tente novamente em alguns instantes.',
      { status: response.status, payload },
    )
  }

  return createProjectAnalysisError(
    'ANALYSIS_FAILED',
    'Não foi possível gerar o diagnóstico do projeto agora.',
    { status: response.status, payload },
  )
}

export function normalizeProjectAnalysis(rawResult) {
  const safe = rawResult ?? {}

  return {
    summary: asString(
      safe.summary,
      'O projeto já possui contexto suficiente para uma leitura inicial, mas ainda precisa de revisão humana.',
    ),
    health_label: asString(safe.health_label, 'Em organização'),
    risks: asArray(safe.risks, ['Revise as histórias mais antigas antes de encaminhar para estimativa.']).slice(0, 4),
    refinement_questions: asArray(safe.refinement_questions, [
      'Qual é o principal resultado de negócio esperado para este projeto?',
    ]).slice(0, 5),
    next_actions: asArray(safe.next_actions, [
      'Escolher as histórias prioritárias e marcar as que estão prontas para estimativa.',
    ]).slice(0, 5),
    estimation_candidates: asArray(safe.estimation_candidates, []).slice(0, 5),
    meta: {
      generated_by: safe?.meta?.generated_by ?? 'gemini',
      model_used: safe?.meta?.model_used ?? null,
      analyzed_stories: Number(safe?.meta?.analyzed_stories ?? 0),
      guardrails_applied: Boolean(safe?.meta?.guardrails_applied),
    },
  }
}

function normalizeProjectAnalysisRecord(record) {
  if (!record) return null

  const analysis = normalizeProjectAnalysis({
    summary: record.summary,
    health_label: record.health_label,
    risks: record.risks,
    refinement_questions: record.refinement_questions,
    next_actions: record.next_actions,
    estimation_candidates: record.estimation_candidates,
    meta: {
      generated_by: record.provider,
      model_used: record.model_used,
      analyzed_stories: record.analyzed_story_count,
      guardrails_applied: Boolean(record.raw_result?.meta?.guardrails_applied),
    },
  })

  return {
    id: record.id,
    project_id: record.project_id,
    created_by: record.created_by,
    created_at: record.created_at,
    input_story_count: Number(record.input_story_count ?? 0),
    analysis,
  }
}

function isProjectDiagnosticsUnavailable(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return (
    error?.code === '42P01' ||
    message.includes('project_ai_diagnostics') ||
    message.includes('could not find the table')
  )
}

function formatMarkdownList(items, fallback) {
  const normalized = asArray(items, [])
  if (normalized.length === 0) return `- ${fallback}`

  return normalized.map((item) => `- ${item}`).join('\n')
}

export function buildProjectAnalysisMarkdown({
  project,
  analysis,
  storyCount = 0,
  memberCount = 0,
}) {
  if (!analysis) return ''

  const projectName = asString(project?.name, 'Projeto')
  const projectDescription = asString(project?.description, 'Sem descrição cadastrada.')
  const analyzedStories = Number(analysis?.meta?.analyzed_stories ?? storyCount ?? 0)

  return [
    `# Diagnóstico do projeto: ${projectName}`,
    `**Saúde do projeto:** ${asString(analysis.health_label, 'Em organização')}`,
    `**Histórias vinculadas:** ${storyCount}`,
    `**Histórias analisadas:** ${analyzedStories}`,
    `**Membros:** ${memberCount}`,
    '',
    '## Contexto',
    projectDescription,
    '',
    '## Resumo executivo',
    asString(analysis.summary, 'Nenhum resumo gerado.'),
    '',
    '## Riscos',
    formatMarkdownList(analysis.risks, 'Nenhum risco relevante foi destacado.'),
    '',
    '## Perguntas de refinamento',
    formatMarkdownList(
      analysis.refinement_questions,
      'Nenhuma pergunta adicional foi sugerida.',
    ),
    '',
    '## Próximos passos',
    formatMarkdownList(analysis.next_actions, 'Nenhum próximo passo foi sugerido.'),
    '',
    '## Candidatas à estimativa',
    formatMarkdownList(
      analysis.estimation_candidates,
      'Nenhuma candidata específica foi destacada.',
    ),
  ].join('\n')
}

export async function listProjectAnalyses({ projectId, userId, limit = 3 }) {
  try {
    if (!userId) {
      return { success: false, unavailable: false, error: new Error('Usuário não autenticado.'), data: [] }
    }

    if (!projectId) {
      return { success: false, unavailable: false, error: new Error('Projeto não informado.'), data: [] }
    }

    const { data, error } = await supabase
      .from('project_ai_diagnostics')
      .select(projectAnalysisColumns)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (isProjectDiagnosticsUnavailable(error)) {
        return { success: false, unavailable: true, error, data: [] }
      }

      console.error('Supabase listProjectAnalyses error:', error)
      return { success: false, unavailable: false, error, data: [] }
    }

    return {
      success: true,
      unavailable: false,
      data: (data ?? []).map(normalizeProjectAnalysisRecord).filter(Boolean),
    }
  } catch (error) {
    console.error('Unexpected listProjectAnalyses error:', error)
    return { success: false, unavailable: false, error, data: [] }
  }
}

export async function saveProjectAnalysis({
  projectId,
  userId,
  analysis,
  storyCount = 0,
}) {
  try {
    if (!userId) {
      return { success: false, unavailable: false, error: new Error('Usuário não autenticado.'), data: null }
    }

    if (!projectId || !analysis) {
      return { success: false, unavailable: false, error: new Error('Diagnóstico incompleto.'), data: null }
    }

    const payload = {
      project_id: projectId,
      created_by: userId,
      summary: analysis.summary,
      health_label: analysis.health_label,
      risks: analysis.risks,
      refinement_questions: analysis.refinement_questions,
      next_actions: analysis.next_actions,
      estimation_candidates: analysis.estimation_candidates,
      input_story_count: storyCount,
      analyzed_story_count: Number(analysis?.meta?.analyzed_stories ?? 0),
      provider: analysis?.meta?.generated_by ?? 'gemini',
      model_used: analysis?.meta?.model_used ?? null,
      raw_result: analysis,
    }

    const { data, error } = await supabase
      .from('project_ai_diagnostics')
      .insert([payload])
      .select(projectAnalysisColumns)
      .single()

    if (error) {
      if (isProjectDiagnosticsUnavailable(error)) {
        return { success: false, unavailable: true, error, data: null }
      }

      console.error('Supabase saveProjectAnalysis error:', error)
      return { success: false, unavailable: false, error, data: null }
    }

    return {
      success: true,
      unavailable: false,
      data: normalizeProjectAnalysisRecord(data),
    }
  } catch (error) {
    console.error('Unexpected saveProjectAnalysis error:', error)
    return { success: false, unavailable: false, error, data: null }
  }
}

export async function analyzeProject({ project, stories, storyCount, memberCount }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração Supabase ausente no frontend (URL ou ANON KEY).')
  }

  const { data } = await supabase.auth.getSession()
  const accessToken = data?.session?.access_token
  if (!accessToken) {
    throw createProjectAnalysisError(
      'AUTH_REQUIRED',
      'Sua sessão expirou. Entre novamente para continuar.',
    )
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), PROJECT_ANALYSIS_TIMEOUT_MS)

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ project, stories, story_count: storyCount, member_count: memberCount }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw mapProjectAnalysisHttpError(response, payload)
    }

    return normalizeProjectAnalysis(payload)
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createProjectAnalysisError(
        'TIMEOUT',
        'A análise demorou mais do que o esperado. Tente novamente em alguns instantes.',
        { timeout_ms: PROJECT_ANALYSIS_TIMEOUT_MS },
      )
    }

    if (error instanceof Error && error.code) {
      throw error
    }

    throw createProjectAnalysisError(
      'NETWORK',
      'Não foi possível conectar à análise do projeto agora. Verifique sua conexão e tente novamente.',
      { cause: error instanceof Error ? error.message : null },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
