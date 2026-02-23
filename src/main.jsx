import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Capacitor plugins initialization (mobile only)
async function initCapacitor() {
  if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      const { App: CapApp } = await import('@capacitor/app')

      // Request push notification permission
      const permission = await PushNotifications.requestPermissions()
      if (permission.receive === 'granted') {
        await PushNotifications.register()
      }

      // Store FCM token
      PushNotifications.addListener('registration', (token) => {
        localStorage.setItem('fcm_token', token.value)
        console.log('[FCM] Token registered:', token.value)
      })

      // Handle foreground notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        window.dispatchEvent(new CustomEvent('push-notification', { detail: notification }))
      })

      // Handle notification tap
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        window.dispatchEvent(new CustomEvent('notification-tapped', { detail: action }))
      })

      // Handle Android back button
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) CapApp.exitApp()
      })
    } catch (e) {
      console.log('Capacitor init (web mode, OK):', e.message)
    }
  }
}

initCapacitor()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
