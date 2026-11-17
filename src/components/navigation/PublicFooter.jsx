import { buildAuthPath } from '../../utils/authRedirect'
import { useCopy, useLanguage } from '../../i18n/context'
import Link from '../../i18n/LocalizedLink'
import { APP_NAME, BRAND_LOGO_HORIZONTAL_SRC, HUGO_MORAES_LINKEDIN_URL } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'

const creatorName = 'Hugo Moraes Neto'
const footerGuides = [
  { slug: 'fundamentos-produto-agil', label: 'agileGuide' },
  { slug: 'user-stories-na-pratica', label: 'storiesGuide' },
  { slug: 'backlog-e-refinamento', label: 'backlogGuide' },
]

function PublicFooter() {
  const t = useCopy('navigation')
  const { canSwitch, language } = useLanguage()
  const authLocale = canSwitch ? language : undefined
  const { user } = useAuth()
  const brandStatement = t('footerStatement')
  const bottomCopy = `© ${new Date().getFullYear()} ${APP_NAME} · ${t('builtFor')}`
  const footerClassName = 'public-footer public-footer--forge-home'
  const footerCtaClassName = ['public-footer__cta', 'forge-button forge-button--metal forge-button--sm']
    .filter(Boolean)
    .join(' ')

  return (
    <footer className={footerClassName}>
      <div className="public-footer__inner">
        <div className="public-footer__brand">
          <div className="brand-logo">
            <img
              src={BRAND_LOGO_HORIZONTAL_SRC}
              alt={APP_NAME}
              className="brand-logo__image brand-logo--footer"
              loading="lazy"
            />
          </div>
          <p className="public-footer__brand-statement">{brandStatement}</p>
          <Link to={user ? '/tool' : buildAuthPath('/signup', undefined, authLocale)} className={footerCtaClassName}>
            {user ? t('openWorkspace') : t('createAccountArrow')}
          </Link>
        </div>

        <div className="public-footer__links">
          <nav className="public-footer__nav" aria-label={t('product')}>
            <p className="public-footer__nav-title">{t('product')}</p>
            <Link to="/">{t('product')}</Link>
            <Link to="/#como-funciona">{t('how')}</Link>
            <Link to="/#antes-depois">{t('beforeAfter')}</Link>
            <Link to="/#planos">{t('plans')}</Link>
          </nav>

          <nav className="public-footer__nav" aria-label={t('training')}>
            <p className="public-footer__nav-title">{t('training')}</p>
            {footerGuides.map((guide) => (
              <Link key={guide.slug} to={`/aprender/${guide.slug}`}>
                {t(guide.label)}
              </Link>
            ))}
            <Link to="/aprender">{t('allGuides')}</Link>
          </nav>

          <nav className="public-footer__nav" aria-label={t('institutionalAria')}>
            <p className="public-footer__nav-title">{t('institutional')}</p>
            <Link to={language === 'en' ? '/en/about' : '/sobre'}>{t('about')}</Link>
            <Link to="/faq">{t('faq')}</Link>
            <Link to="/politica-de-privacidade">{t('privacy')}</Link>
            <Link to="/preferencias-de-privacidade">{t('privacyPreferences')}</Link>
            <Link to="/termos-de-uso">{t('terms')}</Link>
            <Link to="/contato">{t('contact')}</Link>
            <a href={HUGO_MORAES_LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              {t('creatorLinkedIn')}
            </a>
          </nav>
        </div>
      </div>

      <div className="public-footer__bottom">
        <div className="public-footer__bottom-inner">
          <p>{bottomCopy}</p>
          <p className="public-footer__signature">
            {t('developedBy')}{' '}
            <a href={HUGO_MORAES_LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              {creatorName}
            </a>
            {t('signature')}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
