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
  return (
    <div className="app-route-loader" role="status" aria-live="polite">
      <div className="app-route-loader__content">
        <p className="eyebrow">ProdForge</p>
        <h1>Carregando</h1>
        <p>Aguarde enquanto o modulo desta area e preparado.</p>
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
