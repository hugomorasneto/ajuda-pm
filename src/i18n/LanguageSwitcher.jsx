import { useId } from 'react'
import { useCopy, useLanguage } from './context'
import './language-switcher.css'

export default function LanguageSwitcher() {
  const t = useCopy('common')
  const { preview, language, canSwitch, completingAuth, switchLanguage } = useLanguage()
  const hintId = useId()
  if (!preview) return null

  return (
    <div className="language-switcher">
      <label className="language-switcher__control">
        <span>{t('language')}</span>
        <select
          value={language}
          disabled={completingAuth}
          onChange={(event) => switchLanguage(event.target.value)}
          aria-describedby={canSwitch ? undefined : hintId}
        >
          <option value="pt-BR" lang="pt-BR">Português (Brasil)</option>
          <option value="en" lang="en" disabled={!canSwitch}>English</option>
        </select>
      </label>
      {!canSwitch && <span className="language-switcher__announcement" id={hintId}>{t('unavailable')}</span>}
      {canSwitch && <span className="language-switcher__announcement" role="status">{t('selected')}</span>}
    </div>
  )
}
