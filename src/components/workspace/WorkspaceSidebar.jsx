import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { APP_NAME } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'

const baseNavItems = [
  { label: 'Área de trabalho', path: '/tool' },
]

function WorkspaceSidebar({ isOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const navItems = location.pathname.startsWith('/admin')
    ? [...baseNavItems, { label: 'Admin', path: '/admin' }]
    : baseNavItems

  async function handleSignOut() {
    await signOut()
    onClose()
    navigate('/login', {
      replace: true,
      state: { message: 'Você saiu da conta.' },
    })
  }

  return (
    <aside className={`workspace-sidebar ${isOpen ? 'workspace-sidebar--open' : ''}`}>
      <div className="workspace-sidebar__header">
        <Link to="/tool" className="workspace-sidebar__brand" onClick={onClose}>
          <span className="workspace-sidebar__brand-mark" />
          <div>
            <p className="workspace-sidebar__brand-name">{APP_NAME}</p>
            <p className="workspace-sidebar__brand-caption">Área de trabalho para PMs e POs</p>
          </div>
        </Link>

        <button
          type="button"
          className="workspace-sidebar__close"
          onClick={onClose}
          aria-label="Fechar navegação"
        >
          Fechar
        </button>
      </div>

      <div className="workspace-sidebar__intro">
        <p className="workspace-sidebar__eyebrow">Área de trabalho</p>
        <h2>Crie, revise e refine user stories no mesmo fluxo.</h2>
        <p>Acesse a geração, o histórico e os materiais de apoio em um só lugar.</p>
      </div>

      <nav className="workspace-sidebar__nav" aria-label="Navegação da área de trabalho">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/' || item.path === '/tool'}
            onClick={onClose}
            className={({ isActive }) =>
              `workspace-sidebar__link ${isActive ? 'workspace-sidebar__link--active' : ''}`
            }
          >
            <span className="workspace-sidebar__link-marker" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="workspace-sidebar__footer">
        {user ? (
          <div className="workspace-sidebar__account">
            <p className="workspace-sidebar__account-label">Conta ativa</p>
            <p className="workspace-sidebar__account-email">{user.email}</p>
            <button type="button" className="workspace-sidebar__signout" onClick={handleSignOut}>
              Sair
            </button>
          </div>
        ) : (
          <div className="workspace-sidebar__account">
            <p className="workspace-sidebar__account-label">Acesso</p>
            <div className="workspace-sidebar__account-links">
              <Link to="/login" onClick={onClose}>
                Entrar
              </Link>
              <Link to="/signup" onClick={onClose}>
                Criar conta
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default WorkspaceSidebar
