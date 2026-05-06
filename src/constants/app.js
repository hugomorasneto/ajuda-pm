export const APP_NAME = 'ProdForge'
export const BRAND_MARK_SRC = '/images/prodforge/brand/prodforge-brand-mark.webp'
export const BRAND_LOGO_HORIZONTAL_SRC = '/images/prodforge/brand/prodforge-logo-horizontal.webp'
export const HUGO_MORAES_LINKEDIN_URL = 'https://www.linkedin.com/in/hugomoraesneto/'
export const FREE_PLAN_NAME = 'Free'
export const PRO_PLAN_NAME = 'Pro'
export const FREE_GENERATION_LIMIT = 10
export const MAX_FORGE_LIMIT_OVERRIDE = 9999
export const PLAN_VALUES = {
  FREE: 'free',
  PRO: 'premium',
}

export function getDefaultForgeLimit(plan) {
  return plan === PLAN_VALUES.PRO ? null : FREE_GENERATION_LIMIT
}

export function getEffectiveForgeLimit({ plan, forgeLimitOverride }) {
  if (Number.isInteger(forgeLimitOverride)) return forgeLimitOverride
  return getDefaultForgeLimit(plan)
}

export function getRemainingForgeGenerations({ usageCount, forgeLimit }) {
  if (forgeLimit === null) return null
  return Math.max(0, forgeLimit - Number(usageCount ?? 0))
}
