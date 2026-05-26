import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CAMPAIGN_ATTRIBUTION_STORAGE_KEY,
  clearCampaignAttribution,
  extractCampaignAttribution,
  getOrCreateCampaignAttribution,
} from './campaignAttribution'

function installBrowser({ search = '', referrer = '' } = {}) {
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
    location: {
      origin: 'https://prodforge.techtupa.com.br',
      pathname: '/',
      search,
    },
  })
  vi.stubGlobal('document', { referrer })

  return store
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('campaignAttribution', () => {
  it('extrai UTMs e referrer externos', () => {
    expect(
      extractCampaignAttribution({
        search:
          '?utm_source=linkedin&utm_medium=organic&utm_campaign=prodforge_mvp_signup&utm_content=post_01&utm_term=pm',
        referrer: 'https://www.linkedin.com/feed/',
        origin: 'https://prodforge.techtupa.com.br',
      }),
    ).toEqual({
      utm_source: 'linkedin',
      utm_medium: 'organic',
      utm_campaign: 'prodforge_mvp_signup',
      utm_content: 'post_01',
      utm_term: 'pm',
      referrer: 'https://www.linkedin.com/feed/',
    })
  })

  it('retorna nulo quando não há UTM nem referrer externo', () => {
    expect(
      extractCampaignAttribution({
        search: '',
        referrer: 'https://prodforge.techtupa.com.br/signup',
        origin: 'https://prodforge.techtupa.com.br',
      }),
    ).toBeNull()
  })

  it('preserva a primeira atribuição e não sobrescreve com nova UTM', () => {
    const store = installBrowser({
      search: '?utm_source=linkedin&utm_medium=organic&utm_campaign=primeira&utm_content=post_01',
      referrer: 'https://www.linkedin.com/feed/',
    })

    expect(getOrCreateCampaignAttribution()).toMatchObject({
      utm_source: 'linkedin',
      utm_campaign: 'primeira',
      utm_content: 'post_01',
    })

    window.location.search = '?utm_source=linkedin&utm_medium=organic&utm_campaign=segunda&utm_content=post_02'

    expect(getOrCreateCampaignAttribution()).toMatchObject({
      utm_campaign: 'primeira',
      utm_content: 'post_01',
    })
    expect(JSON.parse(store.get(CAMPAIGN_ATTRIBUTION_STORAGE_KEY))).toMatchObject({
      utm_campaign: 'primeira',
      utm_content: 'post_01',
    })
  })

  it('limpa a atribuição persistida', () => {
    const store = installBrowser({
      search: '?utm_source=linkedin&utm_campaign=prodforge_mvp_signup',
    })

    expect(getOrCreateCampaignAttribution()).toMatchObject({
      utm_source: 'linkedin',
      utm_campaign: 'prodforge_mvp_signup',
    })
    expect(clearCampaignAttribution()).toBe(true)
    expect(store.has(CAMPAIGN_ATTRIBUTION_STORAGE_KEY)).toBe(false)
  })
})
