function QaChecklist({ items }) {
  const checklist = Array.isArray(items) ? items.filter(Boolean) : []

  return (
    <section className="quality-panel__block">
      <div className="quality-panel__block-header">
        <div>
          <p className="quality-panel__eyebrow">QA</p>
          <h3>Checklist de validação</h3>
        </div>
      </div>

      {checklist.length > 0 ? (
        <ul className="quality-panel__list quality-panel__list--checks">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="quality-panel__empty-note">
          O checklist de QA ainda não veio preenchido para esta versão.
        </p>
      )}
    </section>
  )
}

export default QaChecklist
