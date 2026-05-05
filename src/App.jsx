import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import ProtectedRoute from './components/ProtectedRoute'

const PublicLayout = lazy(() => import('./layout/PublicLayout'))
const WorkspaceLayout = lazy(() => import('./layout/WorkspaceLayout'))
const HomePage = lazy(() => import('./pages/HomePage'))
const LearningHubPage = lazy(() => import('./pages/LearningHubPage'))
const LearningGuidePage = lazy(() => import('./pages/LearningGuidePage'))
const ToolPage = lazy(() => import('./pages/ToolPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
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
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />

        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/aprender" element={<LearningHubPage />} />
          <Route path="/aprender/:slug" element={<LearningGuidePage />} />
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
        </Route>

        <Route
          element={
            <AdminRoute>
              <WorkspaceLayout />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
