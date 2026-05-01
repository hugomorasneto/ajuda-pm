function LearningSummaryBlock({ title, items }) {
  return (
    <section className="learning-guide-block learning-guide-summary" id="resumo">
      <div className="learning-guide-block__header">
        <p className="landing-section__eyebrow">Em 2 minutos</p>
        <h2>{title}</h2>
      </div>

      <ul className="learning-guide-summary__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export default LearningSummaryBlock
