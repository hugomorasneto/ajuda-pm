import { buildAuthPath } from '../../utils/authRedirect'
import LanguageSwitcher from '../../i18n/LanguageSwitcher'
import { useCopy, useLanguage } from '../../i18n/context'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Link from '../../i18n/LocalizedLink'
import { getPilotPage } from '../../i18n/routes'
import { APP_NAME, BRAND_LOGO_HORIZONTAL_SRC } from '../../constants/app'
import { useAuth } from '../../hooks/useAuth'

const publicNavItems = (t) => [
  { label: t('product'), to: '/#produto', activeOn: ['/'] },
  { label: t('how'), to: '/#como-funciona' },
  { label: t('training'), to: '/aprender', activeOn: ['/aprender'] },
  { label: t('plans'), to: '/#planos' },
]

function isItemActive(item, pathname) {
  if (!item.activeOn) {
    return false
  }

  return item.activeOn.some((activePath) =>
    activePath === '/' ? getPilotPage(pathname)?.id === 'home' : pathname.startsWith(activePath)
  )
}

function PublicNavLink({ item, pathname, mobile = false, onNavigate }) {
  const baseClassName = mobile ? 'public-header__mobile-link' : 'public-header__link'
  const activeClassName = mobile ? 'public-header__mobile-link--active' : 'public-header__link--active'
  const className = [baseClassName, isItemActive(item, pathname) ? activeClassName : '']
    .filter(Boolean)
    .join(' ')

  if (item.to) {
    return (
      <Link to={item.to} className={className} onClick={onNavigate}>
        {item.label}
      </Link>
    )
  }

  return (
    <a href={item.href} className={className} onClick={onNavigate}>
      {item.label}
    </a>
  )
}

function PublicHeader({ isHomeRoute = false, isLearningRoute = false, isLegalRoute = false }) {
  const t = useCopy('navigation')
  const { canSwitch, language, preview } = useLanguage()
  const authLocale = canSwitch ? language : undefined
  const location = useLocation()
  const { user } = useAuth()
  const [menuOpenPath, setMenuOpenPath] = useState(null)
  const navPage = getPilotPage(location.pathname)?.id ?? location.pathname
  const isMenuOpen = menuOpenPath === navPage
  const isForgeHeader = isHomeRoute || isLearningRoute || isLegalRoute
  const navItems = publicNavItems(t)
  const headerClassName = ['public-header', isForgeHeader ? 'public-header--forge-home' : '']
    .filter(Boolean)
    .join(' ')
  const primaryCtaClassName = [
    'public-header__cta',
    'public-header__cta--primary',
    isForgeHeader ? 'forge-button forge-button--ember forge-button--sm' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const secondaryCtaClassName = [
    'public-header__cta',
    'public-header__cta--secondary',
    isForgeHeader ? 'forge-button forge-button--ghost forge-button--sm' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const menuButtonClassName = [
    'public-header__menu-button',
    isForgeHeader ? 'forge-button forge-button--ghost forge-button--sm' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={headerClassName}>
      <div className="public-header__inner">
        <Link to="/" className="brand-logo" aria-label={APP_NAME}>
          <img
            src={BRAND_LOGO_HORIZONTAL_SRC}
            alt={APP_NAME}
            className="brand-logo__image brand-logo--header"
            loading="eager"
          />
        </Link>

        <nav className="public-header__nav" aria-label={t('publicNav')}>
          {navItems.map((item) => (
            <PublicNavLink key={item.to ?? item.href} item={item} pathname={location.pathname} />
          ))}
        </nav>

        <div className="public-header__actions">
          {user ? (
            <Link to="/tool" className={primaryCtaClassName}>
              {t('openWorkspace')}
            </Link>
          ) : (
            <>
              <Link to={buildAuthPath('/login', undefined, authLocale)} className={secondaryCtaClassName}>
                {t('signIn')}
              </Link>
              <Link to={buildAuthPath('/signup', undefined, authLocale)} className={primaryCtaClassName}>
                {t('createAccount')}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className={menuButtonClassName}
          onClick={() =>
            setMenuOpenPath((currentPath) => (currentPath === navPage ? null : navPage))
          }
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? t('closeNav') : t('openNav')}
        >
          {isMenuOpen ? t('close') : t('menu')}
        </button>
      </div>

      {preview && <div className="public-header__language"><LanguageSwitcher /></div>}

      {isMenuOpen ? (
        <div className="public-header__mobile-panel">
          <nav className="public-header__mobile-nav" aria-label={t('mobileNav')}>
            {navItems.map((item) => (
              <PublicNavLink
                key={item.to ?? item.href}
                item={item}
                pathname={location.pathname}
                mobile
                onNavigate={() => setMenuOpenPath(null)}
              />
            ))}
          </nav>

          <div className="public-header__mobile-actions">
            {user ? (
              <Link to="/tool" className={primaryCtaClassName}>
                {t('openWorkspace')}
              </Link>
            ) : (
              <>
                <Link to={buildAuthPath('/login', undefined, authLocale)} className={secondaryCtaClassName}>
                  {t('signIn')}
                </Link>
                <Link to={buildAuthPath('/signup', undefined, authLocale)} className={primaryCtaClassName}>
                  {t('createAccount')}
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}

export default PublicHeader
