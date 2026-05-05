import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar'
import WorkspaceTopbar from '../components/workspace/WorkspaceTopbar'
import '../styles/workspace.css'

function WorkspaceLayout() {
  const location = useLocation()
  const [sidebarOpenPath, setSidebarOpenPath] = useState(null)
  const [topbarStatus, setTopbarStatus] = useState(null)

  const isSidebarOpen = sidebarOpenPath === location.pathname
  const isForgeWorkspace =
    location.pathname === '/tool' ||
    location.pathname === '/tool/admin' ||
    location.pathname === '/historico' ||
    location.pathname.startsWith('/projetos')

  function openSidebar() {
    setSidebarOpenPath(location.pathname)
  }

  function closeSidebar() {
    setSidebarOpenPath(null)
  }

  return (
    <div className={`workspace-shell ${isForgeWorkspace ? 'theme-forge workspace-shell--forge' : ''}`.trim()}>
      <WorkspaceSidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      {isSidebarOpen ? (
        <button
          type="button"
          className="workspace-shell__backdrop"
          onClick={closeSidebar}
          aria-label="Fechar navegação"
        />
      ) : null}

      <div className="workspace-shell__main">
        <WorkspaceTopbar onOpenSidebar={openSidebar} topbarStatus={topbarStatus} />
        <main className="workspace-shell__content" id="main-content">
          <Outlet context={{ setTopbarStatus }} />
        </main>
      </div>
    </div>
  )
}

export default WorkspaceLayout
