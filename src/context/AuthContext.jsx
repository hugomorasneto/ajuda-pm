import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthContext } from './authContextValue'

const EAGER_AUTH_PATH_PREFIXES = ['/login', '/signup', '/check-email', '/tool', '/admin']
const IDLE_BOOTSTRAP_DELAY_MS = 1200

function requiresImmediateAuthBootstrap(pathname) {
  return EAGER_AUTH_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

async function loadSupabaseClient() {
  const { supabase } = await import('../lib/supabaseClient')
  return supabase
}

function scheduleIdle(callback) {
  if (typeof window === 'undefined') return () => {}

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: IDLE_BOOTSTRAP_DELAY_MS })
    return () => window.cancelIdleCallback(idleId)
  }

  const timeoutId = window.setTimeout(callback, IDLE_BOOTSTRAP_DELAY_MS)
  return () => window.clearTimeout(timeoutId)
}

export function AuthProvider({ children }) {
  const location = useLocation()
  const needsImmediateAuth = requiresImmediateAuthBootstrap(location.pathname)
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [hasResolvedAuth, setHasResolvedAuth] = useState(false)

  const supabaseRef = useRef(null)
  const subscriptionRef = useRef(null)
  const bootstrapPromiseRef = useRef(null)

  const initializeAuth = useCallback(async () => {
    if (bootstrapPromiseRef.current) {
      return bootstrapPromiseRef.current
    }

    bootstrapPromiseRef.current = (async () => {
      const supabase = await loadSupabaseClient()
      supabaseRef.current = supabase

      const { data } = await supabase.auth.getSession()
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)

      if (!subscriptionRef.current) {
        const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession ?? null)
          setUser(nextSession?.user ?? null)
          setHasResolvedAuth(true)
        })

        subscriptionRef.current = listener.subscription
      }

      setHasResolvedAuth(true)
      return supabase
    })().catch((error) => {
      console.warn('auth_bootstrap_failed', error)
      setSession(null)
      setUser(null)
      setHasResolvedAuth(true)
      bootstrapPromiseRef.current = null
      throw error
    })

    return bootstrapPromiseRef.current
  }, [])

  useEffect(() => {
    if (needsImmediateAuth) {
      initializeAuth().catch(() => {})
      return undefined
    }

    if (!bootstrapPromiseRef.current) {
      const cancelIdleBootstrap = scheduleIdle(() => {
        initializeAuth().catch(() => {})
      })

      return cancelIdleBootstrap
    }

    return undefined
  }, [initializeAuth, needsImmediateAuth])

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = supabaseRef.current ?? (await initializeAuth())
    return supabase.auth.signOut()
  }, [initializeAuth])

  const isAuthLoading = needsImmediateAuth && !hasResolvedAuth

  const value = useMemo(
    () => ({
      session,
      user,
      isAuthLoading,
      signOut,
    }),
    [session, user, isAuthLoading, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
