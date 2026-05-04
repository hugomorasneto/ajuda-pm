import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { APP_NAME, BRAND_LOGO_HORIZONTAL_SRC, BRAND_MARK_SRC } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'
import { useLearningProgress } from '../../hooks/useLearningProgress'

const TRAIL_SLUGS = ['fundamentos-produto-agil', 'user-stories-na-pratica', 'backlog-e-refinamento']

function IconWorkspace() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M3 5.5h18v13H3z" />
      <path d="M3 10.5h18" />
      <path d="M8 10.5v8" />
    </svg>
  )
}

function IconAdmin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 7h10" />
      <path d="M4 17h16" />
      <circle cx="17" cy="7" r="2.5" />
      <circle cx="9" cy="17" r="2.5" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 5h16v14H4z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
      <path d="M6 3v4" />
      <path d="M18 3v4" />
    </svg>
  )
}

function IconAcademy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M3 7.5L12 3l9 4.5L12 12 3 7.5Z" />
      <path d="M7 10v4.5c0 1.8 2.24 3.5 5 3.5s5-1.7 5-3.5V10" />
    </svg>
  )
}

function IconGuide() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M6 4.5h11a2 2 0 0 1 2 2V19l-4-2-4 2-4-2-4 2V6.5a2 2 0 0 1 2-2h1Z" />
      <path d="M8 8h7" />
      <path d="M8 11.5h5" />
    </svg>
  )
}

function IconStoryGuide() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M6 5h12v14H6z" />
      <path d="M9 9h6" />
      <path d="M9 12.5h6" />
      <path d="M9 16h4" />
    </svg>
  )
}

function IconPanelToggle({ isCompact }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 5.5h16v13H4z" />
      <path d={isCompact ? 'M9 5.5v13' : 'M15 5.5v13'} />
      {isCompact ? <path d="m13 12 3-3v6l-3-3Z" /> : <path d="m11 12-3-3v6l3-3Z" />}
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

function IconSignOut() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M14 7V4.5A1.5 1.5 0 0 0 12.5 3h-6A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h6a1.5 1.5 0 0 0 1.5-1.5V17" />
      <path d="M10 12h10" />
      <path d="m17 8 4 4-4 4" />
    </svg>
  )
}

function getTooltipProps(label, isCompact) {
  if (!isCompact) return {}

  return {
    'aria-label': label,
    'data-tooltip': label,
    title: label,
  }
}

function SidebarNavLink({ item, isCompact, onClose }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClose}
      className={({ isActive }) =>
        `workspace-sidebar__link ${item.toneClass ?? ''} ${isActive ? 'workspace-sidebar__link--active' : ''}`.trim()
      }
      {...getTooltipProps(item.label, isCompact)}
    >
      <span className={`workspace-sidebar__link-marker ${item.markerClass ?? ''}`} />
      <span className="workspace-sidebar__link-icon">{item.icon}</span>
      {!isCompact ? <span className="workspace-sidebar__link-label">{item.label}</span> : null}
    </NavLink>
  )
}

function WorkspaceSidebar({
  isOpen,
  onClose,
  isCompact = false,
  canToggleDensity = false,
  onToggleDensity,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { completedSlugs } = useLearningProgress()

  const completedCount = TRAIL_SLUGS.filter((slug) => completedSlugs.has(slug)).length
  const totalCount = TRAIL_SLUGS.length
  const accountInitial = user?.email?.charAt(0)?.toUpperCase() || 'P'

  const baseToolNavItems = [
    { label: 'Área de trabalho', path: '/tool', end: true, icon: <IconWorkspace /> },
    { label: 'Histórico', path: '/historico', end: true, icon: <IconHistory /> },
  ]
  const toolNavItems = location.pathname.startsWith('/admin')
    ? [...baseToolNavItems, { label: 'Admin', path: '/admin', end: false, icon: <IconAdmin /> }]
    : baseToolNavItems

  const academyNavItems = [
    {
      label: 'Guias práticos',
      path: '/aprender',
      end: false,
      icon: <IconAcademy />,
      toneClass: 'workspace-sidebar__link--academy',
      markerClass: 'workspace-sidebar__link-marker--academy',
    },
    {
      label: 'User stories na prática',
      path: '/aprender/user-stories-na-pratica',
      end: true,
      icon: <IconStoryGuide />,
      toneClass: 'workspace-sidebar__link--academy',
      markerClass: 'workspace-sidebar__link-marker--academy',
    },
  ]

  async function handleSignOut() {
    await signOut()
    onClose()
    navigate('/login', {
      replace: true,
      state: { message: 'Você saiu da conta.' },
    })
  }

  return (
    <aside
      className={`workspace-sidebar ${isOpen ? 'workspace-sidebar--open' : ''} ${
        isCompact ? 'workspace-sidebar--compact' : ''
      }`}
    >
      <div className="workspace-sidebar__header">
        <Link
          to="/tool"
          className="brand-logo workspace-sidebar__brand"
          onClick={onClose}
          aria-label={APP_NAME}
          {...getTooltipProps(APP_NAME, isCompact)}
        >
          <img
            src={isCompact ? BRAND_MARK_SRC : BRAND_LOGO_HORIZONTAL_SRC}
            alt={APP_NAME}
            className="brand-logo__image brand-logo--sidebar"
          />
        </Link>

        <div className="workspace-sidebar__header-actions">
          {canToggleDensity ? (
            <button
              type="button"
              className="workspace-sidebar__density-toggle"
              onClick={onToggleDensity}
              aria-label={isCompact ? 'Expandir menu lateral' : 'Compactar menu lateral'}
              title={isCompact ? 'Expandir menu lateral' : 'Compactar menu lateral'}
              data-tooltip={isCompact ? 'Expandir menu lateral' : 'Compactar menu lateral'}
            >
              <IconPanelToggle isCompact={isCompact} />
              {!isCompact ? <span>Compactar</span> : null}
            </button>
          ) : null}
        </div>
      </div>

      {!isCompact ? (
        <div className="workspace-sidebar__summary">
          <p className="workspace-sidebar__eyebrow">Workspace</p>
          <p className="workspace-sidebar__summary-copy">Brief, story e revisão no mesmo fluxo.</p>
        </div>
      ) : null}

      <nav className="workspace-sidebar__nav" aria-label="Navegação da área de trabalho">
        {!isCompact ? <p className="workspace-sidebar__section-label">Ferramentas</p> : null}
        {toolNavItems.map((item) => (
          <SidebarNavLink key={item.path} item={item} isCompact={isCompact} onClose={onClose} />
        ))}
      </nav>

      <nav className="workspace-sidebar__nav" aria-label="Academia ProdForge">
        {!isCompact ? (
          <div className="workspace-sidebar__section-header">
            <p className="workspace-sidebar__section-label">Academia</p>
            {completedCount > 0 ? (
              <span className="workspace-sidebar__progress-pill">
                {completedCount}/{totalCount}
              </span>
            ) : null}
          </div>
        ) : null}

        {academyNavItems.map((item) => (
          <SidebarNavLink key={item.path} item={item} isCompact={isCompact} onClose={onClose} />
        ))}
      </nav>

      <div className="workspace-sidebar__footer">
        {user ? (
          isCompact ? (
            <div className="workspace-sidebar__account workspace-sidebar__account--compact">
              <div
                className="workspace-sidebar__account-badge"
                {...getTooltipProps(`Conta ativa: ${user.email}`, true)}
              >
                <IconUser />
                <span>{accountInitial}</span>
              </div>

              <button
                type="button"
                className="workspace-sidebar__signout workspace-sidebar__signout--compact"
                onClick={handleSignOut}
                {...getTooltipProps('Sair da conta', true)}
              >
                <IconSignOut />
              </button>
            </div>
          ) : (
            <div className="workspace-sidebar__account">
              <div className="workspace-sidebar__account-meta">
                <p className="workspace-sidebar__account-label">Conta ativa</p>
                <p className="workspace-sidebar__account-email">{user.email}</p>
              </div>
              <button type="button" className="workspace-sidebar__signout" onClick={handleSignOut}>
                <IconSignOut />
                <span>Sair</span>
              </button>
            </div>
          )
        ) : isCompact ? (
          <div className="workspace-sidebar__account workspace-sidebar__account--compact">
            <Link
              to="/login"
              className="workspace-sidebar__compact-link"
              onClick={onClose}
              {...getTooltipProps('Entrar', true)}
            >
              <IconUser />
            </Link>
            <Link
              to="/signup"
              className="workspace-sidebar__compact-link"
              onClick={onClose}
              {...getTooltipProps('Criar conta', true)}
            >
              <IconGuide />
            </Link>
          </div>
        ) : (
          <div className="workspace-sidebar__account workspace-sidebar__account--guest">
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
