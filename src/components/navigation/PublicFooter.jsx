import { Link } from 'react-router-dom'
import { APP_NAME } from '../../constants/app'

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__brand">
          <p className="public-footer__eyebrow">ProdForge</p>
          <h2>{APP_NAME}</h2>
          <p>Plataforma para PMs e POs criarem user stories claras, completas e prontas para refinamento.</p>
        </div>

        <nav className="public-footer__nav" aria-label="Links do rodapé">
          <Link to="/">Início</Link>
          <Link to="/user-stories">User stories</Link>
          <Link to="/templates">Templates</Link>
          <Link to="/login">Entrar</Link>
        </nav>
      </div>
    </footer>
  )
}

export default PublicFooter
