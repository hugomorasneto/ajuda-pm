function GapList({ items }) {
  const gaps = Array.isArray(items) ? items.filter(Boolean) : []

  if (gaps.length === 0) {
    return <p className="quality-panel__empty-note">Nenhum gap crítico foi identificado nesta versão.</p>
  }

  return (
    <ul className="quality-panel__list">
      {gaps.map((gap) => (
        <li key={gap}>{gap}</li>
      ))}
    </ul>
  )
}

export default GapList
