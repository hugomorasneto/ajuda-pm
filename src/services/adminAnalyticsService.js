import { supabase } from '../lib/supabaseClient'

const PAGE_SIZE = 1000
const MAX_ROWS = 50000

const FUNNEL_EVENT_STEPS = [
  'landing_view',
  'signup_started',
  'signup_completed',
  'login_completed',
  'tool_view',
  'user_story_generate_clicked',
  'user_story_generate_success',
]

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

async function fetchTrackingEvents(dateFrom) {
  const allEvents = []
  let offset = 0

  while (offset < MAX_ROWS) {
    const { data, error } = await supabase
      .from('tracking_events')
      .select('id, user_id, event_name, page_path, created_at')
      .gte('created_at', dateFrom)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      break
    }

    allEvents.push(...data)

    if (data.length < PAGE_SIZE) {
      break
    }

    offset += PAGE_SIZE
  }

  return allEvents
}

async function fetchEmailsForUsers(userIds) {
  if (!userIds.length) return {}

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)

    if (error || !data) return {}

    return data.reduce((acc, row) => {
      if (row.id && row.email) {
        acc[row.id] = row.email
      }
      return acc
    }, {})
  } catch {
    return {}
  }
}

export async function fetchAdminAnalytics(period = '7d') {
  const dateFrom = getDateFromFilter(period)
  const events = await fetchTrackingEvents(dateFrom)
  const totalEvents = events.length
  const eventCountMap = buildEventCountMap(events)

  const recentEventsRaw = events.slice(0, 20)
  const recentUserIds = Array.from(
    new Set(recentEventsRaw.map((event) => event.user_id).filter(Boolean)),
  )
  const emailsByUserId = await fetchEmailsForUsers(recentUserIds)

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

