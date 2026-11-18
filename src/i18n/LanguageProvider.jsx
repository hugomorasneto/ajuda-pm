import { useCallback, useLayoutEffect, useMemo, useSyncExternalStore } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAuthDestinationLanguage, getAuthRedirectFromLocation } from '../utils/authRedirect'
import { useAuth } from '../hooks/useAuth'
import { LanguageContext } from './context'
import { getExplicitLanguage, getPilotPage, isLanguageEnabled, languageDestination, preferenceKey, resolveLanguage } from './routes'

const preferenceEvent = 'prodforge:language'
const temporaryPreferences = new Map()

function subscribe(listener) {
  window.addEventListener(preferenceEvent, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(preferenceEvent, listener)
    window.removeEventListener('storage', listener)
  }
}

function readPreference(key) {
  if (temporaryPreferences.has(key)) return temporaryPreferences.get(key)
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function savePreference(key, language) {
  try {
    window.localStorage.setItem(key, language)
    temporaryPreferences.delete(key)
  } catch {
    temporaryPreferences.set(key, language)
  }
  window.dispatchEvent(new Event(preferenceEvent))
}

export function LanguageProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthLoading } = useAuth()
  const preview = isLanguageEnabled(import.meta.env.MODE, window.location.hostname)
  const key = preferenceKey(user?.id)
  const getSaved = useCallback(() => preview ? readPreference(key) : null, [key, preview])
  const getVisitor = useCallback(() => preview ? readPreference(preferenceKey()) : null, [preview])
  const saved = useSyncExternalStore(subscribe, getSaved)
  const visitor = useSyncExternalStore(subscribe, getVisitor)
  const page = preview ? getPilotPage(location.pathname) : undefined
  const completingAuth = Boolean(page?.auth && isAuthLoading && (
    new URLSearchParams(location.search).has('code') ||
    new URLSearchParams(location.hash.slice(1)).has('access_token')
  ))
  const requested = getExplicitLanguage(location.search)
  const destinationLanguage = page?.auth && !requested
    ? getAuthDestinationLanguage(getAuthRedirectFromLocation(location))
    : undefined
  const language = resolveLanguage({
    pathname: location.pathname,
    search: destinationLanguage ? '?lang=' + destinationLanguage : location.search,
    enabled: preview,
    saved,
    visitor,
    browser: navigator.languages,
  })

  useLayoutEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const switchLanguage = useCallback((next) => {
    if (!page || completingAuth || !['pt-BR', 'en'].includes(next) || next === language) return
    savePreference(key, next)
    // Auth may consume callback parameters directly through browser history.
    const current = page.auth
      ? { ...location, search: window.location.search, hash: window.location.hash }
      : location
    navigate(languageDestination(current, next), {
      replace: !page.en,
      state: location.state,
    })
  }, [completingAuth, key, language, location, navigate, page])

  const value = useMemo(() => ({
    language,
    preview,
    canSwitch: Boolean(page),
    completingAuth,
    switchLanguage,
  }), [completingAuth, language, page, preview, switchLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
