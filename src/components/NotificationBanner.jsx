import React from 'react'

export default function NotificationBanner({ title, body, type = 'info', onClose }) {
  const icons = {
    push:        '🔔',
    alert:       '🚨',
    price:       '💰',
    appointment: '📅',
    service:     '🔧',
    update:      '🔄',
    info:        'ℹ️',
  }

  const icon = icons[type] || '🔔'

  return (
    <div className={`notification-banner ${type}`}>
      <span className="notif-icon">{icon}</span>
      <div className="notif-content">
        <div className="notif-title">{title}</div>
        {body && <div className="notif-body">{body}</div>}
      </div>
      <button className="notif-close" onClick={onClose}>✕</button>
    </div>
  )
}
