import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/hike_tracker/sw.js', { scope: '/hike_tracker/' })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
