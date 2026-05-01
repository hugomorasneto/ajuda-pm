function LearningMistakesList({ items }) {
  return (
    <section className="learning-guide-block learning-guide-mistakes" id="erros-comuns">
      <div className="learning-guide-block__header">
        <p className="landing-section__eyebrow">Erros comuns</p>
        <h2>O que costuma atrapalhar</h2>
      </div>

      <ul className="learning-guide-mistakes__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export default LearningMistakesList
