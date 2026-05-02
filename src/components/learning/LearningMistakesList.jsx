const WarnIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6 3.5v3M6 8.2v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

function LearningMistakesList({ items }) {
  return (
    <section className="learning-guide-block learning-guide-mistakes" id="erros-comuns">
      <div className="learning-guide-block__header">
        <span className="badge-pill badge-pill--warning">Erros comuns</span>
        <h2>O que costuma atrapalhar</h2>
      </div>

      <ul className="learning-guide-mistakes__list">
        {items.map((item) => (
          <li key={item}>
            <span className="learning-guide-mistakes__icon">
              <WarnIcon />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default LearningMistakesList
