import { useCopy, useLanguage } from '../i18n/context'
import { teamOperationMessage, renderTeamMessage } from '../utils/teamMessages'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from '../i18n/LocalizedLink'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import TeamMembersPanel from '../components/projects/TeamMembersPanel'
import { useAuth } from '../hooks/useAuth'
import { checkCanManageProject, listProjects } from '../services/projectsService'
import { createTeam, listTeamsByProject } from '../services/teamsService'

function TimesPage() {
  const t = useCopy('teams')
  const { language } = useLanguage()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const createSectionRef = useRef(null)
  const projectIdFromUrl = searchParams.get('projectId') ?? ''
  const [projects, setProjects] = useState([])
  const [teamsByProject, setTeamsByProject] = useState({})
  const [canManageProjectById, setCanManageProjectById] = useState({})
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromUrl)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlySelectedProject, setShowOnlySelectedProject] = useState(Boolean(projectIdFromUrl))
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState(null)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const teamCount = useMemo(
    () =>
      Object.values(teamsByProject).reduce(
        (total, projectTeams) => total + (Array.isArray(projectTeams) ? projectTeams.length : 0),
        0,
      ),
    [teamsByProject],
  )
  const collaborationLabel = t('collaborationLayer')
  const title = t('title')
  const teamCountLabel = t('teamCount', { count: teamCount })
  const projectCountLabel = t('projectCount', { count: projects.length })
  const projectsWithTeamsCount = useMemo(
    () =>
      projects.filter((project) => {
        const projectTeams = teamsByProject[project.id] ?? []
        return projectTeams.length > 0
      }).length,
    [projects, teamsByProject],
  )
  const manageableProjectCount = useMemo(
    () => projects.filter((project) => canManageProjectById[project.id]).length,
    [canManageProjectById, projects],
  )
  const visibleProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR')

    return projects.filter((project) => {
      if (showOnlySelectedProject && selectedProjectId && project.id !== selectedProjectId) {
        return false
      }

      if (!normalizedSearch) return true

      const projectTeams = teamsByProject[project.id] ?? []
      const projectText = [project.name, project.description].join(' ').toLocaleLowerCase('pt-BR')
      const teamsText = projectTeams
        .map((team) => [team.name, team.description].join(' '))
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      return projectText.includes(normalizedSearch) || teamsText.includes(normalizedSearch)
    })
  }, [projects, searchTerm, selectedProjectId, showOnlySelectedProject, teamsByProject])
  const visibleTeamCount = useMemo(
    () =>
      visibleProjects.reduce((total, project) => {
        const projectTeams = teamsByProject[project.id] ?? []
        return total + projectTeams.length
      }, 0),
    [teamsByProject, visibleProjects],
  )
  const visibleTeamCountLabel = t('visibleTeams', { count: visibleTeamCount })
  const visibleProjectCountLabel = t('visibleProjects', { count: visibleProjects.length })
  const selectedProjectTeamCount = selectedProject
    ? (teamsByProject[selectedProject.id] ?? []).length
    : 0
  const canCreateForSelectedProject = Boolean(
    selectedProjectId && canManageProjectById[selectedProjectId],
  )
  const hasFilteredNoResults = !isLoading && projects.length > 0 && visibleProjects.length === 0

  const loadTeams = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    const projectsResponse = await listProjects({ userId })

    if (!projectsResponse.success) {
      setProjects([])
      setTeamsByProject({})
      setCanManageProjectById({})
      setMessage({ key: 'loadFailed' })
      setIsLoading(false)
      return
    }

    const nextProjects = projectsResponse.data ?? []
    const entries = await Promise.all(
      nextProjects.map(async (project) => {
        const [teamsResponse, manageResponse] = await Promise.all([
          listTeamsByProject({ projectId: project.id, userId }),
          checkCanManageProject({ projectId: project.id, userId }),
        ])

        return [
          project.id,
          {
            canManage: manageResponse.success ? Boolean(manageResponse.data) : false,
            teams: teamsResponse.success ? (teamsResponse.data ?? []) : [],
          },
        ]
      }),
    )
    const nextTeamsByProject = Object.fromEntries(
      entries.map(([projectId, data]) => [projectId, data.teams]),
    )
    const nextCanManageProjectById = Object.fromEntries(
      entries.map(([projectId, data]) => [projectId, data.canManage]),
    )
    const fallbackProjectId = nextProjects[0]?.id ?? ''
    const requestedProjectIsAvailable = nextProjects.some((project) => project.id === projectIdFromUrl)
    const nextSelectedProjectId = requestedProjectIsAvailable ? projectIdFromUrl : fallbackProjectId

    setProjects(nextProjects)
    setTeamsByProject(nextTeamsByProject)
    setCanManageProjectById(nextCanManageProjectById)
    setSelectedProjectId((current) =>
      nextProjects.some((project) => project.id === current) ? current : nextSelectedProjectId,
    )
    setIsLoading(false)
  }, [projectIdFromUrl, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadTeams()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadTeams])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: collaborationLabel,
      title,
      pills: [
        { text: teamCountLabel },
        { text: projectCountLabel },
      ],
    })

    return () => setTopbarStatus(null)
  }, [collaborationLabel, projectCountLabel, setTopbarStatus, teamCountLabel, title])

  function handleProjectSelection(projectId) {
    setSelectedProjectId(projectId)
    const next = new URLSearchParams(searchParams)
    if (projectId) next.set('projectId', projectId)
    else next.delete('projectId')
    navigate({ pathname: location.pathname, search: next.toString(), hash: location.hash }, {
      replace: true,
      state: location.state,
    })
  }

  function handleSelectProjectForCreation(projectId) {
    handleProjectSelection(projectId)
    setShowOnlySelectedProject(true)
    setMessage({ key: 'projectChosen' })
    window.requestAnimationFrame(() => {
      createSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleCreateTeam(event) {
    event.preventDefault()
    setMessage(null)

    if (!selectedProjectId) {
      setMessage({ key: 'chooseProject' })
      return
    }

    if (!canCreateForSelectedProject) {
      setMessage({ key: 'noCreatePermission' })
      return
    }

    setIsCreating(true)
    const response = await createTeam({
      projectId: selectedProjectId,
      name,
      description,
      userId,
    })
    setIsCreating(false)

    if (!response.success) {
      setMessage(teamOperationMessage(response.error, 'createFailed'))
      return
    }

    setName('')
    setDescription('')
    setMessage({ key: 'created' })
    await loadTeams()
  }

  return (
    <div className="projects-page teams-page">
      <section className="panel projects-page__hero">
        <div className="projects-page__hero-copy">
          <p className="projects-page__eyebrow">{t('collaborationLayer')}</p>
          <h1>{t('title')}</h1>
          <p>
            {t('intro')}
          </p>
          <div className="projects-page__hero-indicators" aria-label={t('overviewLabel')}>
            <span className="projects-page__indicator">
              <strong>{teamCount}</strong>
              {t('unit', { count: teamCount })}
            </span>
            <span className="projects-page__indicator projects-page__indicator--free">
              {t('linked')}
            </span>
          </div>
        </div>
        <div className="projects-page__hero-actions">
          <Link className="btn btn-secondary btn-small" to="/projetos">
            {t('viewProjects')}
          </Link>
        </div>
      </section>

      <section className="teams-page__overview" aria-label={t('operationsLabel')}>
        <article className="teams-page__overview-card teams-page__overview-card--primary">
          <span>{t('collaboration')}</span>
          <strong>{teamCount}</strong>
          <p>{t('ready', { count: teamCount })}</p>
        </article>
        <article className="teams-page__overview-card">
          <span>{t('projectsWithTeams')}</span>
          <strong>{projectsWithTeamsCount}</strong>
          <p>{t('withTeamDescription')}</p>
        </article>
        <article className="teams-page__overview-card">
          <span>{t('management')}</span>
          <strong>{manageableProjectCount}</strong>
          <p>{t('managementDescription')}</p>
        </article>
        <article className="teams-page__overview-card">
          <span>{t('recommended')}</span>
          <strong>{t('project')}</strong>
          <p>{t('recommendation')}</p>
        </article>
      </section>

      {projectIdFromUrl && selectedProject ? (
        <section className="panel teams-page__context" aria-label={t('focused')}>
          <div className="teams-page__context-copy">
            <p className="projects-page__eyebrow">{t('focused')}</p>
            <h2>{selectedProject.name}</h2>
            <p>
              {t('focusedDescription', { count: selectedProjectTeamCount })}
            </p>
          </div>
          <div className="teams-page__context-actions">
            <Link className="btn btn-secondary btn-small" to={`/projetos/${selectedProject.id}`}>
              {t('openProject')}
            </Link>
            <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${selectedProject.id}`}>
              {t('openPlanning')}
            </Link>
          </div>
        </section>
      ) : null}

      <div className="projects-page__layout">
        <section ref={createSectionRef} className="panel projects-page__form-card" aria-label={t('create')}>
          <div className="projects-page__card-header">
            <p className="projects-page__eyebrow">{t('newTeam')}</p>
            <h2>{t('create')}</h2>
            <p>{t('createIntro')}</p>
          </div>

          <div className="teams-page__creation-status" aria-label={t('createPermission')}>
            <strong>
              {selectedProject
                ? canCreateForSelectedProject
                  ? t('canCreate')
                  : t('readOnly')
                : t('chooseToStart')}
            </strong>
            <p>
              {t('optional')}
            </p>
          </div>

          <form className="projects-page__form" onSubmit={handleCreateTeam}>
            <label className="projects-page__field">
              <span>{t('project')}</span>
              <select
                value={selectedProjectId}
                onChange={(event) => handleProjectSelection(event.target.value)}
                disabled={isLoading || isCreating || projects.length === 0}
              >
                {projects.length === 0 ? <option value="">{t('noProjectsAvailable')}</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="projects-page__field">
              <span>{t('name')}</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('nameExample')}
                disabled={isCreating || isLoading || !canCreateForSelectedProject}
                required
              />
            </label>

            <label className="projects-page__field">
              <span>{t('description')}</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('descriptionExample')}
                rows={4}
                disabled={isCreating || isLoading || !canCreateForSelectedProject}
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || isLoading || !canCreateForSelectedProject || !name.trim()}
            >
              {isCreating ? t('creating') : t('create')}
            </button>
          </form>

          {selectedProject && !canCreateForSelectedProject ? (
            <p className="projects-page__state">
              {t('viewOnlyProject', { name: selectedProject.name })}
            </p>
          ) : null}
          {message ? <p className="projects-page__message" role="status">{renderTeamMessage(t, message, language)}</p> : null}
        </section>

        <section className="panel projects-page__list-card" aria-label={t('byProject')}>
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">{t('byProject')}</p>
              <h2>{visibleTeamCountLabel}</h2>
            </div>
            <div className="teams-page__section-metrics" aria-label={t('listSummary')}>
              <span className="projects-page__section-count">{visibleProjectCountLabel}</span>
              <span className="projects-page__section-count">{teamCountLabel}</span>
            </div>
          </div>

          <div className="teams-page__toolbar" aria-label={t('filters')}>
            <label className="projects-page__field projects-page__field--search">
              <span>{t('search')}</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('searchPlaceholder')}
              />
            </label>
            <div className="teams-page__toolbar-actions">
              <button
                type="button"
                className={`btn btn-secondary btn-small ${showOnlySelectedProject ? 'is-active' : ''}`}
                disabled={!selectedProjectId}
                onClick={() => setShowOnlySelectedProject((current) => !current)}
              >
                {showOnlySelectedProject ? t('showAll') : t('showSelected')}
              </button>
            </div>
          </div>

          {isLoading ? <p className="projects-page__state">{t('loading')}</p> : null}
          {!isLoading && projects.length === 0 ? (
            <div className="projects-page__empty">
              <h3>{t('noProjects')}</h3>
              <p>{t('createProjectFirst')}</p>
              <Link className="btn btn-secondary btn-small" to="/projetos">
                {t('createProject')}
              </Link>
            </div>
          ) : null}
          {hasFilteredNoResults ? (
            <div className="projects-page__empty">
              <h3>{t('noResults')}</h3>
              <p>{t('noResultsHelp')}</p>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => {
                  setSearchTerm('')
                  setShowOnlySelectedProject(false)
                }}
              >
                {t('clearFilters')}
              </button>
            </div>
          ) : null}

          <div className="teams-page__groups">
            {visibleProjects.map((project) => {
              const projectTeams = teamsByProject[project.id] ?? []
              const canManageProjectMembers = Boolean(canManageProjectById[project.id])

              return (
                <section key={project.id} className="teams-page__group" aria-label={t('group', { name: project.name })}>
                  <div className="teams-page__group-header">
                    <div className="teams-page__group-title">
                      <p className="projects-page__eyebrow">{t('project')}</p>
                      <h3>{project.name}</h3>
                      <p>
                        {t('linkedTeams', { count: projectTeams.length })} ·{' '}
                        {canManageProjectMembers ? t('manageMembers') : t('viewOnly')}
                      </p>
                    </div>
                    <div className="teams-page__group-actions">
                      {canManageProjectMembers ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => handleSelectProjectForCreation(project.id)}
                        >
                          {t('createHere')}
                        </button>
                      ) : null}
                      <Link className="btn btn-secondary btn-small" to={`/projetos/${project.id}`}>
                        {t('viewProject')}
                      </Link>
                      <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${project.id}`}>
                        {t('openPlanning')}
                      </Link>
                    </div>
                  </div>

                  <div className="teams-page__group-metrics" aria-label={t('groupSummary', { name: project.name })}>
                    <span>{t('linkedTeams', { count: projectTeams.length })}</span>
                    <span>{canManageProjectMembers ? t('canManage') : t('cannotManage')}</span>
                    <span>{t('linkedSessions')}</span>
                  </div>

                  {projectTeams.length === 0 ? (
                    <div className="projects-page__empty">
                      <h3>{t('noTeams')}</h3>
                      <p>{t('noTeamsHelp')}</p>
                      {canManageProjectMembers ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => handleSelectProjectForCreation(project.id)}
                        >
                          {t('firstTeam')}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="project-detail-page__teams">
                      {projectTeams.map((team) => (
                        <TeamMembersPanel
                          key={team.id}
                          team={team}
                          userId={userId}
                          canManageProjectMembers={canManageProjectMembers}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default TimesPage
