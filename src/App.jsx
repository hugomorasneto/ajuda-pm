import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layout/MainLayout'
import HomePage from './pages/HomePage'
import ToolPage from './pages/ToolPage'
import PlaceholderPage from './pages/PlaceholderPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AdminPage from './pages/AdminPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/tool"
          element={
            <ProtectedRoute>
              <ToolPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/fundamentos"
          element={
            <PlaceholderPage
              title="Fundamentos de Produto"
              description="Guia base para visão de produto, descoberta e priorização."
            />
          }
        />
        <Route
          path="/scrum-agil"
          element={
            <PlaceholderPage
              title="Scrum & Ágil"
              description="Rituais, papéis e práticas para execução iterativa orientada a valor."
            />
          }
        />
        <Route
          path="/backlog"
          element={
            <PlaceholderPage
              title="Backlog"
              description="Framework para organizar, refinar e ordenar backlog com critérios claros."
            />
          }
        />
        <Route
          path="/user-stories"
          element={
            <PlaceholderPage
              title="User Stories"
              description="Boas práticas de escrita, anti-padrões e critérios de aceitação."
            />
          }
        />
        <Route
          path="/templates"
          element={
            <PlaceholderPage
              title="Templates"
              description="Modelos prontos para discovery, planejamento e documentação de produto."
            />
          }
        />
        <Route
          path="/glossario"
          element={
            <PlaceholderPage
              title="Glossário"
              description="Termos-chave de produto, agilidade e colaboração cross-functional."
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
