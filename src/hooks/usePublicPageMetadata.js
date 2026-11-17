import { useLanguage } from '../i18n/context'
import { getPublicMetadata } from '../i18n/publicMetadata'
import { usePageMetadata } from './usePageMetadata'

const englishCatalogs = import.meta.env.MODE === 'i18n-preview'
  ? import.meta.glob('../content/en/*Metadata.json', { eager: true, import: 'default' })
  : {}

export function usePublicPageMetadata(page, faqCategories) {
  const { language } = useLanguage()
  const file = page === 'about' ? 'aboutMetadata' : 'publicMetadata'
  const catalog = language === 'en' ? englishCatalogs['../content/en/' + file + '.json'] : undefined
  usePageMetadata(getPublicMetadata(page, language, faqCategories, catalog))
}

export function formatPublicDate(isoDate, language) {
  return new Intl.DateTimeFormat(language, {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(isoDate))
}
