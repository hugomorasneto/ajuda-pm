import { Link, useLocation } from 'react-router-dom'
import { BRAND_MARK_SRC } from '../../constants/app'

const pageMeta = {
  '/tool': {
    title: 'Bancada de trabalho',
    description: 'Espaço para transformar briefing em user story.',
  },
  '/historico': {
    title: 'Peças forjadas',
    description: 'Histórico das user stories geradas, versões e artefatos prontos para inspeção.',
  },
  '/projetos': {
    title: 'Projetos',
    description: 'Organize histórias por jornada quando fizer sentido.',
  },
  '/times': {
    title: 'Times',
    description: 'Gerencie guildas e membros por projeto.',
  },
  '/roda': {
    title: 'Roda da Fogueira',
    description: 'Crie e acompanhe estimativas colaborativas.',
  },
  '/tool/admin': {
    title: 'Administração da Forja',
    description: 'Acompanhe operação, aquisição e uso do ProdForge.',
  },
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

function WorkspaceTopbar({ onOpenSidebar, topbarStatus }) {
  const location = useLocation()
  const meta = pageMeta[location.pathname] ??
    (location.pathname.startsWith('/projetos/')
      ? pageMeta['/projetos']
      : {
          title: 'Bancada de trabalho',
          description: 'Ambiente interno do ProdForge.',
        })

  const hasStatus = Boolean(topbarStatus)

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar__inner">
        <div className="workspace-topbar__leading">
          <button
            type="button"
            className="workspace-topbar__menu"
            onClick={onOpenSidebar}
            aria-label="Abrir navegação"
          >
            <IconMenu />
            <span>Menu</span>
          </button>

          <img
            src={BRAND_MARK_SRC}
            alt=""
            className="workspace-topbar__brand-mark"
            aria-hidden="true"
          />

          <div className="workspace-topbar__copy">
            <p className="workspace-topbar__eyebrow">ProdForge</p>
            <h1>{meta.title}</h1>
            {!hasStatus && <p>{meta.description}</p>}
          </div>
        </div>

        {hasStatus ? (
          <div className="workspace-topbar__status">
            <span className="workspace-topbar__status-eyebrow">{topbarStatus.label}</span>
            <span className="workspace-topbar__status-title">{topbarStatus.title}</span>
            <div className="workspace-topbar__status-pills">
              {topbarStatus.pills?.map((pill, i) => (
                <span key={i} className={`mode-pill ${pill.className ?? ''}`}>
                  {pill.text}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="workspace-topbar__actions">
          <Link to="/aprender" className="workspace-topbar__link workspace-topbar__link--academy">
            Campo de Treino
          </Link>
          <Link to="/" className="workspace-topbar__link">
            Site
          </Link>
        </div>
      </div>
    </header>
  )
}

export default WorkspaceTopbar
