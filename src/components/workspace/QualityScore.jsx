function getFallbackScore(story) {
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

function getScoreMeta(score) {
  if (score >= 85) {
    return {
      label: 'Alta clareza',
      note: 'A base já está bem estruturada para revisão e encaminhamento.',
      toneClass: 'quality-score--good',
    }
  }

  if (score >= 70) {
    return {
      label: 'Boa base',
      note: 'A user story está utilizável, mas ainda vale revisar gaps e checklist.',
      toneClass: 'quality-score--mid',
    }
  }

  return {
    label: 'Revisar antes de compartilhar',
    note: 'Ainda há pontos importantes para consolidar antes de enviar ao backlog.',
    toneClass: 'quality-score--low',
  }
}

function QualityScore({ story }) {
  const providedScore = Number(story?.generation_meta?.quality_score)
  const score = Number.isFinite(providedScore) && providedScore > 0 ? providedScore : getFallbackScore(story)
  const scoreMeta = getScoreMeta(score)

  return (
    <section className={`quality-score ${scoreMeta.toneClass}`}>
      <div className="quality-score__header">
        <div>
          <p className="quality-panel__eyebrow">Qualidade</p>
          <h3>{scoreMeta.label}</h3>
        </div>
        <strong className="quality-score__value">{score}</strong>
      </div>

      <div className="quality-score__bar" aria-hidden="true">
        <span className="quality-score__bar-fill" style={{ width: `${Math.min(score, 100)}%` }} />
      </div>

      <p className="quality-score__note">{scoreMeta.note}</p>
    </section>
  )
}

export default QualityScore
