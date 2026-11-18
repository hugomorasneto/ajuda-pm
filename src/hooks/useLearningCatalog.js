import portuguese from '../content/pt-BR/learningEditorial.json'
import { useLanguage } from '../i18n/context'
import { isLanguageBuild } from '../i18n/routes'

const english = isLanguageBuild(import.meta.env.MODE)
  ? import.meta.glob('../content/en/learningEditorial.json', { eager: true, import: 'default' })['../content/en/learningEditorial.json']
  : undefined

export function useLearningCatalog() {
  const { language } = useLanguage()
  return language === 'en' ? english : portuguese
}
