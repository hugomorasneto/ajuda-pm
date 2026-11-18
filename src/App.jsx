import { publicLocalePages } from './i18n/routes'
import { Suspense, lazy } from 'react'
import LanguageSwitcher from './i18n/LanguageSwitcher'
import { useCopy, useLanguage } from './i18n/context'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import PrivacyConsentBanner from './components/privacy/PrivacyConsentBanner'
import ScrollRestoration from './components/ScrollRestoration'

const PublicLayout = lazy(() => import('./layout/PublicLayout'))
const PublicFooterLayout = lazy(() => import('./layout/PublicFooterLayout'))
const WorkspaceLayout = lazy(() => import('./layout/WorkspaceLayout'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const LearningHubPage = lazy(() => import('./pages/LearningHubPage'))
const LearningGuidePage = lazy(() => import('./pages/LearningGuidePage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const PrivacyPreferencesPage = lazy(() => import('./pages/PrivacyPreferencesPage'))
const TermsOfUsePage = lazy(() => import('./pages/TermsOfUsePage'))
const ToolPage = lazy(() => import('./pages/ToolPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))
const TimesPage = lazy(() => import('./pages/TimesPage'))
const PlanningPokerJoinPage = lazy(() => import('./pages/PlanningPokerJoinPage'))
const PlanningPokerRoomPage = lazy(() => import('./pages/PlanningPokerRoomPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const CheckEmailPage = lazy(() => import('./pages/CheckEmailPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function RouteFallback() {
  const t = useCopy('common')
  const { preview } = useLanguage()
  const loadingSteps = [t('loadingModules'), t('loadingInterface'), t('loadingContext')]

  return (
    <div
      className="app-route-loader theme-forge"
      role="status"
      aria-live="polite"
      aria-label={t('loadingLabel')}
    >
      {preview && <div className="language-switcher--loading"><LanguageSwitcher /></div>}
      <div className="app-route-loader__content">
        <div className="app-route-loader__brand" aria-hidden="true">
          <span className="app-route-loader__brand-mark" />
          <span>ProdForge</span>
        </div>

        <div className="app-route-loader__copy">
          <p className="app-route-loader__eyebrow">{t('loading')}</p>
          <h1>{t('preparing')}</h1>
          <p>{t('preparingDetails')}</p>
        </div>

        <div className="app-route-loader__skeleton" aria-hidden="true">
          <span className="app-route-loader__skeleton-line app-route-loader__skeleton-line--title" />
          <span className="app-route-loader__skeleton-line app-route-loader__skeleton-line--wide" />
          <span className="app-route-loader__skeleton-line" />
          <span className="app-route-loader__skeleton-card" />
        </div>

        <ol className="app-route-loader__steps" aria-hidden="true">
          {loadingSteps.map((step) => (
            <li key={step}>
              <span className="app-route-loader__step-dot" />
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

const publicComponents = {
  home: HomePage,
  about: AboutPage,
  faq: FaqPage,
  contact: ContactPage,
  privacyPolicy: PrivacyPolicyPage,
  preferences: PrivacyPreferencesPage,
  terms: TermsOfUsePage,
}

function RouteRedirect({ pathname }) {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname, search, hash }} replace />
}

function App() {
  const { preview } = useLanguage()
  return (
    <>
      <ScrollRestoration />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<PublicFooterLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/check-email" element={<CheckEmailPage />} />
          </Route>

          <Route element={<PublicLayout />}>
            {publicLocalePages.flatMap((page) => {
              const Page = publicComponents[page.id]
              const LearningPage = page.guideSlug ? LearningGuidePage : LearningHubPage
              const element = page.learning ? <LearningPage route={page} /> : <Page />
              const paths = preview ? [page['pt-BR'], page.en] : [page['pt-BR']]
              return paths.map((path) => <Route key={path} path={path} element={element} />)
            })}
            <Route path="/aprender/:slug" element={<RouteRedirect pathname="/aprender" />} />
            {preview && <Route path="/en/learn/:slug" element={<RouteRedirect pathname="/en/learn" />} />}
            <Route
              path="/preferencias-de-cookies"
              element={<RouteRedirect pathname="/preferencias-de-privacidade" />}
            />
            <Route
              path="/fundamentos"
              element={<RouteRedirect pathname="/aprender/fundamentos-produto-agil" />}
            />
            <Route
              path="/scrum-agil"
              element={<RouteRedirect pathname="/aprender/scrum-para-pm-po" />}
            />
            <Route
              path="/backlog"
              element={<RouteRedirect pathname="/aprender/backlog-e-refinamento" />}
            />
            <Route
              path="/user-stories"
              element={<RouteRedirect pathname="/aprender/user-stories-na-pratica" />}
            />
            <Route path="/templates" element={<RouteRedirect pathname="/aprender" />} />
            <Route path="/glossario" element={<RouteRedirect pathname="/aprender" />} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <WorkspaceLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/tool" element={<ToolPage />} />
            <Route path="/historico" element={<HistoryPage />} />
            <Route path="/projetos" element={<ProjectsPage />} />
            <Route path="/times" element={<TimesPage />} />
            <Route path="/roda" element={<PlanningPokerJoinPage />} />
            <Route path="/projetos/:projectId" element={<ProjectDetailPage />} />
            <Route path="/projetos/:projectId/roda/:sessionId" element={<PlanningPokerRoomPage />} />
            <Route
              path="/tool/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="/admin" element={<RouteRedirect pathname="/tool/admin" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PrivacyConsentBanner />
      </Suspense>
    </>
  )
}

export default App
