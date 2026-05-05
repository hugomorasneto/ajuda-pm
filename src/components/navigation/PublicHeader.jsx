import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { APP_NAME, BRAND_LOGO_HORIZONTAL_SRC } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'

const publicNavItems = [
  { label: 'Produto', to: '/#produto', activeOn: ['/'] },
  { label: 'Como funciona', to: '/#como-funciona' },
  { label: 'Campo de Treino', to: '/aprender', activeOn: ['/aprender'] },
  { label: 'Planos', to: '/#planos' },
]

function isItemActive(item, pathname) {
  if (!item.activeOn) {
    return false
  }

  return item.activeOn.some((activePath) =>
    activePath === '/' ? pathname === '/' : pathname.startsWith(activePath)
  )
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

function PublicHeader({ isHomeRoute = false, isLearningRoute = false, isLegalRoute = false }) {
  const location = useLocation()
  const { user } = useAuth()
  const [menuOpenPath, setMenuOpenPath] = useState(null)
  const isMenuOpen = menuOpenPath === location.pathname
  const isForgeHeader = isHomeRoute || isLearningRoute || isLegalRoute
  const navItems = publicNavItems
  const headerClassName = ['public-header', isForgeHeader ? 'public-header--forge-home' : '']
    .filter(Boolean)
    .join(' ')
  const primaryCtaClassName = [
    'public-header__cta',
    'public-header__cta--primary',
    isForgeHeader ? 'forge-button forge-button--ember forge-button--sm' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const secondaryCtaClassName = [
    'public-header__cta',
    'public-header__cta--secondary',
    isForgeHeader ? 'forge-button forge-button--ghost forge-button--sm' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const menuButtonClassName = [
    'public-header__menu-button',
    isForgeHeader ? 'forge-button forge-button--ghost forge-button--sm' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={headerClassName}>
      <div className="public-header__inner">
        <Link to="/" className="brand-logo" aria-label={APP_NAME}>
          <img
            src={BRAND_LOGO_HORIZONTAL_SRC}
            alt={APP_NAME}
            className="brand-logo__image brand-logo--header"
            loading="eager"
          />
        </Link>

        <nav className="public-header__nav" aria-label="Navegação pública">
          {navItems.map((item) => (
            <PublicNavLink key={item.to ?? item.href} item={item} pathname={location.pathname} />
          ))}
        </nav>

        <div className="public-header__actions">
          {user ? (
            <Link to="/tool" className={primaryCtaClassName}>
              Abrir bancada
            </Link>
          ) : (
            <>
              <Link to="/login" className={secondaryCtaClassName}>
                Entrar
              </Link>
              <Link to="/signup" className={primaryCtaClassName}>
                Criar conta grátis
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={menuButtonClassName}
          onClick={() =>
            setMenuOpenPath((currentPath) => (currentPath === location.pathname ? null : location.pathname))
          }
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Fechar navegação' : 'Abrir navegação'}
        >
          {isMenuOpen ? 'Fechar' : 'Menu'}
        </button>
      </div>

      {isMenuOpen ? (
        <div className="public-header__mobile-panel">
          <nav className="public-header__mobile-nav" aria-label="Navegação pública — mobile">
            {navItems.map((item) => (
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
              <Link to="/tool" className={primaryCtaClassName}>
                Abrir bancada
              </Link>
            ) : (
              <>
                <Link to="/login" className={secondaryCtaClassName}>
                  Entrar
                </Link>
                <Link to="/signup" className={primaryCtaClassName}>
                  Criar conta grátis
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
