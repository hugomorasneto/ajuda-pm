import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './layout/PublicLayout'
import WorkspaceLayout from './layout/WorkspaceLayout'
import HomePage from './pages/HomePage'
import ToolPage from './pages/ToolPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import CheckEmailPage from './pages/CheckEmailPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AdminPage from './pages/AdminPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />

      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/fundamentos" element={<Navigate to="/" replace />} />
        <Route path="/scrum-agil" element={<Navigate to="/" replace />} />
        <Route path="/backlog" element={<Navigate to="/" replace />} />
        <Route path="/user-stories" element={<Navigate to="/" replace />} />
        <Route path="/templates" element={<Navigate to="/" replace />} />
        <Route path="/glossario" element={<Navigate to="/" replace />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/tool" element={<ToolPage />} />
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
  )
}

export default App
