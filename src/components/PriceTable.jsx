import React from 'react'
import { useSolData } from '../hooks/useSolData.jsx'
import { fmtPrice, fmtPct, fmtVolume, calcProfitPct, getChangeClass, fmtTime } from '../utils/formatters.js'

export default function PriceTable() {
  const { currentPrice, stats24h, entryPrice, setEntryPrice } = useSolData()

  const profit = calcProfitPct(entryPrice, currentPrice)
  const profitClass = getChangeClass(profit)

  const changeClass = getChangeClass(stats24h?.pctChange ?? 0)

  function handleResetEntry() {
    if (currentPrice) setEntryPrice(currentPrice)
  }

  return (
    <div className="price-table-section">
      <div className="section-header">
        <div className="section-title">💹 Pregled Cijene</div>
        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handleResetEntry}>
          🔄 Reset Entry
        </button>
      </div>

      <div className="price-summary-grid">
        <div className="price-stat-card">
          <div className="price-stat-label">Trenutna Cijena</div>
          <div className="price-stat-value sol-green">{fmtPrice(currentPrice)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {fmtTime(Date.now())}
          </div>
        </div>

        <div className="price-stat-card">
          <div className="price-stat-label">Ulazna Cijena</div>
          <div className="price-stat-value purple">{fmtPrice(entryPrice)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Session start</div>
        </div>

        <div className="price-stat-card">
          <div className="price-stat-label">Profit / Gubitak</div>
          <div className={`price-stat-value ${profitClass}`}>
            {fmtPct(profit)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {profit >= 0 ? '+' : ''}{fmtPrice(currentPrice && entryPrice ? currentPrice - entryPrice : null)}
          </div>
        </div>

        <div className="price-stat-card">
          <div className="price-stat-label">24h Promjena</div>
          <div className={`price-stat-value ${changeClass}`}>
            {fmtPct(stats24h?.pctChange ?? 0)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {fmtPrice(stats24h?.priceChange)}
          </div>
        </div>

        <div className="price-stat-card">
          <div className="price-stat-label">24h High</div>
          <div className="price-stat-value green">{fmtPrice(stats24h?.high24h)}</div>
        </div>

        <div className="price-stat-card">
          <div className="price-stat-label">24h Low</div>
          <div className="price-stat-value red">{fmtPrice(stats24h?.low24h)}</div>
        </div>

        <div className="price-stat-card">
          <div className="price-stat-label">Volume 24h</div>
          <div className="price-stat-value" style={{ fontSize: 16 }}>{fmtVolume(stats24h?.volume24h)} SOL</div>
        </div>

        <div className="price-stat-card">
          <div className="price-stat-label">Quote Vol 24h</div>
          <div className="price-stat-value" style={{ fontSize: 16 }}>
            ${fmtVolume(stats24h?.quoteVolume)}
          </div>
        </div>
      </div>
    </div>
  )
}
