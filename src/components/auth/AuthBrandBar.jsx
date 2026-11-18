import Link from '../../i18n/LocalizedLink'
import { APP_NAME, BRAND_LOGO_HORIZONTAL_SRC } from '../../constants/app'
import { useCopy } from '../../i18n/context'

export default function AuthBrandBar() {
  const t = useCopy('auth')
  return (
    <div className="auth-card__topbar">
      <Link to="/" className="auth-card__brand" aria-label={t('homeLabel')}>
        <img src={BRAND_LOGO_HORIZONTAL_SRC} alt={APP_NAME} className="auth-card__brand-logo" loading="eager" />
      </Link>
      <Link to="/" className="auth-card__home-link">{t('home')}</Link>
    </div>
  )
}
