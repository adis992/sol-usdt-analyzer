import React, { useState } from 'react'
import { useSolData } from '../hooks/useSolData.jsx'
import TimeframeCard from './TimeframeCard.jsx'
import PriceTable from './PriceTable.jsx'
import { TIMEFRAMES, TF_GROUPS } from '../utils/constants.js'
import { calcAccuracyStats } from '../services/predictionService.js'

export default function Dashboard() {
  const { tfData, loading, history, error, connected } = useSolData()
  const [activeGroup, setActiveGroup] = useState('all')

  const stats = calcAccuracyStats(history)

  const displayTfs = activeGroup === 'all'
    ? TIMEFRAMES
    : TIMEFRAMES.filter(tf => TF_GROUPS[activeGroup]?.tfs.includes(tf.id))

  if (error) {
    return (
      <div className="loading-state">
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ color: 'var(--red)', fontSize: 16 }}>Greška: {error}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Provjerite internet konekciju i osvježite stranicu.</div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          🔄 Osvježi
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Price Table at top */}
      <PriceTable />

      {/* Global accuracy stats */}
      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-pill" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          📊 Ukupno prognoza: <span className="stat-val">&nbsp;{stats.total}</span>
        </div>
        <div className="stat-pill green-pill">
          ✅ Pogodci: <span className="stat-val">&nbsp;{stats.hits}</span>
        </div>
        <div className="stat-pill red-pill">
          ❌ Promašaji: <span className="stat-val">&nbsp;{stats.misses}</span>
        </div>
        {stats.total > 0 && (
          <div className="stat-pill" style={{ borderColor: 'var(--sol-green)', color: 'var(--sol-green)' }}>
            🎯 Tačnost: <span className="stat-val">&nbsp;{stats.accuracy.toFixed(1)}%</span>
          </div>
        )}
        {stats.last10 > 0 && (
          <div className="stat-pill">
            Zadnjih 10: <span className="stat-val">&nbsp;{stats.hitsLast10}/{stats.last10}</span>
          </div>
        )}
        <div className="stat-pill" style={{
          borderColor: connected ? 'var(--green)' : 'var(--red)',
          color: connected ? 'var(--green)' : 'var(--red)'
        }}>
          <span className="conn-dot" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: connected ? 'var(--green)' : 'var(--red)',
            display: 'inline-block', marginRight: 4
          }} />
          {connected ? 'WebSocket aktivan' : 'Offline'}
        </div>
      </div>

      {/* Timeframe group filter */}
      <div className="section-header">
        <div className="section-title">⏱️ Timeframe Analiza</div>
      </div>
      <div className="tf-sections" style={{ marginBottom: 14 }}>
        <button
          className={`tf-section-btn ${activeGroup === 'all' ? 'active' : ''}`}
          onClick={() => setActiveGroup('all')}
        >
          Svi ({TIMEFRAMES.length})
        </button>
        {Object.entries(TF_GROUPS).map(([key, grp]) => (
          <button
            key={key}
            className={`tf-section-btn ${activeGroup === key ? 'active' : ''}`}
            onClick={() => setActiveGroup(key)}
          >
            {grp.label} ({grp.tfs.length})
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <div className="loading-text">
            Učitavanje SOL/USDT podataka sa Binance...
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Priprema {TIMEFRAMES.length} timeframes i 10 indikatora
          </div>
        </div>
      ) : (
        <div className="timeframe-grid">
          {displayTfs.map(tf => (
            <TimeframeCard
              key={tf.id}
              tf={tf}
              data={tfData[tf.id] ?? null}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      {!loading && (
        <div style={{
          marginTop: 16, padding: '12px 16px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--text-muted)',
          display: 'flex', gap: 20, flexWrap: 'wrap'
        }}>
          <span>🟩 Prognoza tačna (HIT)</span>
          <span>🟥 Prognoza netačna (MISS)</span>
          <span>🟡 Na čekanju (PENDING)</span>
          <span>📈 10 indikatora: RSI, MACD, BB, EMA 9/21, EMA 50/200, Stoch, ATR, W%R, CCI, OBV</span>
          <span>🎯 Cilj: max 1 promašaj na 10 prognoza</span>
          <span>💡 Klikni na karticu za detalje indikatora</span>
        </div>
      )}
    </div>
  )
}
