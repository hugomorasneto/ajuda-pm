import { Link } from 'react-router-dom'
import { useLanguage } from './context'
import { getPilotPage, localizeHref } from './routes'

export default function LocalizedLink({ to, hrefLang, ...props }) {
  const { language, preview } = useLanguage()
  const target = preview ? localizeHref(to, language) : to
  const targetPath = typeof target === 'string' ? target.split(/[?#]/, 1)[0] : ''
  const untranslated = language === 'en' && targetPath.startsWith('/') && !getPilotPage(targetPath)
  return <Link {...props} to={target} hrefLang={hrefLang ?? (untranslated ? 'pt-BR' : undefined)} />
}
