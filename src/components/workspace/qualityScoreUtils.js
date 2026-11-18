import { defaultStoryFormat } from '../../utils/storyFormat'

export function getFallbackScore(story) {
  if (!story) return 0

  let score = 0

  if (story.title?.trim()) score += 12
  if (story.objective?.trim()) score += 16
  if (story.user_story?.trim()) score += 20
  if (Array.isArray(story.acceptance_criteria) && story.acceptance_criteria.length >= 2) score += 24
  if (Array.isArray(story.business_rules) && story.business_rules.length > 0) score += 10
  if (Array.isArray(story.gaps) && story.gaps.length > 0) score += 8
  if (Array.isArray(story.qa_checklist) && story.qa_checklist.length > 0) score += 10

  return Math.min(100, Math.max(score, story.user_story ? 58 : 0))
}

export function getScoreMeta(score, t = defaultStoryFormat) {
  if (score >= 85) {
    return {
      label: t('score_good'),
      note: t('score_good_note'),
      toneClass: 'quality-score--good',
    }
  }

  if (score >= 70) {
    return {
      label: t('score_mid'),
      note: t('score_mid_note'),
      toneClass: 'quality-score--mid',
    }
  }

  return {
    label: t('score_low'),
    note: t('score_low_note'),
    toneClass: 'quality-score--low',
  }
}

export function getResolvedQualityScore(story) {
  const providedScore = Number(story?.generation_meta?.quality_score)
  return Number.isFinite(providedScore) && providedScore > 0 ? providedScore : getFallbackScore(story)
}
