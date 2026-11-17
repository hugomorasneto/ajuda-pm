import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getUserStoryById,
  listRecentStoryGroups,
  listStoryVersions,
  updateUserStory,
  updateUserStoryEstimationStatus,
} from '../services/userStoriesService'
import {
  generateUserStory,
  getStoryGenerationUsage,
  normalizeUserStoryGeneration,
} from '../services/userStoryGenerationService'
import { useAuth } from './useAuth'
import { trackEvent } from '../services/analyticsService'
import {
  FREE_GENERATION_LIMIT,
  getRemainingForgeGenerations,
} from '../constants/app'
import { defaultStoryFormat } from '../utils/storyFormat'
import { copyTextToClipboard } from '../utils/storyExport'

const generationErrorKeys = {
  INVALID_INPUT: 'generation_invalid',
  AUTH_REQUIRED: 'your_session_has_expired_sign_in',
  RATE_LIMIT: 'generation_busy',
  PROVIDER_UNAVAILABLE: 'generation_provider',
  TIMEOUT: 'generation_timeout',
  NETWORK: 'generation_network',
  SAVE_FAILED: 'version_save_failed',
  GENERATION_IN_PROGRESS: 'generation_in_progress',
  TARGET_UNAVAILABLE: 'generation_target_unavailable',
  REQUEST_CONFLICT: 'generation_retry',
  RESERVATION_EXPIRED: 'generation_retry',
  STORY_REMOVED: 'generation_target_unavailable',
}

export function parseTextList(value) {
  if (!value) return []
  return String(value)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function mapStoryRowToGeneratedResult(story) {
  return {
    ...normalizeUserStoryGeneration({
      title: story.title,
      objective: story.objective,
      user_story: story.user_story,
      acceptance_criteria: parseTextList(story.acceptance_criteria),
      business_rules: parseTextList(story.business_rules),
      gaps: parseTextList(story.gaps),
      qa_checklist: parseTextList(story.qa_checklist),
      generation_meta: {
        generated_by: 'history',
        model_used: null,
        quality_score: null,
        guardrails_applied: false,
      },
    }),
    storedStatus: story.status ?? 'generated',
  }
}


function validateForm(formValues) {
  const errors = {}
  if (!formValues.problemContext.trim()) {
    errors.problemContext = 'enter_the_brief_before_generating_a'
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

function buildClipboardText(result, t) {
  return [
    `${t('user_story')}: ${result.user_story}`,
    '',
    t('criteria') + ':',
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

export function formatDateTime(value, locale = 'pt-BR') {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function useUserStoryWorkspace(storyFormat = defaultStoryFormat) {
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
  const [selectedStoryEstimationStatus, setSelectedStoryEstimationStatus] = useState(null)
  const [selectedStoryTitle, setSelectedStoryTitle] = useState('')
  const [selectedBaseInput, setSelectedBaseInput] = useState({ context: '', requirements: '' })
  const [versions, setVersions] = useState([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('7d')
  const [accountUsage, setAccountUsage] = useState(null)
  const usage = accountUsage?.userId === userId ? accountUsage.data : null
  const isSubmittingRef = useRef(false)
  const pendingGeneration = useRef(null)
  const usageCount = usage?.usage_count ?? 0
  const userPlan = usage?.plan ?? 'free'
  const effectiveForgeLimit = usage ? usage.effective_limit : FREE_GENERATION_LIMIT

  const isEditing = Boolean(selectedStoryId)
  const canEditSelectedStory = Boolean(isEditing && selectedStoryOwnerId === userId)
  const isPremium = userPlan === 'premium'
  const remainingGenerations = getRemainingForgeGenerations({
    usageCount,
    forgeLimit: effectiveForgeLimit,
  })
  const hasReachedLimit = effectiveForgeLimit !== null && usageCount >= effectiveForgeLimit

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

    const serverUsage = await getStoryGenerationUsage()
    if (serverUsage) {
      setAccountUsage({ userId, data: serverUsage })
    } else {
      setWorkspaceError('generation_usage_unavailable')
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
      setHistoryError('could_not_load_story_history_try')
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
    setSelectedStoryEstimationStatus(story.estimation_status ?? 'created')
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
    setSelectedStoryEstimationStatus(null)
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
    setWorkspaceError('')

    const response = await getUserStoryById(storyId, userId)
    if (!response.success || !response.data) {
      setWorkspaceError('could_not_load_the_selected_version')
      setSaveMessage({ key: 'error_loading_the_selected_version', tone: 'error' })
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
    setWorkspaceError('')

    const response = await getUserStoryById(storyId, userId)
    if (!response.success || !response.data) {
      setWorkspaceError('could_not_load_the_selected_user')
      setSaveMessage({ key: 'error_loading_the_selected_user_story', tone: 'error' })
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
      const text = buildClipboardText(sourceStory, storyFormat)
      await copyTextToClipboard(text)
      setCopyMessage('artifact_copied_to_the_clipboard')
      trackEvent({
        event_name: 'user_story_copied',
        event_category: 'workspace',
        page_path: '/tool',
        metadata: { story_id: selectedStoryId, has_story: true },
      })
    } catch (error) {
      setCopyMessage('could_not_copy_the_content')
      console.error('Falha ao copiar user story:', error)
    } finally {
      setIsCopying(false)
    }
  }

  async function handleSaveEdits() {
    if (!userId || !selectedStoryId || !result) return
    if (!canEditSelectedStory) {
      setSaveMessage({ key: 'only_the_story_s_author_can_3', tone: 'error' })
      return
    }

    const safeTitle = editDraft.title.trim()
    const safeUserStory = editDraft.user_story.trim()
    const safeCriteria = editDraft.acceptance_criteria

    if (!safeTitle || !safeUserStory || safeCriteria.length === 0) {
      setSaveMessage({ key: 'enter_a_title_user_story_and', tone: 'error' })
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
      setSaveMessage({ key: 'version_save_failed', tone: 'error' })
      return
    }

    fillScreenWithStory(response.data[0])
    setSaveMessage('changes_saved')
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
    if (isSubmittingRef.current) return false

    const adjustmentOverride =
      typeof options.adjustment === 'string' ? options.adjustment : null
    const formValuesForSubmit = adjustmentOverride === null
      ? formValues
      : { ...formValues, adjustment: adjustmentOverride }

    if (!userId) {
      setWorkspaceError('your_session_has_expired_sign_in')
      setSaveMessage({ key: 'session_expired_sign_in_again', tone: 'error' })
      return false
    }

    const errors = validateForm(formValuesForSubmit)
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      setSaveMessage({ key: 'check_the_brief_before_generating_a', tone: 'error' })
      return false
    }

    isSubmittingRef.current = true
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

      const input = {
        input_context: contextTrimmed,
        input_requirements: requirementsTrimmed,
        input_adjustment: generationAdjustment,
        regeneration_instruction: adjustmentTrimmed || null,
        project_id: shouldUseCurrentGroup ? selectedStoryProjectId : options.projectId || null,
        previous_version_id: shouldUseCurrentGroup ? selectedStoryId : null,
      }
      const pendingInput = JSON.stringify([userId, input])
      if (pendingGeneration.current?.input !== pendingInput) {
        pendingGeneration.current = { input: pendingInput, id: crypto.randomUUID() }
      }
      const { generated, story: persisted } = await generateUserStory({
        ...input,
        request_id: pendingGeneration.current.id,
      })
      pendingGeneration.current = null
      setResult(generated)
      setEditDraft({
        title: generated.title,
        user_story: generated.user_story,
        acceptance_criteria: [...generated.acceptance_criteria],
      })

      setSelectedStoryId(persisted.id)
      setSelectedStoryGroupId(persisted.story_group_id ?? persisted.id)
      setSelectedStoryOwnerId(persisted.user_id ?? userId)
      setSelectedStoryProjectId(persisted.project_id ?? null)
      setSelectedStoryEstimationStatus(persisted.estimation_status ?? 'created')
      setSelectedStoryTitle(persisted.title ?? generated.title ?? '')
      setSelectedBaseInput({
        context: persisted.input_context ?? contextTrimmed,
        requirements: persisted.input_requirements ?? requirementsTrimmed,
      })

      const quality = generated?.generation_meta?.quality_score
      const savedKey = shouldUseCurrentGroup ? 'refined_version' : 'first_version'
      setSaveMessage(Number.isFinite(quality) && quality > 0
        ? { key: savedKey + '_score', values: { score: quality } }
        : savedKey + '_saved')
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
      if (error?.code === 'QUOTA_EXHAUSTED' && error.details.usage) {
        const serverUsage = error.details.usage
        setAccountUsage({ userId, data: serverUsage })
        const notice = {
          key: serverUsage.plan === 'free' && serverUsage.forge_limit_override === null
            ? 'you_have_reached_the_free_plan'
            : 'you_have_reached_your_limit_of',
          values: { p1: serverUsage.effective_limit },
          quotaReached: true,
          tone: 'error',
        }
        setWorkspaceError(notice)
        setSaveMessage(notice)
        trackEvent({
          event_name: 'limit_reached_free_plan',
          event_category: 'usage',
          page_path: '/tool',
          metadata: serverUsage,
        })
        return false
      }
      if (error?.code === 'REQUEST_CONFLICT' || error?.code === 'STORY_REMOVED') {
        pendingGeneration.current = null
      }
      console.error('Falha ao gerar user story com IA:', error)
      const notice = {
        key: generationErrorKeys[error?.code] ?? 'could_not_generate_a_story_try',
        keepDraft: true,
        tone: 'error',
      }
      setWorkspaceError(notice)
      setSaveMessage(notice)
      trackEvent({
        event_name: 'user_story_generate_failed',
        event_category: 'workspace',
        page_path: '/tool',
        metadata: {
          stage: error?.code === 'SAVE_FAILED' ? 'persist' : 'generate',
          error_code: error instanceof Error ? error.code ?? null : null,
          error_message: error instanceof Error ? error.message : 'unknown_error',
        },
      })
      return false
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  async function handleRefineStory(instruction) {
    const adjustment = String(instruction ?? '').trim()
    if (!adjustment) {
      setSaveMessage({ key: 'describe_the_change_you_want_before', tone: 'error' })
      return false
    }

    if (!result) {
      setSaveMessage({ key: 'generate_a_story_before_refining_it', tone: 'error' })
      return false
    }

    if (!canEditSelectedStory) {
      setSaveMessage({ key: 'only_the_story_s_author_can_4', tone: 'error' })
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
      setSaveMessage({ key: 'project_assignment_failed', tone: 'error' })
      return false
    }

    fillScreenWithStory(response.data[0])
    setSelectedStoryProjectId(response.data[0].project_id ?? null)
    setSelectedStoryEstimationStatus(response.data[0].estimation_status ?? 'created')
    setSaveMessage(
      response.data[0].project_id
        ? 'story_organized_in_the_selected_project'
        : 'story_kept_as_a_standalone_artifact',
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

  async function handleUpdateSelectedStoryEstimationStatus(nextStatus) {
    if (!userId || !selectedStoryId) return false

    if (!canEditSelectedStory) {
      setSaveMessage({ key: 'only_the_story_s_author_can_5', tone: 'error' })
      return false
    }

    if (selectedStoryEstimationStatus === nextStatus) {
      return true
    }

    setIsSavingEdits(true)
    const response = await updateUserStoryEstimationStatus({
      storyId: selectedStoryId,
      estimationStatus: nextStatus,
      userId,
    })
    setIsSavingEdits(false)

    if (!response.success) {
      setSaveMessage({ key: 'could_not_prepare_the_story_for', tone: 'error' })
      return false
    }

    setSelectedStoryEstimationStatus(response.data?.estimation_status ?? nextStatus)
    setSaveMessage('story_marked_as_ready_for_estimation')
    await loadRecentStories()
    await loadVersionsByGroup(selectedStoryGroupId)

    trackEvent({
      event_name: 'user_story_estimation_status_updated',
      event_category: 'workspace',
      page_path: '/tool',
      metadata: { story_id: selectedStoryId, estimation_status: nextStatus },
    })

    return true
  }

  return {
    activeStoryTitle,
    copyMessage,
    editDraft,
    formValues,
    freeGenerationLimit: FREE_GENERATION_LIMIT,
    effectiveForgeLimit,
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
    handleUpdateSelectedStoryEstimationStatus,
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
    selectedStoryEstimationStatus,
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
