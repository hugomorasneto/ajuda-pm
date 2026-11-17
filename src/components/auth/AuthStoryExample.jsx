import { Trans } from 'react-i18next'
import { useCopy } from '../../i18n/context'

export default function AuthStoryExample({ label }) {
  const t = useCopy('auth')
  return (
    <div className="auth-side__preview">
      <p className="auth-side__preview-label">{t(label)}</p>
      <div className="auth-side__preview-card">
        <p className="auth-side__preview-story">
          <Trans t={t} ns="auth" i18nKey="exampleStory" />
        </p>
        <ul className="auth-side__preview-criteria">
          <li>{t('exampleBlock')}</li>
          <li>{t('exampleGuide')}</li>
          <li>{t('exampleLog')}</li>
        </ul>
      </div>
    </div>
  )
}
