import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { keepFieldsAboveKeyboard } from './lib/keyboardInset'
import { loadLocalities } from './lib/localities'

keepFieldsAboveKeyboard()

// All Australian places, for suburbs, distances and map pins (loads in the background).
void loadLocalities()

// Service worker for push notifications (see public/sw.js).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
