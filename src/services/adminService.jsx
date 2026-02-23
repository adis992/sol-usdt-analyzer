// Admin Service — Message management + FCM push (via Firebase)
// Firebase setup: Add your firebase config in src/firebase.js for push to mobile
import React, { createContext, useContext, useState, useCallback } from 'react'
import { MESSAGES_STORAGE_KEY, ADMIN_PASSWORD_KEY, DEFAULT_ADMIN_PASS, MESSAGE_TYPES } from '../utils/constants.js'
import { showNotification, showLocalNotification } from './notificationService.js'

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadMessages() {
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveMessages(msgs) {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(msgs.slice(-200)))
  } catch (e) {
    console.error('[Admin] Save messages error:', e)
  }
}

// ─── Password ─────────────────────────────────────────────────────────────────

export function checkAdminPassword(password) {
  const stored = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASS
  return password === stored
}

export function setAdminPassword(newPass) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, newPass)
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function getMessages() {
  return loadMessages().reverse()
}

/**
 * Send an admin message:
 * 1. Saves to local storage (all users on same device see it)
 * 2. Dispatches in-app event (NotificationBanner shows)
 * 3. Attempts Firebase FCM push (if configured)
 */
export async function sendAdminMessage({ title, body, type = 'info', targetAll = true }) {
  const msg = {
    id: Date.now(),
    title,
    body,
    type,
    sentAt: Date.now(),
    sender: 'Admin',
    targetAll,
    delivered: false,
  }

  const messages = loadMessages()
  messages.push(msg)
  saveMessages(messages)

  // In-app notification
  window.dispatchEvent(new CustomEvent('admin-notification', {
    detail: { title, body, type }
  }))

  // Desktop/mobile OS notification
  await showLocalNotification(title, body, { type, data: msg })

  // Firebase FCM push (if configured)
  await sendFCMPush(title, body, type)

  return msg
}

/**
 * Send FCM push notification via Firebase HTTP API
 * Configure FIREBASE_SERVER_KEY in .env or hardcode for demo
 * For production: use Firebase Admin SDK on a server
 */
async function sendFCMPush(title, body, type) {
  // FCM via Firebase Cloud Messaging REST API v1
  // You need to set up Firebase project and get server key
  // This sends to a topic 'all_users' that mobile clients subscribe to
  const serverKey = import.meta.env?.VITE_FCM_SERVER_KEY
  if (!serverKey) {
    console.info('[FCM] No server key configured. Set VITE_FCM_SERVER_KEY in .env for push notifications.')
    return
  }

  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: '/topics/sol_analyzer_all',
        notification: { title, body, icon: 'ic_stat_icon_config_sample', color: '#9945ff' },
        data: { type, timestamp: String(Date.now()) },
        android: { priority: 'high', notification: { channel_id: 'sol_analyzer' } },
        apns: { payload: { aps: { alert: { title, body }, badge: 1, sound: 'default' } } },
      })
    })
    const result = await res.json()
    console.log('[FCM] Push sent:', result)
  } catch (e) {
    console.warn('[FCM] Push failed (Firebase not configured):', e.message)
  }
}

/**
 * Delete a message by ID
 */
export function deleteMessage(id) {
  const messages = loadMessages().filter(m => m.id !== id)
  saveMessages(messages)
}

/**
 * Clear all messages
 */
export function clearMessages() {
  localStorage.removeItem(MESSAGES_STORAGE_KEY)
}

// ─── React Context ────────────────────────────────────────────────────────────

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('admin_authed') === '1'
  })
  const [messages, setMessages] = useState(() => getMessages())

  const login = useCallback((password) => {
    if (checkAdminPassword(password)) {
      setIsAdmin(true)
      sessionStorage.setItem('admin_authed', '1')
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setIsAdmin(false)
    sessionStorage.removeItem('admin_authed')
  }, [])

  const send = useCallback(async (msgData) => {
    const msg = await sendAdminMessage(msgData)
    setMessages(getMessages())
    return msg
  }, [])

  const remove = useCallback((id) => {
    deleteMessage(id)
    setMessages(getMessages())
  }, [])

  const refresh = useCallback(() => {
    setMessages(getMessages())
  }, [])

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout, send, remove, refresh, messages }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider')
  return ctx
}
