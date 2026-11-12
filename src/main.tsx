import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { keepFieldsAboveKeyboard } from './lib/keyboardInset'

keepFieldsAboveKeyboard()

// Service worker for push notifications (also needed to install the app on Android).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
