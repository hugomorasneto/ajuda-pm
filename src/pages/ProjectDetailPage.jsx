import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  addProjectMemberByEmail,
  checkCanManageProject,
  getProjectById,
  listProjectMembers,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
} from '../services/projectsService'
import {
  listStoryHistoryGroups,
  updateUserStoryEstimationStatus,
} from '../services/userStoriesService'
import {
  analyzeProject,
  buildProjectAnalysisMarkdown,
  deleteProjectAnalysis,
  listProjectAnalyses,
  saveProjectAnalysis,
} from '../services/projectAiService'
import { copyTextToClipboard } from '../utils/storyExport'

const PROJECT_MEMBER_ROLES = [
  { value: 'member', label: 'Membro' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Visualizador' },
]

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Membro',
  viewer: 'Visualizador',
}

const ESTIMATION_STATUS_LABELS = {
  created: 'Criada',
  refining: 'Em refinamento',
  ready_for_estimation: 'Pronta para estimar',
  estimated: 'Estimada',
}

const ESTIMATION_STATUS_OPTIONS = [
  { value: 'created', label: 'Criada' },
  { value: 'refining', label: 'Em refinamento' },
  { value: 'ready_for_estimation', label: 'Pronta para estimar' },
  { value: 'estimated', label: 'Estimada' },
]

const STORY_ESTIMATION_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas' },
  ...ESTIMATION_STATUS_OPTIONS,
]

function formatProjectDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getEstimationStatusLabel(status) {
  return ESTIMATION_STATUS_LABELS[status] ?? 'Criada'
}

function ProjectInsightList({ title, items, emptyText }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{emptyText}</p>
      )}
    </section>
  )
}

function ProjectDetailPage() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [project, setProject] = useState(null)
  const [projectMembers, setProjectMembers] = useState([])
  const [projectStories, setProjectStories] = useState([])
  const [projectStoryCount, setProjectStoryCount] = useState(0)
  const [projectStoryFilteredCount, setProjectStoryFilteredCount] = useState(0)
  const [storyEstimationFilter, setStoryEstimationFilter] = useState('all')
  const [projectNameDraft, setProjectNameDraft] = useState('')
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStories, setIsLoadingStories] = useState(false)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [isAddingProjectMember, setIsAddingProjectMember] = useState(false)
  const [updatingProjectMemberId, setUpdatingProjectMemberId] = useState(null)
  const [removingProjectMemberId, setRemovingProjectMemberId] = useState(null)
  const [updatingStoryStatusId, setUpdatingStoryStatusId] = useState(null)
  const [canManageProjectMembers, setCanManageProjectMembers] = useState(false)
  const [projectMessage, setProjectMessage] = useState('')
  const [storyStatusMessage, setStoryStatusMessage] = useState('')
  const [memberMessage, setMemberMessage] = useState('')
  const [projectInsights, setProjectInsights] = useState(null)
  const [projectInsightsMessage, setProjectInsightsMessage] = useState('')
  const [projectInsightsCopyFeedback, setProjectInsightsCopyFeedback] = useState('')
  const [projectInsightHistory, setProjectInsightHistory] = useState([])
  const [activeProjectInsightId, setActiveProjectInsightId] = useState(null)
  const [deletingProjectInsightId, setDeletingProjectInsightId] = useState(null)
  const [isLoadingProjectInsightHistory, setIsLoadingProjectInsightHistory] = useState(false)
  const [isProjectInsightHistoryUnavailable, setIsProjectInsightHistoryUnavailable] = useState(false)
  const [isGeneratingProjectInsights, setIsGeneratingProjectInsights] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const storiesLabel = useMemo(
    () => `${projectStoryCount} ${projectStoryCount === 1 ? 'história' : 'histórias'}`,
    [projectStoryCount],
  )
  const membersLabel = useMemo(
    () => `${projectMembers.length} ${projectMembers.length === 1 ? 'membro' : 'membros'}`,
    [projectMembers.length],
  )
  const filteredStoriesLabel = useMemo(
    () =>
      `${projectStoryFilteredCount} ${
        projectStoryFilteredCount === 1 ? 'história encontrada' : 'histórias encontradas'
      }`,
    [projectStoryFilteredCount],
  )
  const currentStoryFilterLabel = useMemo(
    () =>
      STORY_ESTIMATION_FILTER_OPTIONS.find((option) => option.value === storyEstimationFilter)
        ?.label ?? 'Todas',
    [storyEstimationFilter],
  )
  const hasNoProjectStories = !isLoadingStories && projectStoryCount === 0
  const hasProjectStories = projectStoryCount > 0
  const hasNoStoriesForFilter =
    !isLoadingStories && projectStoryCount > 0 && projectStories.length === 0
  const shouldShowStoryLimitNotice = projectStoryFilteredCount > projectStories.length
  const canGenerateProjectInsights = Boolean(project && projectStoryCount > 0 && !isGeneratingProjectInsights)

  const loadProjectStories = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoadingStories(true)
    const storiesPromise = listStoryHistoryGroups({
      userId,
      projectFilter: 'project',
      projectId,
      estimationStatus: storyEstimationFilter,
      page: 1,
      pageSize: 50,
    })
    const totalsPromise =
      storyEstimationFilter === 'all'
        ? storiesPromise
        : listStoryHistoryGroups({
            userId,
            projectFilter: 'project',
            projectId,
            page: 1,
            pageSize: 1,
          })

    const [storiesResponse, totalsResponse] = await Promise.all([storiesPromise, totalsPromise])
    setIsLoadingStories(false)

    if (storiesResponse.success) {
      setProjectStories(storiesResponse.data ?? [])
      setProjectStoryFilteredCount(storiesResponse.totalCount ?? 0)
    } else {
      setProjectStories([])
      setProjectStoryFilteredCount(0)
    }

    if (totalsResponse.success) {
      setProjectStoryCount(totalsResponse.totalCount ?? 0)
    } else if (storyEstimationFilter === 'all') {
      setProjectStoryCount(0)
    }
  }, [projectId, storyEstimationFilter, userId])

  const loadProject = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoading(true)
    const [projectResponse, membersResponse, manageResponse] = await Promise.all([
      getProjectById({ projectId, userId }),
      listProjectMembers({ projectId, userId }),
      checkCanManageProject({ projectId, userId }),
    ])
    setIsLoading(false)

    if (!projectResponse.success || !projectResponse.data) {
      setNotFound(true)
      return
    }

    setProject(projectResponse.data)
    setProjectNameDraft(projectResponse.data.name ?? '')
    setProjectDescriptionDraft(projectResponse.data.description ?? '')
    setProjectMembers(membersResponse.success ? (membersResponse.data ?? []) : [])
    setCanManageProjectMembers(manageResponse.success ? Boolean(manageResponse.data) : false)
  }, [projectId, userId])

  const loadProjectInsightHistory = useCallback(async () => {
    if (!projectId || !userId) return

    setIsLoadingProjectInsightHistory(true)
    const response = await listProjectAnalyses({ projectId, userId, limit: 3 })
    setIsLoadingProjectInsightHistory(false)

    if (response.success) {
      const history = response.data ?? []
      setProjectInsightHistory(history)
      if (history.length > 0) {
        setProjectInsights((current) => current ?? history[0].analysis)
        setActiveProjectInsightId((current) => current ?? history[0].id)
      }
      setIsProjectInsightHistoryUnavailable(false)
      return
    }

    setProjectInsightHistory([])
    setActiveProjectInsightId(null)
    setIsProjectInsightHistoryUnavailable(Boolean(response.unavailable))
  }, [projectId, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProject()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProject])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectInsightHistory()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectInsightHistory])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjectStories()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjectStories])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Projeto',
      title: project?.name ?? 'Projeto',
      pills: [
        { text: storiesLabel },
        { text: membersLabel },
        { text: 'Times e Roda no menu' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [membersLabel, project?.name, setTopbarStatus, storiesLabel])

  async function handleUpdateProject(event) {
    event.preventDefault()
    setProjectMessage('')

    if (!canManageProjectMembers) {
      setProjectMessage('Apenas responsáveis e administradores podem editar o projeto.')
      return
    }

    setIsSavingProject(true)
    const response = await updateProject({
      projectId,
      name: projectNameDraft,
      description: projectDescriptionDraft,
      userId,
    })
    setIsSavingProject(false)

    if (!response.success) {
      setProjectMessage(response.error?.message ?? 'Não foi possível salvar o projeto agora.')
      return
    }

    setProject(response.data)
    setIsEditingProject(false)
    setProjectMessage('Projeto atualizado.')
  }

  function handleCancelProjectEdit() {
    setProjectNameDraft(project?.name ?? '')
    setProjectDescriptionDraft(project?.description ?? '')
    setIsEditingProject(false)
    setProjectMessage('')
  }

  async function handleUpdateStoryEstimationStatus(story, nextStatus) {
    if (!story || story.estimation_status === nextStatus) return

    setStoryStatusMessage('')
    setUpdatingStoryStatusId(story.id)
    const response = await updateUserStoryEstimationStatus({
      storyId: story.id,
      estimationStatus: nextStatus,
      userId,
    })
    setUpdatingStoryStatusId(null)

    if (!response.success) {
      setStoryStatusMessage(response.error?.message ?? 'Não foi possível atualizar o status da história.')
      return
    }

    setProjectStories((current) =>
      current.map((item) =>
        item.id === story.id ? { ...item, estimation_status: nextStatus } : item,
      ),
    )
    setStoryStatusMessage('Status de estimativa atualizado.')
    await loadProjectStories()
  }

  async function handlePrepareStoryForPlanning(story) {
    if (!story) return
    await handleUpdateStoryEstimationStatus(story, 'ready_for_estimation')
  }

  async function handleGenerateProjectInsights() {
    if (!project || !userId) return

    setProjectInsightsMessage('')
    setIsGeneratingProjectInsights(true)

    const storiesResponse = await listStoryHistoryGroups({
      userId,
      projectFilter: 'project',
      projectId,
      page: 1,
      pageSize: 30,
    })

    if (!storiesResponse.success) {
      setIsGeneratingProjectInsights(false)
      setProjectInsightsMessage('Não foi possível carregar as histórias do projeto para análise.')
      return
    }

    const storiesForAnalysis = storiesResponse.data ?? []
    if (storiesForAnalysis.length === 0) {
      setIsGeneratingProjectInsights(false)
      setProjectInsightsMessage('Forje ou vincule ao menos uma história antes de gerar o diagnóstico.')
      return
    }

    try {
      const analyzedStoryCount = storiesResponse.totalCount ?? storiesForAnalysis.length
      const analysis = await analyzeProject({
        project,
        stories: storiesForAnalysis,
        storyCount: analyzedStoryCount,
        memberCount: projectMembers.length,
      })
      setProjectInsights(analysis)
      setProjectInsightsCopyFeedback('')

      const saveResponse = await saveProjectAnalysis({
        projectId,
        userId,
        analysis,
        storyCount: analyzedStoryCount,
      })

      if (saveResponse.success && saveResponse.data) {
        setProjectInsightHistory((current) => [
          saveResponse.data,
          ...current.filter((item) => item.id !== saveResponse.data.id),
        ].slice(0, 3))
        setActiveProjectInsightId(saveResponse.data.id)
        setIsProjectInsightHistoryUnavailable(false)
        setProjectInsightsMessage('Diagnóstico gerado e salvo no histórico do projeto.')
      } else if (saveResponse.unavailable) {
        setActiveProjectInsightId(null)
        setIsProjectInsightHistoryUnavailable(true)
        setProjectInsightsMessage('Diagnóstico gerado. O histórico será ativado após aplicar o SQL desta etapa.')
      } else {
        setActiveProjectInsightId(null)
        setProjectInsightsMessage('Diagnóstico gerado. Não foi possível salvar no histórico agora.')
      }
    } catch (error) {
      setProjectInsightsMessage(
        error?.message ?? 'Não foi possível gerar o diagnóstico do projeto agora.',
      )
    } finally {
      setIsGeneratingProjectInsights(false)
    }
  }

  function handleOpenProjectInsightHistoryItem(item) {
    if (!item?.analysis) return

    setProjectInsights(item.analysis)
    setActiveProjectInsightId(item.id)
    setProjectInsightsCopyFeedback('')
    setProjectInsightsMessage('Diagnóstico reaberto do histórico do projeto.')
  }

  async function handleDeleteProjectInsightHistoryItem(item) {
    if (!item?.id) return

    const confirmed = window.confirm(
      `Excluir o diagnóstico de ${formatProjectDateTime(item.created_at)}?`,
    )
    if (!confirmed) return

    setProjectInsightsMessage('')
    setDeletingProjectInsightId(item.id)
    const response = await deleteProjectAnalysis({
      projectId,
      diagnosticId: item.id,
      userId,
    })
    setDeletingProjectInsightId(null)

    if (!response.success) {
      setProjectInsightsMessage(response.error?.message ?? 'Não foi possível excluir o diagnóstico agora.')
      return
    }

    const remaining = projectInsightHistory.filter((historyItem) => historyItem.id !== item.id)
    setProjectInsightHistory(remaining)
    if (activeProjectInsightId === item.id) {
      const nextCurrent = remaining[0] ?? null
      setProjectInsights(nextCurrent?.analysis ?? null)
      setActiveProjectInsightId(nextCurrent?.id ?? null)
    }
    setProjectInsightsMessage('Diagnóstico excluído do histórico.')
  }

  async function handleCopyProjectInsights() {
    if (!projectInsights) return

    setProjectInsightsCopyFeedback('')

    try {
      await copyTextToClipboard(
        buildProjectAnalysisMarkdown({
          project,
          analysis: projectInsights,
          storyCount: projectStoryCount,
          memberCount: projectMembers.length,
        }),
      )
      setProjectInsightsCopyFeedback('Diagnóstico copiado em Markdown.')
      window.setTimeout(() => setProjectInsightsCopyFeedback(''), 2600)
    } catch {
      setProjectInsightsCopyFeedback('Não foi possível copiar o diagnóstico agora.')
    }
  }

  async function handleAddProjectMember(event) {
    event.preventDefault()
    setMemberMessage('')

    if (!canManageProjectMembers) {
      setMemberMessage('Apenas responsáveis e administradores podem adicionar membros ao projeto.')
      return
    }

    setIsAddingProjectMember(true)
    const response = await addProjectMemberByEmail({
      projectId,
      email: memberEmail,
      role: memberRole,
      userId,
    })
    setIsAddingProjectMember(false)

    if (!response.success) {
      setMemberMessage(response.error?.message ?? 'Não foi possível adicionar este membro.')
      return
    }

    setMemberEmail('')
    setMemberRole('member')
    setMemberMessage('Membro adicionado ao projeto.')
    await loadProject()
  }

  async function handleUpdateProjectMemberRole(member, nextRole) {
    if (!member || member.role === nextRole) return
    setMemberMessage('')

    if (!canManageProjectMembers) {
      setMemberMessage('Apenas responsáveis e administradores podem alterar papéis do projeto.')
      return
    }

    if (member.role === 'owner') {
      setMemberMessage('O owner do projeto não pode ter o papel alterado por aqui.')
      return
    }

    if (member.user_id === userId) {
      setMemberMessage('Você não pode alterar seu próprio papel por aqui.')
      return
    }

    setUpdatingProjectMemberId(member.user_id)
    const response = await updateProjectMemberRole({
      projectId,
      memberUserId: member.user_id,
      role: nextRole,
      userId,
    })
    setUpdatingProjectMemberId(null)

    if (!response.success) {
      setMemberMessage(response.error?.message ?? 'Não foi possível alterar este membro.')
      return
    }

    setProjectMembers((current) =>
      current.map((item) => (item.user_id === member.user_id ? { ...item, role: nextRole } : item)),
    )
    setMemberMessage('Papel do membro atualizado.')
  }

  async function handleRemoveProjectMember(member) {
    if (!member) return
    setMemberMessage('')

    if (!canManageProjectMembers) {
      setMemberMessage('Apenas responsáveis e administradores podem remover membros do projeto.')
      return
    }

    if (member.role === 'owner') {
      setMemberMessage('O owner do projeto não pode ser removido por aqui.')
      return
    }

    if (member.user_id === userId) {
      setMemberMessage('Você não pode remover seu próprio acesso por aqui.')
      return
    }

    const confirmed = window.confirm(`Remover ${member.email} deste projeto?`)
    if (!confirmed) return

    setRemovingProjectMemberId(member.user_id)
    const response = await removeProjectMember({
      projectId,
      memberUserId: member.user_id,
      userId,
    })
    setRemovingProjectMemberId(null)

    if (!response.success) {
      setMemberMessage(response.error?.message ?? 'Não foi possível remover este membro.')
      return
    }

    setProjectMembers((current) => current.filter((item) => item.user_id !== member.user_id))
    setMemberMessage('Membro removido do projeto.')
  }

  if (notFound) {
    return <Navigate to="/projetos" replace />
  }

  return (
    <div className="projects-page project-detail-page">
      <section className="panel projects-page__hero">
        <div>
          <p className="projects-page__eyebrow">Projeto</p>
          <h1>{project?.name ?? 'Carregando projeto...'}</h1>
          <p>
            Contexto de organização para histórias, membros e futuras funções de IA. Times e Roda da Fogueira ficam em
            áreas próprias para manter esta página mais limpa.
          </p>
        </div>
        <div className="project-detail-page__actions">
          <Link className="btn btn-secondary btn-small" to="/projetos">
            Voltar
          </Link>
          <Link className="btn btn-secondary btn-small" to={`/historico?projectId=${projectId}`}>
            Histórico
          </Link>
          {canManageProjectMembers ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setIsEditingProject((current) => !current)}
              disabled={isSavingProject}
            >
              {isEditingProject ? 'Fechar edição' : 'Editar'}
            </button>
          ) : null}
          <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
            Bancada
          </Link>
        </div>
      </section>

      <section className="panel project-detail-page__settings" aria-label="Dados do projeto">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Dados do projeto</p>
            <h2>Contexto de organização</h2>
            <p>{project?.description || 'Sem descrição cadastrada.'}</p>
          </div>
        </div>

        {isEditingProject ? (
          <form className="project-detail-page__edit-form" onSubmit={handleUpdateProject}>
            <label className="projects-page__field">
              <span>Nome do projeto</span>
              <input
                type="text"
                value={projectNameDraft}
                onChange={(event) => setProjectNameDraft(event.target.value)}
                placeholder="Ex.: Onboarding de clientes"
                disabled={isSavingProject}
              />
            </label>

            <label className="projects-page__field">
              <span>Descrição opcional</span>
              <textarea
                value={projectDescriptionDraft}
                onChange={(event) => setProjectDescriptionDraft(event.target.value)}
                placeholder="Explique a jornada, squad ou objetivo do projeto."
                rows={4}
                disabled={isSavingProject}
              />
            </label>

            <div className="project-detail-page__edit-actions">
              <button type="submit" className="btn btn-primary btn-small" disabled={isSavingProject}>
                {isSavingProject ? 'Salvando...' : 'Salvar projeto'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={handleCancelProjectEdit}
                disabled={isSavingProject}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {projectMessage ? <p className="projects-page__message">{projectMessage}</p> : null}
      </section>

      <section className="panel project-detail-page__ai" aria-label="Diagnóstico com IA do projeto">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">IA do projeto</p>
            <h2>Diagnóstico do projeto</h2>
            <p>
              Gere uma leitura executiva das histórias vinculadas para encontrar riscos, perguntas de refinamento
              e próximos passos antes da estimativa.
            </p>
          </div>
          <div className="project-detail-page__ai-actions">
            {projectInsights ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleCopyProjectInsights}
              >
                {projectInsightsCopyFeedback === 'Diagnóstico copiado em Markdown.'
                  ? 'Diagnóstico copiado'
                  : 'Copiar diagnóstico'}
              </button>
            ) : null}
            {projectInsights ? (
              <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${projectId}`}>
                Levar para Roda
              </Link>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={handleGenerateProjectInsights}
              disabled={!canGenerateProjectInsights}
            >
              {isGeneratingProjectInsights
                ? 'Analisando...'
                : projectInsights
                  ? 'Atualizar diagnóstico'
                  : 'Gerar diagnóstico'}
            </button>
          </div>
        </div>

        {projectInsightsMessage ? (
          <p className="projects-page__message" role="status">
            {projectInsightsMessage}
          </p>
        ) : null}
        {projectInsightsCopyFeedback ? (
          <p className="projects-page__message" role="status">
            {projectInsightsCopyFeedback}
          </p>
        ) : null}

        {!projectInsights ? (
          <div className="project-detail-page__ai-empty">
            <strong>Leitura sob demanda</strong>
            <p>
              O diagnóstico não é salvo no banco nesta versão. Ele usa as histórias atuais do projeto e deve ser
              revisado pelo PM/PO antes de orientar o time.
            </p>
            {projectStoryCount === 0 ? (
              <p>Este projeto ainda precisa de histórias vinculadas para liberar a análise.</p>
            ) : null}
          </div>
        ) : (
          <div className="project-detail-page__ai-result">
            <div className="project-detail-page__ai-summary">
              <span>{projectInsights.health_label}</span>
              <p>{projectInsights.summary}</p>
              <small>
                {projectInsights.meta.analyzed_stories}{' '}
                {projectInsights.meta.analyzed_stories === 1 ? 'história analisada' : 'histórias analisadas'}
              </small>
            </div>

            <div className="project-detail-page__ai-grid">
              <ProjectInsightList
                title="Riscos"
                items={projectInsights.risks}
                emptyText="Nenhum risco relevante foi destacado pela IA."
              />
              <ProjectInsightList
                title="Perguntas de refinamento"
                items={projectInsights.refinement_questions}
                emptyText="Nenhuma pergunta adicional foi sugerida."
              />
              <ProjectInsightList
                title="Próximos passos"
                items={projectInsights.next_actions}
                emptyText="Nenhum próximo passo foi sugerido."
              />
              <ProjectInsightList
                title="Candidatas à estimativa"
                items={projectInsights.estimation_candidates}
                emptyText="Nenhuma candidata específica foi destacada."
              />
            </div>

            <div className="project-detail-page__ai-next-step">
              <div>
                <strong>Próxima ação</strong>
                <p>
                  Use o diagnóstico para preparar as histórias, alinhar dúvidas com o time e abrir a Roda da Fogueira
                  quando houver candidatas prontas para estimar.
                </p>
              </div>
              <Link className="btn btn-primary btn-small" to={`/roda?projectId=${projectId}`}>
                Abrir Roda da Fogueira
              </Link>
            </div>
          </div>
        )}

        <div className="project-detail-page__ai-history">
          <div>
            <strong>Histórico recente</strong>
            <p>
              Reabra os últimos diagnósticos gerados para comparar a evolução do projeto sem executar a IA novamente.
            </p>
          </div>

          {isLoadingProjectInsightHistory ? (
            <p className="projects-page__state">Carregando diagnósticos...</p>
          ) : null}

          {isProjectInsightHistoryUnavailable ? (
            <p className="projects-page__state">
              O histórico ficará disponível após aplicar o SQL <code>supabase/project-ai-diagnostics.sql</code>.
            </p>
          ) : null}

          {!isLoadingProjectInsightHistory &&
          !isProjectInsightHistoryUnavailable &&
          projectInsightHistory.length === 0 ? (
            <p className="projects-page__state">
              Nenhum diagnóstico salvo ainda. Gere o primeiro para criar uma referência do projeto.
            </p>
          ) : null}

          {projectInsightHistory.length > 0 ? (
            <div className="project-detail-page__ai-history-list">
              {projectInsightHistory.map((item) => (
                <article key={item.id} className="project-detail-page__ai-history-item">
                  <div>
                    <span>
                      {formatProjectDateTime(item.created_at)}
                      {activeProjectInsightId === item.id ? ' · Aberto agora' : ''}
                    </span>
                    <strong>{item.analysis.health_label}</strong>
                    <p>{item.analysis.summary}</p>
                  </div>
                  <div className="project-detail-page__ai-history-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handleOpenProjectInsightHistoryItem(item)}
                    >
                      Reabrir
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => handleDeleteProjectInsightHistoryItem(item)}
                      disabled={deletingProjectInsightId === item.id}
                    >
                      {deletingProjectInsightId === item.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel project-detail-page__collaboration" aria-label="Colaboração e estimativas">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Colaboração</p>
            <h2>Times e Roda da Fogueira</h2>
            <p>Gerencie times e estimativas nas áreas dedicadas, mantendo o projeto focado em contexto e histórias.</p>
          </div>
        </div>

        <div className="project-detail-page__collaboration-actions">
          <Link className="btn btn-secondary" to={`/times?projectId=${projectId}`}>
            Gerenciar Times
          </Link>
          <Link className="btn btn-secondary" to={`/roda?projectId=${projectId}`}>
            Abrir Rodas da Fogueira
          </Link>
        </div>
      </section>

      <section className="panel project-detail-page__stories" aria-label="Histórias vinculadas ao projeto">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Histórias do projeto</p>
            <h2>{storiesLabel}</h2>
            <p>Histórias vinculadas a este projeto, organizadas por status de estimativa.</p>
            {hasProjectStories ? (
              <p className="project-detail-page__story-filter-summary">
                {storyEstimationFilter === 'all'
                  ? filteredStoriesLabel
                  : `${filteredStoriesLabel} em ${currentStoryFilterLabel}.`}
              </p>
            ) : null}
          </div>
          <div className="project-detail-page__story-actions">
            <label className="project-detail-page__story-filter">
              <span>Filtrar status</span>
              <select
                value={storyEstimationFilter}
                onChange={(event) => setStoryEstimationFilter(event.target.value)}
                disabled={isLoadingStories}
              >
                {STORY_ESTIMATION_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Link className="btn btn-primary btn-small" to={`/tool?projectId=${projectId}`}>
              Forjar neste projeto
            </Link>
          </div>
        </div>

        {isLoadingStories ? <p className="projects-page__state">Carregando histórias...</p> : null}
        {hasNoProjectStories ? (
          <div className="projects-page__empty">
            <h3>Nenhuma história vinculada ainda</h3>
            <p>Abra a Bancada com este projeto selecionado ou organize uma peça avulsa quando fizer sentido.</p>
          </div>
        ) : null}
        {hasNoStoriesForFilter ? (
          <div className="projects-page__empty">
            <h3>Nenhuma história neste filtro</h3>
            <p>Troque o status selecionado para ver outras peças vinculadas a este projeto.</p>
          </div>
        ) : null}
        {storyStatusMessage ? <p className="projects-page__message">{storyStatusMessage}</p> : null}
        {shouldShowStoryLimitNotice ? (
          <p className="projects-page__state">Mostrando as 50 histórias mais recentes deste filtro.</p>
        ) : null}

        <div className="project-detail-page__story-list">
          {projectStories.map((story) => {
            const canUpdateStoryStatus = canManageProjectMembers || story.user_id === userId
            const isUpdatingStoryStatus = updatingStoryStatusId === story.id

            return (
              <article key={story.id} className="project-detail-page__story">
                <div>
                  <h3>{story.title}</h3>
                  <p>{story.input_context || story.user_story || 'Sem descrição.'}</p>
                </div>
                <div className="project-detail-page__story-meta">
                  <span>{formatProjectDateTime(story.created_at)}</span>
                  {canUpdateStoryStatus ? (
                    <label className="project-detail-page__story-status">
                      <span>Status de estimativa</span>
                      <select
                        value={story.estimation_status ?? 'created'}
                        onChange={(event) =>
                          handleUpdateStoryEstimationStatus(story, event.target.value)
                        }
                        disabled={isUpdatingStoryStatus}
                      >
                        {ESTIMATION_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <span>{getEstimationStatusLabel(story.estimation_status)}</span>
                  )}
                  <Link className="btn btn-secondary btn-small" to={`/tool?storyId=${story.id}`}>
                    Abrir na Bancada
                  </Link>
                  {story.estimation_status === 'ready_for_estimation' ? (
                    <Link
                      className="btn btn-primary btn-small"
                      to={`/roda?projectId=${projectId}&storyId=${story.id}`}
                    >
                      Abrir Roda
                    </Link>
                  ) : null}
                  {story.estimation_status === 'estimated' ? (
                    <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${projectId}`}>
                      Ver Rodas
                    </Link>
                  ) : null}
                  {story.estimation_status !== 'ready_for_estimation' &&
                  story.estimation_status !== 'estimated' &&
                  canUpdateStoryStatus ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => handlePrepareStoryForPlanning(story)}
                      disabled={isUpdatingStoryStatus}
                    >
                      {isUpdatingStoryStatus ? 'Preparando...' : 'Preparar Roda'}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="panel project-detail-page__members" aria-label="Membros do projeto">
        <div className="projects-page__section-header">
          <div>
            <p className="projects-page__eyebrow">Membros do projeto</p>
            <h2>{membersLabel}</h2>
            <p>Pessoas com acesso ao contexto e às histórias vinculadas deste projeto.</p>
          </div>
        </div>

        {canManageProjectMembers ? (
          <form className="project-detail-page__member-form" onSubmit={handleAddProjectMember}>
            <label className="projects-page__field">
              <span>E-mail cadastrado</span>
              <input
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="pessoa@empresa.com"
                disabled={isAddingProjectMember || isLoading}
              />
            </label>
            <label className="projects-page__field">
              <span>Papel</span>
              <select
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value)}
                disabled={isAddingProjectMember || isLoading}
              >
                {PROJECT_MEMBER_ROLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn btn-secondary btn-small"
              disabled={isAddingProjectMember || isLoading}
            >
              {isAddingProjectMember ? 'Adicionando...' : 'Adicionar membro'}
            </button>
          </form>
        ) : (
          <p className="projects-page__state">
            Você pode consultar os membros. Apenas responsáveis e administradores adicionam novas pessoas.
          </p>
        )}

        {memberMessage ? <p className="projects-page__message">{memberMessage}</p> : null}
        {isLoading ? <p className="projects-page__state">Carregando membros...</p> : null}

        <div className="project-detail-page__member-list">
          {projectMembers.map((member) => {
            const canEditMember =
              canManageProjectMembers && member.role !== 'owner' && member.user_id !== userId
            const isUpdatingMember = updatingProjectMemberId === member.user_id
            const isRemovingMember = removingProjectMemberId === member.user_id

            return (
              <div key={member.user_id} className="project-detail-page__member">
                <span>{member.email}</span>
                {canEditMember ? (
                  <div className="project-detail-page__member-controls">
                    <label className="project-detail-page__member-role">
                      <span>Papel</span>
                      <select
                        value={member.role}
                        onChange={(event) =>
                          handleUpdateProjectMemberRole(member, event.target.value)
                        }
                        disabled={isUpdatingMember || isRemovingMember}
                      >
                        {PROJECT_MEMBER_ROLES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => handleRemoveProjectMember(member)}
                      disabled={isUpdatingMember || isRemovingMember || member.user_id === userId}
                    >
                      {isRemovingMember ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                ) : (
                  <strong>{ROLE_LABELS[member.role] ?? member.role}</strong>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default ProjectDetailPage
