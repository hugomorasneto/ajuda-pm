function QaChecklist({ items }) {
  const checklist = Array.isArray(items) ? items.filter(Boolean) : []

  if (checklist.length === 0) {
    return <p className="quality-panel__empty-note">O checklist de QA ainda não veio preenchido para esta versão.</p>
  }

  return (
    <ul className="quality-panel__list quality-panel__list--checks">
      {checklist.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export default QaChecklist
