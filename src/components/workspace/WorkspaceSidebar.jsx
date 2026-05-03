import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { APP_NAME, BRAND_MARK_SRC } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'
import { useLearningProgress } from '../../hooks/useLearningProgress'

const TRAIL_SLUGS = ['fundamentos-produto-agil', 'user-stories-na-pratica', 'backlog-e-refinamento']

const baseNavItems = [{ label: 'Área de trabalho', path: '/tool' }]

function WorkspaceSidebar({ isOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { completedSlugs } = useLearningProgress()

  const completedCount = TRAIL_SLUGS.filter((s) => completedSlugs.has(s)).length
  const totalCount = TRAIL_SLUGS.length

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
          <img
            src={BRAND_MARK_SRC}
            alt="ProdForge"
            className="workspace-sidebar__brand-mark"
          />
          <div className="workspace-sidebar__brand-copy">
            <p className="workspace-sidebar__brand-name">{APP_NAME}</p>
            <p className="workspace-sidebar__brand-caption">Workspace para PMs e POs</p>
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

      <div className="workspace-sidebar__summary">
        <p className="workspace-sidebar__eyebrow">Workspace</p>
        <p className="workspace-sidebar__summary-copy">Brief, story e revisão no mesmo fluxo.</p>
      </div>

      <nav className="workspace-sidebar__nav" aria-label="Navegação da área de trabalho">
        <p className="workspace-sidebar__section-label">Ferramentas</p>
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

      {/* ── Academia ── */}
      <nav className="workspace-sidebar__nav" aria-label="Academia ProdForge">
        <div className="workspace-sidebar__section-header">
          <p className="workspace-sidebar__section-label">Academia</p>
          {completedCount > 0 && (
            <span className="workspace-sidebar__progress-pill">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>

        <Link
          to="/aprender"
          className="workspace-sidebar__link workspace-sidebar__link--academy"
          onClick={onClose}
        >
          <span className="workspace-sidebar__link-marker workspace-sidebar__link-marker--academy" />
          <span>Guias práticos</span>
        </Link>

        <Link
          to="/aprender/user-stories-na-pratica"
          className="workspace-sidebar__link workspace-sidebar__link--academy"
          onClick={onClose}
        >
          <span className="workspace-sidebar__link-marker workspace-sidebar__link-marker--academy" />
          <span>User stories na prática</span>
        </Link>
      </nav>

      <div className="workspace-sidebar__footer">
        {user ? (
          <div className="workspace-sidebar__account">
            <div className="workspace-sidebar__account-meta">
              <p className="workspace-sidebar__account-label">Conta ativa</p>
              <p className="workspace-sidebar__account-email">{user.email}</p>
            </div>
            <button type="button" className="workspace-sidebar__signout" onClick={handleSignOut}>
              Sair
            </button>
          </div>
        ) : (
          <div className="workspace-sidebar__account workspace-sidebar__account--guest">
            <p className="workspace-sidebar__account-label">Acesso</p>
            <div className="workspace-sidebar__account-links">
              <Link to="/login" onClick={onClose}>Entrar</Link>
              <Link to="/signup" onClick={onClose}>Criar conta</Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default WorkspaceSidebar
