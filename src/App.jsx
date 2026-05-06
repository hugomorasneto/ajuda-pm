import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
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
const PlanningPokerRoomPage = lazy(() => import('./pages/PlanningPokerRoomPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const CheckEmailPage = lazy(() => import('./pages/CheckEmailPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function RouteFallback() {
  const loadingSteps = ['Carregando módulos', 'Organizando a interface', 'Preservando o contexto']

  return (
    <div
      className="app-route-loader theme-forge"
      role="status"
      aria-live="polite"
      aria-label="Carregando módulos do ProdForge"
    >
      <div className="app-route-loader__content">
        <div className="app-route-loader__brand" aria-hidden="true">
          <span className="app-route-loader__brand-mark" />
          <span>ProdForge</span>
        </div>

        <div className="app-route-loader__copy">
          <p className="app-route-loader__eyebrow">Carregando</p>
          <h1>Preparando a experiência</h1>
          <p>Estamos carregando os módulos desta área para você continuar com o contexto preservado.</p>
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

function App() {
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
            <Route path="/" element={<HomePage />} />
            <Route path="/aprender" element={<LearningHubPage />} />
            <Route path="/aprender/:slug" element={<LearningGuidePage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/contato" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/politica-de-privacidade" element={<PrivacyPolicyPage />} />
            <Route path="/preferencias-de-privacidade" element={<PrivacyPreferencesPage />} />
            <Route
              path="/preferencias-de-cookies"
              element={<Navigate to="/preferencias-de-privacidade" replace />}
            />
            <Route path="/termos-de-uso" element={<TermsOfUsePage />} />
            <Route
              path="/fundamentos"
              element={<Navigate to="/aprender/fundamentos-produto-agil" replace />}
            />
            <Route
              path="/scrum-agil"
              element={<Navigate to="/aprender/scrum-para-pm-po" replace />}
            />
            <Route
              path="/backlog"
              element={<Navigate to="/aprender/backlog-e-refinamento" replace />}
            />
            <Route
              path="/user-stories"
              element={<Navigate to="/aprender/user-stories-na-pratica" replace />}
            />
            <Route path="/templates" element={<Navigate to="/aprender" replace />} />
            <Route path="/glossario" element={<Navigate to="/aprender" replace />} />
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

          <Route path="/admin" element={<Navigate to="/tool/admin" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PrivacyConsentBanner />
      </Suspense>
    </>
  )
}

export default App
