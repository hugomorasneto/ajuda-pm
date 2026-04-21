import { useCallback, useEffect, useMemo, useState } from 'react'
import FormUserStory from '../components/FormUserStory'
import UserStoryResult from '../components/UserStoryResult'
import UserStoriesHistory from '../components/UserStoriesHistory'
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
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../constants/app'
import { trackEvent } from '../services/analyticsService'

const FREE_GENERATION_LIMIT = 10

function parseTextList(value) {
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
    notes: `Status: ${story.status ?? 'generated'}`,
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
    errors.problemContext = 'Informe o contexto do problema para gerar a user story.'
  }
  if (!formValues.requirements.trim()) {
    errors.requirements = 'Informe os requisitos para montar criterios de aceitacao uteis.'
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
    `User Story: ${result.user_story}`,
    '',
    'Criterios de aceitacao:',
    ...result.acceptance_criteria.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n')
}

function formatDateTime(value) {
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

function ToolPage() {
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
  const [selectedStoryId, setSelectedStoryId] = useState(null)
  const [selectedStoryGroupId, setSelectedStoryGroupId] = useState(null)
  const [selectedBaseInput, setSelectedBaseInput] = useState({ context: '', requirements: '' })
  const [versions, setVersions] = useState([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('7d')
  const [usageCount, setUsageCount] = useState(0)
  const [userPlan, setUserPlan] = useState('free')

  const isEditing = Boolean(selectedStoryId)
  const isPremium = userPlan === 'premium'
  const remainingGenerations = Math.max(0, FREE_GENERATION_LIMIT - usageCount)
  const hasReachedLimit = !isPremium && usageCount >= FREE_GENERATION_LIMIT

  const activeStoryTitle = useMemo(() => {
    const selected = recentStories.find((item) => item.id === selectedStoryId)
    return selected?.title ?? ''
  }, [recentStories, selectedStoryId])

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
      setHistoryError('Nao foi possivel carregar o historico agora.')
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
    setFormValues((prev) => ({
      ...prev,
      problemContext: story.input_context ?? '',
      requirements: story.input_requirements ?? '',
      adjustment: '',
    }))
    setResult(mapped)
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
    setSelectedBaseInput({ context: '', requirements: '' })
    setFormValues({ problemContext: '', requirements: '', adjustment: '' })
    setValidationErrors({})
    setResult(null)
    setSaveMessage('')
    setCopyMessage('')
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
      setSaveMessage('Erro ao carregar versao selecionada.')
      setIsLoadingSelection(false)
      return
    }

    const story = response.data
    setSelectedStoryId(story.id)
    setSelectedStoryGroupId(story.story_group_id ?? story.id)
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
      setSaveMessage('Erro ao carregar historia selecionada.')
      setIsLoadingSelection(false)
      return
    }

    const story = response.data
    setSelectedStoryId(story.id)
    setSelectedStoryGroupId(story.story_group_id ?? story.id)
    setSelectedBaseInput({
      context: story.input_context ?? '',
      requirements: story.input_requirements ?? '',
    })
    fillScreenWithStory(story)
    await loadVersionsByGroup(story.story_group_id ?? story.id)
    setIsLoadingSelection(false)
  }

  async function handleCopy() {
    if (!result) return
    setIsCopying(true)
    setCopyMessage('')
    try {
      const text = buildClipboardText(result)
      await navigator.clipboard.writeText(text)
      setCopyMessage('User story copiada para a area de transferencia.')
      trackEvent({
        event_name: 'user_story_copied',
        event_category: 'workspace',
        page_path: '/tool',
        metadata: { story_id: selectedStoryId, has_story: true },
      })
    } catch (error) {
      setCopyMessage('Erro ao copiar conteudo.')
      console.error('Falha ao copiar user story:', error)
    } finally {
      setIsCopying(false)
    }
  }

  async function handleSaveEdits() {
    if (!userId || !selectedStoryId || !result) return

    const safeTitle = editDraft.title.trim()
    const safeUserStory = editDraft.user_story.trim()
    const safeCriteria = editDraft.acceptance_criteria

    if (!safeTitle || !safeUserStory || safeCriteria.length === 0) {
      setSaveMessage('Erro: titulo, user story e criterios precisam estar preenchidos.')
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
      const errorMessage = response.error?.message ?? 'Erro desconhecido ao salvar edicao.'
      setSaveMessage(`Erro ao salvar: ${errorMessage}`)
      return
    }

    fillScreenWithStory(response.data[0])
    setSaveMessage('Edicoes manuais salvas com sucesso.')
    await loadVersionsByGroup(selectedStoryGroupId)
    await loadRecentStories()

    trackEvent({
      event_name: 'user_story_updated',
      event_category: 'workspace',
      page_path: '/tool',
      metadata: { story_id: selectedStoryId, update_type: 'manual_edit' },
    })
  }

  async function handleSubmitStory() {
    if (!userId) {
      setSaveMessage('Erro ao salvar: sessao expirada. Faca login novamente.')
      return
    }

    const errors = validateForm(formValues)
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      setSaveMessage('Erro: revise os campos obrigatorios.')
      return
    }

    if (hasReachedLimit) {
      trackEvent({
        event_name: 'limit_reached_free_plan',
        event_category: 'usage',
        page_path: '/tool',
        metadata: { usage_count: usageCount, free_limit: FREE_GENERATION_LIMIT },
      })
      setSaveMessage(
        `Limite do plano free atingido (${FREE_GENERATION_LIMIT} geracoes). Atualize para premium para continuar.`,
      )
      return
    }

    setIsSubmitting(true)
    setSaveMessage('')
    setCopyMessage('')

    const contextTrimmed = formValues.problemContext.trim()
    const requirementsTrimmed = formValues.requirements.trim()
    const adjustmentTrimmed = formValues.adjustment.trim()
    const isSameBaseInput =
      selectedBaseInput.context === contextTrimmed &&
      selectedBaseInput.requirements === requirementsTrimmed
    const shouldUseCurrentGroup = isEditing && isSameBaseInput

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
        input_adjustment: adjustmentTrimmed,
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
        setSaveMessage(`Erro ao salvar: ${errorMessage}`)
        trackEvent({
          event_name: 'user_story_generate_failed',
          event_category: 'workspace',
          page_path: '/tool',
          metadata: { stage: 'persist', error_message: errorMessage },
        })
        return
      }

      const persisted = actionResult.data[0]
      setSelectedStoryId(persisted.id)
      setSelectedStoryGroupId(persisted.story_group_id ?? persisted.id)
      setSelectedBaseInput({
        context: persisted.input_context ?? contextTrimmed,
        requirements: persisted.input_requirements ?? requirementsTrimmed,
      })

      const quality = generated?.generation_meta?.quality_score
      const qualityLabel =
        Number.isFinite(quality) && quality > 0 ? ` Qualidade IA: ${quality}/100.` : ''
      setSaveMessage(`Versao salva com sucesso.${qualityLabel}`)
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
    } catch (error) {
      console.error('Falha ao gerar user story com IA:', error)
      setSaveMessage(`Erro ao salvar: ${error.message}`)
      trackEvent({
        event_name: 'user_story_generate_failed',
        event_category: 'workspace',
        page_path: '/tool',
        metadata: { stage: 'generate', error_message: error.message },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page tool-page">
      <section className="tool-header">
        <p className="eyebrow">{APP_NAME} IA - MVP</p>
        <h1>{APP_NAME} Workspace de User Stories</h1>
        <p>
          Crie historias, regenere versoes com ajuste, compare evolucoes e revise sem sair da mesma
          tela.
        </p>
      </section>

      <div className="usage-banner">
        <p>
          Plano: <strong>{isPremium ? 'Premium' : 'Free'}</strong>.{' '}
          {isPremium
            ? 'Geracoes ilimitadas.'
            : `Voce usou ${usageCount}/${FREE_GENERATION_LIMIT} geracoes (restam ${remainingGenerations}).`}
        </p>
      </div>

      <div className="tool-mode-banner">
        <span className={`mode-pill ${isEditing ? 'mode-pill-editing' : 'mode-pill-new'}`}>
          {isEditing ? 'Modo versao ativa' : 'Modo novo'}
        </span>
      </div>

      <div className="tool-grid">
        <FormUserStory
          formValues={formValues}
          validationErrors={validationErrors}
          onChange={handleFieldChange}
          onSubmit={handleSubmitStory}
          onReset={handleResetToCreate}
          isSubmitting={isSubmitting}
          isEditing={isEditing}
          activeStoryTitle={activeStoryTitle}
          hasAdjustment={Boolean(formValues.adjustment.trim())}
        />
        <UserStoryResult
          result={result}
          saveMessage={saveMessage}
          onCopy={handleCopy}
          copyMessage={copyMessage}
          isCopying={isCopying}
          isLoadingSelectedStory={isLoadingSelection}
          editDraft={editDraft}
          onEditDraftChange={handleEditDraftChange}
          onSaveEdits={handleSaveEdits}
          isSavingEdits={isSavingEdits}
          canEdit={isEditing}
        />
        <UserStoriesHistory
          items={recentStories}
          selectedId={selectedStoryId}
          isLoading={isLoadingRecent}
          onSelect={handleSelectHistory}
          loadErrorMessage={historyError}
          reloadRecent={loadRecentStories}
          filterValue={historyFilter}
          onFilterChange={setHistoryFilter}
        />
      </div>

      {isEditing ? (
        <section className="panel version-panel">
          <div className="panel-header panel-header-row">
            <h2>Versoes da mesma base</h2>
            {isLoadingVersions ? <p className="result-inline-status">Carregando versoes...</p> : null}
          </div>
          <div className="version-list">
            {versions.map((version) => (
              <button
                type="button"
                key={version.id}
                className={`history-item ${version.id === selectedStoryId ? 'history-item-active' : ''}`}
                onClick={() => handleSelectVersion(version.id)}
              >
                <p className="history-title">
                  V{version.version_number ?? '?'} - {version.title}
                </p>
                <p className="history-meta">{formatDateTime(version.created_at)}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {isEditing && selectedVersion ? (
        <section className="panel version-compare-panel">
          <div className="panel-header">
            <h2>Comparacao simples de versoes</h2>
            <p>
              Versao atual V{selectedVersion.version_number ?? '-'}
              {previousVersion ? ` comparada com V${previousVersion.version_number}` : ' sem versao anterior.'}
            </p>
          </div>
          {previousVersion ? (
            <div className="version-compare-grid">
              <article className="panel panel-muted">
                <h3>Versao anterior</h3>
                <p>
                  <strong>Titulo:</strong> {previousVersion.title}
                </p>
                <p>
                  <strong>User story:</strong> {previousVersion.user_story}
                </p>
                <p>
                  <strong>Criterios:</strong> {parseTextList(previousVersion.acceptance_criteria).join(' | ')}
                </p>
              </article>
              <article className="panel panel-muted">
                <h3>Versao atual</h3>
                <p>
                  <strong>Titulo:</strong> {selectedVersion.title}
                </p>
                <p>
                  <strong>User story:</strong> {selectedVersion.user_story}
                </p>
                <p>
                  <strong>Criterios:</strong> {parseTextList(selectedVersion.acceptance_criteria).join(' | ')}
                </p>
              </article>
            </div>
          ) : (
            <p className="history-status">Gere uma nova versao para habilitar a comparacao.</p>
          )}
        </section>
      ) : null}
    </div>
  )
}

export default ToolPage

