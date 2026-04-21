import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { APP_NAME } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'

const publicNavItems = [
  { label: 'Início', path: '/' },
  { label: 'Fundamentos', path: '/fundamentos' },
  { label: 'User stories', path: '/user-stories' },
  { label: 'Templates', path: '/templates' },
]

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
            <span className="public-brand__tagline">User stories mais claras para PMs e POs</span>
          </div>
        </Link>

        <nav className="public-header__nav" aria-label="Navegação pública">
          {publicNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `public-header__link ${isActive ? 'public-header__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="public-header__actions">
          {user ? (
            <Link to="/tool" className="public-header__cta public-header__cta--primary">
              Abrir área de trabalho
            </Link>
          ) : (
            <>
              <Link to="/login" className="public-header__cta public-header__cta--secondary">
                Entrar
              </Link>
              <Link to="/signup" className="public-header__cta public-header__cta--primary">
                Criar conta
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="public-header__menu-button"
          onClick={() =>
            setMenuOpenPath((current) => (current === location.pathname ? null : location.pathname))
          }
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Fechar navegação' : 'Abrir navegação'}
        >
          {isMenuOpen ? 'Fechar' : 'Menu'}
        </button>
      </div>

      {isMenuOpen ? (
        <div className="public-header__mobile-panel">
          <nav className="public-header__mobile-nav" aria-label="Navegação pública no mobile">
            {publicNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `public-header__mobile-link ${isActive ? 'public-header__mobile-link--active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="public-header__mobile-actions">
            {user ? (
              <Link to="/tool" className="public-header__cta public-header__cta--primary">
                Abrir área de trabalho
              </Link>
            ) : (
              <>
                <Link to="/login" className="public-header__cta public-header__cta--secondary">
                  Entrar
                </Link>
                <Link to="/signup" className="public-header__cta public-header__cta--primary">
                  Criar conta
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
