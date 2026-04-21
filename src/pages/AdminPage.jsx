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
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDay(value) {
  if (!value) return '-'
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

function FunnelTable({ funnel }) {
  return (
    <section className="panel admin-table-panel">
      <div className="panel-header">
        <h2>Funil principal</h2>
        <p>Conversão entre etapas de aquisição e uso do produto.</p>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Etapa</th>
              <th>Volume</th>
              <th>Conversão etapa anterior</th>
            </tr>
          </thead>
          <tbody>
            {funnel.steps.map((item) => (
              <tr key={item.step}>
                <td>{item.step}</td>
                <td>{item.count}</td>
                <td>
                  {item.conversion_from_previous === null
                    ? '-'
                    : formatPercent(item.conversion_from_previous)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="admin-inline-note">
        Conversão final da landing para geração com sucesso:{' '}
        <strong>{formatPercent(funnel.final_completion_rate)}</strong>
      </p>
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
        if (!active) return
        setAnalytics(data)
      } catch {
        if (!active) return
        setError('Não foi possível carregar os dados agora. Tente novamente.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadAnalytics()

    return () => {
      active = false
    }
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
      { label: 'Total de gerações com sucesso', value: operational.total_generate_success },
      { label: 'Total de falhas de geração', value: operational.total_generate_failed },
      { label: 'Taxa de falha da geração', value: formatPercent(operational.generation_failure_rate) },
      { label: 'Usuários únicos ativos', value: operational.total_active_unique_users },
      { label: 'Usuários que atingiram o limite Free', value: operational.users_reached_free_limit },
      {
        label: 'Taxa da área de trabalho sem geração',
        value: `${formatPercent(operational.tool_without_generation_rate)} (${operational.tool_users_without_generation}/${operational.tool_users_total || 0})`,
      },
      { label: 'Cadastros concluídos', value: overview.signup_completed },
      { label: 'Logins concluídos', value: overview.login_completed },
    ]
  }, [overview, operational])

  return (
    <div className="page admin-page">
      <section className="tool-header">
        <p className="eyebrow">Admin</p>
        <h1>Painel de produto do {APP_NAME}</h1>
        <p>Visão operacional para aquisição, conversão e uso do produto.</p>
      </section>

      <section className="panel admin-filter-panel">
        <div className="panel-header panel-header-row">
          <h2>Período</h2>
          <select
            className="history-filter"
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
      </section>

      {isLoading ? (
        <section className="panel panel-muted">
          <p className="history-status">Carregando métricas...</p>
        </section>
      ) : null}

      {error ? (
        <section className="panel panel-muted">
          <p className="history-status history-status-error">{error}</p>
        </section>
      ) : null}

      {hasNoData ? (
        <section className="panel panel-muted">
          <p className="history-status">Nenhum evento encontrado para o período selecionado.</p>
        </section>
      ) : null}

      {!isLoading && !error && !hasNoData && overview && operational && funnel ? (
        <>
          <section className="admin-overview-grid">
            {topMetrics.map((metric) => (
              <article className="panel admin-metric-card" key={metric.label}>
                <p className="admin-metric-label">{metric.label}</p>
                <h2>{metric.value}</h2>
              </article>
            ))}
          </section>

          <FunnelTable funnel={funnel} />

          <section className="panel admin-table-panel">
            <div className="panel-header">
              <h2>Atividade por dia</h2>
              <p>Resumo diário de eventos e conversões principais.</p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Total de eventos</th>
                    <th>Gerações com sucesso</th>
                    <th>Cadastros concluídos</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyActivity.map((day) => (
                    <tr key={day.day}>
                      <td>{formatDay(day.day)}</td>
                      <td>{day.total_events}</td>
                      <td>{day.user_story_generate_success}</td>
                      <td>{day.signup_completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel admin-table-panel">
            <div className="panel-header">
              <h2>Eventos recentes</h2>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Usuário</th>
                    <th>Página</th>
                    <th>Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.event_name}</td>
                      <td>{event.user_email ?? event.user_id ?? 'anônimo'}</td>
                      <td>{event.page_path ?? '-'}</td>
                      <td>{formatDateTime(event.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel admin-table-panel">
            <div className="panel-header">
              <h2>Resumo por evento</h2>
              <p>Ordenado por maior volume no período selecionado.</p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Quantidade</th>
                    <th>Percentual do total</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedEvents.map((item) => (
                    <tr key={item.event_name}>
                      <td>{item.event_name}</td>
                      <td>{item.total}</td>
                      <td>{formatPercent(item.percentage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

export default AdminPage
