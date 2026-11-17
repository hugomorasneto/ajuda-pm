import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useLanguage } from '../i18n/context'
import { getExplicitLanguage } from '../i18n/routes'
import {
  buildAuthPath,
  clearAuthRedirect,
  getAuthContinuation,
  getAuthDestinationLanguage,
  getAuthRedirectContext,
  getAuthRedirectFromLocation,
  persistAuthRedirect,
} from '../utils/authRedirect'

export function useAuthJourney() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthLoading } = useAuth()
  const { language, preview } = useLanguage()
  const from = useMemo(() => getAuthRedirectFromLocation(location), [location])
  const explicit = preview
    ? getExplicitLanguage(location.search) ?? getAuthDestinationLanguage(from)
    : undefined
  const redirectTo = getAuthContinuation(from, explicit)
  const emailRedirectTo = preview ? buildAuthPath('/check-email', from, language) : from
  const context = getAuthRedirectContext(from)
  const latest = useRef(null)

  useLayoutEffect(() => {
    latest.current = { from, explicit }
    return () => {
      latest.current = null
    }
  }, [from, explicit])

  useEffect(() => {
    persistAuthRedirect(from)
  }, [from])

  useEffect(() => {
    if (!isAuthLoading && user) {
      clearAuthRedirect()
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthLoading, navigate, redirectTo, user])

  function pathTo(path) {
    return buildAuthPath(path, from, explicit)
  }

  function showCheckEmail(email) {
    const current = latest.current
    if (!current) return
    navigate(buildAuthPath('/check-email', current.from, current.explicit), {
      replace: true,
      state: { from: current.from, email },
    })
  }

  return { context, emailRedirectTo, from, isAuthLoading, language, location, pathTo, showCheckEmail }
}
