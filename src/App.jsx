import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Dashboard from './components/Dashboard.jsx'
import HistoryView from './components/HistoryView.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import NotificationBanner from './components/NotificationBanner.jsx'
import { SolDataProvider } from './hooks/useSolData.jsx'
import { AdminProvider } from './services/adminService.jsx'

export default function App() {
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    // Listen for push notifications (mobile) or admin messages
    const handlePush = (e) => {
      const n = e.detail
      setNotification({ title: n.title, body: n.body, type: 'push' })
      setTimeout(() => setNotification(null), 6000)
    }
    const handleAdmin = (e) => {
      const msg = e.detail
      setNotification({ title: msg.title || 'Admin Obavijest', body: msg.body, type: msg.type || 'info' })
      setTimeout(() => setNotification(null), 8000)
    }
    window.addEventListener('push-notification', handlePush)
    window.addEventListener('admin-notification', handleAdmin)
    return () => {
      window.removeEventListener('push-notification', handlePush)
      window.removeEventListener('admin-notification', handleAdmin)
    }
  }, [])

  return (
    <AdminProvider>
      <SolDataProvider>
        <Router>
          <div className="app-root">
            {notification && (
              <NotificationBanner
                title={notification.title}
                body={notification.body}
                type={notification.type}
                onClose={() => setNotification(null)}
              />
            )}
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/history" element={<HistoryView />} />
                <Route path="/admin" element={<AdminPanel />} />
              </Routes>
            </main>
          </div>
        </Router>
      </SolDataProvider>
    </AdminProvider>
  )
}
