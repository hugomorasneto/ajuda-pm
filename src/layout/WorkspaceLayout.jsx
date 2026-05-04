import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar'
import WorkspaceTopbar from '../components/workspace/WorkspaceTopbar'
import { useAuth } from '../hooks/useAuth'
import '../styles/workspace.css'

const DESKTOP_SIDEBAR_QUERY = '(min-width: 1100px)'
const DEFAULT_SIDEBAR_DENSITY = 'expanded'

function getMediaQueryMatch(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(query).matches
}

function getSidebarDensityStorageKey(userId) {
  return `pf_workspace_sidebar_density_${userId ?? 'guest'}`
}

function readSidebarDensityPreference(userId) {
  if (typeof window === 'undefined') {
    return DEFAULT_SIDEBAR_DENSITY
  }

  try {
    const rawValue = window.localStorage.getItem(getSidebarDensityStorageKey(userId))
    return rawValue === 'compact' ? 'compact' : DEFAULT_SIDEBAR_DENSITY
  } catch (error) {
    console.error('Falha ao ler densidade da sidebar:', error)
    return DEFAULT_SIDEBAR_DENSITY
  }
}

function WorkspaceLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const [sidebarOpenPath, setSidebarOpenPath] = useState(null)
  const [canUseCompactSidebar, setCanUseCompactSidebar] = useState(() =>
    getMediaQueryMatch(DESKTOP_SIDEBAR_QUERY),
  )
  const [sidebarDensityState, setSidebarDensityState] = useState(() => {
    const initialUserId = user?.id ?? null
    return {
      userId: initialUserId,
      density: readSidebarDensityPreference(initialUserId),
    }
  })
  const [topbarStatus, setTopbarStatus] = useState(null)

  const isSidebarOpen = sidebarOpenPath === location.pathname
  const isForgeWorkspace = location.pathname === '/tool' || location.pathname === '/historico'
  const resolvedSidebarDensity = useMemo(() => {
    const currentUserId = user?.id ?? null
    if (sidebarDensityState.userId === currentUserId) {
      return sidebarDensityState.density
    }

    return readSidebarDensityPreference(currentUserId)
  }, [sidebarDensityState, user])
  const isSidebarCompact = canUseCompactSidebar && resolvedSidebarDensity === 'compact'
  const sidebarTrackWidth = isSidebarCompact ? '68px' : '248px'

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQueryList = window.matchMedia(DESKTOP_SIDEBAR_QUERY)
    const syncDesktopSidebarAvailability = (event) => {
      setCanUseCompactSidebar(event.matches)
    }

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', syncDesktopSidebarAvailability)
      return () => mediaQueryList.removeEventListener('change', syncDesktopSidebarAvailability)
    }

    mediaQueryList.addListener(syncDesktopSidebarAvailability)
    return () => mediaQueryList.removeListener(syncDesktopSidebarAvailability)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(
        getSidebarDensityStorageKey(user?.id ?? null),
        resolvedSidebarDensity,
      )
    } catch (error) {
      console.error('Falha ao salvar densidade da sidebar:', error)
    }
  }, [resolvedSidebarDensity, user])

  function openSidebar() {
    setSidebarOpenPath(location.pathname)
  }

  function closeSidebar() {
    setSidebarOpenPath(null)
  }

  function toggleSidebarDensity() {
    setSidebarDensityState({
      userId: user?.id ?? null,
      density: isSidebarCompact ? 'expanded' : 'compact',
    })
  }

  return (
    <div
      className={`workspace-shell ${
        isForgeWorkspace ? 'theme-forge workspace-shell--forge' : ''
      } ${isSidebarCompact ? 'workspace-shell--sidebar-compact' : ''}`.trim()}
      style={{ '--workspace-sidebar-width': sidebarTrackWidth }}
    >
      <WorkspaceSidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCompact={isSidebarCompact}
        canToggleDensity={canUseCompactSidebar}
        onToggleDensity={toggleSidebarDensity}
      />

      {isSidebarOpen ? (
        <button
          type="button"
          className="workspace-shell__backdrop"
          onClick={closeSidebar}
          aria-label="Fechar navegacao"
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
