import { useState } from 'react'

function ProjectContextPanel({
  projects = [],
  selectedProjectId = '',
  selectedProjectName = '',
  onSelectProject,
  onCreateProject,
  onForgeStandalone,
  isCreating = false,
  isLoading = false,
  isSubmitting = false,
  hasGeneratedStory = false,
  canAssignGeneratedStory = false,
  actionMessage = '',
}) {
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const isStandalone = !selectedProjectId

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
    <section className="project-context-panel panel" aria-label="Contexto opcional de projeto">
      <div className="project-context-panel__header">
        <div>
          <p className="project-context-panel__eyebrow">Organização opcional</p>
          <h2>Projeto da história</h2>
          <p>
            Use um projeto para organizar histórias por jornada. Para começar rápido, mantenha sem projeto.
          </p>
        </div>
        <span className={`project-context-panel__status ${isStandalone ? '' : 'project-context-panel__status--active'}`}>
          {isStandalone ? 'Sem projeto' : selectedProjectName}
        </span>
      </div>

      <div className="project-context-panel__controls">
        <label className="project-context-panel__field">
          <span>Contexto</span>
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
              Forjar sem projeto
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => setIsCreatingProject((current) => !current)}
            disabled={isSubmitting}
          >
            {hasGeneratedStory && isStandalone ? 'Organizar em projeto' : 'Novo projeto'}
          </button>
        </div>
      </div>

      {hasGeneratedStory && isStandalone ? (
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
    </section>
  )
}

export default ProjectContextPanel
