import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar'
import WorkspaceTopbar from '../components/workspace/WorkspaceTopbar'

function WorkspaceLayout() {
  const location = useLocation()
  const [sidebarOpenPath, setSidebarOpenPath] = useState(null)
  const isSidebarOpen = sidebarOpenPath === location.pathname

  function openSidebar() {
    setSidebarOpenPath(location.pathname)
  }

  function closeSidebar() {
    setSidebarOpenPath(null)
  }

  return (
    <div className="workspace-shell">
      {/* Sidebar: col 1 no desktop, drawer no mobile */}
      <WorkspaceSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Backdrop mobile */}
      {isSidebarOpen ? (
        <button
          type="button"
          className="workspace-shell__backdrop"
          onClick={closeSidebar}
          aria-label="Fechar navegação"
        />
      ) : null}

      {/* Col 2 no desktop: topbar + conteúdo */}
      <div className="workspace-shell__main">
        <WorkspaceTopbar onOpenSidebar={openSidebar} />
        <main className="workspace-shell__content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default WorkspaceLayout
