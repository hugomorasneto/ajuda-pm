import { useEffect, useMemo, useState } from 'react'
import { APP_NAME } from '../constants/app'
import { fetchAdminAnalytics } from '../services/adminAnalyticsService'

const periodOptions = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
]

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function formatDay(value) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date)
}

function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

/* ── Sub-components ── */

function MetricCard({ label, value }) {
  return (
    <article className="admin-metric-card">
      <p className="admin-metric-card__label">{label}</p>
      <p className="admin-metric-card__value">{value}</p>
    </article>
  )
}

function DataTable({ title, description, columns, rows, renderRow }) {
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
              {columns.map((col) => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      </div>
    </section>
  )
}

function AdminPage() {
  const [period, setPeriod] = useState('7d')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    let active = true
    async function loadAnalytics() {
      setIsLoading(true)
      setError('')
      try {
        const data = await fetchAdminAnalytics(period)
        if (active) setAnalytics(data)
      } catch {
        if (active) setError('Não foi possível carregar os dados agora. Tente novamente.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadAnalytics()
    return () => { active = false }
  }, [period])

  const hasNoData = !isLoading && !error && (analytics?.overview?.total_events ?? 0) === 0
  const overview = analytics?.overview
  const operational = analytics?.operational
  const funnel = analytics?.funnel
  const dailyActivity = analytics?.dailyActivity ?? []
  const recentEvents = analytics?.recentEvents ?? []
  const groupedEvents = analytics?.groupedEvents ?? []

  const topMetrics = useMemo(() => {
    if (!overview || !operational) return []
    return [
      { label: 'Gerações com sucesso', value: operational.total_generate_success },
      { label: 'Falhas de geração', value: operational.total_generate_failed },
      { label: 'Taxa de falha', value: formatPercent(operational.generation_failure_rate) },
      { label: 'Usuários únicos ativos', value: operational.total_active_unique_users },
      { label: 'Atingiram limite Free', value: operational.users_reached_free_limit },
      {
        label: 'Workspace sem geração',
        value: `${formatPercent(operational.tool_without_generation_rate)} (${operational.tool_users_without_generation}/${operational.tool_users_total || 0})`,
      },
      { label: 'Cadastros concluídos', value: overview.signup_completed },
      { label: 'Logins concluídos', value: overview.login_completed },
    ]
  }, [overview, operational])

  return (
    <div className="admin-page">
      {/* Page header */}
      <header className="admin-page__header">
        <div className="admin-page__header-copy">
          <p className="admin-page__eyebrow">Admin</p>
          <h1 className="admin-page__title">Painel de produto — {APP_NAME}</h1>
          <p className="admin-page__description">
            Visão operacional de aquisição, conversão e uso.
          </p>
        </div>

        {/* Period filter */}
        <div className="admin-page__filter">
          <label className="admin-page__filter-label" htmlFor="period-select">Período</label>
          <select
            id="period-select"
            className="admin-page__filter-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </header>

      {/* States */}
      {isLoading && (
        <div className="admin-state-card">
          <div className="admin-state-card__spinner" aria-hidden="true" />
          <p>Carregando métricas…</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="admin-state-card admin-state-card--error">
          <p>{error}</p>
        </div>
      )}

      {hasNoData && !isLoading && (
        <div className="admin-state-card">
          <p>Nenhum evento encontrado para o período selecionado.</p>
        </div>
      )}

      {/* Data */}
      {!isLoading && !error && !hasNoData && overview && operational && funnel && (
        <>
          {/* Metrics grid */}
          <section className="admin-metrics-section">
            <p className="admin-section-label">Visão geral</p>
            <div className="admin-metrics-grid">
              {topMetrics.map((m) => (
                <MetricCard key={m.label} label={m.label} value={m.value} />
              ))}
            </div>
          </section>

          {/* Funnel */}
          <DataTable
            title="Funil principal"
            description="Conversão entre etapas de aquisição e uso do produto."
            columns={['Etapa', 'Volume', 'Conversão da etapa anterior']}
            rows={funnel.steps}
            renderRow={(item) => (
              <tr key={item.step}>
                <td>{item.step}</td>
                <td>{item.count}</td>
                <td>
                  {item.conversion_from_previous === null
                    ? '—'
                    : formatPercent(item.conversion_from_previous)}
                </td>
              </tr>
            )}
          />
          <p className="admin-inline-note">
            Conversão total (landing → geração):{' '}
            <strong>{formatPercent(funnel.final_completion_rate)}</strong>
          </p>

          {/* Daily activity */}
          <DataTable
            title="Atividade por dia"
            description="Resumo diário de eventos e conversões principais."
            columns={['Data', 'Eventos', 'Gerações', 'Cadastros']}
            rows={dailyActivity}
            renderRow={(day) => (
              <tr key={day.day}>
                <td>{formatDay(day.day)}</td>
                <td>{day.total_events}</td>
                <td>{day.user_story_generate_success}</td>
                <td>{day.signup_completed}</td>
              </tr>
            )}
          />

          {/* Recent events */}
          <DataTable
            title="Eventos recentes"
            columns={['Evento', 'Usuário', 'Página', 'Data / Hora']}
            rows={recentEvents}
            renderRow={(event) => (
              <tr key={event.id}>
                <td><code className="admin-event-code">{event.event_name}</code></td>
                <td>{event.user_email ?? event.user_id ?? 'anônimo'}</td>
                <td>{event.page_path ?? '—'}</td>
                <td>{formatDateTime(event.created_at)}</td>
              </tr>
            )}
          />

          {/* Grouped events */}
          <DataTable
            title="Resumo por evento"
            description="Ordenado por maior volume no período selecionado."
            columns={['Evento', 'Quantidade', '% do total']}
            rows={groupedEvents}
            renderRow={(item) => (
              <tr key={item.event_name}>
                <td><code className="admin-event-code">{item.event_name}</code></td>
                <td>{item.total}</td>
                <td>
                  <span className="admin-percent-bar" style={{ '--pct': `${Math.min(item.percentage, 100)}%` }}>
                    {formatPercent(item.percentage)}
                  </span>
                </td>
              </tr>
            )}
          />
        </>
      )}
    </div>
  )
}

export default AdminPage
