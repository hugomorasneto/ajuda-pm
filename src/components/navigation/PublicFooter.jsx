import { Link } from 'react-router-dom'
import { APP_NAME } from '../../constants/app'
import { getLearningGuidesBySlugs } from '../../content/learningContent'
import { useAuth } from '../../hooks/useAuth'

const footerGuides = getLearningGuidesBySlugs([
  'fundamentos-produto-agil',
  'user-stories-na-pratica',
  'backlog-e-refinamento',
])

function PublicFooter() {
  const { user } = useAuth()

  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__brand">
          <p className="public-footer__eyebrow">ProdForge</p>
          <h2>{APP_NAME}</h2>
          <p>Plataforma para PMs e POs criarem user stories claras, completas e prontas para refinamento.</p>
        </div>

        <div className="public-footer__links">
          <nav className="public-footer__nav" aria-label="Links principais">
            <p className="public-footer__nav-title">Produto</p>
            <a href="/#como-funciona">Como funciona</a>
            <a href="/#antes-depois">Ver exemplo</a>
            <a href="/#planos">Planos</a>
            <Link to="/aprender">Aprender</Link>
          </nav>

          <nav className="public-footer__nav" aria-label="Guias para iniciantes">
            <p className="public-footer__nav-title">Guias para comecar</p>
            {footerGuides.map((guide) => (
              <Link key={guide.slug} to={`/aprender/${guide.slug}`}>
                {guide.title}
              </Link>
            ))}
          </nav>

          <nav className="public-footer__nav" aria-label="Acao principal">
            <p className="public-footer__nav-title">Proximo passo</p>
            {user ? <Link to="/tool">Abrir area de trabalho</Link> : <Link to="/signup">Criar conta gratis</Link>}
            <a href="/#lead-capture-title">Receber novidades do Pro</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
