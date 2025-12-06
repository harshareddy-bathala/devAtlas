import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Wrap the app with PostHogProvider for analytics
import { PostHogProvider } from 'posthog-js/react'

const root = ReactDOM.createRoot(document.getElementById('root'))

// Determine the PostHog configuration based on environment
const getPostHogConfig = () => {
  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
  const isProduction = import.meta.env.PROD
  
  // Base PostHog configuration (same for both dev and prod)
  const baseConfig = {
    defaults: '2025-05-24',
    capture_exceptions: true,
    
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
  
  if (isProduction) {
    // In production, use PostHog's CDN directly
    // The backend proxy is only for specific event endpoints if needed
    return {
      apiKey,
      options: {
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        debug: false,
        ...baseConfig,
      }
    }
  } else {
    // In development, use direct PostHog
    return {
      apiKey,
      options: {
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        debug: true,
        ...baseConfig,
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
