import { createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_LANGUAGE } from './routes'

export const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  preview: false,
  canSwitch: false,
})

export function useLanguage() {
  return useContext(LanguageContext)
}

export function useCopy(namespace) {
  const { language } = useLanguage()
  return useTranslation(namespace, { lng: language }).t
}
