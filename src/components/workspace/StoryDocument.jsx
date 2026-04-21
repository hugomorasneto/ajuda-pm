import { useState } from 'react'
import StorySection from './StorySection'

function StoryDocument({
  result,
  saveMessage,
  isLoadingSelectedStory,
  editDraft,
  onEditDraftChange,
  onSaveEdits,
  isSavingEdits,
  canEdit,
}) {
  const [editingField, setEditingField] = useState(null)

  if (!result) {
    return (
      <section className="panel story-document story-document--empty">
        <div className="story-document__empty">
          <p className="story-document__eyebrow">Documento de revisão</p>
          <h2>A user story aparece aqui com estrutura pronta para revisão.</h2>
          <p>
            Gere a primeira versão para visualizar objetivo, critérios de aceite, gaps, regras de
            negócio e checklist de QA no mesmo documento.
          </p>
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

  return (
    <section className="panel story-document">
      <header className="story-document__header">
        <div className="story-document__header-copy">
          <p className="story-document__eyebrow">Documento estruturado</p>
          <h2>{titleValue}</h2>
          <p>
            Revise o resultado antes de exportar para o backlog. O documento mantém objetivo, user
            story, critérios de aceite e pontos críticos no mesmo fluxo.
          </p>
        </div>

        <div className="story-document__header-actions">
          {canEdit ? (
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={onSaveEdits}
              disabled={isSavingEdits}
            >
              {isSavingEdits ? 'Salvando...' : 'Salvar alterações'}
            </button>
          ) : null}
        </div>
      </header>

      <div className="story-document__meta">
        <span className="story-document__meta-pill">Pronta para revisão</span>
      </div>

      {isLoadingSelectedStory ? (
        <p className="story-document__inline-status">Carregando dados da user story selecionada...</p>
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
          <StorySection eyebrow="Gaps" title="Pontos que ainda precisam de decisão">
            <ul className="story-document__list">
              {result.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </StorySection>
        ) : null}

        {result.qa_checklist.length > 0 ? (
          <StorySection eyebrow="Checklist de QA" title="Cenários que merecem validação">
            <ul className="story-document__list">
              {result.qa_checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </StorySection>
        ) : null}

        <StorySection eyebrow="Notas" title="Contexto adicional">
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
