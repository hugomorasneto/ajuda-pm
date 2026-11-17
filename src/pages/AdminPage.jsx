import { useCopy, useLanguage } from '../i18n/context'
import LanguageSwitcher from '../i18n/LanguageSwitcher'
import { formatNotice } from '../i18n/formatNotice'
import { useLearningCatalog } from '../hooks/useLearningCatalog'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  APP_NAME,
  FREE_GENERATION_LIMIT,
  FREE_PLAN_NAME,
  PRO_PLAN_NAME,
  MAX_FORGE_LIMIT_OVERRIDE,
  PLAN_VALUES,
  getEffectiveForgeLimit,
  getRemainingForgeGenerations,
} from '../constants/app'
import { fetchAdminDashboard } from '../services/adminDashboardService'
import { updateAdminUserAccess } from '../services/adminUserAccessService'
import '../styles/pages.css'

const periodOptions = [
  { value: 'today', label: 'today' },
  { value: '7d', label: 'last_7_days' },
  { value: '30d', label: 'last_30_days' },
]

const adminTabs = [
  { id: 'overview', label: 'overview' },
  { id: 'leads', label: 'leads' },
  { id: 'users', label: 'users' },
  { id: 'usage', label: 'usage' },
  { id: 'stories', label: 'artifacts' },
  { id: 'learning', label: 'learning' },
]

const accessPlanOptions = [
  { value: PLAN_VALUES.FREE, label: FREE_PLAN_NAME },
  { value: PLAN_VALUES.PRO, label: PRO_PLAN_NAME },
]

const emptyDash = '—'

function formatNumber(value, language) {
  return new Intl.NumberFormat(language).format(Number(value ?? 0))
}

function formatDateTime(value, language) {
  if (!value) return emptyDash
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return emptyDash

  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDay(value, language) {
  if (!value) return emptyDash
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatPercent(value, language) {
  return new Intl.NumberFormat(language, {
    style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1,
  }).format(Number(value ?? 0) / 100)
}

function formatPlan(plan) {
  return plan === PLAN_VALUES.PRO ? PRO_PLAN_NAME : FREE_PLAN_NAME
}

function formatRole(role, t) {
  if (role === 'admin') return t('admin')
  return t('user')
}

function formatStoryStatus(status, t) {
  const statusLabels = {
    generated: t('forged'),
    reviewed: t('reviewed'),
    approved: t('approved'),
    archived: t('archived'),
  }

  return statusLabels[status] ?? status ?? emptyDash
}

function getNormalizedPlan(plan) {
  return plan === PLAN_VALUES.PRO ? PLAN_VALUES.PRO : PLAN_VALUES.FREE
}

function getNormalizedForgeLimitOverride(value) {
  return Number.isInteger(value) ? value : null
}

function getUserEffectiveForgeLimit(user) {
  return getEffectiveForgeLimit({
    plan: getNormalizedPlan(user?.plan),
    forgeLimitOverride: getNormalizedForgeLimitOverride(user?.forge_limit_override),
  })
}

function getUserRemainingForges(user) {
  return getRemainingForgeGenerations({
    usageCount: user?.stories_count ?? 0,
    forgeLimit: getUserEffectiveForgeLimit(user),
  })
}

function isUserAtForgeLimit(user) {
  const limit = getUserEffectiveForgeLimit(user)
  return limit !== null && Number(user?.stories_count ?? 0) >= limit
}

function formatForgeLimit(limit, language, t) {
  return limit === null ? t('unlimited') : formatNumber(limit, language)
}

function formatRemainingForges(remaining, language, t) {
  return remaining === null ? t('unlimited_2') : formatNumber(remaining, language)
}

function parseForgeLimitOverride(value) {
  const rawValue = String(value ?? '').trim()
  if (!rawValue) return null

  if (!/^\d+$/.test(rawValue)) {
    return NaN
  }

  const parsed = Number(rawValue)
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_FORGE_LIMIT_OVERRIDE) {
    return NaN
  }

  return parsed
}

function MetricCard({ label, value, note, tone = 'neutral' }) {
  return (
    <article className={`admin-metric-card admin-metric-card--${tone}`}>
      <span className="admin-metric-card__signal" aria-hidden="true" />
      <div>
        <p className="admin-metric-card__label">{label}</p>
        <p className="admin-metric-card__value">{value}</p>
        {note ? <p className="admin-metric-card__note">{note}</p> : null}
      </div>
    </article>
  )
}

function StateCard({ tone = 'default', children }) {
  return (
    <div className={`admin-state-card ${tone === 'error' ? 'admin-state-card--error' : ''}`.trim()}>
      {tone === 'loading' ? <div className="admin-state-card__spinner" aria-hidden="true" /> : null}
      <p role={tone === 'error' ? 'alert' : 'status'}>{children}</p>
    </div>
  )
}

function AdminTabs({ activeTab, onChange }) {
  const t = useCopy('admin')

  function handleKeyDown(event) {
    const index = adminTabs.findIndex((tab) => tab.id === activeTab)
    const last = adminTabs.length - 1
    const next = {
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowRight: index === last ? 0 : index + 1,
      Home: 0,
      End: last,
    }[event.key]
    if (!Number.isInteger(next)) return

    event.preventDefault()
    onChange(adminTabs[next].id)
    event.currentTarget.children[next].focus()
  }

  return (
    <div className="admin-tabs" role="tablist" aria-label={t('administration_sections')} onKeyDown={handleKeyDown}>
      {adminTabs.map((tab) => (
        <button
          key={tab.id}
          id={`admin-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-controls={activeTab === tab.id ? `admin-panel-${tab.id}` : undefined}
          tabIndex={activeTab === tab.id ? 0 : -1}
          aria-selected={activeTab === tab.id}
          className={`admin-tabs__button ${activeTab === tab.id ? 'admin-tabs__button--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {t(tab.label)}
        </button>
      ))}
    </div>
  )
}

function SearchField({ id, label, placeholder, value, onChange }) {
  return (
    <label className="admin-search" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function DataTable({ title, description, columns, rows, renderRow, emptyMessage }) {
  const titleId = useId()
  let tableRows = (
    <tr>
      <td colSpan={columns.length} className="admin-table__empty">
        {emptyMessage}
      </td>
    </tr>
  )

  if (rows.length > 0) {
    tableRows = rows.map(renderRow)
  }

  return (
    <section className="admin-table-section">
      <div className="admin-table-section__header">
        <h2 id={titleId} className="admin-table-section__title">{title}</h2>
        {description ? <p className="admin-table-section__desc">{description}</p> : null}
      </div>
      <div className="admin-table-wrap" role="region" aria-labelledby={titleId} tabIndex={0}>
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th scope="col" key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>{tableRows}</tbody>
        </table>
      </div>
    </section>
  )
}

function Pagination({ page, totalPages, totalCount, onPageChange }) {
  const t = useCopy('admin')
  const { language } = useLanguage()
  if (!totalCount) return null

  const safeTotalPages = Math.max(totalPages, 1)

  return (
    <nav className="admin-pagination" aria-label={t('pagination')}>
      <p>{t('page_record_count', {
        count: totalCount,
        page: formatNumber(page, language),
        pages: formatNumber(safeTotalPages, language),
        records: formatNumber(totalCount, language),
      })}</p>
      <div className="admin-pagination__actions">
        <button
          type="button"
          className="admin-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t('previous')}
        </button>
        <button
          type="button"
          className="admin-button"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('next')}
        </button>
      </div>
    </nav>
  )
}

function AdminSectionToolbar({ children }) {
  return <div className="admin-section-toolbar">{children}</div>
}

function buildAccessForm(user) {
  return {
    plan: getNormalizedPlan(user?.plan),
    forgeLimitOverride: Number.isInteger(user?.forge_limit_override)
      ? String(user.forge_limit_override)
      : '',
    notes: '',
  }
}

function AccessSummaryItem({ label, value }) {
  return (
    <div className="admin-access-summary__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function UserAccessModal({ user, isSaving, feedback, onClose, onSave }) {
  const t = useCopy('admin')
  const { language } = useLanguage()
  const [form, setForm] = useState(() => buildAccessForm(user))
  const [localError, setLocalError] = useState('')
  const dialogRef = useRef(null)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const currentLimit = getUserEffectiveForgeLimit(user)
  const remainingForges = getUserRemainingForges(user)
  const limitReached = isUserAtForgeLimit(user)
  const shownFeedback = localError
    ? { tone: 'error', message: localError }
    : feedback

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setLocalError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLocalError('')

    if (!accessPlanOptions.some((option) => option.value === form.plan)) {
      setLocalError('choose_a_valid_plan')
      return
    }

    const forgeLimitOverride = parseForgeLimitOverride(form.forgeLimitOverride)
    if (Number.isNaN(forgeLimitOverride)) {
      setLocalError('forge_limit_range')
      return
    }

    await onSave({
      plan: form.plan,
      forgeLimitOverride,
      notes: form.notes.trim() || null,
    })
  }

  return (
    <dialog
      ref={dialogRef}
      className="admin-access-modal"
      aria-labelledby="admin-access-modal-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form className="admin-access-modal__panel" onSubmit={handleSubmit}>
        <div className="admin-access-modal__header">
          <div>
            <p className="admin-section-label">{t('user_access')}</p>
            <h2 id="admin-access-modal-title">{t('manage_access')}</h2>
            <p>{user.email}</p>
          </div>
          <button type="button" className="admin-button admin-button--compact" onClick={onClose} disabled={isSaving}>
            {t('cancel')}
          </button>
        </div>

        <LanguageSwitcher />

        <dl className="admin-access-summary">
          <AccessSummaryItem label={t('current_role')} value={formatRole(user.role, t)} />
          <AccessSummaryItem label={t('current_plan')} value={formatPlan(user.plan)} />
          <AccessSummaryItem label={t('used')} value={formatNumber(user.stories_count, language)} />
          <AccessSummaryItem label={t('limit')} value={formatForgeLimit(currentLimit, language, t)} />
          <AccessSummaryItem label={t('remaining')} value={formatRemainingForges(remainingForges, language, t)} />
          <AccessSummaryItem label={t('last_activity')} value={formatDateTime(user.last_activity_at, language)} />
        </dl>

        {limitReached ? (
          <p className="admin-access-modal__limit-warning" role="status">
            {t('limit_reached')}
          </p>
        ) : null}

        <div className="admin-access-modal__fields">
          <label className="admin-access-field">
            <span>{t('plan')}</span>
            <select
              value={form.plan}
              onChange={(event) => updateForm('plan', event.target.value)}
              disabled={isSaving}
            >
              {accessPlanOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-access-field">
            <span id="admin-forge-limit-label">{t('forge_limit')}</span>
            <input
              type="number"
              min="0"
              max={MAX_FORGE_LIMIT_OVERRIDE}
              step="1"
              inputMode="numeric"
              aria-labelledby="admin-forge-limit-label"
              aria-describedby="admin-forge-limit-help"
              aria-invalid={localError === 'forge_limit_range' || undefined}
              onInvalid={(event) => {
                event.preventDefault()
                event.currentTarget.focus()
                setLocalError('forge_limit_range')
              }}
              value={form.forgeLimitOverride}
              placeholder={t('use_plan_default')}
              onChange={(event) => updateForm('forgeLimitOverride', event.target.value)}
              disabled={isSaving}
            />
            <small id="admin-forge-limit-help">
              {t('leave_blank_to_use_the_plan_default', { count: FREE_GENERATION_LIMIT })}
            </small>
          </label>

          <label className="admin-access-field">
            <span>{t('administrative_note')}</span>
            <textarea
              value={form.notes}
              placeholder={t('reason_for_the_change')}
              rows="3"
              onChange={(event) => updateForm('notes', event.target.value)}
              disabled={isSaving}
            />
          </label>
        </div>

        {shownFeedback?.message ? (
          <p
            className={`admin-access-modal__feedback ${
              shownFeedback.tone === 'error' ? 'admin-access-modal__feedback--error' : ''
            }`}
            role={shownFeedback.tone === 'error' ? 'alert' : 'status'}
          >
            {formatNotice(t, { key: shownFeedback.message, values: { max: formatNumber(MAX_FORGE_LIMIT_OVERRIDE, language) } })}
          </p>
        ) : null}

        <div className="admin-access-modal__actions">
          <button type="button" className="admin-button" onClick={onClose} disabled={isSaving}>
            {t('cancel')}
          </button>
          <button type="submit" className="admin-button admin-button--primary" disabled={isSaving}>
            {isSaving ? t('saving') : t('save_changes')}
          </button>
        </div>
      </form>
    </dialog>
  )
}

function OverviewTab({ dashboard, periodLabel }) {
  const t = useCopy('admin')
  const { language } = useLanguage()
  const overview = dashboard.overview

  const metrics = [
    {
      label: t('total_leads'),
      value: formatNumber(overview.totalLeads, language),
      note: t('in_this_period', { p1: formatNumber(overview.periodLeads, language) }),
      tone: 'tech',
    },
    {
      label: t('total_users'),
      value: formatNumber(overview.totalUsers, language),
      note: t('new_in_this_period', { p1: formatNumber(overview.periodUsers, language) }),
      tone: 'success',
    },
    {
      label: t('forged_artifacts'),
      value: formatNumber(overview.totalStories, language),
      note: t('in_this_period', { p1: formatNumber(overview.periodStories, language) }),
      tone: 'ember',
    },
    {
      label: t('active_users'),
      value: formatNumber(overview.activeUsers, language),
      note: periodLabel,
    },
    {
      label: t('guide_completions'),
      value: formatNumber(overview.totalLearningCompletions, language),
      note: t('in_this_period', { p1: formatNumber(overview.periodLearningCompletions, language) }),
      tone: 'tech',
    },
    {
      label: t('successful_generations'),
      value: formatNumber(overview.generationSuccess, language),
      note: periodLabel,
      tone: 'success',
    },
    {
      label: t('generation_failures'),
      value: formatNumber(overview.generationFailures, language),
      note: t('failure_rate', { p1: formatPercent(overview.failureRate, language) }),
      tone: 'danger',
    },
    {
      label: t('recorded_events'),
      value: formatNumber(dashboard.usage.overview.total_events, language),
      note: t('unique_users', { p1: formatNumber(dashboard.usage.overview.unique_users, language) }),
    },
  ]

  return (
    <section className="admin-metrics-section">
      <p className="admin-section-label">{t('operational_overview')}</p>
      <div className="admin-metrics-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  )
}

function LeadsTab({ data, search, onSearchChange, onPageChange }) {
  const t = useCopy('admin')
  const { language } = useLanguage()
  return (
    <>
      <AdminSectionToolbar>
        <SearchField
          id="admin-leads-search"
          label={t('search_leads')}
          placeholder={t('name_or_email')}
          value={search}
          onChange={onSearchChange}
        />
      </AdminSectionToolbar>
      <DataTable
        title={t('lead_list')}
        description={t('people_who_joined_the_public_interest_list')}
        columns={[t('name'), t('email'), t('date_added')]}
        rows={data.rows}
        emptyMessage={t('no_leads_found')}
        renderRow={(lead) => (
          <tr key={lead.id}>
            <td>{lead.name}</td>
            <td>{lead.email}</td>
            <td>{formatDateTime(lead.created_at, language)}</td>
          </tr>
        )}
      />
      <Pagination {...data} onPageChange={onPageChange} />
    </>
  )
}

function UsersTab({ data, search, onSearchChange, onPageChange, onManageAccess }) {
  const t = useCopy('admin')
  const { language } = useLanguage()
  return (
    <>
      <AdminSectionToolbar>
        <SearchField
          id="admin-users-search"
          label={t('search_users')}
          placeholder={t('user_email')}
          value={search}
          onChange={onSearchChange}
        />
      </AdminSectionToolbar>
      <DataTable
        title={t('users')}
        description={t('registered_accounts_roles_plans_and_recent_activity')}
        columns={[t('email'), t('plan'), t('role'), t('signed_up'), t('last_activity'), t('stories'), t('guides'), t('access')]}
        rows={data.rows}
        emptyMessage={t('no_users_found')}
        renderRow={(user) => (
          <tr key={user.id}>
            <td>{user.email}</td>
            <td>
              <span className="admin-user-plan-cell">
                <span>{formatPlan(user.plan)}</span>
                {isUserAtForgeLimit(user) ? (
                  <span className="admin-badge admin-badge--warning">{t('limit_reached')}</span>
                ) : null}
              </span>
            </td>
            <td>
              <span className={`admin-badge ${user.role === 'admin' ? 'admin-badge--strong' : ''}`}>
                {formatRole(user.role, t)}
              </span>
            </td>
            <td>{formatDateTime(user.created_at, language)}</td>
            <td>{formatDateTime(user.last_activity_at, language)}</td>
            <td>{formatNumber(user.stories_count, language)}</td>
            <td>{formatNumber(user.guides_count, language)}</td>
            <td>
              <button type="button" className="admin-button admin-button--compact" onClick={() => onManageAccess(user)}>
                {t('manage')}
              </button>
            </td>
          </tr>
        )}
      />
      <Pagination {...data} onPageChange={onPageChange} />
    </>
  )
}

function UsageTab({ usage }) {
  const t = useCopy('admin')
  const { language } = useLanguage()
  return (
    <>
      <section className="admin-metrics-section">
        <p className="admin-section-label">{t('tool_usage')}</p>
        <div className="admin-metrics-grid">
          <MetricCard
            label={t('successful_generations')}
            value={formatNumber(usage.operational.total_generate_success, language)}
            tone="success"
          />
          <MetricCard
            label={t('generation_failures')}
            value={formatNumber(usage.operational.total_generate_failed, language)}
            tone="danger"
          />
          <MetricCard
            label={t('failure_rate_2')}
            value={formatPercent(usage.operational.generation_failure_rate, language)}
            tone="warning"
          />
          <MetricCard
            label={t('reached_the_free_limit')}
            value={formatNumber(usage.operational.users_reached_free_limit, language)}
            tone="tech"
          />
          <MetricCard
            label={t('opened_workspace_without_generating')}
            value={formatPercent(usage.operational.tool_without_generation_rate, language)}
            note={t('of_users', { p1: formatNumber(usage.operational.tool_users_without_generation, language), p2: formatNumber(usage.operational.tool_users_total, language) })}
          />
        </div>
      </section>

      <DataTable
        title={t('main_funnel')}
        description={t('conversion_across_acquisition_and_product_usage_steps')}
        columns={[t('step'), t('volume'), t('conversion_from_previous_step')]}
        rows={usage.funnel.steps}
        emptyMessage={t('no_funnel_steps_found')}
        renderRow={(item) => (
          <tr key={item.step}>
            <td>
              <code className="admin-event-code">{item.step}</code>
            </td>
            <td>{formatNumber(item.count, language)}</td>
            <td>{item.conversion_from_previous === null ? emptyDash : formatPercent(item.conversion_from_previous, language)}</td>
          </tr>
        )}
      />
      <p className="admin-inline-note">
        {t('overall_conversion_from_landing_page_to_generation')}{' '}
        <strong>{formatPercent(usage.funnel.final_completion_rate, language)}</strong>
      </p>

      <DataTable
        title={t('daily_activity')}
        description={t('daily_summary_of_events_and_key_conversions')}
        columns={[t('date'), t('events'), t('generations'), t('sign_ups')]}
        rows={usage.dailyActivity}
        emptyMessage={t('no_activity_found')}
        renderRow={(day) => (
          <tr key={day.day}>
            <td>{formatDay(day.day, language)}</td>
            <td>{formatNumber(day.total_events, language)}</td>
            <td>{formatNumber(day.user_story_generate_success, language)}</td>
            <td>{formatNumber(day.signup_completed, language)}</td>
          </tr>
        )}
      />

      <DataTable
        title={t('recent_events')}
        columns={[t('event'), t('user'), t('page'), t('date_and_time')]}
        rows={usage.recentEvents}
        emptyMessage={t('no_recent_events')}
        renderRow={(event) => (
          <tr key={event.id}>
            <td>
              <code className="admin-event-code">{event.event_name}</code>
            </td>
            <td>{event.user_email ?? event.user_id ?? t('anonymous')}</td>
            <td>{event.page_path ?? emptyDash}</td>
            <td>{formatDateTime(event.created_at, language)}</td>
          </tr>
        )}
      />

      <DataTable
        title={t('events_by_type')}
        description={t('sorted_by_highest_volume_in_the_selected')}
        columns={[t('event'), t('count'), t('of_total')]}
        rows={usage.groupedEvents}
        emptyMessage={t('no_grouped_events')}
        renderRow={(item) => (
          <tr key={item.event_name}>
            <td>
              <code className="admin-event-code">{item.event_name}</code>
            </td>
            <td>{formatNumber(item.total, language)}</td>
            <td>
              <span className="admin-percent-bar">{formatPercent(item.percentage, language)}</span>
            </td>
          </tr>
        )}
      />
    </>
  )
}

function StoryDetail({ story, onClose }) {
  const t = useCopy('admin')
  const { language } = useLanguage()
  if (!story) return null

  const detailSections = [
    { label: t('input_context'), value: story.input_context },
    { label: t('input_requirements'), value: story.input_requirements },
    { label: t('objective'), value: story.objective },
    { label: t('user_story'), value: story.user_story },
    { label: t('acceptance_criteria'), value: story.acceptance_criteria },
    { label: t('business_rules'), value: story.business_rules },
    { label: t('gaps'), value: story.gaps },
    { label: t('qa_checklist'), value: story.qa_checklist },
  ]

  return (
    <section className="admin-story-detail" aria-label={t('selected_artifact_details')}>
      <div className="admin-story-detail__header">
        <div>
          <p className="admin-section-label">{t('read_only_details')}</p>
          <h2>{story.title}</h2>
          <p>
            {t('story_details_byline', {
              user: story.user_email ?? story.user_id ?? t('unidentified_user'),
              version: formatNumber(story.version_number, language),
              date: formatDateTime(story.created_at, language),
            })}
          </p>
        </div>
        <button type="button" className="admin-button" onClick={onClose}>
          {t('close_details')}
        </button>
      </div>
      <div className="admin-story-detail__grid">
        {detailSections.map((section) => (
          <article key={section.label} className="admin-story-detail__block">
            <h3>{section.label}</h3>
            <p>{section.value || t('not_provided')}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function StoriesTab({ data, search, selectedStory, onSearchChange, onPageChange, onSelectStory, onCloseStory }) {
  const t = useCopy('admin')
  const { language } = useLanguage()
  return (
    <>
      <AdminSectionToolbar>
        <SearchField
          id="admin-stories-search"
          label={t('search_artifacts')}
          placeholder={t('title_context_or_content')}
          value={search}
          onChange={onSearchChange}
        />
      </AdminSectionToolbar>
      <DataTable
        title={t('recent_artifacts')}
        description={t('open_the_read_only_details_to_view')}
        columns={[t('title'), t('user'), t('status'), t('version'), t('created_on'), t('details')]}
        rows={data.rows}
        emptyMessage={t('no_artifacts_found')}
        renderRow={(story) => (
          <tr key={story.id}>
            <td>{story.title}</td>
            <td>{story.user_email ?? story.user_id ?? emptyDash}</td>
            <td>{formatStoryStatus(story.status, t)}</td>
            <td>{formatNumber(story.version_number, language)}</td>
            <td>{formatDateTime(story.created_at, language)}</td>
            <td>
              <button type="button" className="admin-button admin-button--compact" onClick={() => onSelectStory(story)}>
                {t('view_details')}
              </button>
            </td>
          </tr>
        )}
      />
      <Pagination {...data} onPageChange={onPageChange} />
      <StoryDetail story={selectedStory} onClose={onCloseStory} />
    </>
  )
}

function LearningTab({ data, search, onSearchChange, onPageChange }) {
  const t = useCopy('admin')
  const { language } = useLanguage()
  const guides = useLearningCatalog()?.guides
  return (
    <>
      <AdminSectionToolbar>
        <SearchField
          id="admin-learning-search"
          label={t('search_guides')}
          placeholder={t('guide_identifier')}
          value={search}
          onChange={onSearchChange}
        />
      </AdminSectionToolbar>

      <DataTable
        title={t('completions_by_guide')}
        description={t('guides_ranked_by_completions_in_the_selected')}
        columns={[t('guide'), t('identifier'), t('completions')]}
        rows={data.guideSummary}
        emptyMessage={t('no_completions_in_this_period')}
        renderRow={(guide) => (
          <tr key={guide.guide_slug}>
            <td>{guides?.[guide.guide_slug]?.title ?? guide.guide_title}</td>
            <td>
              <code className="admin-event-code">{guide.guide_slug}</code>
            </td>
            <td>{formatNumber(guide.completions, language)}</td>
          </tr>
        )}
      />

      <DataTable
        title={t('recent_completions')}
        description={t('users_who_marked_guides_as_complete')}
        columns={[t('user'), t('guide'), t('date_and_time')]}
        rows={data.rows}
        emptyMessage={t('no_recent_completions_found')}
        renderRow={(row) => (
          <tr key={row.id}>
            <td>{row.user_email ?? row.user_id ?? emptyDash}</td>
            <td>{guides?.[row.guide_slug]?.title ?? row.guide_title}</td>
            <td>{formatDateTime(row.completed_at, language)}</td>
          </tr>
        )}
      />
      <Pagination {...data} onPageChange={onPageChange} />
    </>
  )
}

function AdminPage() {
  const t = useCopy('admin')
  const { setTopbarStatus } = useOutletContext() ?? {}
  const [period, setPeriod] = useState('7d')
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState({
    leads: '',
    users: '',
    stories: '',
    learning: '',
  })
  const [pages, setPages] = useState({
    leads: 1,
    users: 1,
    stories: 1,
    learning: 1,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [selectedStoryId, setSelectedStoryId] = useState(null)
  const [selectedAccessUser, setSelectedAccessUser] = useState(null)
  const [isSavingAccess, setIsSavingAccess] = useState(false)
  const [accessFeedback, setAccessFeedback] = useState(null)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setIsLoading(true)
      setError('')

      try {
        const data = await fetchAdminDashboard({
          period,
          leads: { search: search.leads, page: pages.leads },
          users: { search: search.users, page: pages.users },
          stories: { search: search.stories, page: pages.stories },
          learning: { search: search.learning, page: pages.learning },
        })

        if (active) {
          setDashboard(data)
        }
      } catch (loadError) {
        console.error('Falha ao carregar painel administrativo:', loadError)
        if (active) {
          setError('could_not_load_administration_data_check_your')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [period, search, pages])

  const periodLabel = t(periodOptions.find((option) => option.value === period)?.label ?? 'selected_period')

  const activeTabLabel = t(adminTabs.find((tab) => tab.id === activeTab)?.label ?? 'overview')

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: t('administration'),
      title: activeTabLabel,
      pills: [
        { text: periodLabel },
        { text: t('secure_access') },
      ],
    })

    return () => setTopbarStatus(null)
  }, [activeTabLabel, periodLabel, setTopbarStatus, t])

  const selectedStory = useMemo(() => {
    if (!selectedStoryId || !dashboard?.stories?.rows) return null
    return dashboard.stories.rows.find((story) => story.id === selectedStoryId) ?? null
  }, [dashboard, selectedStoryId])

  function updateSearch(section, value) {
    setSearch((current) => ({ ...current, [section]: value }))
    setPages((current) => ({ ...current, [section]: 1 }))
  }

  function updatePage(section, nextPage) {
    setPages((current) => ({ ...current, [section]: nextPage }))
  }

  function openAccessModal(user) {
    setSelectedAccessUser(user)
    setAccessFeedback(null)
  }

  function closeAccessModal() {
    if (isSavingAccess) return
    setSelectedAccessUser(null)
    setAccessFeedback(null)
  }

  async function handleSaveUserAccess(payload) {
    if (!selectedAccessUser?.id || isSavingAccess) return

    setIsSavingAccess(true)
    setAccessFeedback(null)
    const response = await updateAdminUserAccess({
      userId: selectedAccessUser.id,
      ...payload,
    })
    setIsSavingAccess(false)

    if (!response.success) {
      setAccessFeedback({
        tone: 'error',
        message: response.messageKey,
      })
      return
    }

    const updatedAccess = response.data ?? {
      plan: payload.plan,
      forge_limit_override: payload.forgeLimitOverride,
      access_notes: payload.notes,
      updated_at: new Date().toISOString(),
    }

    const mergedUser = {
      ...selectedAccessUser,
      ...updatedAccess,
    }

    setSelectedAccessUser(mergedUser)
    setDashboard((current) => {
      if (!current?.users?.rows) return current

      return {
        ...current,
        users: {
          ...current.users,
          rows: current.users.rows.map((user) => (
            user.id === selectedAccessUser.id ? { ...user, ...updatedAccess } : user
          )),
        },
      }
    })
    setAccessFeedback({
      tone: 'success',
      message: 'access_updated_successfully',
    })
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__header-copy">
          <div className="admin-page__kicker-row">
            <p className="admin-page__eyebrow">{t('administration')}</p>
            <span className="admin-page__status-pill">{t('secure_access')}</span>
          </div>
          <h1 className="admin-page__title">{t('forge_control_room')}</h1>
          <p className="admin-page__description">
            {t('dashboard_description', { product: APP_NAME })}
          </p>
        </div>

        <div className="admin-page__filter" role="group" aria-label={t('administration_dashboard_filter')}>
          <label className="admin-page__filter-label" htmlFor="period-select">
            {t('reporting_period')}
          </label>
          <select
            id="period-select"
            className="admin-page__filter-select"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </div>
      </header>

      <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

      {isLoading ? <StateCard tone="loading">{t('loading_administration_data')}</StateCard> : null}
      {error && !isLoading ? <StateCard tone="error">{formatNotice(t, error)}</StateCard> : null}

      {!isLoading && !error && dashboard ? (
        <div
          id={`admin-panel-${activeTab}`}
          className="admin-tab-panel"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`admin-tab-${activeTab}`}
        >
          {activeTab === 'overview' ? <OverviewTab dashboard={dashboard} periodLabel={periodLabel} /> : null}
          {activeTab === 'leads' ? (
            <LeadsTab
              data={dashboard.leads}
              search={search.leads}
              onSearchChange={(value) => updateSearch('leads', value)}
              onPageChange={(page) => updatePage('leads', page)}
            />
          ) : null}
          {activeTab === 'users' ? (
            <UsersTab
              data={dashboard.users}
              search={search.users}
              onSearchChange={(value) => updateSearch('users', value)}
              onPageChange={(page) => updatePage('users', page)}
              onManageAccess={openAccessModal}
            />
          ) : null}
          {activeTab === 'usage' ? <UsageTab usage={dashboard.usage} /> : null}
          {activeTab === 'stories' ? (
            <StoriesTab
              data={dashboard.stories}
              search={search.stories}
              selectedStory={selectedStory}
              onSearchChange={(value) => updateSearch('stories', value)}
              onPageChange={(page) => updatePage('stories', page)}
              onSelectStory={(story) => setSelectedStoryId(story.id)}
              onCloseStory={() => setSelectedStoryId(null)}
            />
          ) : null}
          {activeTab === 'learning' ? (
            <LearningTab
              data={dashboard.learning}
              search={search.learning}
              onSearchChange={(value) => updateSearch('learning', value)}
              onPageChange={(page) => updatePage('learning', page)}
            />
          ) : null}
        </div>
      ) : null}

      {selectedAccessUser ? (
        <UserAccessModal
          key={selectedAccessUser.id}
          user={selectedAccessUser}
          isSaving={isSavingAccess}
          feedback={accessFeedback}
          onClose={closeAccessModal}
          onSave={handleSaveUserAccess}
        />
      ) : null}
    </div>
  )
}

export default AdminPage
