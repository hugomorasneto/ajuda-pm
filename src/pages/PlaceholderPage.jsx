function PlaceholderPage({ title, description }) {
  return (
    <div className="page">
      <section className="panel panel-muted placeholder">
        <p className="eyebrow">Em construção</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
    </div>
  )
}

export default PlaceholderPage
