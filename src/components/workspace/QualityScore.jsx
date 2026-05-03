import { useEffect, useRef, useState } from 'react'
import { getResolvedQualityScore, getScoreMeta } from './qualityScoreUtils'

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!target) return
    let start = null

    function step(timestamp) {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

function QualityScore({ story }) {
  const target = getResolvedQualityScore(story)
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

      <div
        className="quality-score__bar"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
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
