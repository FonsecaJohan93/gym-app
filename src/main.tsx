import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { openSession, requestPersistence } from './lib/store'
import { loadSession } from './lib/api'

requestPersistence()
const saved = loadSession()
if (saved) void openSession(saved)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
