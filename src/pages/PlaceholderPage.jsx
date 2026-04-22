import { Link } from 'react-router-dom'

function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-shell">
      <div className="placeholder-card">
        <span className="placeholder-card__badge">Em construção</span>
        <h1 className="placeholder-card__title">{title}</h1>
        <p className="placeholder-card__description">{description}</p>
        <Link to="/tool" className="placeholder-card__cta">
          Ir para a área de trabalho
        </Link>
      </div>
    </div>
  )
}

export default PlaceholderPage
