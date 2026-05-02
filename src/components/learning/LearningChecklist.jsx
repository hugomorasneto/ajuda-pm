function LearningChecklist({ items }) {
  return (
    <section className="learning-guide-block learning-guide-checklist" id="checklist">
      <div className="learning-guide-block__header">
        <span className="badge-pill badge-pill--success">Checklist final</span>
        <h2>Use isto antes de seguir</h2>
      </div>

      <ol className="learning-guide-checklist__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  )
}

export default LearningChecklist
