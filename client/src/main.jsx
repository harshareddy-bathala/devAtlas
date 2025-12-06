import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Wrap the app with PostHogProvider for analytics
import { PostHogProvider } from 'posthog-js/react'

const root = ReactDOM.createRoot(document.getElementById('root'))

// Determine PostHog host - use backend proxy in dev to bypass ad blockers
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'
const posthogHost = import.meta.env.MODE === 'development' 
  ? apiUrl.replace('/api/v1', '') // Use backend proxy: http://localhost:3001
  : import.meta.env.VITE_PUBLIC_POSTHOG_HOST

// PostHog configuration with ad-blocker handling
const posthogOptions = {
  api_host: posthogHost,
  defaults: '2025-05-24',
  capture_exceptions: true,
  debug: import.meta.env.MODE === 'development',
  // Disable session recording
  disable_session_recording: true,
  // Shorter timeout for blocked requests
  request_timeout_ms: 5000,
}

root.render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={posthogOptions}
    >
      <App />
    </PostHogProvider>
  </React.StrictMode>,
)
