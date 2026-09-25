import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { startAutoUpdate } from './lib/autoUpdate'

// Pick up new deploys in tabs that stay open (see lib/autoUpdate.js)
startAutoUpdate()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
