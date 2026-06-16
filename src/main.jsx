import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './assets/styles/index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { runMigrations } from './utils/migrations'
import { applyTheme, getTheme } from './utils/theme'
import { setupPwaAutoUpdate } from './utils/pwaUpdate'

runMigrations()
applyTheme(getTheme())
setupPwaAutoUpdate()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)