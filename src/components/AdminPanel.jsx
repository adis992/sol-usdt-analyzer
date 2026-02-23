import React, { useState } from 'react'
import { useAdmin } from '../services/adminService.jsx'
import { fmtDate } from '../utils/formatters.js'
import { MESSAGE_TYPES } from '../utils/constants.js'
import { clearMessages } from '../services/adminService.jsx'

export default function AdminPanel() {
  const { isAdmin, login, logout, send, remove, refresh, messages } = useAdmin()
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [form, setForm] = useState({ title: '', body: '', type: 'info' })
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  function handleLogin(e) {
    e.preventDefault()
    if (login(password)) {
      setLoginError('')
      setPassword('')
    } else {
      setLoginError('Pogrešna lozinka!')
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    setSending(true)
    setSendSuccess(false)
    try {
      await send({ title: form.title, body: form.body, type: form.type })
      setForm({ title: '', body: '', type: 'info' })
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 3000)
    } finally {
      setSending(false)
    }
  }

  function handleClearAll() {
    if (window.confirm('Obrisati sve poruke?')) {
      clearMessages()
      refresh()
    }
  }

  if (!isAdmin) {
    return (
      <div className="admin-container">
        <div className="section-title" style={{ marginBottom: 20 }}>🔐 Admin Prijava</div>
        <div className="card">
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label>Admin Lozinka</label>
              <input
                type="password"
                className="input-field"
                placeholder="Unesite lozinku..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {loginError && (
              <div style={{ color: 'var(--red)', fontSize: 13 }}>⚠️ {loginError}</div>
            )}
            <button type="submit" className="btn btn-primary">
              🔑 Prijavi se
            </button>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Zadana lozinka: <code style={{ color: 'var(--accent)' }}>Admin123!</code><br />
              Promijeni u localStorage: <code>sol_admin_pass</code>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="section-header">
        <div className="section-title">🔔 Admin Panel — Obavijesti</div>
        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 12px' }} onClick={logout}>
          Odjavi se
        </button>
      </div>

      {/* Send message form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">📨 Pošalji Obavijest Korisnicima</div>
        </div>
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="input-group">
            <label>Tip Obavijesti</label>
            <select
              className="input-field"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              {MESSAGE_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Naslov</label>
            <input
              type="text"
              className="input-field"
              placeholder="Npr: Cijena SOL promijenjena..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              maxLength={80}
            />
          </div>

          <div className="input-group">
            <label>Poruka</label>
            <textarea
              className="input-field"
              placeholder="Tekst obavijesti za korisnike..."
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Quick message templates */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Brzi predlošci:</span>
            <button type="button" className="filter-btn" style={{ fontSize: 11 }}
              onClick={() => setForm({ title: '📅 Termin promijenjen', body: 'Vaš termin je izmjenjen. Provjerite novi raspored.', type: 'appointment' })}>
              Termin
            </button>
            <button type="button" className="filter-btn" style={{ fontSize: 11 }}
              onClick={() => setForm({ title: '💰 Promjena cijene', body: `SOL/USDT trenutna cijena je ažurirana. Pregledajte panel.`, type: 'price' })}>
              Cijena
            </button>
            <button type="button" className="filter-btn" style={{ fontSize: 11 }}
              onClick={() => setForm({ title: '🔧 Ažuriranje servisa', body: 'Sistem je ažuriran. Molimo restartujte aplikaciju.', type: 'service' })}>
              Servis
            </button>
            <button type="button" className="filter-btn" style={{ fontSize: 11 }}
              onClick={() => setForm({ title: '🚨 Upozorenje', body: 'Visoka volatilnost na SOL/USDT. Budite oprezni!', type: 'alert' })}>
              Upozorenje
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" disabled={sending || !form.title || !form.body}>
              {sending ? '⏳ Slanje...' : '📤 Pošalji svim korisnicima'}
            </button>
            {sendSuccess && (
              <span style={{ color: 'var(--green)', fontSize: 13 }}>✅ Obavijest poslana!</span>
            )}
          </div>

          {/* FCM info */}
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 6, padding: '10px 12px',
            fontSize: 11, color: 'var(--text-muted)', border: '1px solid var(--border)'
          }}>
            💡 <strong style={{ color: 'var(--text-secondary)' }}>Push notifikacije na Android/iOS:</strong>{' '}
            Postavi <code style={{ color: 'var(--accent)' }}>VITE_FCM_SERVER_KEY</code> u <code>.env</code> fajlu.{' '}
            Firebase projekat na <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)' }}>console.firebase.google.com</a>.
            Korisnici na mobilnim uređajima se automatski pretplataju na temu <code>sol_analyzer_all</code>.
          </div>
        </form>
      </div>

      {/* Message history */}
      <div className="section-header">
        <div className="section-title" style={{ fontSize: 13 }}>📬 Historija Poruka ({messages.length})</div>
        {messages.length > 0 && (
          <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handleClearAll}>
            🗑️ Obriši sve
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-text">Nema poslanih poruka.</div>
        </div>
      ) : (
        <div className="message-list">
          {messages.map(msg => {
            const typeInfo = MESSAGE_TYPES.find(t => t.id === msg.type) || MESSAGE_TYPES[MESSAGE_TYPES.length - 1]
            return (
              <div key={msg.id} className={`message-card type-${msg.type}`}>
                <div className="message-meta">
                  <span className="message-type-badge" style={{
                    background: typeInfo.color + '22',
                    color: typeInfo.color,
                    border: `1px solid ${typeInfo.color}44`
                  }}>
                    {typeInfo.label}
                  </span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="message-time">{fmtDate(msg.sentAt)}</span>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => remove(msg.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="message-title">{msg.title}</div>
                <div className="message-body">{msg.body}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
