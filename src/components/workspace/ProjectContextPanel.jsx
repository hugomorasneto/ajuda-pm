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
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isManuallyOpen, setIsManuallyOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const isStandalone = !selectedProjectId
  const canOfferGeneratedStoryOrganization =
    hasGeneratedStory && isStandalone && canAssignGeneratedStory
  const shouldAutoOpenForProject = Boolean(selectedProjectId && !hasGeneratedStory)
  const isOpen = Boolean(
    isManuallyOpen || shouldAutoOpenForProject || actionMessage || (canOfferGeneratedStoryOrganization && isCreatingProject),
  )
  const summaryTitle = isStandalone ? 'Vincular a um projeto (opcional)' : 'Projeto selecionado'
  const summaryDescription = isStandalone
    ? 'Use um projeto para organizar histórias por jornada ou iniciativa. Você também pode forjar sem projeto.'
    : 'Use esta área para trocar o projeto, organizar a história atual ou criar um novo contexto.'

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
    <section className={`project-context-panel panel ${isOpen ? 'project-context-panel--open' : ''}`} aria-label="Contexto opcional de projeto">
      <button
        type="button"
        className="project-context-panel__summary"
        onClick={() => setIsManuallyOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="project-context-panel__summary-copy">
          <span className="project-context-panel__eyebrow">Organização opcional</span>
          <strong>{summaryTitle}</strong>
          <span>{summaryDescription}</span>
        </span>
        <span className="project-context-panel__summary-meta">
          <span
            className={`project-context-panel__status ${isStandalone ? '' : 'project-context-panel__status--active'}`}
            title={isStandalone ? 'Sem projeto' : selectedProjectName}
          >
            {isStandalone ? 'Sem projeto' : selectedProjectName}
          </span>
          <span className={`project-context-panel__chevron ${isOpen ? 'project-context-panel__chevron--open' : ''}`}>
            <IconChevronDown />
          </span>
        </span>
      </button>

      <div className="project-context-panel__body" hidden={!isOpen}>
        <div className="project-context-panel__controls">
          <label className="project-context-panel__field">
            <span>Projeto</span>
            <select
              value={selectedProjectId}
              onChange={(event) => onSelectProject?.(event.target.value)}
              disabled={isLoading || isSubmitting}
            >
              <option value="">Sem projeto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <div className="project-context-panel__actions">
            {isStandalone ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={onForgeStandalone}
                disabled={isSubmitting}
              >
                Gerar sem projeto
              </button>
            ) : null}
            {canAssignToSelectedProject ? (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={onAssignToSelectedProject}
                disabled={isAssigning || isSubmitting}
              >
                {isAssigning ? 'Organizando...' : 'Organizar neste projeto'}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setIsCreatingProject((current) => !current)}
              disabled={isSubmitting}
            >
              {canOfferGeneratedStoryOrganization ? 'Organizar em projeto' : 'Criar projeto'}
            </button>
          </div>
        </div>

        {canOfferGeneratedStoryOrganization ? (
          <p className="project-context-panel__hint">
            Quer organizar essa história em um projeto? Crie um projeto agora ou siga com a peça avulsa.
          </p>
        ) : (
          <p className="project-context-panel__hint">
            Histórias sem projeto continuam salvas na sua conta e aparecem no histórico como peças avulsas.
          </p>
        )}

        {isCreatingProject ? (
          <form className="project-context-panel__form" onSubmit={handleCreateProject}>
            <label className="project-context-panel__field">
              <span>Nome do projeto</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Checkout B2B"
                disabled={isCreating}
              />
            </label>
            <label className="project-context-panel__field">
              <span>Descrição opcional</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explique o objetivo do projeto em poucas linhas."
                rows={3}
                disabled={isCreating}
              />
            </label>
            <div className="project-context-panel__form-actions">
              <button type="submit" className="btn btn-primary btn-small" disabled={isCreating}>
                {canAssignGeneratedStory ? 'Criar e organizar história' : 'Criar projeto'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setIsCreatingProject(false)}
                disabled={isCreating}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {actionMessage ? <p className="project-context-panel__message">{actionMessage}</p> : null}
      </div>
    </section>
  )
}

export default ProjectContextPanel
