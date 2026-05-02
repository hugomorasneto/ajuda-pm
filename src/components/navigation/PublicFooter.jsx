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
          <div className="public-footer__brand-logo">
            <span className="public-footer__brand-mark" aria-hidden="true" />
            <span className="public-footer__brand-name">{APP_NAME}</span>
          </div>
          <p className="public-footer__brand-statement">
            Para PMs e POs que querem escrever user stories mais claras, sem depender de sênior para revisar.
          </p>
          <Link
            to={user ? '/tool' : '/signup'}
            className="public-footer__cta"
          >
            {user ? 'Abrir área de trabalho' : 'Começar grátis →'}
          </Link>
        </div>

        <div className="public-footer__links">
          <nav className="public-footer__nav" aria-label="Produto">
            <p className="public-footer__nav-title">Produto</p>
            <a href="/#como-funciona">Como funciona</a>
            <a href="/#antes-depois">Ver exemplo</a>
            <a href="/#planos">Planos</a>
          </nav>

          <nav className="public-footer__nav" aria-label="Aprender">
            <p className="public-footer__nav-title">Academia</p>
            {footerGuides.map((guide) => (
              <Link key={guide.slug} to={`/aprender/${guide.slug}`}>
                {guide.title}
              </Link>
            ))}
            <Link to="/aprender">Ver todos os guias →</Link>
          </nav>
        </div>
      </div>

      <div className="public-footer__bottom">
        <p>© {new Date().getFullYear()} {APP_NAME} · Feito para PMs e POs iniciantes</p>
      </div>
    </footer>
  )
}

export default PublicFooter
