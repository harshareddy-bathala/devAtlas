import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Initialize observability
import { initSentry } from './lib/sentry'
import { initAnalytics } from './lib/analytics'

// Initialize Sentry for error tracking (before React renders)
initSentry()

// Initialize PostHog analytics
initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
