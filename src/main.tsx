// Fix: use named imports — some React ESM builds don't expose a default export.
// Using named imports from 'react' and 'react-dom/client' always works.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
