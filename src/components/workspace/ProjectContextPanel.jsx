import { useCopy } from '../../i18n/context'
import { useState } from 'react'

function IconChevronDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ProjectContextPanel({
  projects = [],
  selectedProjectId = '',
  selectedProjectName = '',
  onSelectProject,
  onCreateProject,
  onAssignToSelectedProject,
  onForgeStandalone,
  isCreating = false,
  isLoading = false,
  isAssigning = false,
  isSubmitting = false,
  hasGeneratedStory = false,
  canAssignGeneratedStory = false,
  canAssignToSelectedProject = false,
  actionMessage = '',
}) {
  const t = useCopy('forge')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isManuallyOpen, setIsManuallyOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const isStandalone = !selectedProjectId
  const canOfferGeneratedStoryOrganization =
    hasGeneratedStory && isStandalone && canAssignGeneratedStory
  const isGeneratedAndLinked = hasGeneratedStory && !isStandalone
  const shouldAutoOpenForProject = Boolean(selectedProjectId && !hasGeneratedStory)
  const isOpen = Boolean(
    isManuallyOpen || shouldAutoOpenForProject || actionMessage || (canOfferGeneratedStoryOrganization && isCreatingProject),
  )
  const summaryTitle = hasGeneratedStory
    ? isStandalone
      ? t('standalone_artifact')
      : t('linked_project')
    : isStandalone
      ? t('link_to_a_project_optional')
      : t('selected_project')
  const summaryDescription = hasGeneratedStory
    ? isStandalone
      ? t('link_the_artifact_to_a_project')
      : t('this_artifact_already_has_a_project')
    : isStandalone
      ? t('use_a_project_to_group_stories')
      : t('change_the_project_organize_the_current')
  const hintText = canOfferGeneratedStoryOrganization
    ? t('select_or_create_a_project_to')
    : isGeneratedAndLinked
      ? t('this_artifact_already_belongs_to_a')
      : t('stories_without_a_project_are_saved')
  const panelClassName = [
    'project-context-panel panel',
    isOpen ? 'project-context-panel--open' : '',
    hasGeneratedStory ? 'project-context-panel--generated' : '',
  ].filter(Boolean).join(' ')

  async function handleCreateProject(event) {
    event.preventDefault()
    const created = await onCreateProject?.({
      name,
      description,
      shouldAssignCurrentStory: canAssignGeneratedStory,
    })

    if (created) {
      setName('')
      setDescription('')
      setIsCreatingProject(false)
    }
  }

  return (
    <section className={panelClassName} aria-label={t('optional_project_context')}>
      <button
        type="button"
        className="project-context-panel__summary"
        onClick={() => setIsManuallyOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="project-context-panel__summary-copy">
          <span className="project-context-panel__eyebrow">{t('optional_organization')}</span>
          <strong title={summaryTitle}>{summaryTitle}</strong>
          <span>{summaryDescription}</span>
        </span>
        <span className="project-context-panel__summary-meta">
          <span
            className={`project-context-panel__status ${isStandalone ? '' : 'project-context-panel__status--active'}`}
            title={isStandalone ? t('no_project') : selectedProjectName}
          >
            {isStandalone ? t('no_project') : selectedProjectName}
          </span>
          <span className={`project-context-panel__chevron ${isOpen ? 'project-context-panel__chevron--open' : ''}`}>
            <IconChevronDown />
          </span>
        </span>
      </button>

      <div className="project-context-panel__body" hidden={!isOpen}>
        <div className="project-context-panel__controls">
          <label className="project-context-panel__field">
            <span>{t('project')}</span>
            <select
              value={selectedProjectId}
              onChange={(event) => onSelectProject?.(event.target.value)}
              disabled={isLoading || isSubmitting}
            >
              <option value="">{t('no_project')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <div className="project-context-panel__actions">
            {isStandalone && !hasGeneratedStory ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={onForgeStandalone}
                disabled={isSubmitting}
              >{t('generate_without_a_project')}</button>
            ) : null}
            {canAssignToSelectedProject ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={onAssignToSelectedProject}
                disabled={isAssigning || isSubmitting}
              >
                {isAssigning ? t('organizing') : t('organize_in_this_project')}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setIsCreatingProject((current) => !current)}
              disabled={isSubmitting}
            >
              {canOfferGeneratedStoryOrganization ? t('create_a_new_project') : t('create_project')}
            </button>
          </div>
        </div>

        <p className="project-context-panel__hint">{hintText}</p>

        {isCreatingProject ? (
          <form className="project-context-panel__form" onSubmit={handleCreateProject}>
            <label className="project-context-panel__field">
              <span>{t('project_name')}</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('for_example_b2b_checkout')}
                disabled={isCreating}
              />
            </label>
            <label className="project-context-panel__field">
              <span>{t('optional_description')}</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('explain_the_purpose_of_the_project')}
                rows={3}
                disabled={isCreating}
              />
            </label>
            <div className="project-context-panel__form-actions">
              <button type="submit" className="btn btn-primary btn-small" disabled={isCreating}>
                {canAssignGeneratedStory ? t('create_and_organize_story') : t('create_project')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setIsCreatingProject(false)}
                disabled={isCreating}
              >{t('cancel')}</button>
            </div>
          </form>
        ) : null}

        {actionMessage ? <p className="project-context-panel__message">{actionMessage}</p> : null}
      </div>
    </section>
  )
}

export default ProjectContextPanel
