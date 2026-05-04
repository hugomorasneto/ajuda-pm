import { Link, useLocation } from 'react-router-dom'

const pageMeta = {
  '/tool': {
    title: 'Bancada de trabalho',
    description: 'Da matéria-prima à story pronta para entrega.',
  },
  '/historico': {
    title: 'Peças forjadas',
    description: 'Stories salvas, versões e artefatos prontos para inspeção.',
  },
  '/admin': {
    title: 'Painel administrativo',
    description: 'Acompanhe a operação e os principais indicadores do produto.',
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
  const meta = pageMeta[location.pathname] ?? {
    title: 'Bancada de trabalho',
    description: 'Ambiente interno do ProdForge.',
  }

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
            Academia
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
