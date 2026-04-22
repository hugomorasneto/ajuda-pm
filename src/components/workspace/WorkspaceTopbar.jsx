import { Link, useLocation } from 'react-router-dom'

const pageMeta = {
  '/tool': {
    title: 'Área de trabalho',
    description: 'Brief, documento e revisão no mesmo fluxo.',
  },
  '/admin': {
    title: 'Painel administrativo',
    description: 'Acompanhe a operação e os principais indicadores do produto.',
  },
}

function WorkspaceTopbar({ onOpenSidebar }) {
  const location = useLocation()
  const meta = pageMeta[location.pathname] ?? {
    title: 'Área de trabalho',
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
            aria-label="Abrir navegação"
          >
            Menu
          </button>

          <div className="workspace-topbar__copy">
            <p className="workspace-topbar__eyebrow">ProdForge</p>
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>
          </div>
        </div>

        <div className="workspace-topbar__actions">
          <Link to="/" className="workspace-topbar__link">
            Ver página pública
          </Link>
        </div>
      </div>
    </header>
  )
}

export default WorkspaceTopbar
