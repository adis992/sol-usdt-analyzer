import React, { useState, useMemo } from 'react'
import { useSolData } from '../hooks/useSolData.jsx'
import { fmtPrice, fmtPct, fmtDateShort, signalLabel } from '../utils/formatters.js'
import { clearHistory } from '../services/historyService.js'
import { calcAccuracyStats } from '../services/predictionService.js'
import { TIMEFRAMES } from '../utils/constants.js'

export default function HistoryView() {
  const { history, refreshHistory } = useSolData()
  const [filterTf, setFilterTf] = useState('all')
  const [filterResult, setFilterResult] = useState('all')

  const filtered = useMemo(() => {
    return history.filter(h => {
      if (filterTf !== 'all' && h.tfId !== filterTf) return false
      if (filterResult !== 'all' && h.result !== filterResult) return false
      return true
    })
  }, [history, filterTf, filterResult])

  const stats = useMemo(() => calcAccuracyStats(filtered), [filtered])

  function handleClear() {
    if (window.confirm('Obrisati svu historiju prognoza?')) {
      clearHistory()
      refreshHistory()
    }
  }

  const tfLabels = Object.fromEntries(TIMEFRAMES.map(t => [t.id, t.label]))

  return (
    <div className="history-section">
      {/* Header */}
      <div className="section-header">
        <div className="section-title">📋 Historija Prognoza</div>
        <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 12px' }} onClick={handleClear}>
          🗑️ Obriši sve
        </button>
      </div>

      {/* Accuracy stats */}
      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-pill">
          Ukupno: <span className="stat-val">&nbsp;{stats.total}</span>
        </div>
        <div className="stat-pill green-pill">
          ✅ Pogodci: <span className="stat-val">&nbsp;{stats.hits}</span>
        </div>
        <div className="stat-pill red-pill">
          ❌ Promašaji: <span className="stat-val">&nbsp;{stats.misses}</span>
        </div>
        <div className="stat-pill" style={{ borderColor: 'var(--sol-green)', color: 'var(--sol-green)' }}>
          Tačnost: <span className="stat-val">&nbsp;{stats.accuracy?.toFixed(1) ?? '–'}%</span>
        </div>
        {stats.last10 > 0 && (
          <div className="stat-pill" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
            Zadnjih 10: <span className="stat-val">&nbsp;{stats.hitsLast10}/{stats.last10}</span>
          </div>
        )}
      </div>

      {/* Accuracy bar */}
      {stats.total > 0 && (
        <div className="accuracy-bar-wrap" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>Ukupna tačnost</span>
            <span>{stats.accuracy?.toFixed(1)}%</span>
          </div>
          <div className="accuracy-bar">
            <div className="accuracy-bar-fill" style={{ width: `${stats.accuracy || 0}%` }} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="history-filters">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Timeframe:</span>
        <button className={`filter-btn ${filterTf === 'all' ? 'active' : ''}`} onClick={() => setFilterTf('all')}>Sve</button>
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.id}
            className={`filter-btn ${filterTf === tf.id ? 'active' : ''}`}
            onClick={() => setFilterTf(tf.id)}
          >
            {tf.label}
          </button>
        ))}

        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Rezultat:</span>
        {['all', 'HIT', 'MISS', 'PENDING', 'NEUTRAL'].map(r => (
          <button
            key={r}
            className={`filter-btn ${filterResult === r ? 'active' : ''}`}
            onClick={() => setFilterResult(r)}
          >
            {r === 'all' ? 'Sve' : r === 'HIT' ? '✅ Pogodak' : r === 'MISS' ? '❌ Promašaj' : r === 'PENDING' ? '⏳ Na čekanju' : '⚪ Neutral'}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-text">Nema historije prognoza za odabrane filtere.</div>
        </div>
      ) : (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Datum/Vrij.</th>
                <th>Timeframe</th>
                <th>Signal</th>
                <th>Pouzdanost</th>
                <th>Ulazna $</th>
                <th>Izlazna $</th>
                <th>Profit %</th>
                <th>↑/↓/–</th>
                <th>Rezultat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr
                  key={item.id}
                  className={
                    item.result === 'HIT' ? 'hit-row' :
                    item.result === 'MISS' ? 'miss-row' :
                    item.result === 'NEUTRAL' ? 'neutral-row' : 'pending-row'
                  }
                >
                  <td style={{ color: 'var(--text-muted)' }}>{filtered.length - i}</td>
                  <td>{fmtDateShort(item.timestamp)}</td>
                  <td style={{ fontWeight: 600 }}>{tfLabels[item.tfId] || item.tfId}</td>
                  <td>
                    <span style={{
                      color: item.signal.includes('BUY') ? 'var(--green)' :
                             item.signal.includes('SELL') ? 'var(--red)' : 'var(--yellow)',
                      fontWeight: 600, fontSize: 11
                    }}>
                      {item.signal.includes('BUY') ? '▲' : item.signal.includes('SELL') ? '▼' : '▶'} {item.signal}
                    </span>
                  </td>
                  <td>{item.confidence?.toFixed(1)}%</td>
                  <td>{fmtPrice(item.entryPrice)}</td>
                  <td>{item.resolvedPrice ? fmtPrice(item.resolvedPrice) : '–'}</td>
                  <td>
                    <span style={{
                      color: item.profitPct === null ? 'var(--text-muted)' :
                             item.profitPct >= 0 ? 'var(--green)' : 'var(--red)'
                    }}>
                      {item.profitPct !== null ? fmtPct(item.profitPct) : '–'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--green)' }}>↑{item.votes?.buy ?? '–'}</span>
                    {' '}
                    <span style={{ color: 'var(--red)' }}>↓{item.votes?.sell ?? '–'}</span>
                    {' '}
                    <span>–{item.votes?.neutral ?? '–'}</span>
                  </td>
                  <td>
                    <span className={`prediction-result-badge ${item.result.toLowerCase()}`}>
                      {item.result === 'HIT' ? '✅ HIT' :
                       item.result === 'MISS' ? '❌ MISS' :
                       item.result === 'NEUTRAL' ? '⚪ NEUTRAL' : '⏳ ČEKA'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
