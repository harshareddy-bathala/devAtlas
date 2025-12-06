import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Wrap the app with PostHogProvider for analytics
import { PostHogProvider } from 'posthog-js/react'

const root = ReactDOM.createRoot(document.getElementById('root'))

// Determine the PostHog host based on environment
// In production, use a proxy endpoint to bypass ad blockers
const getPostHogConfig = () => {
  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
  const isProduction = import.meta.env.PROD
  
  if (isProduction) {
    // In production, route through our backend proxy to bypass ad blockers
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.devorbit.com'
    return {
      apiKey,
      options: {
        // Use our backend proxy instead of PostHog's CDN
        api_host: apiUrl,
        
        // Custom request handler to use our proxy endpoint
        config_request_timeout_ms: 5000,
        request_batching: {
          batch_size: 10,
          batch_timeout_ms: 2000,
        },
        
        defaults: '2025-05-24',
        capture_exceptions: true,
        debug: false,
        
        // Privacy settings
        persistence: 'localStorage',
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: true,
        ip: false,
        respect_dnt: true,
        
        property_blacklist: [
          '$ip',
          '$device_id',
        ],
      }
    }
  } else {
    // In development, use direct PostHog
    return {
      apiKey,
      options: {
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        defaults: '2025-05-24',
        capture_exceptions: true,
        debug: true,
        
        // Privacy settings
        persistence: 'localStorage',
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: true,
        ip: false,
        respect_dnt: true,
        
        property_blacklist: [
          '$ip',
          '$device_id',
        ],
      }
    }
  }
}

const config = getPostHogConfig()

root.render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={config.apiKey}
      options={config.options}
    >
      <App />
    </PostHogProvider>
  </React.StrictMode>,
)
