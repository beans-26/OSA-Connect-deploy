import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { startAutoUpdate } from './lib/autoUpdate'
import { installApiAuth } from './lib/apiAuth'

// Send the login token with every API request (see lib/apiAuth.js)
installApiAuth()

// Pick up new deploys in tabs that stay open (see lib/autoUpdate.js)
startAutoUpdate()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
