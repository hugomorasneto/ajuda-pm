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
        <div className="mobile-topbar-brand">
          <span className="brand-mark" />
          <div>
            <p className="brand-name">{APP_NAME}</p>
            <p className="brand-caption">Workspace para PMs e POs</p>
          </div>
        </div>
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
            <p className="brand-caption">Conteudo e IA para backlog de produto</p>
          </div>
        </div>

        <div className="sidebar-intro-card">
          <p className="sidebar-intro-label">Workspace</p>
          <h2>Estruture backlog com mais clareza operacional.</h2>
          <p>Conteudo, geracao assistida e historico no mesmo ambiente.</p>
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
              <span className="sidebar-link-dot" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <div className="sidebar-user-card">
              <p className="sidebar-user-label">Conta ativa</p>
              <p className="sidebar-user">{user.email}</p>
              <button
                type="button"
                className="btn btn-ghost btn-small sidebar-auth-btn"
                onClick={handleSignOut}
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="sidebar-user-card">
              <p className="sidebar-user-label">Acesso</p>
              <div className="sidebar-auth-links">
                <Link className="sidebar-inline-link" to="/login" onClick={closeDrawer}>
                  Entrar
                </Link>
                <Link className="sidebar-inline-link" to="/signup" onClick={closeDrawer}>
                  Criar conta
                </Link>
              </div>
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
