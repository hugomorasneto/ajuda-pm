import { useEffect, useState } from 'react'
import StorySection from './StorySection'
import { buildStoryMarkdown, copyTextToClipboard } from '../../utils/storyExport'

const REFINEMENT_SHORTCUTS = [
  {
    label: 'Melhorar critérios',
    text: 'Deixe os critérios de aceite mais objetivos, observáveis e testáveis.',
  },
  {
    label: 'Simplificar linguagem',
    text: 'Simplifique a linguagem sem perder clareza para produto, dev e QA.',
  },
  {
    label: 'Adicionar cenários de QA',
    text: 'Inclua cenários de QA relevantes, cobrindo caminho principal, erro e exceções.',
  },
  {
    label: 'Mapear exceções',
    text: 'Mapeie exceções, restrições e dependências que ainda precisam ficar explícitas.',
  },
]

function areCriteriaEqual(current = [], original = []) {
  if (current.length !== original.length) return false
  return current.every((item, index) => item === original[index])
}

function getCompactSaveMessage(message) {
  if (!message) return ''
  if (message.includes('Primeira versão forjada e salva com sucesso')) {
    const scoreMatch = message.match(/(\d+)\/100/)
    return scoreMatch ? `Primeira versão salva · inspeção ${scoreMatch[1]}/100` : 'Primeira versão salva'
  }
  if (message.includes('Story refinada e salva como nova versão')) {
    const scoreMatch = message.match(/(\d+)\/100/)
    return scoreMatch ? `Versão refinada salva · inspeção ${scoreMatch[1]}/100` : 'Versão refinada salva'
  }
  return message
}

function StoryDocument({
  result,
  saveMessage,
  isLoadingSelectedStory,
  editDraft,
  baseContext = '',
  baseRequirements = '',
  onEditDraftChange,
  onSaveEdits,
  isSavingEdits,
  canEdit,
  onRefineStory,
  isRefining = false,
  refineRequestId = 0,
  attentionRequestId = 0,
}) {
  const [editingField, setEditingField] = useState(null)
  const [isRefineOpen, setIsRefineOpen] = useState(false)
  const [refinementText, setRefinementText] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [copyTarget, setCopyTarget] = useState(null)
  const [openDetail, setOpenDetail] = useState(null)
  const canRefine = canEdit && typeof onRefineStory === 'function'

  useEffect(() => {
    if (!result || !canRefine || refineRequestId <= 0) return
    const timerId = window.setTimeout(() => {
      setIsRefineOpen(true)
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [canRefine, refineRequestId, result])

  useEffect(() => {
    if (!result || attentionRequestId <= 0) return
    const timerId = window.setTimeout(() => {
      setOpenDetail('attention')
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [attentionRequestId, result])

  if (!result) {
    return (
      <section className="panel story-document story-document--empty">
        <div className="story-document__empty">
          <p className="story-document__eyebrow">Story ainda não gerada</p>
          <h2>A primeira versão aparece aqui pronta para inspeção.</h2>
          <p>
            Forjar gera a primeira versão estruturada da story com objetivo, critérios de aceite, trincas, regras
            de negócio e teste de resistência no mesmo documento.
          </p>
          <ul className="story-document__empty-list">
            <li>Objetivo e user story em formato legível para refinamento.</li>
            <li>Critérios de aceite organizados para inspeção com dev e QA.</li>
            <li>Trincas, regras de negócio e notas no mesmo fluxo de trabalho.</li>
          </ul>
        </div>
      </section>
    )
  }

  const acceptanceText = (editDraft.acceptance_criteria || []).join('\n')
  const titleValue = editDraft.title || result.title
  const userStoryValue = editDraft.user_story || result.user_story
  const criteriaValue =
    editDraft.acceptance_criteria?.length > 0 ? editDraft.acceptance_criteria : result.acceptance_criteria
  const currentStoryForExport = {
    ...result,
    title: titleValue,
    user_story: userStoryValue,
    acceptance_criteria: criteriaValue,
  }
  const hasOriginalContext = Boolean(baseContext?.trim() || baseRequirements?.trim())
  const hasPendingManualEdits = Boolean(
    canEdit && (
      titleValue !== result.title ||
      userStoryValue !== result.user_story ||
      !areCriteriaEqual(criteriaValue, result.acceptance_criteria)
    ),
  )
  const compactSaveMessage = getCompactSaveMessage(saveMessage)

  function renderEditButton(field) {
    if (!canEdit) return null

    return (
      <button
        type="button"
        className="btn btn-ghost btn-small"
        onClick={() => setEditingField((current) => (current === field ? null : field))}
      >
        {editingField === field ? 'Concluir edição' : 'Editar'}
      </button>
    )
  }

  async function handleRefinementSubmit(event) {
    event.preventDefault()
    const refined = await onRefineStory?.(refinementText)
    if (refined) {
      setRefinementText('')
      setIsRefineOpen(false)
    }
  }

  function handleShortcutSelect(text) {
    setRefinementText(text)
    setIsRefineOpen(true)
  }

  async function handleCopyUserStory() {
    if (!userStoryValue) return

    setCopyTarget('story')
    setCopyStatus('')
    try {
      await copyTextToClipboard(userStoryValue)
      setCopyStatus('User story copiada')
    } catch (error) {
      setCopyStatus('Não foi possível copiar a user story agora.')
      console.error('Falha ao copiar user story:', error)
    } finally {
      setCopyTarget(null)
    }
  }

  async function handleCopyMarkdown() {
    if (!currentStoryForExport) return

    setCopyTarget('markdown')
    setCopyStatus('')
    try {
      await copyTextToClipboard(buildStoryMarkdown(currentStoryForExport))
      setCopyStatus('Artefato copiado em Markdown')
    } catch (error) {
      setCopyStatus('Não foi possível copiar o artefato em Markdown agora.')
      console.error('Falha ao copiar artefato em Markdown:', error)
    } finally {
      setCopyTarget(null)
    }
  }

  const canSubmitRefinement = refinementText.trim().length > 0 && !isRefining
  const copiandoStory = copyTarget === 'story'
  const copiandoMarkdown = copyTarget === 'markdown'

  return (
    <section className="panel story-document">
      <header className="story-document__header">
        <div className="story-document__header-copy">
          <div className="story-document__status-row">
            <span className="story-document__meta-pill">Primeira versão gerada</span>
          </div>
          <h2>{titleValue}</h2>
          <p>
            Revise a user story, copie para o backlog ou refine os pontos abertos.
          </p>
        </div>

        <div className="story-document__header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={handleCopyUserStory}
            disabled={copiandoStory || copiandoMarkdown}
          >
            {copiandoStory ? 'Copiando...' : 'Copiar user story'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={handleCopyMarkdown}
            disabled={copiandoStory || copiandoMarkdown}
          >
            {copiandoMarkdown ? 'Copiando...' : 'Copiar artefato'}
          </button>

          {canRefine ? (
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => setIsRefineOpen((current) => !current)}
              aria-expanded={isRefineOpen}
              disabled={isRefining}
            >
              Refinar story
            </button>
          ) : null}

          {canEdit ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={onSaveEdits}
              disabled={isSavingEdits || isRefining || !hasPendingManualEdits}
            >
              {isSavingEdits ? 'Salvando...' : hasPendingManualEdits ? 'Salvar ajustes' : 'Salvo'}
            </button>
          ) : null}
        </div>
      </header>

      {copyStatus || compactSaveMessage ? (
        <div className="story-document__status-line" aria-live="polite">
          {copyStatus ? <p className="copy-message">{copyStatus}</p> : null}
          {compactSaveMessage ? (
            <p
              className={`save-message ${saveMessage.toLowerCase().includes('erro') ? 'save-message-error' : 'save-message-success'}`}
            >
              {compactSaveMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {canRefine && isRefineOpen ? (
        <form className="story-document__refine-panel" onSubmit={handleRefinementSubmit}>
          <div className="story-document__refine-copy">
            <p className="story-document__eyebrow">Refino</p>
            <h3>Refinar story</h3>
            <p>
              Descreva o ajuste desejado. A IA usa a matéria-prima original,
              a versão atual e as trincas existentes como referência.
            </p>
          </div>

          <label className="sr-only" htmlFor="story-refinement-feedback">
            Ajuste desejado para refinar a story
          </label>
          <textarea
            id="story-refinement-feedback"
            value={refinementText}
            onChange={(event) => setRefinementText(event.target.value)}
            placeholder="Ex: deixe os critérios mais objetivos, inclua exceções do fluxo mobile ou simplifique a linguagem."
            rows={4}
            disabled={isRefining}
          />

          <div className="story-document__refine-shortcuts" aria-label="Atalhos de refino">
            {REFINEMENT_SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                className="story-document__refine-chip"
                onClick={() => handleShortcutSelect(shortcut.text)}
                disabled={isRefining}
              >
                {shortcut.label}
              </button>
            ))}
          </div>

          <div className="story-document__refine-actions">
            <button
              type="submit"
              className="btn btn-primary btn-small"
              disabled={!canSubmitRefinement}
            >
              {isRefining ? 'Refinando story...' : 'Gerar versão refinada'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setIsRefineOpen(false)}
              disabled={isRefining}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {isLoadingSelectedStory ? (
        <p className="story-document__inline-status">Buscando peça forjada selecionada...</p>
      ) : null}

      <div className="story-document__body">
        <div className="story-document__primary-stack">
          <StorySection eyebrow="Objetivo" title="O que esta versão precisa resolver?">
            <p>{result.objective}</p>
          </StorySection>

          <StorySection
            eyebrow="User story"
            title="Formulação principal"
            emphasis
            actions={renderEditButton('user_story')}
          >
            {editingField === 'user_story' ? (
              <textarea
                rows={5}
                value={editDraft.user_story}
                onChange={(event) => onEditDraftChange('user_story', event.target.value)}
              />
            ) : (
              <p className="story-document__highlight">{userStoryValue}</p>
            )}
          </StorySection>

          <StorySection
            eyebrow="Critérios de aceite"
            title="Checklist mínimo para validar a entrega"
            emphasis
            actions={renderEditButton('acceptance_criteria')}
          >
            {editingField === 'acceptance_criteria' ? (
              <>
                <textarea
                  rows={7}
                  value={acceptanceText}
                  onChange={(event) => onEditDraftChange('acceptance_criteria', event.target.value)}
                />
                <p className="story-document__section-note">Use uma linha por critério de aceite.</p>
              </>
            ) : (
              <ol className="story-document__ordered-list">
                {criteriaValue.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ol>
            )}
          </StorySection>
        </div>

        <div className="story-document__secondary-stack" aria-label="Detalhes secundários da peça">
          <details
            className="story-document__detail"
            open={openDetail === 'attention'}
            onToggle={(event) => {
              if (event.currentTarget.open) setOpenDetail('attention')
              else if (openDetail === 'attention') setOpenDetail(null)
            }}
          >
            <summary>
              <span>
                <strong>Pontos de atenção</strong>
                <small>Trincas e decisões pendentes</small>
              </span>
              <em>{result.gaps.length > 0 ? `${result.gaps.length} pontos` : 'Sem trincas críticas'}</em>
            </summary>
            {result.gaps.length > 0 ? (
              <ul className="story-document__list">
                {result.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            ) : (
              <p className="story-document__section-note">Nenhuma trinca crítica foi identificada nesta versão.</p>
            )}
          </details>

          <details
            className="story-document__detail"
            open={openDetail === 'qa'}
            onToggle={(event) => {
              if (event.currentTarget.open) setOpenDetail('qa')
              else if (openDetail === 'qa') setOpenDetail(null)
            }}
          >
            <summary>
              <span>
                <strong>Checklist de QA</strong>
                <small>Teste de resistência da story</small>
              </span>
              <em>{result.qa_checklist.length > 0 ? `${result.qa_checklist.length} itens` : 'Não preenchido'}</em>
            </summary>
            {result.qa_checklist.length > 0 ? (
              <ul className="story-document__list">
                {result.qa_checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="story-document__section-note">O checklist de QA ainda não veio preenchido para esta versão.</p>
            )}
          </details>

          <details
            className="story-document__detail"
            open={openDetail === 'rules'}
            onToggle={(event) => {
              if (event.currentTarget.open) setOpenDetail('rules')
              else if (openDetail === 'rules') setOpenDetail(null)
            }}
          >
            <summary>
              <span>
                <strong>Regras e notas</strong>
                <small>Condições, observações e contexto de refinamento</small>
              </span>
              <em>{result.business_rules.length > 0 ? `${result.business_rules.length} regras` : 'Notas'}</em>
            </summary>
            {result.business_rules.length > 0 ? (
              <ul className="story-document__list">
                {result.business_rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            ) : null}
            {result.notes ? <p>{result.notes}</p> : null}
          </details>

          {hasOriginalContext ? (
            <details
              className="story-document__detail"
              open={openDetail === 'context'}
              onToggle={(event) => {
                if (event.currentTarget.open) setOpenDetail('context')
                else if (openDetail === 'context') setOpenDetail(null)
              }}
            >
              <summary>
                <span>
                  <strong>Contexto original</strong>
                  <small>Matéria-prima usada na forja</small>
                </span>
                <em>Recolhido</em>
              </summary>
              {baseContext?.trim() ? (
                <div className="story-document__context-block">
                  <p className="story-document__section-note">Matéria-prima</p>
                  <p>{baseContext}</p>
                </div>
              ) : null}
              {baseRequirements?.trim() ? (
                <div className="story-document__context-block">
                  <p className="story-document__section-note">Ligas e regras informadas</p>
                  <p>{baseRequirements}</p>
                </div>
              ) : null}
            </details>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default StoryDocument
