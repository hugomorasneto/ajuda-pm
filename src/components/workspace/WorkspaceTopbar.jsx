import LanguageSwitcher from '../../i18n/LanguageSwitcher'
import { useCopy, useLanguage } from '../../i18n/context'
import { useLocation } from 'react-router-dom'
import LocalizedLink from '../../i18n/LocalizedLink'
import { APP_NAME, BRAND_MARK_SRC } from '../../constants/app'
import { usePageMetadata } from '../../hooks/usePageMetadata'

const pageMeta = (t) => ({
  '/tool': {
    title: t('workspaceTitle'),
    description: t('workspaceDesc'),
  },
  '/historico': {
    title: t('history'),
    description: t('historyDesc'),
  },
  '/projetos': {
    title: t('projects'),
    description: t('projectsDesc'),
  },
  '/times': {
    title: t('teams'),
    description: t('teamsDesc'),
  },
  '/roda': {
    title: t('planning'),
    description: t('planningDesc'),
  },
  '/tool/admin': {
    title: t('adminTitle'),
    description: t('adminDesc'),
  },
})

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

function WorkspaceTopbar({ onOpenSidebar, topbarStatus }) {
  const t = useCopy('navigation')
  const { language, preview } = useLanguage()
  const labels = pageMeta(t)
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '')
  const isPlanningPokerRoute =
    path === '/roda' || path.includes('/roda/')
  const meta = labels[path] ??
    (isPlanningPokerRoute
      ? labels['/roda']
      : path.startsWith('/projetos/')
      ? labels['/projetos']
      : {
          title: t('workspaceTitle'),
          description: t('internal'),
        })

  usePageMetadata({
    enabled: preview || path === '/times',
    language,
    title: meta.title + ' · ' + APP_NAME,
    description: meta.description,
    path,
    robots: 'noindex,follow',
  })

  const hasStatus = Boolean(topbarStatus)

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar__inner">
        <div className="workspace-topbar__leading">
          <button
            type="button"
            className="workspace-topbar__menu"
            onClick={onOpenSidebar}
            aria-label={t('openPublicMenu')}
          >
            <IconMenu />
            <span>{t('menu')}</span>
          </button>

          <img
            src={BRAND_MARK_SRC}
            alt=""
            className="workspace-topbar__brand-mark"
            aria-hidden="true"
          />

          <div className="workspace-topbar__copy">
            <p className="workspace-topbar__eyebrow">{APP_NAME}</p>
            <h1>{meta.title}</h1>
            {!hasStatus && <p>{meta.description}</p>}
          </div>
        </div>

        {hasStatus ? (
          <div className="workspace-topbar__status">
            <span className="workspace-topbar__status-eyebrow">{topbarStatus.label}</span>
            <span className="workspace-topbar__status-title">{topbarStatus.title}</span>
            <div className="workspace-topbar__status-pills">
              {topbarStatus.pills?.map((pill, i) => (
                <span key={i} className={`mode-pill ${pill.className ?? ''}`}>
                  {pill.text}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="workspace-topbar__actions">
          <LocalizedLink to="/aprender" className="workspace-topbar__link workspace-topbar__link--academy">
            {t('training')}
          </LocalizedLink>
          <LocalizedLink to="/" className="workspace-topbar__link">
            {t('site')}
          </LocalizedLink>
        </div>
      </div>
      {preview && <div className="workspace-topbar__language"><LanguageSwitcher /></div>}
    </header>
  )
}

export default WorkspaceTopbar
