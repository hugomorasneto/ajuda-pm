import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createProject, listProjects } from '../services/projectsService'

function formatProjectDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function ProjectsPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState('')

  const projectCountLabel = useMemo(
    () => `${projects.length} ${projects.length === 1 ? 'projeto' : 'projetos'}`,
    [projects.length],
  )

  const loadProjects = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    const response = await listProjects({ userId })
    setIsLoading(false)

    if (response.success) {
      setProjects(response.data ?? [])
      return
    }

    setMessage('Não foi possível carregar os projetos agora.')
  }, [userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjects()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjects])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Organização opcional',
      title: 'Projetos',
      pills: [
        { text: projectCountLabel },
        { text: 'Bancada continua livre' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [projectCountLabel, setTopbarStatus])

  async function handleCreateProject(event) {
    event.preventDefault()
    setMessage('')
    setIsCreating(true)

    const response = await createProject({
      name,
      description,
      userId,
    })
    setIsCreating(false)

    if (!response.success) {
      setMessage(response.error?.message ?? 'Não foi possível criar o projeto agora.')
      return
    }

    setName('')
    setDescription('')
    setMessage('Projeto criado. Você já pode selecionar esse contexto na Bancada.')
    await loadProjects()
  }

  return (
    <div className="projects-page">
      <section className="panel projects-page__hero">
        <div>
          <p className="projects-page__eyebrow">Organização opcional</p>
          <h1>Projetos</h1>
          <p>
            Agrupe histórias por jornada quando fizer sentido. Se quiser começar direto, a Bancada continua funcionando sem projeto.
          </p>
        </div>
        <Link className="btn btn-primary btn-small" to="/tool">
          Abrir Bancada
        </Link>
      </section>

      <div className="projects-page__layout">
        <section className="panel projects-page__form-card" aria-label="Criar projeto">
          <p className="projects-page__eyebrow">Novo contexto</p>
          <h2>Criar projeto</h2>
          <form className="projects-page__form" onSubmit={handleCreateProject}>
            <label className="projects-page__field">
              <span>Nome</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Onboarding de clientes"
                disabled={isCreating}
              />
            </label>

            <label className="projects-page__field">
              <span>Descrição opcional</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explique a jornada, squad ou objetivo do projeto."
                rows={4}
                disabled={isCreating}
              />
            </label>

            <button type="submit" className="btn btn-primary" disabled={isCreating}>
              {isCreating ? 'Criando projeto...' : 'Criar projeto'}
            </button>
          </form>
          {message ? <p className="projects-page__message">{message}</p> : null}
        </section>

        <section className="panel projects-page__list-card" aria-label="Lista de projetos">
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">Seus contextos</p>
              <h2>{projectCountLabel}</h2>
            </div>
          </div>

          {isLoading ? <p className="projects-page__state">Carregando projetos...</p> : null}
          {!isLoading && projects.length === 0 ? (
            <div className="projects-page__empty">
              <h3>Nenhum projeto criado ainda</h3>
              <p>Você pode continuar forjando histórias sem projeto e organizar depois.</p>
            </div>
          ) : null}

          <div className="projects-page__list">
            {projects.map((project) => (
              <article key={project.id} className="projects-page__item">
                <div>
                  <h3>{project.name}</h3>
                  {project.description ? <p>{project.description}</p> : <p>Sem descrição.</p>}
                </div>
                <div className="projects-page__item-actions">
                  <span>Criado em {formatProjectDate(project.created_at)}</span>
                  <Link className="btn btn-secondary btn-small" to={`/projetos/${project.id}`}>
                    Ver projeto
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProjectsPage
