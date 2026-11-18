import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useCopy, useLanguage } from '../i18n/context'
import { formatNotice } from '../i18n/formatNotice'
import Link from '../i18n/LocalizedLink'
import { useAuth } from '../hooks/useAuth'
import { createProject, listProjects } from '../services/projectsService'
import { listProjectAnalyses } from '../services/projectAiService'
import { listTeamsByProject } from '../services/teamsService'
import { listStoryHistoryGroups } from '../services/userStoriesService'
import { getProjectInsightFreshness } from '../utils/projectInsightsUtils'

const EMPTY_PROJECT_STATS = {
  storyCount: 0,
  readyStoryCount: 0,
  teamCount: 0,
  hasDiagnostic: false,
  diagnosticHealthLabel: '',
  latestDiagnosticAt: null,
  latestDiagnostic: null,
  isDiagnosticOutdated: false,
}

const PROJECT_PORTFOLIO_FILTERS = [
  {
    value: 'all',
    label: 'all',
    description: 'registered_projects',
  },
  {
    value: 'with_ready_stories',
    label: 'ready_for_planning_poker',
    description: 'with_stories_ready_to_estimate',
  },
  {
    value: 'with_teams',
    label: 'with_teams',
    description: 'active_collaboration',
  },
  {
    value: 'with_diagnostics',
    label: 'with_a_diagnosis',
    description: 'already_analyzed_with_ai',
  },
  {
    value: 'without_diagnostics',
    label: 'no_diagnosis',
    description: 'stories_awaiting_analysis',
  },
  {
    value: 'stale_diagnostics',
    label: 'outdated_diagnosis',
    description: 'ready_for_a_fresh_analysis',
  },
  {
    value: 'without_stories',
    label: 'no_stories',
    description: 'no_stories_linked_yet',
  },
]

const PROJECT_SORT_OPTIONS = [
  {
    value: 'recommended',
    label: 'next_action',
  },
  {
    value: 'recent',
    label: 'most_recent',
  },
  {
    value: 'name',
    label: 'name_a_z',
  },
]

function formatProjectDate(value, language) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatProjectMetric(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`
}

function normalizePortfolioSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function getProjectCreatedTime(project) {
  const date = new Date(project?.created_at ?? 0)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function getProjectActionPriority(stats = EMPTY_PROJECT_STATS) {
  if (stats.storyCount === 0) return 4
  if (stats.isDiagnosticOutdated) return 0
  if (stats.readyStoryCount > 0) return 1
  if (!stats.hasDiagnostic) return 2
  return 3
}

function getProjectNextAction(project, stats, diagnosticFreshness, t) {
  if (stats.storyCount === 0) {
    return {
      label: t('forge_your_first_story'),
      href: `/tool?projectId=${project.id}`,
      description: t('start_by_creating_your_first_story_in'),
      tone: 'empty',
    }
  }

  if (stats.isDiagnosticOutdated) {
    return {
      label: t('update_diagnosis'),
      href: `/projetos/${project.id}#diagnostico-projeto`,
      description: diagnosticFreshness?.description || t('run_the_analysis_with_the_latest_stories'),
      tone: 'warning',
    }
  }

  if (stats.readyStoryCount > 0) {
    return {
      label: t('open_planning_poker'),
      href: `/roda?projectId=${project.id}`,
      description: t('to_estimate', { p1: formatProjectMetric(
        stats.readyStoryCount,
        t('story_ready'),
        t('stories_ready'),
      ) }),
      tone: 'ready',
    }
  }

  if (!stats.hasDiagnostic) {
    return {
      label: t('generate_diagnosis'),
      href: `/projetos/${project.id}#diagnostico-projeto`,
      description: t('use_project_ai_to_identify_risks_and'),
      tone: 'ai',
    }
  }

  return {
    label: t('open_board'),
    href: `/projetos/${project.id}`,
    description: t('review_the_kanban_board_and_get_stories'),
    tone: 'neutral',
  }
}

function ProjectsPage() {
  const t = useCopy('projects')
  const tInsights = useCopy('projectInsights')
  const { language } = useLanguage()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [projects, setProjects] = useState([])
  const [projectStatsById, setProjectStatsById] = useState({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [portfolioFilter, setPortfolioFilter] = useState('all')
  const [projectSort, setProjectSort] = useState('recommended')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState('')
  const nameInputRef = useRef(null)

  const projectCountLabel = useMemo(
    () => `${projects.length} ${t('project', { count: projects.length })}`,
    [t, projects.length],
  )
  const portfolioTotals = useMemo(
    () =>
      projects.reduce(
        (totals, project) => {
          const stats = projectStatsById[project.id] ?? EMPTY_PROJECT_STATS

          return {
            storyCount: totals.storyCount + stats.storyCount,
            readyStoryCount: totals.readyStoryCount + stats.readyStoryCount,
            teamCount: totals.teamCount + stats.teamCount,
            diagnosticCount: totals.diagnosticCount + (stats.hasDiagnostic ? 1 : 0),
            missingDiagnosticCount:
              totals.missingDiagnosticCount + (stats.storyCount > 0 && !stats.hasDiagnostic ? 1 : 0),
            staleDiagnosticCount: totals.staleDiagnosticCount + (stats.isDiagnosticOutdated ? 1 : 0),
          }
        },
        {
          storyCount: 0,
          readyStoryCount: 0,
          teamCount: 0,
          diagnosticCount: 0,
          missingDiagnosticCount: 0,
          staleDiagnosticCount: 0,
        },
      ),
    [projectStatsById, projects],
  )
  const filteredProjects = useMemo(() => {
    const normalizedSearch = normalizePortfolioSearch(searchInput)

    return projects
      .filter((project) => {
        const stats = projectStatsById[project.id] ?? EMPTY_PROJECT_STATS
        const projectText = normalizePortfolioSearch([project.name, project.description].join(' '))
        const matchesSearch =
          !normalizedSearch ||
          projectText.includes(normalizedSearch)

        if (!matchesSearch) return false

        if (portfolioFilter === 'with_ready_stories') {
          return stats.readyStoryCount > 0
        }

        if (portfolioFilter === 'with_teams') {
          return stats.teamCount > 0
        }

        if (portfolioFilter === 'with_diagnostics') {
          return stats.hasDiagnostic
        }

        if (portfolioFilter === 'without_diagnostics') {
          return stats.storyCount > 0 && !stats.hasDiagnostic
        }

        if (portfolioFilter === 'stale_diagnostics') {
          return stats.isDiagnosticOutdated
        }

        if (portfolioFilter === 'without_stories') {
          return stats.storyCount === 0
        }

        return true
      })
      .sort((leftProject, rightProject) => {
        const leftStats = projectStatsById[leftProject.id] ?? EMPTY_PROJECT_STATS
        const rightStats = projectStatsById[rightProject.id] ?? EMPTY_PROJECT_STATS

        if (projectSort === 'name') {
          return leftProject.name.localeCompare(rightProject.name, 'pt-BR')
        }

        if (projectSort === 'recent') {
          return getProjectCreatedTime(rightProject) - getProjectCreatedTime(leftProject)
        }

        const priorityDiff = getProjectActionPriority(leftStats) - getProjectActionPriority(rightStats)
        if (priorityDiff !== 0) return priorityDiff

        const readyDiff = rightStats.readyStoryCount - leftStats.readyStoryCount
        if (readyDiff !== 0) return readyDiff

        return getProjectCreatedTime(rightProject) - getProjectCreatedTime(leftProject)
      })
  }, [portfolioFilter, projectSort, projectStatsById, projects, searchInput])
  const filteredProjectCountLabel = useMemo(
    () =>
      formatProjectMetric(
        filteredProjects.length,
        t('project_found'),
        t('projects_found'),
      ),
    [t, filteredProjects.length],
  )
  const activePortfolioFilter = useMemo(
    () =>
      PROJECT_PORTFOLIO_FILTERS.find((option) => option.value === portfolioFilter) ??
      PROJECT_PORTFOLIO_FILTERS[0],
    [portfolioFilter],
  )
  const trimmedSearchInput = searchInput.trim()
  const hasActivePortfolioRecorte = portfolioFilter !== 'all' || trimmedSearchInput.length > 0
  const projectTopbarPills = useMemo(() => {
    const pills = [
      { text: hasActivePortfolioRecorte ? filteredProjectCountLabel : projectCountLabel },
    ]

    if (portfolioTotals.readyStoryCount > 0) {
      pills.push({
        text:
          portfolioTotals.readyStoryCount === 1
            ? t('1_ready_for_planning_poker')
            : t('ready_for_planning_poker_2', { p1: portfolioTotals.readyStoryCount }),
      })
    }

    if (portfolioTotals.staleDiagnosticCount > 0) {
      pills.push({
        text:
          portfolioTotals.staleDiagnosticCount === 1
            ? t('1_outdated_diagnosis')
            : t('outdated_diagnoses', { p1: portfolioTotals.staleDiagnosticCount }),
      })
    } else if (portfolioTotals.missingDiagnosticCount > 0) {
      pills.push({
        text:
          portfolioTotals.missingDiagnosticCount === 1
            ? t('1_without_a_diagnosis')
            : t('without_a_diagnosis', { p1: portfolioTotals.missingDiagnosticCount }),
      })
    } else {
      pills.push({ text: t('the_workbench_is_still_available') })
    }

    if (hasActivePortfolioRecorte) {
      pills.push({ text: t('filter', { p1: t(activePortfolioFilter.label) }) })
    }

    return pills
  }, [
      t,
    activePortfolioFilter.label,
    filteredProjectCountLabel,
    hasActivePortfolioRecorte,
    portfolioTotals.missingDiagnosticCount,
    portfolioTotals.readyStoryCount,
    portfolioTotals.staleDiagnosticCount,
    projectCountLabel,
  ])
  const hasNoProjectsForFilter =
    !isLoading && projects.length > 0 && filteredProjects.length === 0
  const emptyProjectCount = useMemo(
    () =>
      projects.filter((project) => {
        const stats = projectStatsById[project.id] ?? EMPTY_PROJECT_STATS
        return stats.storyCount === 0
      }).length,
    [projectStatsById, projects],
  )
  const portfolioSummaryItems = useMemo(
    () => [
      {
        label: t('stories'),
        value: portfolioTotals.storyCount,
        detail: t('linked_to_projects'),
        filter: 'all',
      },
      {
        label: t('ready'),
        value: portfolioTotals.readyStoryCount,
        detail: t('for_planning_poker'),
        filter: 'with_ready_stories',
      },
      {
        label: t('teams'),
        value: portfolioTotals.teamCount,
        detail: t('linked_teams'),
        filter: 'with_teams',
      },
      {
        label: t('diagnoses'),
        value: portfolioTotals.diagnosticCount,
        detail: t('with_an_ai_analysis'),
        filter: 'with_diagnostics',
      },
      {
        label: t('no_diagnosis'),
        value: portfolioTotals.missingDiagnosticCount,
        detail: t('with_stories'),
        filter: 'without_diagnostics',
      },
      {
        label: t('outdated_diagnosis'),
        value: portfolioTotals.staleDiagnosticCount,
        detail: t('need_a_fresh_analysis'),
        filter: 'stale_diagnostics',
      },
      {
        label: t('no_stories'),
        value: emptyProjectCount,
        detail: t('need_their_first_story'),
        filter: 'without_stories',
      },
    ],
    [
      t,
      emptyProjectCount,
      portfolioTotals.diagnosticCount,
      portfolioTotals.missingDiagnosticCount,
      portfolioTotals.readyStoryCount,
      portfolioTotals.staleDiagnosticCount,
      portfolioTotals.storyCount,
      portfolioTotals.teamCount,
    ],
  )

  const loadProjectStats = useCallback(
    async (nextProjects) => {
      if (!userId || nextProjects.length === 0) {
        setProjectStatsById({})
        return
      }

      setIsLoadingStats(true)
      const entries = await Promise.all(
        nextProjects.map(async (project) => {
          const [storiesResponse, readyStoriesResponse, teamsResponse, diagnosticsResponse] = await Promise.all([
            listStoryHistoryGroups({
              userId,
              projectFilter: 'project',
              projectId: project.id,
              page: 1,
              pageSize: 1,
            }),
            listStoryHistoryGroups({
              userId,
              projectFilter: 'project',
              projectId: project.id,
              estimationStatus: 'ready_for_estimation',
              page: 1,
              pageSize: 1,
            }),
            listTeamsByProject({ projectId: project.id, userId }),
            listProjectAnalyses({ projectId: project.id, userId, limit: 1 }),
          ])
          const latestDiagnostic = diagnosticsResponse.success ? diagnosticsResponse.data?.[0] : null
          const storyCount = storiesResponse.success ? storiesResponse.totalCount : 0
          const diagnosticFreshness = latestDiagnostic
            ? getProjectInsightFreshness(latestDiagnostic, storyCount)
            : null

          return [
            project.id,
            {
              storyCount,
              readyStoryCount: readyStoriesResponse.success ? readyStoriesResponse.totalCount : 0,
              teamCount: teamsResponse.success ? (teamsResponse.data?.length ?? 0) : 0,
              hasDiagnostic: Boolean(latestDiagnostic),
              diagnosticHealthLabel: latestDiagnostic?.analysis?.health_label ?? '',
              latestDiagnostic,
              latestDiagnosticAt: latestDiagnostic?.created_at ?? null,
              isDiagnosticOutdated: Boolean(diagnosticFreshness?.isOutdated),
            },
          ]
        }),
      )
      setProjectStatsById(Object.fromEntries(entries))
      setIsLoadingStats(false)
    },
    [userId],
  )

  const loadProjects = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    const response = await listProjects({ userId })
    setIsLoading(false)

    if (response.success) {
      const nextProjects = response.data ?? []
      setProjects(nextProjects)
      await loadProjectStats(nextProjects)
      return
    }

    setMessage('could_not_load_projects_right_now')
  }, [loadProjectStats, userId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadProjects()
    }, 0)

    return () => clearTimeout(timerId)
  }, [loadProjects])

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: t('optional_organization'),
      title: t('projects'),
      pills: projectTopbarPills,
    })

    return () => setTopbarStatus(null)
  }, [t, projectTopbarPills, setTopbarStatus])

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
      setMessage(response.error?.message === 'Informe um nome para o projeto.'
        ? 'project_name_required'
        : 'could_not_create_the_project_right_now')
      return
    }

    setName('')
    setDescription('')
    setMessage('project_created_you_can_now_select_it')
    await loadProjects()
  }

  function focusCreateProject() {
    nameInputRef.current?.focus()
  }

  return (
    <div className="projects-page projects-page--list">
      <section className="panel projects-page__hero">
        <div className="projects-page__hero-copy">
          <p className="projects-page__eyebrow">{t('optional_organization')}</p>
          <h1>{t('projects')}</h1>
          <p>
            {t('group_stories_by_journey_squad_or_initiative')}
          </p>
          <div className="projects-page__hero-indicators" aria-label={t('project_organization_summary')}>
            <span className="projects-page__indicator">
              <strong>{projects.length}</strong>
              {t('project', { count: projects.length })}
            </span>
            <span className="projects-page__indicator">
              <strong>{portfolioTotals.storyCount}</strong>
              {portfolioTotals.storyCount === 1 ? t('story') : t('stories_2')}
            </span>
            <span className="projects-page__indicator projects-page__indicator--ready">
              <strong>{portfolioTotals.readyStoryCount}</strong>
              {portfolioTotals.readyStoryCount === 1 ? t('ready_for_planning_poker_3') : t('ready_for_planning_poker_4')}
            </span>
            <span className="projects-page__indicator projects-page__indicator--ai">
              <strong>{portfolioTotals.diagnosticCount}</strong>
              {portfolioTotals.diagnosticCount === 1 ? t('project_with_a_diagnosis') : t('projects_with_a_diagnosis')}
            </span>
            {portfolioTotals.staleDiagnosticCount > 0 ? (
              <span className="projects-page__indicator projects-page__indicator--warning">
                <strong>{portfolioTotals.staleDiagnosticCount}</strong>
                {portfolioTotals.staleDiagnosticCount === 1
                  ? t('outdated_diagnosis_2')
                  : t('outdated_diagnoses_2')}
              </span>
            ) : null}
            <span className="projects-page__indicator projects-page__indicator--free">
              {t('the_workbench_is_still_available')}
            </span>
          </div>
        </div>
        <div className="projects-page__hero-actions">
          <Link className="btn btn-secondary btn-small" to="/tool">
            {t('open_workbench')}
          </Link>
        </div>
      </section>

      <div className="projects-page__layout">
        <section className="panel projects-page__form-card" id="criar-projeto" aria-label={t('create_project')}>
          <div className="projects-page__card-header">
            <p className="projects-page__eyebrow">{t('new_project')}</p>
            <h2>{t('create_project')}</h2>
            <p>{t('use_projects_to_group_stories_by_journey')}</p>
          </div>
          <form className="projects-page__form" onSubmit={handleCreateProject}>
            <label className="projects-page__field">
              <span>{t('project_name')}</span>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('e_g_customer_onboarding')}
                disabled={isCreating}
                required
              />
            </label>

            <label className="projects-page__field">
              <span>
                {t('description')}{' '}
                <small>{t('optional')}</small>
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('describe_the_project_s_journey_squad_or')}
                rows={4}
                disabled={isCreating}
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary projects-page__submit"
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? t('creating_project') : t('create_project')}
            </button>
          </form>
          {message ? <p className="projects-page__message" role="status">{formatNotice(t, message)}</p> : null}
        </section>

        <section className="panel projects-page__list-card" aria-label={t('project_list')}>
          <div className="projects-page__section-header">
            <div>
              <p className="projects-page__eyebrow">{t('portfolio')}</p>
              <h2>{t('your_projects')}</h2>
            </div>
            <span className="projects-page__section-count">{filteredProjectCountLabel}</span>
          </div>

          {projects.length > 0 ? (
            <div className="projects-page__portfolio-strip" role="group" aria-label={t('portfolio_summary')}>
              {portfolioSummaryItems.map((item) => {
                const isActive = portfolioFilter === item.filter

                return (
                  <button
                    key={item.filter}
                    type="button"
                    className={`projects-page__portfolio-card ${
                      isActive ? 'projects-page__portfolio-card--active' : ''
                    }`}
                    aria-pressed={isActive}
                    onClick={() => setPortfolioFilter(item.filter)}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="projects-page__filters" aria-label={t('project_filters')}>
            <div className="projects-page__filter-row">
              <label className="projects-page__field projects-page__field--search">
                <span>{t('search_projects')}</span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t('name_squad_journey_or_initiative')}
                />
              </label>

              <label className="projects-page__field projects-page__field--sort">
                <span>{t('sort')}</span>
                <select
                  value={projectSort}
                  onChange={(event) => setProjectSort(event.target.value)}
                  aria-label={t('sort_projects')}
                >
                  {PROJECT_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="projects-page__quick-filters" aria-label={t('quick_project_filters')}>
              {PROJECT_PORTFOLIO_FILTERS.map((option) => {
                const isActive = portfolioFilter === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`projects-page__quick-filter ${
                      isActive ? 'projects-page__quick-filter--active' : ''
                    }`}
                    aria-pressed={isActive}
                    onClick={() => setPortfolioFilter(option.value)}
                  >
                    <span>{t(option.label)}</span>
                    <small>{t(option.description)}</small>
                  </button>
                )
              })}
            </div>

            {hasActivePortfolioRecorte ? (
              <div className="projects-page__active-filter" role="status">
                <div>
                  <span>{t('current_filter')}</span>
                  <p>
                    {t(activePortfolioFilter.label)}
                    {trimmedSearchInput ? t('search', { p1: trimmedSearchInput }) : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    setSearchInput('')
                    setPortfolioFilter('all')
                  }}
                >
                  {t('clear_selection')}
                </button>
              </div>
            ) : null}
          </div>

          {isLoading ? <p className="projects-page__state">{t('loading_projects')}</p> : null}
          {isLoadingStats ? <p className="projects-page__state">{t('updating_project_summary')}</p> : null}
          {!isLoading && projects.length === 0 ? (
            <div className="projects-page__empty">
              <p className="projects-page__eyebrow">{t('start_when_it_makes_sense')}</p>
              <h3>{t('no_projects_yet')}</h3>
              <p>
                {t('keep_using_the_workbench_without_a_project')}
              </p>
              <button type="button" className="btn btn-secondary btn-small" onClick={focusCreateProject}>
                {t('create_first_project')}
              </button>
            </div>
          ) : null}
          {hasNoProjectsForFilter ? (
            <div className="projects-page__empty">
              <p className="projects-page__eyebrow">{t('no_results')}</p>
              <h3>{t('no_projects_match_this_view')}</h3>
              <p>{t('adjust_your_search_or_select_another_filter')}</p>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => {
                  setSearchInput('')
                  setPortfolioFilter('all')
                }}
              >
                {t('clear_filters')}
              </button>
            </div>
          ) : null}

          <div className="projects-page__list">
            {filteredProjects.map((project) => {
              const stats = projectStatsById[project.id] ?? EMPTY_PROJECT_STATS
              const diagnosticFreshness = stats.latestDiagnostic
                  ? getProjectInsightFreshness(stats.latestDiagnostic, stats.storyCount, tInsights)
                  : null
                const nextAction = getProjectNextAction(project, stats, diagnosticFreshness, t)

              return (
                <article key={project.id} className="projects-page__item">
                  <div className="projects-page__item-main">
                    <div className="projects-page__item-title-row">
                      <span className="projects-page__item-marker" aria-hidden="true" />
                      <h3>
                        <Link to={`/projetos/${project.id}`}>{project.name}</Link>
                      </h3>
                    </div>
                    <p className="projects-page__item-description">
                      {project.description || t('no_description_yet')}
                    </p>
                    <p className="projects-page__item-date">{t('created_on')}{" "}{formatProjectDate(project.created_at, language)}</p>
                    <div className="projects-page__item-metrics" aria-label={t('summary_for', { p1: project.name })}>
                      <span className="projects-page__metric">
                        {formatProjectMetric(stats.storyCount, t('story'), t('stories_2'))}
                      </span>
                      <span className="projects-page__metric projects-page__metric--ready">
                        {formatProjectMetric(
                          stats.readyStoryCount,
                          t('ready_to_estimate'),
                          t('ready_to_estimate_2'),
                        )}
                      </span>
                      <span className="projects-page__metric">
                        {`${stats.teamCount} ${t('team', { count: stats.teamCount })}`}
                      </span>
                      <span
                        className={`projects-page__metric ${
                          stats.hasDiagnostic ? 'projects-page__metric--ai' : ''
                        }`}
                      >
                        {stats.hasDiagnostic
                          ? t('ai', { p1: stats.diagnosticHealthLabel || t('diagnosis') })
                          : t('no_diagnosis')}
                      </span>
                      {stats.isDiagnosticOutdated ? (
                        <span className="projects-page__metric projects-page__metric--warning">
                          {diagnosticFreshness?.label || t('outdated_diagnosis')}
                        </span>
                      ) : null}
                      {stats.latestDiagnosticAt ? (
                        <span className="projects-page__metric">
                          {t('ai_analyzed_on')}{" "}{formatProjectDate(stats.latestDiagnosticAt, language)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="projects-page__item-actions">
                    <div
                      className={`projects-page__next-action projects-page__next-action--${nextAction.tone}`}
                    >
                      <span>{t('next_action')}</span>
                      <p>{nextAction.description}</p>
                      <Link className="btn btn-primary btn-small" to={nextAction.href}>
                        {nextAction.label}
                      </Link>
                    </div>
                    <details className="projects-page__item-more">
                      <summary>{t('more_actions')}</summary>
                      <div>
                        <Link className="btn btn-secondary btn-small" to={`/projetos/${project.id}`}>
                          {t('view_project')}
                        </Link>
                        <Link className="btn btn-secondary btn-small" to={`/historico?projectId=${project.id}`}>
                          {t('view_stories')}
                        </Link>
                        <Link className="btn btn-secondary btn-small" to={`/roda?projectId=${project.id}`}>
                          {t('open_planning_poker')}
                        </Link>
                        <Link className="btn btn-secondary btn-small" to={`/times?projectId=${project.id}`}>
                          {t('teams')}
                        </Link>
                        <Link className="btn btn-secondary btn-small" to={`/tool?projectId=${project.id}`}>
                          {t('forge')}
                        </Link>
                      </div>
                    </details>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProjectsPage
