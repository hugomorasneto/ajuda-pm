import { useCallback, useEffect, useMemo, useState } from 'react'
import FormUserStory from '../components/FormUserStory'
import UserStoryResult from '../components/UserStoryResult'
import UserStoriesHistory from '../components/UserStoriesHistory'
import {
  countUserStoriesByUser,
  getUserStoryById,
  listRecentUserStories,
  saveUserStory,
  updateUserStory,
} from '../services/userStoriesService'
import {
  generateUserStory,
  normalizeUserStoryGeneration,
} from '../services/userStoryGenerationService'
import { getUserProfile } from '../services/userProfilesService'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../constants/app'

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

function ToolPage() {
  const pageSize = 10
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [formValues, setFormValues] = useState({ problemContext: '', requirements: '' })
  const [validationErrors, setValidationErrors] = useState({})
  const [result, setResult] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSelection, setIsLoadingSelection] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [isCopying, setIsCopying] = useState(false)
  const [recentStories, setRecentStories] = useState([])
  const [isLoadingRecent, setIsLoadingRecent] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [selectedStoryId, setSelectedStoryId] = useState(null)
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

  const loadUsage = useCallback(async () => {
    if (!userId) return

    const [countResponse, profileResponse] = await Promise.all([
      countUserStoriesByUser(userId),
      getUserProfile(userId),
    ])

    if (countResponse.success) {
      setUsageCount(countResponse.count)
    }

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
    const response = await listRecentUserStories({
      limit: pageSize,
      sinceIso,
      offset: 0,
      userId,
    })

    if (response.success) {
      setRecentStories(response.data ?? [])
    } else {
      setHistoryError('Nao foi possivel carregar o historico agora.')
    }

    setIsLoadingRecent(false)
  }, [historyFilter, pageSize, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadRecentStories()
      loadUsage()
    }, 0)
    return () => clearTimeout(timerId)
  }, [loadRecentStories, loadUsage])

  function handleFieldChange(field, value) {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  function handleResetToCreate() {
    setSelectedStoryId(null)
    setFormValues({ problemContext: '', requirements: '' })
    setValidationErrors({})
    setResult(null)
    setSaveMessage('')
    setCopyMessage('')
  }

  async function handleSelectHistory(storyId) {
    if (!userId) return

    setIsLoadingSelection(true)
    setSelectedStoryId(storyId)
    setSaveMessage('')
    setCopyMessage('')

    const response = await getUserStoryById(storyId, userId)
    if (!response.success || !response.data) {
      setSaveMessage('Erro ao carregar historia selecionada.')
      setIsLoadingSelection(false)
      return
    }

    const mapped = mapStoryRowToGeneratedResult(response.data)
    setFormValues({
      problemContext: response.data.input_context ?? '',
      requirements: response.data.input_requirements ?? '',
    })
    setResult(mapped)
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
    } catch (error) {
      setCopyMessage('Erro ao copiar conteudo.')
      console.error('Falha ao copiar user story:', error)
    } finally {
      setIsCopying(false)
    }
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

    if (!isEditing && hasReachedLimit) {
      setSaveMessage(
        `Limite do plano free atingido (${FREE_GENERATION_LIMIT} geracoes). Atualize para premium para continuar.`,
      )
      return
    }

    setIsSubmitting(true)
    setSaveMessage('')
    setCopyMessage('')

    try {
      await new Promise((resolve) => {
        setTimeout(resolve, 450)
      })

      const generated = await generateUserStory({
        input_context: formValues.problemContext.trim(),
        input_requirements: formValues.requirements.trim(),
      })
      setResult(generated)

      const payload = {
        input_context: formValues.problemContext.trim(),
        input_requirements: formValues.requirements.trim(),
        title: generated.title,
        objective: generated.objective,
        user_story: generated.user_story,
        acceptance_criteria: toNullableText(generated.acceptance_criteria),
        business_rules: toNullableText(generated.business_rules),
        gaps: toNullableText(generated.gaps),
        qa_checklist: toNullableText(generated.qa_checklist),
        status: 'generated',
      }

      const actionResult = isEditing
        ? await updateUserStory(selectedStoryId, payload, userId)
        : await saveUserStory({ ...payload, created_at: new Date().toISOString() }, userId)

      if (actionResult.success) {
        const persisted = actionResult.data?.[0]
        if (persisted?.id) {
          setSelectedStoryId(persisted.id)
        }
        console.log(isEditing ? 'User story atualizada com sucesso.' : 'User story salva com sucesso.')
        const quality = generated?.generation_meta?.quality_score
        const qualityLabel =
          Number.isFinite(quality) && quality > 0 ? ` Qualidade IA: ${quality}/100.` : ''
        setSaveMessage(`${isEditing ? 'Atualizado com sucesso.' : 'Salvo com sucesso.'}${qualityLabel}`)
        await loadRecentStories()
        await loadUsage()
      } else {
        const errorMessage = actionResult.error?.message ?? 'Erro desconhecido ao persistir.'
        console.error('Falha ao persistir user story:', actionResult.error)
        setSaveMessage(`Erro ao salvar: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Falha ao gerar user story com IA:', error)
      setSaveMessage(`Erro ao salvar: ${error.message}`)
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
          Crie novas historias, abra itens do historico e atualize conteudo sem sair da mesma tela.
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
          {isEditing ? 'Modo editando' : 'Modo novo'}
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
        />
        <UserStoryResult
          result={result}
          saveMessage={saveMessage}
          onCopy={handleCopy}
          copyMessage={copyMessage}
          isCopying={isCopying}
          isLoadingSelectedStory={isLoadingSelection}
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
    </div>
  )
}

export default ToolPage
