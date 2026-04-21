import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../constants/app'

const navItems = [
  { label: 'Inicio', path: '/' },
  { label: 'Fundamentos', path: '/fundamentos' },
  { label: 'Scrum & Agil', path: '/scrum-agil' },
  { label: 'Backlog', path: '/backlog' },
  { label: 'User Stories', path: '/user-stories' },
  { label: 'Templates', path: '/templates' },
  { label: 'Ferramentas IA', path: '/tool' },
  { label: 'Glossario', path: '/glossario' },
]

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  function closeDrawer() {
    setIsOpen(false)
  }

  async function handleSignOut() {
    await signOut()
    closeDrawer()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="mobile-topbar">
        <p className="brand-name">{APP_NAME}</p>
        <button
          className="menu-button"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label="Abrir navegacao"
        >
          Menu
        </button>
      </header>

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark" />
          <div>
            <p className="brand-name">{APP_NAME}</p>
            <p className="brand-caption">Conteudo + Ferramentas</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegacao principal">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <>
              <p className="sidebar-user">{user.email}</p>
              <button
                type="button"
                className="btn btn-ghost btn-small sidebar-auth-btn"
                onClick={handleSignOut}
              >
                Sair
              </button>
            </>
          ) : (
            <div className="sidebar-auth-links">
              <Link className="sidebar-inline-link" to="/login" onClick={closeDrawer}>
                Entrar
              </Link>
              <Link className="sidebar-inline-link" to="/signup" onClick={closeDrawer}>
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </aside>

      {isOpen ? (
        <button
          type="button"
          className="backdrop"
          onClick={closeDrawer}
          aria-label="Fechar navegacao"
        />
      ) : null}
    </>
  )
}

export default Sidebar

