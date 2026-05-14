import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerServiceWorker } from './utils/swRegistrationUtils.ts'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
