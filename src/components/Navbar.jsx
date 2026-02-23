import React from 'react'
import { NavLink } from 'react-router-dom'
import { useSolData } from '../hooks/useSolData.jsx'
import { fmtPrice, fmtPct, getChangeClass } from '../utils/formatters.js'

export default function Navbar() {
  const { currentPrice, stats24h, connected, loading } = useSolData()

  const pctChange = stats24h?.pctChange ?? 0
  const changeClass = getChangeClass(pctChange)

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="logo-icon">S</div>
        <span>SOL/USDT Analyzer</span>
      </div>

      <div className="navbar-price">
        {loading ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Učitavanje...</span>
        ) : (
          <>
            <span className={`live-price ${changeClass}`}>
              {fmtPrice(currentPrice)}
            </span>
            <span className={`price-stat-value ${changeClass}`} style={{ fontSize: 14 }}>
              {fmtPct(pctChange)}
            </span>
            <span className="live-badge">
              <span className={`live-dot`} style={{
                background: connected ? 'var(--green)' : 'var(--red)'
              }} />
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </>
        )}
      </div>

      <nav className="navbar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          📊 Dashboard
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          📋 Historija
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          🔔 Admin
        </NavLink>
      </nav>
    </nav>
  )
}
