import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { APP_NAME, BRAND_LOGO_HORIZONTAL_SRC } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'
import { useLearningProgress } from '../../hooks/useLearningProgress'
import { getUserProfile } from '../../services/userProfilesService'

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

function IconProjects() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 5h6l2 2h8v12H4z" />
      <path d="M8 12h8" />
      <path d="M8 15.5h5" />
    </svg>
  )
}

function IconTeams() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16.5" cy="9" r="2.5" />
      <path d="M3.5 19c.7-3 2.2-5 4.5-5s3.8 2 4.5 5" />
      <path d="M12.5 18.5c.5-2.2 1.8-3.7 4-3.7 1.7 0 3 1.1 4 3.7" />
    </svg>
  )
}

function IconCampfire() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M8 21 19 10" />
      <path d="M16 21 5 10" />
      <path d="M12 4c2 2 3.2 4 3.2 6.1A3.2 3.2 0 0 1 12 13.3a3.2 3.2 0 0 1-3.2-3.2C8.8 8.1 10.3 6.4 12 4Z" />
      <path d="M12 8.5c.9 1 1.4 1.9 1.4 2.8A1.4 1.4 0 0 1 12 12.7a1.4 1.4 0 0 1-1.4-1.4c0-.9.7-1.7 1.4-2.8Z" />
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

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
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

function SidebarNavLink({ item, onClose }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClose}
      className={({ isActive }) =>
        `workspace-sidebar__link ${item.toneClass ?? ''} ${isActive ? 'workspace-sidebar__link--active' : ''}`.trim()
      }
    >
      <span className={`workspace-sidebar__link-marker ${item.markerClass ?? ''}`} />
      <span className="workspace-sidebar__link-icon">{item.icon}</span>
      <span className="workspace-sidebar__link-label">{item.label}</span>
    </NavLink>
  )
}

function WorkspaceSidebar({ isOpen, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { completedSlugs } = useLearningProgress()
  const [canSeeAdmin, setCanSeeAdmin] = useState(false)

  const completedCount = TRAIL_SLUGS.filter((slug) => completedSlugs.has(slug)).length
  const totalCount = TRAIL_SLUGS.length
  const isAdminPath = location.pathname.startsWith('/tool/admin')

  useEffect(() => {
    let active = true

    async function loadAdminAccess() {
      if (!user?.id) {
        if (active) setCanSeeAdmin(false)
        return
      }

      const profile = await getUserProfile(user.id)
      if (!active) return
      setCanSeeAdmin(profile.success && profile.data?.role === 'admin')
    }

    loadAdminAccess()

    return () => {
      active = false
    }
  }, [user?.id])

  const baseToolNavItems = [
    {
      label: 'Bancada',
      description: 'Espaço para transformar briefing em user story.',
      path: '/tool',
      end: true,
      icon: <IconWorkspace />,
    },
    {
      label: 'Peças forjadas',
      description: 'Histórico das user stories geradas.',
      path: '/historico',
      end: true,
      icon: <IconHistory />,
    },
    {
      label: 'Projetos',
      description: 'Organize histórias por jornada quando fizer sentido.',
      path: '/projetos',
      end: true,
      icon: <IconProjects />,
    },
    {
      label: 'Times',
      description: 'Gerencie guildas e membros por projeto.',
      path: '/times',
      end: false,
      icon: <IconTeams />,
    },
    {
      label: 'Roda da Fogueira',
      description: 'Crie e acompanhe estimativas colaborativas.',
      path: '/roda',
      end: true,
      icon: <IconCampfire />,
    },
  ]
  const toolNavItems = canSeeAdmin || isAdminPath
    ? [...baseToolNavItems, { label: 'Administração', path: '/tool/admin', end: false, icon: <IconAdmin /> }]
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
      label: 'Stories na prática',
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
    <aside className={`workspace-sidebar ${isOpen ? 'workspace-sidebar--open' : ''}`}>
      <div className="workspace-sidebar__header">
        <Link
          to="/tool"
          className="brand-logo workspace-sidebar__brand"
          onClick={onClose}
          aria-label={APP_NAME}
        >
          <img
            src={BRAND_LOGO_HORIZONTAL_SRC}
            alt={APP_NAME}
            className="brand-logo__image brand-logo--sidebar"
          />
        </Link>

        <div className="workspace-sidebar__header-actions">
          <button
            type="button"
            className="workspace-sidebar__close"
            onClick={onClose}
            aria-label="Fechar navegação"
          >
            <IconClose />
          </button>
        </div>
      </div>

      <div className="workspace-sidebar__summary">
        <p className="workspace-sidebar__eyebrow">FORJA</p>
        <p className="workspace-sidebar__summary-copy">
          Bancada para transformar briefing em user story pronta para inspeção.
        </p>
      </div>

      <nav className="workspace-sidebar__nav" aria-label="Navegação da bancada">
        <p className="workspace-sidebar__section-label">Ferramentas</p>
        {toolNavItems.map((item) => (
          <SidebarNavLink key={item.path} item={item} onClose={onClose} />
        ))}
      </nav>

      <nav className="workspace-sidebar__nav" aria-label="Campo de Treino ProdForge">
        <div className="workspace-sidebar__section-header">
          <p className="workspace-sidebar__section-label">Campo de Treino</p>
          {completedCount > 0 ? (
            <span className="workspace-sidebar__progress-pill">
              {completedCount}/{totalCount}
            </span>
          ) : null}
        </div>
        <p className="workspace-sidebar__section-description">
          Guias práticos para aprender e aplicar na Bancada.
        </p>

        {academyNavItems.map((item) => (
          <SidebarNavLink key={item.path} item={item} onClose={onClose} />
        ))}
      </nav>

      <div className="workspace-sidebar__footer">
        {user ? (
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
