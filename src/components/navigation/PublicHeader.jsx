import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { APP_NAME } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'

const publicNavItems = [
  { label: 'Aprender', to: '/aprender', activeOn: ['/aprender'] },
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Exemplo', href: '/#antes-depois' },
  { label: 'Planos', href: '/#planos' },
]

function isItemActive(item, pathname) {
  if (!item.activeOn) {
    return false
  }

  return item.activeOn.some((activePath) => pathname.startsWith(activePath))
}

function PublicNavLink({ item, pathname, mobile = false, onNavigate }) {
  const baseClassName = mobile ? 'public-header__mobile-link' : 'public-header__link'
  const activeClassName = mobile ? 'public-header__mobile-link--active' : 'public-header__link--active'
  const className = [baseClassName, isItemActive(item, pathname) ? activeClassName : '']
    .filter(Boolean)
    .join(' ')

  if (item.to) {
    return (
      <Link to={item.to} className={className} onClick={onNavigate}>
        {item.label}
      </Link>
    )
  }

  return (
    <a href={item.href} className={className} onClick={onNavigate}>
      {item.label}
    </a>
  )
}

function PublicHeader() {
  const location = useLocation()
  const { user } = useAuth()
  const [menuOpenPath, setMenuOpenPath] = useState(null)
  const isMenuOpen = menuOpenPath === location.pathname

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <Link to="/" className="public-brand" aria-label={APP_NAME}>
          <span className="public-brand__mark" />
          <div className="public-brand__copy">
            <span className="public-brand__name">{APP_NAME}</span>
          </div>
        </Link>

        <nav className="public-header__nav" aria-label="Navegacao publica">
          {publicNavItems.map((item) => (
            <PublicNavLink key={item.to ?? item.href} item={item} pathname={location.pathname} />
          ))}
        </nav>

        <div className="public-header__actions">
          {user ? (
            <Link to="/tool" className="public-header__cta public-header__cta--primary">
              Abrir area de trabalho
            </Link>
          ) : (
            <>
              <Link to="/login" className="public-header__cta public-header__cta--secondary">
                Entrar
              </Link>
              <Link to="/signup" className="public-header__cta public-header__cta--primary">
                Criar conta gratis
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="public-header__menu-button"
          onClick={() =>
            setMenuOpenPath((currentPath) => (currentPath === location.pathname ? null : location.pathname))
          }
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Fechar navegacao' : 'Abrir navegacao'}
        >
          {isMenuOpen ? 'Fechar' : 'Menu'}
        </button>
      </div>

      {isMenuOpen ? (
        <div className="public-header__mobile-panel">
          <nav className="public-header__mobile-nav" aria-label="Navegacao publica no mobile">
            {publicNavItems.map((item) => (
              <PublicNavLink
                key={item.to ?? item.href}
                item={item}
                pathname={location.pathname}
                mobile
                onNavigate={() => setMenuOpenPath(null)}
              />
            ))}
          </nav>

          <div className="public-header__mobile-actions">
            {user ? (
              <Link to="/tool" className="public-header__cta public-header__cta--primary">
                Abrir area de trabalho
              </Link>
            ) : (
              <>
                <Link to="/login" className="public-header__cta public-header__cta--secondary">
                  Entrar
                </Link>
                <Link to="/signup" className="public-header__cta public-header__cta--primary">
                  Criar conta gratis
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}

export default PublicHeader
