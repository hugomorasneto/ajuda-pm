import { useState } from 'react'
import StorySection from './StorySection'

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

function StoryDocument({
  result,
  saveMessage,
  isLoadingSelectedStory,
  editDraft,
  onEditDraftChange,
  onSaveEdits,
  isSavingEdits,
  canEdit,
  onRefineStory,
  isRefining = false,
}) {
  const [editingField, setEditingField] = useState(null)
  const [isRefineOpen, setIsRefineOpen] = useState(false)
  const [refinementText, setRefinementText] = useState('')

  if (!result) {
    return (
      <section className="panel story-document story-document--empty">
        <div className="story-document__empty">
          <p className="story-document__eyebrow">Artefato em forja</p>
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

  const canRefine = canEdit && typeof onRefineStory === 'function'
  const canSubmitRefinement = refinementText.trim().length > 0 && !isRefining

  return (
    <section className="panel story-document">
      <header className="story-document__header">
        <div className="story-document__header-copy">
          <p className="story-document__eyebrow">Artefato em inspeção</p>
          <h2>{titleValue}</h2>
          <p>
            Inspecione a qualidade, os gaps e os próximos ajustes antes de entregar ao backlog.
            O documento mantém objetivo, user story, critérios de aceite e pontos frágeis no mesmo fluxo.
          </p>
        </div>

        <div className="story-document__header-actions">
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
              disabled={isSavingEdits || isRefining}
            >
              {isSavingEdits ? 'Guardando na bancada...' : 'Salvar alterações'}
            </button>
          ) : null}
        </div>
      </header>

      <div className="story-document__meta">
        <span className="story-document__meta-pill">Primeira versão forjada</span>
      </div>

      {canRefine && isRefineOpen ? (
        <form className="story-document__refine-panel" onSubmit={handleRefinementSubmit}>
          <div className="story-document__refine-copy">
            <p className="story-document__eyebrow">Refino</p>
            <h3>Refinar story</h3>
            <p>
              Descreva o ajuste desejado. A forja usa a matéria-prima original,
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
              {isRefining ? 'Refinando na forja...' : 'Refinar na forja'}
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

        <StorySection eyebrow="Título" title="Resumo curto da user story" actions={renderEditButton('title')}>
          {editingField === 'title' ? (
            <textarea
              rows={2}
              value={editDraft.title}
              onChange={(event) => onEditDraftChange('title', event.target.value)}
            />
          ) : (
            <p>{titleValue}</p>
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

        {result.business_rules.length > 0 ? (
          <StorySection eyebrow="Regras de negócio" title="Condições que orientam a implementação">
            <ul className="story-document__list">
              {result.business_rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </StorySection>
        ) : null}

        {result.gaps.length > 0 ? (
          <StorySection eyebrow="Trincas" title="Pontos frágeis que ainda precisam de decisão">
            <p className="story-document__section-note">
              Trincas são gaps, ambiguidades e pontos frágeis da story.
            </p>
            <ul className="story-document__list">
              {result.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </StorySection>
        ) : null}

        {result.qa_checklist.length > 0 ? (
          <StorySection eyebrow="Teste de resistência" title="Cenários que sustentam desenvolvimento e QA">
            <p className="story-document__section-note">
              Teste de resistência é o checklist de QA e cenários de validação.
            </p>
            <ul className="story-document__list">
              {result.qa_checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </StorySection>
        ) : null}

        <StorySection eyebrow="Notas" title="Observações adicionais">
          <p>{result.notes}</p>
        </StorySection>
      </div>

      {saveMessage ? (
        <div className="story-document__footer">
          <p
            className={`save-message ${saveMessage.toLowerCase().includes('erro') ? 'save-message-error' : 'save-message-success'}`}
          >
            {saveMessage}
          </p>
        </div>
      ) : null}
    </section>
  )
}

export default StoryDocument
