const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 6.5l2.5 2.5 5.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function LearningSummaryBlock({ title, items }) {
  return (
    <section className="learning-guide-block learning-guide-summary" id="resumo">
      <div className="learning-guide-block__header">
        <span className="badge-pill">Em 2 minutos</span>
        <h2>{title}</h2>
      </div>

      <ul className="learning-guide-summary__list">
        {items.map((item) => (
          <li key={item}>
            <span className="learning-guide-summary__check">
              <CheckIcon />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default LearningSummaryBlock
