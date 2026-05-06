import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  APP_NAME,
  MAX_FORGE_LIMIT_OVERRIDE,
  PLAN_VALUES,
  getEffectiveForgeLimit,
  getRemainingForgeGenerations,
} from '../constants/app'
import { fetchAdminDashboard } from '../services/adminDashboardService'
import { updateAdminUserAccess } from '../services/adminUserAccessService'
import '../styles/pages.css'

const periodOptions = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
]

const adminTabs = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'leads', label: 'Interessados' },
  { id: 'users', label: 'Usuários' },
  { id: 'usage', label: 'Uso' },
  { id: 'stories', label: 'Peças' },
  { id: 'learning', label: 'Aprendizado' },
]

const accessPlanOptions = [
  { value: PLAN_VALUES.FREE, label: 'Free' },
  { value: PLAN_VALUES.PRO, label: 'Pro' },
]

const emptyDash = '—'

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value ?? 0))
}

function formatDateTime(value) {
  if (!value) return emptyDash
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return emptyDash

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDay(value) {
  if (!value) return emptyDash
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

function formatPlan(plan) {
  if (plan === 'premium') return 'Pro'
  return 'Free'
}

function formatRole(role) {
  if (role === 'admin') return 'Admin'
  return 'Usuário'
}

function formatStoryStatus(status) {
  const statusLabels = {
    generated: 'Forjada',
    reviewed: 'Inspecionada',
    approved: 'Aprovada',
    archived: 'Arquivada',
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

function formatForgeLimit(limit) {
  return limit === null ? 'Ilimitado' : formatNumber(limit)
}

function formatRemainingForges(remaining) {
  return remaining === null ? 'Ilimitadas' : formatNumber(remaining)
}

function parseForgeLimitOverride(value) {
  const rawValue = String(value ?? '').trim()
  if (!rawValue) return null

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`Informe um limite inteiro entre 0 e ${MAX_FORGE_LIMIT_OVERRIDE}.`)
  }

  const parsed = Number(rawValue)
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAX_FORGE_LIMIT_OVERRIDE) {
    throw new Error(`Informe um limite inteiro entre 0 e ${MAX_FORGE_LIMIT_OVERRIDE}.`)
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
      <p>{children}</p>
    </div>
  )
}

function AdminTabs({ activeTab, onChange }) {
  return (
    <div className="admin-tabs" role="tablist" aria-label="Seções administrativas">
      {adminTabs.map((tab) => (
        <button
          key={tab.id}
          id={`admin-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-controls={`admin-panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          className={`admin-tabs__button ${activeTab === tab.id ? 'admin-tabs__button--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
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
        <h2 className="admin-table-section__title">{title}</h2>
        {description ? <p className="admin-table-section__desc">{description}</p> : null}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
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
  if (!totalCount) return null

  const safeTotalPages = Math.max(totalPages, 1)

  return (
    <div className="admin-pagination" aria-label="Paginação">
      <p>
        Página {page} de {safeTotalPages} · {formatNumber(totalCount)} registro
        {totalCount === 1 ? '' : 's'}
      </p>
      <div className="admin-pagination__actions">
        <button
          type="button"
          className="admin-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="admin-button"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
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
  const [form, setForm] = useState(() => buildAccessForm(user))
  const [localError, setLocalError] = useState('')

  if (!user) return null

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
      setLocalError('Escolha um plano válido.')
      return
    }

    let forgeLimitOverride = null
    try {
      forgeLimitOverride = parseForgeLimitOverride(form.forgeLimitOverride)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Informe um limite válido.')
      return
    }

    await onSave({
      plan: form.plan,
      forgeLimitOverride,
      notes: form.notes.trim() || null,
    })
  }

  return (
    <div className="admin-access-modal" role="presentation">
      <button
        type="button"
        className="admin-access-modal__backdrop"
        aria-label="Cancelar gerenciamento de acesso"
        onClick={onClose}
      />

      <form
        className="admin-access-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-access-modal-title"
        onSubmit={handleSubmit}
      >
        <div className="admin-access-modal__header">
          <div>
            <p className="admin-section-label">Acesso do usuário</p>
            <h2 id="admin-access-modal-title">Gerenciar acesso</h2>
            <p>{user.email}</p>
          </div>
          <button type="button" className="admin-button admin-button--compact" onClick={onClose}>
            Cancelar
          </button>
        </div>

        <dl className="admin-access-summary">
          <AccessSummaryItem label="Papel atual" value={formatRole(user.role)} />
          <AccessSummaryItem label="Plano atual" value={formatPlan(user.plan)} />
          <AccessSummaryItem label="Usadas" value={formatNumber(user.stories_count)} />
          <AccessSummaryItem label="Limite" value={formatForgeLimit(currentLimit)} />
          <AccessSummaryItem label="Restantes" value={formatRemainingForges(remainingForges)} />
          <AccessSummaryItem label="Última atividade" value={formatDateTime(user.last_activity_at)} />
        </dl>

        {limitReached ? (
          <p className="admin-access-modal__limit-warning" role="status">
            Limite atingido
          </p>
        ) : null}

        <div className="admin-access-modal__fields">
          <label className="admin-access-field">
            <span>Plano</span>
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
            <span>Limite de forjas</span>
            <input
              type="number"
              min="0"
              max={MAX_FORGE_LIMIT_OVERRIDE}
              step="1"
              inputMode="numeric"
              value={form.forgeLimitOverride}
              placeholder="Usar padrão do plano"
              onChange={(event) => updateForm('forgeLimitOverride', event.target.value)}
              disabled={isSaving}
            />
            <small>
              Deixe em branco para usar o padrão do plano. O plano Free mantém 10 forjas.
            </small>
          </label>

          <label className="admin-access-field">
            <span>Observação administrativa</span>
            <textarea
              value={form.notes}
              placeholder="Motivo da alteração"
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
            {shownFeedback.message}
          </p>
        ) : null}

        <div className="admin-access-modal__actions">
          <button type="button" className="admin-button" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" className="admin-button admin-button--primary" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}

function OverviewTab({ dashboard, periodLabel }) {
  const overview = dashboard.overview

  const metrics = [
    {
      label: 'Interessados totais',
      value: formatNumber(overview.totalLeads),
      note: `${formatNumber(overview.periodLeads)} no período`,
      tone: 'tech',
    },
    {
      label: 'Usuários totais',
      value: formatNumber(overview.totalUsers),
      note: `${formatNumber(overview.periodUsers)} novos no período`,
      tone: 'success',
    },
    {
      label: 'Peças forjadas',
      value: formatNumber(overview.totalStories),
      note: `${formatNumber(overview.periodStories)} no período`,
      tone: 'ember',
    },
    {
      label: 'Usuários ativos',
      value: formatNumber(overview.activeUsers),
      note: periodLabel,
    },
    {
      label: 'Conclusões de guias',
      value: formatNumber(overview.totalLearningCompletions),
      note: `${formatNumber(overview.periodLearningCompletions)} no período`,
      tone: 'tech',
    },
    {
      label: 'Gerações com sucesso',
      value: formatNumber(overview.generationSuccess),
      note: periodLabel,
      tone: 'success',
    },
    {
      label: 'Falhas de geração',
      value: formatNumber(overview.generationFailures),
      note: `Taxa de falha: ${formatPercent(overview.failureRate)}`,
      tone: 'danger',
    },
    {
      label: 'Eventos registrados',
      value: formatNumber(dashboard.usage.overview.total_events),
      note: `${formatNumber(dashboard.usage.overview.unique_users)} usuários únicos`,
    },
  ]

  return (
    <section className="admin-metrics-section">
      <p className="admin-section-label">Resumo operacional</p>
      <div className="admin-metrics-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  )
}

function LeadsTab({ data, search, onSearchChange, onPageChange }) {
  return (
    <>
      <AdminSectionToolbar>
        <SearchField
          id="admin-leads-search"
          label="Buscar interessados"
          placeholder="Nome ou e-mail"
          value={search}
          onChange={onSearchChange}
        />
      </AdminSectionToolbar>
      <DataTable
        title="Lista de interessados"
        description="Pessoas que registraram interesse na lista pública."
        columns={['Nome', 'E-mail', 'Entrada']}
        rows={data.rows}
        emptyMessage="Nenhuma pessoa interessada encontrada."
        renderRow={(lead) => (
          <tr key={lead.id}>
            <td>{lead.name}</td>
            <td>{lead.email}</td>
            <td>{formatDateTime(lead.created_at)}</td>
          </tr>
        )}
      />
      <Pagination {...data} onPageChange={onPageChange} />
    </>
  )
}

function UsersTab({ data, search, onSearchChange, onPageChange, onManageAccess }) {
  return (
    <>
      <AdminSectionToolbar>
        <SearchField
          id="admin-users-search"
          label="Buscar usuários"
          placeholder="E-mail do usuário"
          value={search}
          onChange={onSearchChange}
        />
      </AdminSectionToolbar>
      <DataTable
        title="Usuários"
        description="Contas criadas, papel, plano e atividade recente."
        columns={['E-mail', 'Plano', 'Papel', 'Cadastro', 'Última atividade', 'Histórias', 'Guias', 'Acesso']}
        rows={data.rows}
        emptyMessage="Nenhum usuário encontrado."
        renderRow={(user) => (
          <tr key={user.id}>
            <td>{user.email}</td>
            <td>
              <span className="admin-user-plan-cell">
                <span>{formatPlan(user.plan)}</span>
                {isUserAtForgeLimit(user) ? (
                  <span className="admin-badge admin-badge--warning">Limite atingido</span>
                ) : null}
              </span>
            </td>
            <td>
              <span className={`admin-badge ${user.role === 'admin' ? 'admin-badge--strong' : ''}`}>
                {formatRole(user.role)}
              </span>
            </td>
            <td>{formatDateTime(user.created_at)}</td>
            <td>{formatDateTime(user.last_activity_at)}</td>
            <td>{formatNumber(user.stories_count)}</td>
            <td>{formatNumber(user.guides_count)}</td>
            <td>
              <button type="button" className="admin-button admin-button--compact" onClick={() => onManageAccess(user)}>
                Gerenciar
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
  return (
    <>
      <section className="admin-metrics-section">
        <p className="admin-section-label">Uso da ferramenta</p>
        <div className="admin-metrics-grid">
          <MetricCard
            label="Gerações com sucesso"
            value={formatNumber(usage.operational.total_generate_success)}
            tone="success"
          />
          <MetricCard
            label="Falhas de geração"
            value={formatNumber(usage.operational.total_generate_failed)}
            tone="danger"
          />
          <MetricCard
            label="Taxa de falha"
            value={formatPercent(usage.operational.generation_failure_rate)}
            tone="warning"
          />
          <MetricCard
            label="Atingiram limite Free"
            value={formatNumber(usage.operational.users_reached_free_limit)}
            tone="tech"
          />
          <MetricCard
            label="Workspace sem geração"
            value={formatPercent(usage.operational.tool_without_generation_rate)}
            note={`${formatNumber(usage.operational.tool_users_without_generation)} de ${formatNumber(
              usage.operational.tool_users_total,
            )} usuários`}
          />
        </div>
      </section>

      <DataTable
        title="Funil principal"
        description="Conversão entre etapas de aquisição e uso do produto."
        columns={['Etapa', 'Volume', 'Conversão da etapa anterior']}
        rows={usage.funnel.steps}
        emptyMessage="Nenhuma etapa encontrada."
        renderRow={(item) => (
          <tr key={item.step}>
            <td>
              <code className="admin-event-code">{item.step}</code>
            </td>
            <td>{formatNumber(item.count)}</td>
            <td>{item.conversion_from_previous === null ? emptyDash : formatPercent(item.conversion_from_previous)}</td>
          </tr>
        )}
      />
      <p className="admin-inline-note">
        Conversão total da landing para geração:{' '}
        <strong>{formatPercent(usage.funnel.final_completion_rate)}</strong>
      </p>

      <DataTable
        title="Atividade por dia"
        description="Resumo diário de eventos e conversões principais."
        columns={['Data', 'Eventos', 'Gerações', 'Cadastros']}
        rows={usage.dailyActivity}
        emptyMessage="Nenhuma atividade encontrada."
        renderRow={(day) => (
          <tr key={day.day}>
            <td>{formatDay(day.day)}</td>
            <td>{formatNumber(day.total_events)}</td>
            <td>{formatNumber(day.user_story_generate_success)}</td>
            <td>{formatNumber(day.signup_completed)}</td>
          </tr>
        )}
      />

      <DataTable
        title="Eventos recentes"
        columns={['Evento', 'Usuário', 'Página', 'Data e hora']}
        rows={usage.recentEvents}
        emptyMessage="Nenhum evento recente."
        renderRow={(event) => (
          <tr key={event.id}>
            <td>
              <code className="admin-event-code">{event.event_name}</code>
            </td>
            <td>{event.user_email ?? event.user_id ?? 'anônimo'}</td>
            <td>{event.page_path ?? emptyDash}</td>
            <td>{formatDateTime(event.created_at)}</td>
          </tr>
        )}
      />

      <DataTable
        title="Resumo por evento"
        description="Ordenado por maior volume no período selecionado."
        columns={['Evento', 'Quantidade', '% do total']}
        rows={usage.groupedEvents}
        emptyMessage="Nenhum evento agrupado."
        renderRow={(item) => (
          <tr key={item.event_name}>
            <td>
              <code className="admin-event-code">{item.event_name}</code>
            </td>
            <td>{formatNumber(item.total)}</td>
            <td>
              <span className="admin-percent-bar">{formatPercent(item.percentage)}</span>
            </td>
          </tr>
        )}
      />
    </>
  )
}

function StoryDetail({ story, onClose }) {
  if (!story) return null

  const detailSections = [
    { label: 'Contexto de entrada', value: story.input_context },
    { label: 'Requisitos de entrada', value: story.input_requirements },
    { label: 'Objetivo', value: story.objective },
    { label: 'User story', value: story.user_story },
    { label: 'Critérios de aceite', value: story.acceptance_criteria },
    { label: 'Regras de negócio', value: story.business_rules },
    { label: 'Lacunas', value: story.gaps },
    { label: 'Checklist de QA', value: story.qa_checklist },
  ]

  return (
    <section className="admin-story-detail" aria-label="Detalhe da peça selecionada">
      <div className="admin-story-detail__header">
        <div>
          <p className="admin-section-label">Detalhe somente leitura</p>
          <h2>{story.title}</h2>
          <p>
            {story.user_email ?? story.user_id ?? 'Usuário não identificado'} · versão{' '}
            {formatNumber(story.version_number)} · {formatDateTime(story.created_at)}
          </p>
        </div>
        <button type="button" className="admin-button" onClick={onClose}>
          Fechar detalhe
        </button>
      </div>
      <div className="admin-story-detail__grid">
        {detailSections.map((section) => (
          <article key={section.label} className="admin-story-detail__block">
            <h3>{section.label}</h3>
            <p>{section.value || 'Não informado.'}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function StoriesTab({ data, search, selectedStory, onSearchChange, onPageChange, onSelectStory, onCloseStory }) {
  return (
    <>
      <AdminSectionToolbar>
        <SearchField
          id="admin-stories-search"
          label="Buscar peças"
          placeholder="Título, contexto ou conteúdo"
          value={search}
          onChange={onSearchChange}
        />
      </AdminSectionToolbar>
      <DataTable
        title="Peças recentes"
        description="Conteúdo completo disponível apenas no detalhe somente leitura."
        columns={['Título', 'Usuário', 'Status', 'Versão', 'Criada em', 'Detalhe']}
        rows={data.rows}
        emptyMessage="Nenhuma peça encontrada."
        renderRow={(story) => (
          <tr key={story.id}>
            <td>{story.title}</td>
            <td>{story.user_email ?? story.user_id ?? emptyDash}</td>
            <td>{formatStoryStatus(story.status)}</td>
            <td>{formatNumber(story.version_number)}</td>
            <td>{formatDateTime(story.created_at)}</td>
            <td>
              <button type="button" className="admin-button admin-button--compact" onClick={() => onSelectStory(story)}>
                Ver detalhe
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
  return (
    <>
      <AdminSectionToolbar>
        <SearchField
          id="admin-learning-search"
          label="Buscar guias"
          placeholder="Identificador do guia"
          value={search}
          onChange={onSearchChange}
        />
      </AdminSectionToolbar>

      <DataTable
        title="Conclusões por guia"
        description="Ranking de guias concluídos no período selecionado."
        columns={['Guia', 'Identificador', 'Conclusões']}
        rows={data.guideSummary}
        emptyMessage="Nenhuma conclusão no período."
        renderRow={(guide) => (
          <tr key={guide.guide_slug}>
            <td>{guide.guide_title}</td>
            <td>
              <code className="admin-event-code">{guide.guide_slug}</code>
            </td>
            <td>{formatNumber(guide.completions)}</td>
          </tr>
        )}
      />

      <DataTable
        title="Conclusões recentes"
        description="Usuários que marcaram guias como concluídos."
        columns={['Usuário', 'Guia', 'Data e hora']}
        rows={data.rows}
        emptyMessage="Nenhuma conclusão recente encontrada."
        renderRow={(row) => (
          <tr key={row.id}>
            <td>{row.user_email ?? row.user_id ?? emptyDash}</td>
            <td>{row.guide_title}</td>
            <td>{formatDateTime(row.completed_at)}</td>
          </tr>
        )}
      />
      <Pagination {...data} onPageChange={onPageChange} />
    </>
  )
}

function AdminPage() {
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
          setError('Não foi possível carregar os dados administrativos agora. Verifique as permissões e tente novamente.')
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

  const periodLabel = useMemo(
    () => periodOptions.find((option) => option.value === period)?.label ?? 'Período selecionado',
    [period],
  )

  const activeTabLabel = useMemo(
    () => adminTabs.find((tab) => tab.id === activeTab)?.label ?? 'Visão geral',
    [activeTab],
  )

  useEffect(() => {
    if (typeof setTopbarStatus !== 'function') return

    setTopbarStatus({
      label: 'Administração',
      title: activeTabLabel,
      pills: [
        { text: periodLabel },
        { text: 'Controle seguro' },
      ],
    })

    return () => setTopbarStatus(null)
  }, [activeTabLabel, periodLabel, setTopbarStatus])

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
    setSelectedAccessUser(null)
    setAccessFeedback(null)
  }

  async function handleSaveUserAccess(payload) {
    if (!selectedAccessUser?.id) return

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
        message: response.message,
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
      message: 'Acesso atualizado com sucesso.',
    })
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__header-copy">
          <div className="admin-page__kicker-row">
            <p className="admin-page__eyebrow">Administração</p>
            <span className="admin-page__status-pill">Controle seguro</span>
          </div>
          <h1 className="admin-page__title">Sala de controle da Forja</h1>
          <p className="admin-page__description">
            Operação, aquisição, uso da ferramenta e aprendizado do {APP_NAME} em uma visão de produto.
          </p>
        </div>

        <div className="admin-page__filter" aria-label="Filtro do painel administrativo">
          <label className="admin-page__filter-label" htmlFor="period-select">
            Período analisado
          </label>
          <select
            id="period-select"
            className="admin-page__filter-select"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

      {isLoading ? <StateCard tone="loading">Carregando dados administrativos...</StateCard> : null}
      {error && !isLoading ? <StateCard tone="error">{error}</StateCard> : null}

      {!isLoading && !error && dashboard ? (
        <div
          id={`admin-panel-${activeTab}`}
          className="admin-tab-panel"
          role="tabpanel"
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
