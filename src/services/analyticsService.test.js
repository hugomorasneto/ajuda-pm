import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRIVACY_CONSENT_STATUS, setPrivacyConsent } from '../utils/privacyConsent'

const insertMock = vi.fn(() => Promise.resolve({ error: null }))
const getUserMock = vi.fn(() => Promise.resolve({ data: { user: null } }))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: vi.fn(() => ({
      insert: insertMock,
    })),
  },
}))

function installBrowser({ search = '' } = {}) {
  const store = new Map()
  const localStorage = {
    getItem: (key) => store.get(key) ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }

  vi.stubGlobal('window', {
    localStorage,
    dispatchEvent: vi.fn(),
    location: {
      origin: 'https://prodforge.techtupa.com.br',
      pathname: '/',
      search,
    },
  })
  vi.stubGlobal('document', { referrer: 'https://www.linkedin.com/feed/' })
  vi.stubGlobal('CustomEvent', class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  })
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('analyticsService', () => {
  it('anexa atribuição aos metadados dos eventos com consentimento analítico', async () => {
    installBrowser({
      search:
        '?utm_source=linkedin&utm_medium=organic&utm_campaign=prodforge_mvp_signup&utm_content=post_01_briefing_confuso',
    })
    setPrivacyConsent(PRIVACY_CONSENT_STATUS.accepted)
    const { trackEvent } = await import('./analyticsService')

    const response = await trackEvent({
      event_name: 'signup_started',
      event_category: 'auth',
      page_path: '/signup',
      metadata: { step: 'form' },
    })

    expect(response.success).toBe(true)
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        event_name: 'signup_started',
        page_path: '/signup',
        metadata: {
          step: 'form',
          attribution: {
            utm_source: 'linkedin',
            utm_medium: 'organic',
            utm_campaign: 'prodforge_mvp_signup',
            utm_content: 'post_01_briefing_confuso',
            utm_term: null,
            referrer: 'https://www.linkedin.com/feed/',
          },
        },
      }),
    ])
  })

  it('preserva a primeira atribuição em eventos de cadastro após navegação interna', async () => {
    installBrowser({
      search:
        '?utm_source=linkedin&utm_medium=organic&utm_campaign=prodforge_mvp_signup&utm_content=post_01_briefing_confuso',
    })
    setPrivacyConsent(PRIVACY_CONSENT_STATUS.accepted)
    const { trackEvent } = await import('./analyticsService')

    await trackEvent({
      event_name: 'landing_view',
      event_category: 'public',
      page_path: '/',
    })

    window.location.pathname = '/signup'
    window.location.search = ''
    document.referrer = 'https://prodforge.techtupa.com.br/'

    await trackEvent({
      event_name: 'signup_started',
      event_category: 'auth',
      page_path: '/signup',
    })
    await trackEvent({
      event_name: 'signup_completed',
      event_category: 'auth',
      page_path: '/signup',
      metadata: { confirmation_pending: true },
    })

    expect(insertMock).toHaveBeenCalledTimes(3)
    expect(insertMock.mock.calls.map(([payload]) => payload[0])).toEqual([
      expect.objectContaining({
        event_name: 'landing_view',
        metadata: {
          attribution: expect.objectContaining({
            utm_campaign: 'prodforge_mvp_signup',
            utm_content: 'post_01_briefing_confuso',
          }),
        },
      }),
      expect.objectContaining({
        event_name: 'signup_started',
        metadata: {
          attribution: expect.objectContaining({
            utm_campaign: 'prodforge_mvp_signup',
            utm_content: 'post_01_briefing_confuso',
          }),
        },
      }),
      expect.objectContaining({
        event_name: 'signup_completed',
        metadata: {
          confirmation_pending: true,
          attribution: expect.objectContaining({
            utm_campaign: 'prodforge_mvp_signup',
            utm_content: 'post_01_briefing_confuso',
          }),
        },
      }),
    ])
  })

  it('não envia evento nem persiste atribuição sem consentimento analítico', async () => {
    installBrowser({
      search: '?utm_source=linkedin&utm_medium=organic&utm_campaign=prodforge_mvp_signup',
    })
    const { trackEvent } = await import('./analyticsService')

    const response = await trackEvent({
      event_name: 'landing_view',
      event_category: 'public',
    })

    expect(response).toMatchObject({
      success: false,
      skipped: true,
      reason: 'privacy_consent_required',
    })
    expect(insertMock).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('prodforge_campaign_attribution')).toBeNull()
  })
})
