function GapList({ items }) {
  const gaps = Array.isArray(items) ? items.filter(Boolean) : []

  return (
    <section className="quality-panel__block">
      <div className="quality-panel__block-header">
        <div>
          <p className="quality-panel__eyebrow">Gaps</p>
          <h3>Pontos que ainda pedem decisão</h3>
        </div>
      </div>

      {gaps.length > 0 ? (
        <ul className="quality-panel__list">
          {gaps.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
      ) : (
        <p className="quality-panel__empty-note">Nenhum gap crítico foi identificado nesta versão.</p>
      )}
    </section>
  )
}

export default GapList
