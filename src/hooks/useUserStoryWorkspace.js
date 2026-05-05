import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  countUserStoriesByUser,
  createUserStoryVersion,
  getUserStoryById,
  listRecentStoryGroups,
  listStoryVersions,
  updateUserStory,
} from '../services/userStoriesService'
import {
  generateUserStory,
  normalizeUserStoryGeneration,
} from '../services/userStoryGenerationService'
import { getUserProfile } from '../services/userProfilesService'
import { useAuth } from './useAuth'
import { trackEvent } from '../services/analyticsService'
import { FREE_GENERATION_LIMIT } from '../constants/app'

const STORY_STATUS_LABELS = {
  generated: 'Forjado',
  reviewed: 'Inspecionado',
  approved: 'Aprovado',
  archived: 'Arquivado',
}

function getStoryStatusLabel(status) {
  return STORY_STATUS_LABELS[status] ?? 'Forjado'
}

export function parseTextList(value) {
  if (!value) return []
  return String(value)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function mapStoryRowToGeneratedResult(story) {
  return normalizeUserStoryGeneration({
    title: story.title,
    objective: story.objective,
    user_story: story.user_story,
    acceptance_criteria: parseTextList(story.acceptance_criteria),
    notes: `Status: ${getStoryStatusLabel(story.status)}`,
    business_rules: parseTextList(story.business_rules),
    gaps: parseTextList(story.gaps),
    qa_checklist: parseTextList(story.qa_checklist),
    generation_meta: {
      generated_by: 'history',
      model_used: null,
      quality_score: null,
      guardrails_applied: false,
    },
  })
}

function validateForm(formValues) {
  const errors = {}
  if (!formValues.problemContext.trim()) {
    errors.problemContext = 'Informe a matéria-prima principal antes de acionar a forja.'
  }
  if (!formValues.requirements.trim()) {
    errors.requirements = 'Informe as ligas e regras para montar critérios de aceite úteis.'
  }
  return errors
}

function buildSinceIso(filter) {
  const now = new Date()
  if (filter === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (filter === '7d') {
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return sevenDaysAgo.toISOString()
  }
  return null
}

function toNullableText(list) {
  if (!Array.isArray(list) || list.length === 0) return null
  return list.join('\n')
}

function buildClipboardText(result) {
  return [
    `User story: ${result.user_story}`,
    '',
    'Critérios de aceite:',
    ...result.acceptance_criteria.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n')
}

function formatInstructionList(title, items) {
  if (!Array.isArray(items) || items.length === 0) return ''
  return [
    `${title}:`,
    ...items.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n')
}

function buildRefinementGenerationAdjustment({ instruction, story }) {
  return [
    'Refine a versão atual sem descartar a matéria-prima original.',
    `Feedback do usuário: ${instruction}`,
    '',
    'Versão atual para referência:',
    story?.title ? `Título atual: ${story.title}` : '',
    story?.objective ? `Objetivo atual: ${story.objective}` : '',
    story?.user_story ? `User story atual: ${story.user_story}` : '',
    formatInstructionList('Critérios de aceite atuais', story?.acceptance_criteria),
    formatInstructionList('Trincas/gaps atuais', story?.gaps),
    formatInstructionList('Checklist de QA atual', story?.qa_checklist),
    'Preserve o contexto original, aplique o feedback e devolva uma nova versão completa.',
  ].filter(Boolean).join('\n')
}

export function formatDateTime(value) {
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

export function useUserStoryWorkspace() {
  const pageSize = 10
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [formValues, setFormValues] = useState({
    problemContext: '',
    requirements: '',
    adjustment: '',
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [result, setResult] = useState(null)
  const [editDraft, setEditDraft] = useState({
    title: '',
    user_story: '',
    acceptance_criteria: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSelection, setIsLoadingSelection] = useState(false)
  const [isSavingEdits, setIsSavingEdits] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [isCopying, setIsCopying] = useState(false)
  const [recentStories, setRecentStories] = useState([])
  const [isLoadingRecent, setIsLoadingRecent] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [workspaceError, setWorkspaceError] = useState('')
  const [selectedStoryId, setSelectedStoryId] = useState(null)
  const [selectedStoryGroupId, setSelectedStoryGroupId] = useState(null)
  const [selectedStoryOwnerId, setSelectedStoryOwnerId] = useState(null)
  const [selectedStoryProjectId, setSelectedStoryProjectId] = useState(null)
  const [selectedStoryTitle, setSelectedStoryTitle] = useState('')
  const [selectedBaseInput, setSelectedBaseInput] = useState({ context: '', requirements: '' })
  const [versions, setVersions] = useState([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('7d')
  const [usageCount, setUsageCount] = useState(0)
  const [userPlan, setUserPlan] = useState('free')

  const isEditing = Boolean(selectedStoryId)
  const canEditSelectedStory = Boolean(isEditing && selectedStoryOwnerId === userId)
  const isPremium = userPlan === 'premium'
  const remainingGenerations = Math.max(0, FREE_GENERATION_LIMIT - usageCount)
  const hasReachedLimit = !isPremium && usageCount >= FREE_GENERATION_LIMIT

  const activeStoryTitle = useMemo(() => {
    const selected = recentStories.find((item) => item.id === selectedStoryId)
    return selected?.title ?? selectedStoryTitle
  }, [recentStories, selectedStoryId, selectedStoryTitle])

  const selectedVersion = useMemo(
    () => versions.find((item) => item.id === selectedStoryId) ?? null,
    [versions, selectedStoryId],
  )

  const previousVersion = useMemo(() => {
    if (!selectedVersion?.version_number) return null
    return versions.find((item) => item.version_number === selectedVersion.version_number - 1) ?? null
  }, [selectedVersion, versions])

  const loadUsage = useCallback(async () => {
    if (!userId) return

    const [countResponse, profileResponse] = await Promise.all([
      countUserStoriesByUser(userId),
      getUserProfile(userId),
    ])

    if (countResponse.success) setUsageCount(countResponse.count)
    if (profileResponse.success && profileResponse.data?.plan) {
      setUserPlan(profileResponse.data.plan)
    } else {
      setUserPlan('free')
    }
  }, [userId])

  const loadRecentStories = useCallback(async () => {
    if (!userId) return
    setIsLoadingRecent(true)
    setHistoryError('')

    const sinceIso = buildSinceIso(historyFilter)
    const response = await listRecentStoryGroups({
      limit: pageSize,
      sinceIso,
      userId,
    })

    if (response.success) {
      setRecentStories(response.data ?? [])
    } else {
      setHistoryError('Não foi possível buscar as peças forjadas agora.')
    }

    setIsLoadingRecent(false)
  }, [historyFilter, pageSize, userId])

  const loadVersionsByGroup = useCallback(
    async (storyGroupId) => {
      if (!userId || !storyGroupId) {
        setVersions([])
        return
      }

      setIsLoadingVersions(true)
      const response = await listStoryVersions({
        storyGroupId,
        userId,
        limit: 20,
      })
      setIsLoadingVersions(false)

      if (response.success) {
        setVersions(response.data ?? [])
      }
    },
    [userId],
  )

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadRecentStories()
      loadUsage()
    }, 0)
    return () => clearTimeout(timerId)
  }, [loadRecentStories, loadUsage])

  useEffect(() => {
    trackEvent({
      event_name: 'tool_view',
      event_category: 'workspace',
      page_path: '/tool',
    })
  }, [])

  function fillScreenWithStory(story) {
    const mapped = mapStoryRowToGeneratedResult(story)
    setWorkspaceError('')
    setFormValues((prev) => ({
      ...prev,
      problemContext: story.input_context ?? '',
      requirements: story.input_requirements ?? '',
      adjustment: '',
    }))
    setResult(mapped)
    setSelectedStoryTitle(story.title ?? mapped.title ?? '')
    setSelectedStoryOwnerId(story.user_id ?? null)
    setSelectedStoryProjectId(story.project_id ?? null)
    setEditDraft({
      title: mapped.title,
      user_story: mapped.user_story,
      acceptance_criteria: [...mapped.acceptance_criteria],
    })
  }

  function handleFieldChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  function handlePromptChipApply(field, snippet) {
    setFormValues((prev) => {
      const current = prev[field] ?? ''
      if (current.includes(snippet.trim())) return prev
      const hasContent = current.trim().length > 0
      const separator = hasContent && !current.endsWith('\n') ? '\n' : ''
      const nextValue = hasContent ? `${current}${separator}${snippet}` : snippet
      return { ...prev, [field]: nextValue }
    })
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  function handleEditDraftChange(field, value) {
    setEditDraft((prev) => {
      if (field === 'acceptance_criteria') {
        return { ...prev, acceptance_criteria: parseTextList(value) }
      }
      return { ...prev, [field]: value }
    })
  }

  function handleResetToCreate() {
    setSelectedStoryId(null)
    setSelectedStoryGroupId(null)
    setSelectedStoryOwnerId(null)
    setSelectedStoryProjectId(null)
    setSelectedStoryTitle('')
    setSelectedBaseInput({ context: '', requirements: '' })
    setFormValues({ problemContext: '', requirements: '', adjustment: '' })
    setValidationErrors({})
    setResult(null)
    setSaveMessage('')
    setCopyMessage('')
    setWorkspaceError('')
    setVersions([])
    setEditDraft({
      title: '',
      user_story: '',
      acceptance_criteria: [],
    })
  }

  async function handleSelectVersion(storyId) {
    if (!userId) return
    setIsLoadingSelection(true)

    const response = await getUserStoryById(storyId, userId)
    if (!response.success || !response.data) {
      setWorkspaceError('Não foi possível carregar a versão selecionada agora.')
      setSaveMessage('Erro ao carregar a versão selecionada.')
      setIsLoadingSelection(false)
      return
    }

    const story = response.data
    setSelectedStoryId(story.id)
    setSelectedStoryGroupId(story.story_group_id ?? story.id)
    setSelectedStoryOwnerId(story.user_id ?? null)
    setSelectedStoryProjectId(story.project_id ?? null)
    fillScreenWithStory(story)
    setIsLoadingSelection(false)
  }

  async function handleSelectHistory(storyId) {
    if (!userId) return

    setIsLoadingSelection(true)
    setSaveMessage('')
    setCopyMessage('')

    const response = await getUserStoryById(storyId, userId)
    if (!response.success || !response.data) {
      setWorkspaceError('Não foi possível carregar a user story selecionada agora.')
      setSaveMessage('Erro ao carregar a user story selecionada.')
      setIsLoadingSelection(false)
      return
    }

    const story = response.data
    setSelectedStoryId(story.id)
    setSelectedStoryGroupId(story.story_group_id ?? story.id)
    setSelectedStoryOwnerId(story.user_id ?? null)
    setSelectedStoryProjectId(story.project_id ?? null)
    setSelectedBaseInput({
      context: story.input_context ?? '',
      requirements: story.input_requirements ?? '',
    })
    fillScreenWithStory(story)
    await loadVersionsByGroup(story.story_group_id ?? story.id)
    setIsLoadingSelection(false)
  }

  async function handleCopy(storyOverride = null) {
    const sourceStory = storyOverride ?? result
    if (!sourceStory) return
    setIsCopying(true)
    setCopyMessage('')
    try {
      const text = buildClipboardText(sourceStory)
      await navigator.clipboard.writeText(text)
      setCopyMessage('Artefato copiado para a área de transferência.')
      trackEvent({
        event_name: 'user_story_copied',
        event_category: 'workspace',
        page_path: '/tool',
        metadata: { story_id: selectedStoryId, has_story: true },
      })
    } catch (error) {
      setCopyMessage('Erro ao copiar o conteúdo.')
      console.error('Falha ao copiar user story:', error)
    } finally {
      setIsCopying(false)
    }
  }

  async function handleSaveEdits() {
    if (!userId || !selectedStoryId || !result) return
    if (!canEditSelectedStory) {
      setSaveMessage('Apenas quem criou esta história pode salvar alterações nela.')
      return
    }

    const safeTitle = editDraft.title.trim()
    const safeUserStory = editDraft.user_story.trim()
    const safeCriteria = editDraft.acceptance_criteria

    if (!safeTitle || !safeUserStory || safeCriteria.length === 0) {
      setSaveMessage('Preencha título, user story e critérios de aceite antes de salvar.')
      return
    }

    setIsSavingEdits(true)
    const response = await updateUserStory(
      selectedStoryId,
      {
        title: safeTitle,
        user_story: safeUserStory,
        acceptance_criteria: toNullableText(safeCriteria),
      },
      userId,
    )
    setIsSavingEdits(false)

    if (!response.success || !response.data?.[0]) {
      const errorMessage = response.error?.message ?? 'Erro desconhecido ao salvar a edição.'
      setSaveMessage(`Erro ao salvar a versão: ${errorMessage}`)
      return
    }

    fillScreenWithStory(response.data[0])
    setSaveMessage('Alterações salvas. Revise os critérios de aceite antes de copiar para o backlog.')
    await loadVersionsByGroup(selectedStoryGroupId)
    await loadRecentStories()

    trackEvent({
      event_name: 'user_story_updated',
      event_category: 'workspace',
      page_path: '/tool',
      metadata: { story_id: selectedStoryId, update_type: 'manual_edit' },
    })
  }

  async function handleSubmitStory(options = {}) {
    const adjustmentOverride =
      typeof options.adjustment === 'string' ? options.adjustment : null
    const formValuesForSubmit = adjustmentOverride === null
      ? formValues
      : { ...formValues, adjustment: adjustmentOverride }

    if (!userId) {
      setWorkspaceError('Sua sessão expirou. Entre novamente para continuar.')
      setSaveMessage('Sessão expirada. Faça login novamente.')
      return false
    }

    const errors = validateForm(formValuesForSubmit)
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      setSaveMessage('Revise a matéria-prima e as ligas antes de acionar a forja.')
      return false
    }

    if (hasReachedLimit) {
      trackEvent({
        event_name: 'limit_reached_free_plan',
        event_category: 'usage',
        page_path: '/tool',
        metadata: { usage_count: usageCount, free_limit: FREE_GENERATION_LIMIT },
      })
      const limitMessage = `Limite do plano Free atingido (${FREE_GENERATION_LIMIT} forjas). Atualize para Pro para continuar.`
      setWorkspaceError(limitMessage)
      setSaveMessage(limitMessage)
      return false
    }

    setIsSubmitting(true)
    setSaveMessage('')
    setCopyMessage('')
    setWorkspaceError('')

    const contextTrimmed = formValuesForSubmit.problemContext.trim()
    const requirementsTrimmed = formValuesForSubmit.requirements.trim()
    const adjustmentTrimmed = formValuesForSubmit.adjustment.trim()
    const generationAdjustment = typeof options.generationAdjustment === 'string' && options.generationAdjustment.trim()
      ? options.generationAdjustment.trim()
      : adjustmentTrimmed
    const isSameBaseInput =
      selectedBaseInput.context === contextTrimmed &&
      selectedBaseInput.requirements === requirementsTrimmed
    const shouldUseCurrentGroup = isEditing && isSameBaseInput && canEditSelectedStory

    try {
      trackEvent({
        event_name: 'user_story_generate_clicked',
        event_category: 'workspace',
        page_path: '/tool',
        metadata: {
          is_regeneration: shouldUseCurrentGroup,
          has_adjustment: Boolean(adjustmentTrimmed),
          existing_versions: versions.length,
        },
      })

      await new Promise((resolve) => {
        setTimeout(resolve, 450)
      })

      const generated = await generateUserStory({
        input_context: contextTrimmed,
        input_requirements: requirementsTrimmed,
        input_adjustment: generationAdjustment,
      })
      setResult(generated)
      setEditDraft({
        title: generated.title,
        user_story: generated.user_story,
        acceptance_criteria: [...generated.acceptance_criteria],
      })

      const payload = {
        input_context: contextTrimmed,
        input_requirements: requirementsTrimmed,
        title: generated.title,
        objective: generated.objective,
        user_story: generated.user_story,
        acceptance_criteria: toNullableText(generated.acceptance_criteria),
        business_rules: toNullableText(generated.business_rules),
        gaps: toNullableText(generated.gaps),
        qa_checklist: toNullableText(generated.qa_checklist),
        status: 'generated',
        project_id: shouldUseCurrentGroup
          ? selectedStoryProjectId
          : options.projectId || null,
        regeneration_instruction: adjustmentTrimmed || null,
        created_at: new Date().toISOString(),
      }

      const actionResult = await createUserStoryVersion({
        data: payload,
        userId,
        storyGroupId: shouldUseCurrentGroup ? selectedStoryGroupId : null,
        previousVersionId: shouldUseCurrentGroup ? selectedStoryId : null,
      })

      if (!actionResult.success || !actionResult.data?.[0]) {
        const errorMessage = actionResult.error?.message ?? 'Erro desconhecido ao persistir.'
        console.error('Falha ao persistir user story:', actionResult.error)
        setSaveMessage(`Erro ao salvar a versão: ${errorMessage}`)
        trackEvent({
          event_name: 'user_story_generate_failed',
          event_category: 'workspace',
          page_path: '/tool',
          metadata: { stage: 'persist', error_message: errorMessage },
        })
        return false
      }

      const persisted = actionResult.data[0]
      setSelectedStoryId(persisted.id)
      setSelectedStoryGroupId(persisted.story_group_id ?? persisted.id)
      setSelectedStoryOwnerId(persisted.user_id ?? userId)
      setSelectedStoryProjectId(persisted.project_id ?? null)
      setSelectedStoryTitle(persisted.title ?? generated.title ?? '')
      setSelectedBaseInput({
        context: persisted.input_context ?? contextTrimmed,
        requirements: persisted.input_requirements ?? requirementsTrimmed,
      })

      const quality = generated?.generation_meta?.quality_score
      const qualityLabel =
        Number.isFinite(quality) && quality > 0 ? ` Pontuação da inspeção: ${quality}/100.` : ''
      setSaveMessage(
        shouldUseCurrentGroup
          ? `Story refinada e salva como nova versão.${qualityLabel}`
          : `Primeira versão forjada e salva com sucesso.${qualityLabel}`,
      )
      await loadRecentStories()
      await loadVersionsByGroup(persisted.story_group_id ?? persisted.id)
      await loadUsage()

      trackEvent({
        event_name: 'user_story_generate_success',
        event_category: 'workspace',
        page_path: '/tool',
        metadata: {
          story_id: persisted.id,
          story_group_id: persisted.story_group_id ?? null,
          version_number: persisted.version_number ?? null,
          quality_score: quality ?? null,
          has_adjustment: Boolean(adjustmentTrimmed),
        },
      })

      if (shouldUseCurrentGroup) {
        trackEvent({
          event_name: 'user_story_regenerated',
          event_category: 'workspace',
          page_path: '/tool',
          metadata: {
            story_group_id: persisted.story_group_id ?? null,
            version_number: persisted.version_number ?? null,
            total_versions_now: (persisted.version_number ?? versions.length) || null,
            has_adjustment: Boolean(adjustmentTrimmed),
          },
        })
      }

      return true
    } catch (error) {
      console.error('Falha ao gerar user story com IA:', error)
      const baseMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível gerar a story agora.'
      setWorkspaceError(`${baseMessage} Sua matéria-prima foi preservada para uma nova tentativa.`)
      setSaveMessage(`${baseMessage} Sua matéria-prima foi preservada para uma nova tentativa.`)
      trackEvent({
        event_name: 'user_story_generate_failed',
        event_category: 'workspace',
        page_path: '/tool',
        metadata: {
          stage: 'generate',
          error_code: error instanceof Error ? error.code ?? null : null,
          error_message: error instanceof Error ? error.message : 'unknown_error',
        },
      })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRefineStory(instruction) {
    const adjustment = String(instruction ?? '').trim()
    if (!adjustment) {
      setSaveMessage('Informe o ajuste desejado antes de refinar na forja.')
      return false
    }

    if (!result) {
      setSaveMessage('Gere uma story antes de acionar o refino.')
      return false
    }

    if (!canEditSelectedStory) {
      setSaveMessage('Apenas quem criou esta história pode gerar uma versão refinada dela.')
      return false
    }

    const currentStory = {
      ...result,
      title: editDraft.title?.trim() || result.title,
      user_story: editDraft.user_story?.trim() || result.user_story,
      acceptance_criteria: editDraft.acceptance_criteria?.length > 0
        ? editDraft.acceptance_criteria
        : result.acceptance_criteria,
    }
    const generationAdjustment = buildRefinementGenerationAdjustment({
      instruction: adjustment,
      story: currentStory,
    })

    setFormValues((prev) => ({ ...prev, adjustment }))
    const refined = await handleSubmitStory({ adjustment, generationAdjustment })
    if (refined) {
      setFormValues((prev) => ({ ...prev, adjustment: '' }))
    }

    return refined
  }

  async function handleAssignSelectedStoryToProject(projectId) {
    if (!userId || !selectedStoryId) return false

    setIsSavingEdits(true)
    const response = await updateUserStory(
      selectedStoryId,
      { project_id: projectId || null },
      userId,
    )
    setIsSavingEdits(false)

    if (!response.success || !response.data?.[0]) {
      const errorMessage = response.error?.message ?? 'Erro desconhecido ao organizar a história.'
      setSaveMessage(`Erro ao organizar a história: ${errorMessage}`)
      return false
    }

    fillScreenWithStory(response.data[0])
    setSelectedStoryProjectId(response.data[0].project_id ?? null)
    setSaveMessage(
      response.data[0].project_id
        ? 'História organizada no projeto selecionado.'
        : 'História mantida como peça avulsa.',
    )
    await loadRecentStories()

    trackEvent({
      event_name: 'user_story_project_assigned',
      event_category: 'workspace',
      page_path: '/tool',
      metadata: { story_id: selectedStoryId, project_id: response.data[0].project_id ?? null },
    })

    return true
  }

  return {
    activeStoryTitle,
    copyMessage,
    editDraft,
    formValues,
    freeGenerationLimit: FREE_GENERATION_LIMIT,
    canEditSelectedStory,
    handleCopy,
    handleEditDraftChange,
    handleFieldChange,
    handlePromptChipApply,
    handleRefineStory,
    handleResetToCreate,
    handleAssignSelectedStoryToProject,
    handleSaveEdits,
    handleSelectHistory,
    handleSelectVersion,
    handleSubmitStory,
    hasReachedLimit,
    historyError,
    historyFilter,
    isCopying,
    isEditing,
    isLoadingRecent,
    isLoadingSelection,
    isLoadingVersions,
    isPremium,
    isSavingEdits,
    isSubmitting,
    loadRecentStories,
    previousVersion,
    recentStories,
    remainingGenerations,
    result,
    saveMessage,
    selectedStoryId,
    selectedStoryProjectId,
    selectedVersion,
    setHistoryFilter,
    usageCount,
    userPlan,
    validationErrors,
    versions,
    workspaceError,
  }
}
