import { Link } from 'react-router-dom'
import { APP_NAME, BRAND_LOGO_HORIZONTAL_SRC, HUGO_MORAES_LINKEDIN_URL } from '../../constants/app'
import { getLearningGuidesBySlugs } from '../../content/learningContent'
import { useAuth } from '../../hooks/useAuth'

const footerGuides = getLearningGuidesBySlugs([
  'fundamentos-produto-agil',
  'user-stories-na-pratica',
  'backlog-e-refinamento',
])

function PublicFooter() {
  const { user } = useAuth()
  const brandStatement =
    'Transforme briefing confuso em user stories claras, testáveis e prontas para Dev, QA e negócio.'
  const bottomCopy = `© ${new Date().getFullYear()} ${APP_NAME} · Feito para times que precisam de stories mais claras`
  const footerClassName = 'public-footer public-footer--forge-home'
  const footerCtaClassName = ['public-footer__cta', 'forge-button forge-button--metal forge-button--sm']
    .filter(Boolean)
    .join(' ')

  return (
    <footer className={footerClassName}>
      <div className="public-footer__inner">
        <div className="public-footer__brand">
          <div className="brand-logo">
            <img
              src={BRAND_LOGO_HORIZONTAL_SRC}
              alt={APP_NAME}
              className="brand-logo__image brand-logo--footer"
              loading="lazy"
            />
          </div>
          <p className="public-footer__brand-statement">{brandStatement}</p>
          <Link to={user ? '/tool' : '/signup'} className={footerCtaClassName}>
            {user ? 'Abrir bancada' : 'Criar conta grátis →'}
          </Link>
        </div>

        <div className="public-footer__links">
          <nav className="public-footer__nav" aria-label="Produto">
            <p className="public-footer__nav-title">Produto</p>
            <a href="/#produto">Produto</a>
            <a href="/#como-funciona">Como funciona</a>
            <a href="/#antes-depois">Antes e depois</a>
            <a href="/#planos">Planos</a>
          </nav>

          <nav className="public-footer__nav" aria-label="Campo de Treino">
            <p className="public-footer__nav-title">Campo de Treino</p>
            {footerGuides.map((guide) => (
              <Link key={guide.slug} to={`/aprender/${guide.slug}`}>
                {guide.title}
              </Link>
            ))}
            <Link to="/aprender">Ver todos os guias →</Link>
          </nav>

          <nav className="public-footer__nav" aria-label="Institucional e legal">
            <p className="public-footer__nav-title">Institucional</p>
            <Link to="/sobre">Sobre o ProdForge</Link>
            <Link to="/politica-de-privacidade">Política de Privacidade</Link>
            <Link to="/preferencias-de-privacidade">Preferências de Privacidade</Link>
            <Link to="/termos-de-uso">Termos de Uso</Link>
            <Link to="/contato">Contato</Link>
            <a href={HUGO_MORAES_LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              LinkedIn de Hugo
            </a>
          </nav>
        </div>
      </div>

      <div className="public-footer__bottom">
        <div className="public-footer__bottom-inner">
          <p>{bottomCopy}</p>
          <p className="public-footer__signature">
            Desenvolvido por{' '}
            <a href={HUGO_MORAES_LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              Hugo Moraes Neto
            </a>
            , Product Manager & Builder, como parte da Tech Tupã — tecnologia com raízes.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
