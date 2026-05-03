import { Link, useLocation } from 'react-router-dom'

const pageMeta = {
  '/tool': {
    title: 'Area de trabalho',
    description: 'Brief, story e revisao no mesmo fluxo.',
  },
  '/admin': {
    title: 'Painel administrativo',
    description: 'Acompanhe a operacao e os principais indicadores do produto.',
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

function WorkspaceTopbar({ onOpenSidebar }) {
  const location = useLocation()
  const meta = pageMeta[location.pathname] ?? {
    title: 'Area de trabalho',
    description: 'Ambiente interno do ProdForge.',
  }

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar__inner">
        <div className="workspace-topbar__leading">
          <button
            type="button"
            className="workspace-topbar__menu"
            onClick={onOpenSidebar}
            aria-label="Abrir navegacao"
          >
            <IconMenu />
            <span>Menu</span>
          </button>

          <div className="workspace-topbar__copy">
            <p className="workspace-topbar__eyebrow">ProdForge</p>
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>
          </div>
        </div>

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
