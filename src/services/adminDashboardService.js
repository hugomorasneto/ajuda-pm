import { learningGuides } from '../content/learningContent'
import { supabase } from '../lib/supabaseClient'

const PAGE_SIZE = 1000
const MAX_ROWS = 50000
const DEFAULT_PAGE_SIZE = 10
const USER_PROFILE_COLUMNS = 'id, email, plan, role, forge_limit_override, access_notes, access_updated_by, updated_at, created_at'
const USER_PROFILE_FALLBACK_COLUMNS = 'id, email, plan, role, created_at'

const FUNNEL_EVENT_STEPS = [
  'landing_view',
  'signup_started',
  'signup_completed',
  'login_completed',
  'tool_view',
  'user_story_generate_clicked',
  'user_story_generate_success',
]

const guideTitlesBySlug = learningGuides.reduce((acc, guide) => {
  acc[guide.slug] = guide.title
  return acc
}, {})

function getDateFromFilter(period) {
  const now = new Date()

  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }

  if (period === '30d') {
    const date = new Date(now)
    date.setDate(date.getDate() - 30)
    return date.toISOString()
  }

  const date = new Date(now)
  date.setDate(date.getDate() - 7)
  return date.toISOString()
}

function normalizePage(page) {
  return Math.max(1, Number(page) || 1)
}

function normalizePageSize(pageSize) {
  return Math.max(1, Math.min(Number(pageSize) || DEFAULT_PAGE_SIZE, 50))
}

function getRange({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const safePage = normalizePage(page)
  const safePageSize = normalizePageSize(pageSize)
  const from = (safePage - 1) * safePageSize

  return {
    from,
    to: from + safePageSize - 1,
    page: safePage,
    pageSize: safePageSize,
  }
}

function getTotalPages(totalCount, pageSize) {
  return totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0
}

function cleanSearchTerm(search) {
  return String(search ?? '')
    .trim()
    .replace(/[,%()]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
}

function shouldRetryUsersWithoutAccessColumns(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return (
    message.includes('forge_limit_override') ||
    message.includes('access_notes') ||
    message.includes('access_updated_by') ||
    message.includes('updated_at')
  )
}

function withAccessDefaults(user) {
  return {
    ...user,
    forge_limit_override: Number.isInteger(user?.forge_limit_override)
      ? user.forge_limit_override
      : null,
    access_notes: user?.access_notes ?? null,
    access_updated_by: user?.access_updated_by ?? null,
    updated_at: user?.updated_at ?? null,
  }
}

function buildEventCountMap(events) {
  return events.reduce((acc, event) => {
    const name = event.event_name
    if (!name) return acc
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})
}

function toPercent(value, total) {
  if (!total) return 0
  return Number(((value / total) * 100).toFixed(1))
}

function formatDayKey(isoDate) {
  if (!isoDate) return null
  return isoDate.slice(0, 10)
}

function buildDailyActivity(events) {
  const byDay = {}

  for (const event of events) {
    const day = formatDayKey(event.created_at)
    if (!day) continue

    if (!byDay[day]) {
      byDay[day] = {
        day,
        total_events: 0,
        user_story_generate_success: 0,
        signup_completed: 0,
      }
    }

    byDay[day].total_events += 1
    if (event.event_name === 'user_story_generate_success') {
      byDay[day].user_story_generate_success += 1
    }
    if (event.event_name === 'signup_completed') {
      byDay[day].signup_completed += 1
    }
  }

  return Object.values(byDay).sort((a, b) => b.day.localeCompare(a.day))
}

function buildFunnel(eventCountMap) {
  const steps = FUNNEL_EVENT_STEPS.map((eventName, index) => {
    const count = eventCountMap[eventName] ?? 0
    const prevCount = index === 0 ? null : eventCountMap[FUNNEL_EVENT_STEPS[index - 1]] ?? 0

    return {
      step: eventName,
      count,
      conversion_from_previous: prevCount === null ? null : toPercent(count, prevCount),
    }
  })

  const landingCount = eventCountMap.landing_view ?? 0
  const finalSuccessCount = eventCountMap.user_story_generate_success ?? 0

  return {
    steps,
    final_completion_rate: toPercent(finalSuccessCount, landingCount),
  }
}

function buildOperationalMetrics(events, eventCountMap) {
  const totalSuccess = eventCountMap.user_story_generate_success ?? 0
  const totalFailed = eventCountMap.user_story_generate_failed ?? 0
  const generationAttempts = totalSuccess + totalFailed
  const generationFailureRate = toPercent(totalFailed, generationAttempts)

  const activeUsers = new Set()
  const limitReachedUsers = new Set()
  const toolUsers = new Set()
  const usersWithSuccess = new Set()

  for (const event of events) {
    if (event.user_id) {
      activeUsers.add(event.user_id)
    }

    if (event.event_name === 'limit_reached_free_plan' && event.user_id) {
      limitReachedUsers.add(event.user_id)
    }

    if (event.event_name === 'tool_view' && event.user_id) {
      toolUsers.add(event.user_id)
    }

    if (event.event_name === 'user_story_generate_success' && event.user_id) {
      usersWithSuccess.add(event.user_id)
    }
  }

  let toolUsersWithoutGeneration = 0
  for (const userId of toolUsers) {
    if (!usersWithSuccess.has(userId)) {
      toolUsersWithoutGeneration += 1
    }
  }

  return {
    total_generate_success: totalSuccess,
    total_generate_failed: totalFailed,
    generation_failure_rate: generationFailureRate,
    total_active_unique_users: activeUsers.size,
    users_reached_free_limit: limitReachedUsers.size,
    tool_without_generation_rate: toPercent(toolUsersWithoutGeneration, toolUsers.size),
    tool_users_total: toolUsers.size,
    tool_users_without_generation: toolUsersWithoutGeneration,
  }
}

function buildGroupedEvents(eventCountMap, totalEvents) {
  return Object.entries(eventCountMap)
    .map(([event_name, total]) => ({
      event_name,
      total,
      percentage: toPercent(total, totalEvents),
    }))
    .sort((a, b) => b.total - a.total)
}

async function fetchCount(tableName, applyFilters = (query) => query) {
  const query = applyFilters(supabase.from(tableName).select('id', { count: 'exact', head: true }))
  const { count, error } = await query

  if (error) throw error
  return count ?? 0
}

async function fetchTrackingEvents(dateFrom) {
  const allEvents = []
  let offset = 0

  while (offset < MAX_ROWS) {
    const { data, error } = await supabase
      .from('tracking_events')
      .select('id, user_id, event_name, event_category, page_path, created_at')
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allEvents.push(...data)
    if (data.length < PAGE_SIZE) break

    offset += PAGE_SIZE
  }

  return allEvents
}

async function fetchLearningProgressRows(dateFrom) {
  const allRows = []
  let offset = 0

  while (offset < MAX_ROWS) {
    let query = supabase
      .from('learning_progress')
      .select('id, user_id, guide_slug, completed_at')
      .order('completed_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (dateFrom) {
      query = query.gte('completed_at', dateFrom)
    }

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) break

    allRows.push(...data)
    if (data.length < PAGE_SIZE) break

    offset += PAGE_SIZE
  }

  return allRows
}

async function fetchEmailsForUsers(userIds) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  if (!uniqueUserIds.length) return {}

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', uniqueUserIds)

  if (error || !data) return {}

  return data.reduce((acc, row) => {
    if (row.id && row.email) {
      acc[row.id] = row.email
    }
    return acc
  }, {})
}

async function fetchUsageData(dateFrom) {
  const events = await fetchTrackingEvents(dateFrom)
  const totalEvents = events.length
  const eventCountMap = buildEventCountMap(events)

  const recentEventsRaw = events.slice(0, 20)
  const emailsByUserId = await fetchEmailsForUsers(recentEventsRaw.map((event) => event.user_id))

  const recentEvents = recentEventsRaw.map((event) => ({
    ...event,
    user_email: event.user_id ? emailsByUserId[event.user_id] ?? null : null,
  }))

  return {
    overview: {
      total_events: totalEvents,
      unique_users: new Set(events.map((event) => event.user_id).filter(Boolean)).size,
      signup_completed: eventCountMap.signup_completed ?? 0,
      login_completed: eventCountMap.login_completed ?? 0,
      user_story_generate_success: eventCountMap.user_story_generate_success ?? 0,
      user_story_generate_failed: eventCountMap.user_story_generate_failed ?? 0,
    },
    funnel: buildFunnel(eventCountMap),
    operational: buildOperationalMetrics(events, eventCountMap),
    dailyActivity: buildDailyActivity(events),
    recentEvents,
    groupedEvents: buildGroupedEvents(eventCountMap, totalEvents),
  }
}

async function fetchLeads({ search, page, pageSize }) {
  const { from, to, page: safePage, pageSize: safePageSize } = getRange({ page, pageSize })
  const term = cleanSearchTerm(search)

  let query = supabase
    .from('leads')
    .select('id, name, email, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (term) {
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    rows: data ?? [],
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safePageSize,
    totalPages: getTotalPages(count ?? 0, safePageSize),
  }
}

async function getUserStats(userId) {
  const [stories, guides, activity] = await Promise.all([
    supabase
      .from('user_stories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('learning_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('tracking_events')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  return {
    stories_count: stories.count ?? 0,
    guides_count: guides.count ?? 0,
    last_activity_at: activity.data?.[0]?.created_at ?? null,
  }
}

async function fetchUsers({ search, page, pageSize }) {
  const { from, to, page: safePage, pageSize: safePageSize } = getRange({ page, pageSize })
  const term = cleanSearchTerm(search)

  let query = supabase
    .from('profiles')
    .select(USER_PROFILE_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (term) {
    query = query.ilike('email', `%${term}%`)
  }

  let { data, error, count } = await query

  if (error && shouldRetryUsersWithoutAccessColumns(error)) {
    let fallbackQuery = supabase
      .from('profiles')
      .select(USER_PROFILE_FALLBACK_COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (term) {
      fallbackQuery = fallbackQuery.ilike('email', `%${term}%`)
    }

    const fallback = await fallbackQuery
    data = fallback.data
    error = fallback.error
    count = fallback.count
  }

  if (error) throw error

  const rows = await Promise.all(
    (data ?? []).map(async (user) => ({
      ...withAccessDefaults(user),
      ...(await getUserStats(user.id)),
    })),
  )

  return {
    rows,
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safePageSize,
    totalPages: getTotalPages(count ?? 0, safePageSize),
  }
}

async function fetchStories({ search, page, pageSize }) {
  const { from, to, page: safePage, pageSize: safePageSize } = getRange({ page, pageSize })
  const term = cleanSearchTerm(search)

  let query = supabase
    .from('user_stories')
    .select(
      'id, user_id, story_group_id, version_number, title, created_at, input_context, input_requirements, objective, user_story, acceptance_criteria, business_rules, gaps, qa_checklist, status',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (term) {
    query = query.or(`title.ilike.%${term}%,input_context.ilike.%${term}%,user_story.ilike.%${term}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const emailsByUserId = await fetchEmailsForUsers((data ?? []).map((story) => story.user_id))
  const rows = (data ?? []).map((story) => ({
    ...story,
    user_email: story.user_id ? emailsByUserId[story.user_id] ?? null : null,
  }))

  return {
    rows,
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safePageSize,
    totalPages: getTotalPages(count ?? 0, safePageSize),
  }
}

async function fetchLearning({ search, page, pageSize, dateFrom }) {
  const { from, to, page: safePage, pageSize: safePageSize } = getRange({ page, pageSize })
  const term = cleanSearchTerm(search)

  let query = supabase
    .from('learning_progress')
    .select('id, user_id, guide_slug, completed_at', { count: 'exact' })
    .gte('completed_at', dateFrom)
    .order('completed_at', { ascending: false })
    .range(from, to)

  if (term) {
    query = query.ilike('guide_slug', `%${term}%`)
  }

  const [{ data, error, count }, summaryRows] = await Promise.all([
    query,
    fetchLearningProgressRows(dateFrom),
  ])

  if (error) throw error

  const emailsByUserId = await fetchEmailsForUsers((data ?? []).map((row) => row.user_id))
  const rows = (data ?? []).map((row) => ({
    ...row,
    guide_title: guideTitlesBySlug[row.guide_slug] ?? row.guide_slug,
    user_email: row.user_id ? emailsByUserId[row.user_id] ?? null : null,
  }))

  const byGuide = summaryRows.reduce((acc, row) => {
    if (!row.guide_slug) return acc
    if (!acc[row.guide_slug]) {
      acc[row.guide_slug] = {
        guide_slug: row.guide_slug,
        guide_title: guideTitlesBySlug[row.guide_slug] ?? row.guide_slug,
        completions: 0,
      }
    }
    acc[row.guide_slug].completions += 1
    return acc
  }, {})

  return {
    rows,
    guideSummary: Object.values(byGuide).sort((a, b) => b.completions - a.completions),
    totalCount: count ?? 0,
    page: safePage,
    pageSize: safePageSize,
    totalPages: getTotalPages(count ?? 0, safePageSize),
  }
}

async function fetchOverview({ dateFrom, usage }) {
  const [
    totalLeads,
    periodLeads,
    totalUsers,
    periodUsers,
    totalStories,
    periodStories,
    totalLearningCompletions,
    periodLearningCompletions,
  ] = await Promise.all([
    fetchCount('leads'),
    fetchCount('leads', (query) => query.gte('created_at', dateFrom)),
    fetchCount('profiles'),
    fetchCount('profiles', (query) => query.gte('created_at', dateFrom)),
    fetchCount('user_stories'),
    fetchCount('user_stories', (query) => query.gte('created_at', dateFrom)),
    fetchCount('learning_progress'),
    fetchCount('learning_progress', (query) => query.gte('completed_at', dateFrom)),
  ])

  return {
    totalLeads,
    periodLeads,
    totalUsers,
    periodUsers,
    totalStories,
    periodStories,
    totalLearningCompletions,
    periodLearningCompletions,
    activeUsers: usage.operational.total_active_unique_users,
    generationSuccess: usage.operational.total_generate_success,
    generationFailures: usage.operational.total_generate_failed,
    failureRate: usage.operational.generation_failure_rate,
  }
}

export async function fetchAdminDashboard({
  period = '7d',
  leads = {},
  users = {},
  stories = {},
  learning = {},
} = {}) {
  const dateFrom = getDateFromFilter(period)
  const usage = await fetchUsageData(dateFrom)

  const [overview, leadsData, usersData, storiesData, learningData] = await Promise.all([
    fetchOverview({ dateFrom, usage }),
    fetchLeads(leads),
    fetchUsers(users),
    fetchStories(stories),
    fetchLearning({ ...learning, dateFrom }),
  ])

  return {
    period,
    dateFrom,
    overview,
    usage,
    leads: leadsData,
    users: usersData,
    stories: storiesData,
    learning: learningData,
  }
}
