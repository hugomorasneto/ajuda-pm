function LeadCaptureForm({ content }) {
  return (
    <section className="landing-section landing-lead-capture" aria-labelledby="lead-capture-title">
      <div className="landing-lead-capture__copy">
        <p className="landing-section__eyebrow">{content.eyebrow}</p>
        <h2 id="lead-capture-title">{content.title}</h2>
        <p>{content.description}</p>
      </div>

      {/* TODO: conectar este bloco ao Supabase. O backend já está protegido com RLS e insert-only para captura pública. */}
      <div className="landing-lead-capture__form" aria-disabled="true">
        <label htmlFor="lead-name">Nome</label>
        <input id="lead-name" type="text" placeholder="Seu nome" disabled />

        <label htmlFor="lead-email">E-mail</label>
        <input id="lead-email" type="email" placeholder="voce@empresa.com" disabled />

        <button type="button" className="landing-button landing-button--secondary" disabled>
          Avisar quando abrir
        </button>

        <p className="landing-lead-capture__note">{content.note}</p>
      </div>
    </section>
  )
}

export default LeadCaptureForm
