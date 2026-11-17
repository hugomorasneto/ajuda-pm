import { useCopy } from '../../i18n/context'

export default function AuthReturnContext({ destination, heading }) {
  const t = useCopy('auth')
  const prefix = 'destinations.' + destination
  return (
    <div className={'auth-card__return-context auth-card__return-context--' + destination}>
      <span>{t(heading)}</span>
      <strong>{t(prefix + '.label')}</strong>
      <p>{t(prefix + '.description')}</p>
    </div>
  )
}
