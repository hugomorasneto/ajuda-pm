import { useEffect, useRef, useState } from 'react'

// ── Animated score (counts up from 0 on mount) ───────────────────
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!target) return
    let start = null

    function step(timestamp) {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

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
    return { label: 'Alta clareza', note: 'Pronta para revisão e encaminhamento.', toneClass: 'quality-score--good' }
  }
  if (score >= 70) {
    return { label: 'Boa base', note: 'Utilizável. Revise gaps e checklist.', toneClass: 'quality-score--mid' }
  }
  return { label: 'Revisar', note: 'Consolide os pontos antes de compartilhar.', toneClass: 'quality-score--low' }
}

function QualityScore({ story }) {
  const providedScore = Number(story?.generation_meta?.quality_score)
  const target = Number.isFinite(providedScore) && providedScore > 0 ? providedScore : getFallbackScore(story)
  const score = useCountUp(target)
  const scoreMeta = getScoreMeta(target)

  return (
    <section className={`quality-score ${scoreMeta.toneClass}`}>
      <div className="quality-score__header">
        <div>
          <p className="quality-score__eyebrow">Qualidade</p>
          <h3 className="quality-score__tone">{scoreMeta.label}</h3>
        </div>
        <strong className="quality-score__value" aria-label={`Score: ${score} de 100`}>
          {score}
          <span className="quality-score__denominator">/100</span>
        </strong>
      </div>

      <div className="quality-score__bar" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <span
          className="quality-score__bar-fill"
          style={{ width: `${Math.min(score, 100)}%`, transition: 'width 0.05s linear' }}
        />
      </div>

      <p className="quality-score__note">{scoreMeta.note}</p>
    </section>
  )
}

export default QualityScore
