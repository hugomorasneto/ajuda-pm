import { useCopy } from '../../i18n/context'
import { formatNotice } from '../../i18n/formatNotice'
import { resolveStoryNotes } from '../../utils/storyFormat'
import { useEffect, useState } from 'react'
import StorySection from './StorySection'
import { buildStoryMarkdown, copyTextToClipboard } from '../../utils/storyExport'

const REFINEMENT_SHORTCUTS = [
  {
    label: 'improve_criteria',
    text: 'make_the_acceptance_criteria_more_specific',
  },
  {
    label: 'simplify_wording',
    text: 'simplify_the_wording_while_keeping_it',
  },
  {
    label: 'add_qa_scenarios',
    text: 'add_relevant_qa_scenarios_for_the',
  },
  {
    label: 'identify_exceptions',
    text: 'identify_exceptions_constraints_and_dependencies_that',
  },
]

function areCriteriaEqual(current = [], original = []) {
  if (current.length !== original.length) return false
  return current.every((item, index) => item === original[index])
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
  const t = useCopy('forge')
  const storyFormat = useCopy('storyFormat')
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
          <p className="story-document__eyebrow">{t('story_not_yet_generated')}</p>
          <h2>{t('the_first_version_appears_here_ready')}</h2>
          <p>{t('generate_a_structured_first_version_with')}</p>
          <ul className="story-document__empty-list">
            <li>{t('a_clear_goal_and_user_story')}</li>
            <li>{t('acceptance_criteria_ready_to_review_with')}</li>
            <li>{t('gaps_business_rules_and_notes_in')}</li>
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
  const notes = resolveStoryNotes(result, storyFormat)
  const hasOriginalContext = Boolean(baseContext?.trim() || baseRequirements?.trim())
  const hasPendingManualEdits = Boolean(
    canEdit && (
      titleValue !== result.title ||
      userStoryValue !== result.user_story ||
      !areCriteriaEqual(criteriaValue, result.acceptance_criteria)
    ),
  )
  const compactSaveMessage = formatNotice(t, saveMessage)

  function renderEditButton(field) {
    if (!canEdit) return null

    return (
      <button
        type="button"
        className="btn btn-ghost btn-small"
        onClick={() => setEditingField((current) => (current === field ? null : field))}
      >
        {editingField === field ? t('done_editing') : t('edit')}
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
      setCopyStatus('user_story_copied')
    } catch (error) {
      setCopyStatus('could_not_copy_the_user_story')
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
      await copyTextToClipboard(buildStoryMarkdown(currentStoryForExport, storyFormat))
      setCopyStatus('artifact_copied_as_markdown')
    } catch (error) {
      setCopyStatus('could_not_copy_the_markdown_artifact')
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
            <span className="story-document__meta-pill">{t('first_version_generated')}</span>
          </div>
          <h2>{titleValue}</h2>
          <p>{t('review_the_user_story_copy_it')}</p>
        </div>

        <div className="story-document__header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={handleCopyUserStory}
            disabled={copiandoStory || copiandoMarkdown}
          >
            {copiandoStory ? t('copying') : t('copy_user_story')}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={handleCopyMarkdown}
            disabled={copiandoStory || copiandoMarkdown}
          >
            {copiandoMarkdown ? t('copying') : t('copy_artifact')}
          </button>

          {canRefine ? (
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => setIsRefineOpen((current) => !current)}
              aria-expanded={isRefineOpen}
              disabled={isRefining}
            >{t('refine_story')}</button>
          ) : null}

          {canEdit && (hasPendingManualEdits || isSavingEdits) ? (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={onSaveEdits}
              disabled={isSavingEdits || isRefining}
            >
              {isSavingEdits ? t('saving') : t('save_changes')}
            </button>
          ) : null}

          {canEdit && !hasPendingManualEdits && !isSavingEdits ? (
            <span className="story-document__save-status" aria-live="polite">{t('saved_automatically')}</span>
          ) : null}
        </div>
      </header>

      {copyStatus || compactSaveMessage ? (
        <div className="story-document__status-line" aria-live="polite">
          {copyStatus ? <p className="copy-message">{t(copyStatus)}</p> : null}
          {compactSaveMessage ? (
            <p
              className={`save-message ${saveMessage?.tone === 'error' ? 'save-message-error' : 'save-message-success'}`}
            >
              {compactSaveMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {canRefine && isRefineOpen ? (
        <form className="story-document__refine-panel" onSubmit={handleRefinementSubmit}>
          <div className="story-document__refine-copy">
            <p className="story-document__eyebrow">{t('refinement')}</p>
            <h3>{t('refine_story')}</h3>
            <p>{t('describe_the_change_you_want_ai')}</p>
          </div>

          <label className="sr-only" htmlFor="story-refinement-feedback">{t('changes_to_make_in_this_refinement')}</label>
          <textarea
            id="story-refinement-feedback"
            value={refinementText}
            onChange={(event) => setRefinementText(event.target.value)}
            placeholder={t('for_example_make_the_criteria_more')}
            rows={4}
            disabled={isRefining}
          />

          <div className="story-document__refine-shortcuts" aria-label={t('refinement_shortcuts')}>
            {REFINEMENT_SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                className="story-document__refine-chip"
                onClick={() => handleShortcutSelect(t(shortcut.text))}
                disabled={isRefining}
              >
                {t(shortcut.label)}
              </button>
            ))}
          </div>

          <div className="story-document__refine-actions">
            <button
              type="submit"
              className="btn btn-primary btn-small"
              disabled={!canSubmitRefinement}
            >
              {isRefining ? t('refining_story') : t('generate_refined_version')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setIsRefineOpen(false)}
              disabled={isRefining}
            >{t('cancel')}</button>
          </div>
        </form>
      ) : null}

      {isLoadingSelectedStory ? (
        <p className="story-document__inline-status">{t('loading_the_selected_artifact')}</p>
      ) : null}

      <div className="story-document__body">
        <div className="story-document__primary-stack">
          <StorySection eyebrow={t('goal')} title={t('what_should_this_version_solve')}>
            <p>{result.objective}</p>
          </StorySection>

          <StorySection
            eyebrow={t('user_story')}
            title={t('main_statement')}
            emphasis
            actions={renderEditButton('user_story')}
          >
            {editingField === 'user_story' ? (
              <textarea
                rows={5}
                aria-label={t('edit_user_story')}
                value={editDraft.user_story}
                onChange={(event) => onEditDraftChange('user_story', event.target.value)}
              />
            ) : (
              <p className="story-document__highlight">{userStoryValue}</p>
            )}
          </StorySection>

          <StorySection
            eyebrow={t('acceptance_criteria')}
            title={t('minimum_checklist_for_validating_the_delivery')}
            emphasis
            actions={renderEditButton('acceptance_criteria')}
          >
            {editingField === 'acceptance_criteria' ? (
              <>
                <textarea
                  rows={7}
                  aria-label={t('edit_acceptance_criteria')}
                  value={acceptanceText}
                  onChange={(event) => onEditDraftChange('acceptance_criteria', event.target.value)}
                />
                <p className="story-document__section-note">{t('use_one_line_per_acceptance_criterion')}</p>
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

        <div className="story-document__secondary-stack" aria-label={t('additional_artifact_details')}>
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
                <strong>{t('points_to_review')}</strong>
                <small>{t('gaps_and_pending_decisions')}</small>
              </span>
              <em>{result.gaps.length > 0 ? t('points', { p1: result.gaps.length }) : t('no_critical_gaps')}</em>
            </summary>
            {result.gaps.length > 0 ? (
              <ul className="story-document__list">
                {result.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            ) : (
              <p className="story-document__section-note">{t('this_version_has_no_identified_critical')}</p>
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
                <strong>{t('qa_checklist')}</strong>
                <small>{t('qa_checks_for_the_story')}</small>
              </span>
              <em>{result.qa_checklist.length > 0 ? t('items', { p1: result.qa_checklist.length }) : t('not_provided')}</em>
            </summary>
            {result.qa_checklist.length > 0 ? (
              <ul className="story-document__list">
                {result.qa_checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="story-document__section-note">{t('this_version_has_no_qa_checklist')}</p>
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
                <strong>{t('rules_and_notes')}</strong>
                <small>{t('conditions_observations_and_refinement_context')}</small>
              </span>
              <em>{result.business_rules.length > 0 ? t('rules', { p1: result.business_rules.length }) : t('notes')}</em>
            </summary>
            {result.business_rules.length > 0 ? (
              <ul className="story-document__list">
                {result.business_rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            ) : null}
            {notes ? <p>{notes}</p> : null}
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
                  <strong>{t('original_context')}</strong>
                  <small>{t('brief_used_to_generate_the_story_2')}</small>
                </span>
                <em>{t('available')}</em>
              </summary>
              {baseContext?.trim() ? (
                <div className="story-document__context-block">
                  <p className="story-document__section-note">{t('brief')}</p>
                  <p>{baseContext}</p>
                </div>
              ) : null}
              {baseRequirements?.trim() ? (
                <div className="story-document__context-block">
                  <p className="story-document__section-note">{t('provided_rules_and_constraints')}</p>
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
