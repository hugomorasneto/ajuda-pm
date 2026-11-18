import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n/init'
import { LanguageProvider } from './i18n/LanguageProvider'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { isLanguageEnabled } from './i18n/routes'

if (isLanguageEnabled(import.meta.env.MODE, window.location.hostname)) {
  import('./styles/fonts-local.css')
} else {
  import('./styles/fonts-remote.css')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
