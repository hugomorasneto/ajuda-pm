import { Link } from 'react-router-dom'
import { APP_NAME } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'

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

        <nav className="public-footer__nav" aria-label="Links do rodapé">
          <a href="/#como-funciona">Como funciona</a>
          <a href="/#antes-depois">Ver exemplo</a>
          <a href="/#planos">Planos</a>
          {user ? <Link to="/tool">Abrir área de trabalho</Link> : <Link to="/signup">Criar conta</Link>}
        </nav>
      </div>
    </footer>
  )
}

export default PublicFooter
