import React, { useState } from 'react'
import { fmtNum, signalLabel, signalClass, indicatorVoteLabel, indicatorVoteSymbol } from '../utils/formatters.js'
import { getTfStats } from '../services/historyService.js'

const INDICATOR_NAMES = {
  rsi:      'RSI',
  macd:     'MACD',
  bb:       'BB',
  emaFast:  'EMA 9/21',
  emaSlow:  'EMA 50/200',
  stoch:    'Stoch',
  atr:      'ATR',
  williams: 'W%R',
  cci:      'CCI',
  obv:      'OBV',
}

export default function TimeframeCard({ tf, data }) {
  const [expanded, setExpanded] = useState(false)

  if (!data) {
    return (
      <div className="tf-card">
        <div className="tf-header">
          <span className="tf-label">{tf.label}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Učitavanje...</span>
        </div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 8 }}>
          <div style={{ width: '40%', height: '100%', background: 'var(--accent)', borderRadius: 2, animation: 'pulse-live 1.5s infinite' }} />
        </div>
      </div>
    )
  }

  const { candles, prediction, priceChange } = data
  const lastCandle = candles?.[candles.length - 1]
  const lastPrice = lastCandle?.close
  const stats = getTfStats(tf.id)

  const sigClass = prediction ? signalClass(prediction.signal) : 'neutral'
  const sigLabel = prediction ? signalLabel(prediction.signal) : '➡️ NEUTRAL'
  const confidence = prediction?.confidence?.toFixed(1) ?? '0.0'
  const votes = prediction?.votes ?? { buy: 0, sell: 0, neutral: 0 }
  const indicators = prediction?.indicators ?? {}

  // Accuracy info
  const accuracyDisplay = stats.total > 0
    ? `${stats.accuracy.toFixed(0)}% (${stats.hits}/${stats.total})`
    : '–'
  const accuracyColor = stats.total > 0
    ? stats.accuracy >= 80 ? 'green' : stats.accuracy >= 60 ? 'yellow' : 'red'
    : ''

  return (
    <div
      className={`tf-card ${sigClass}`}
      onClick={() => setExpanded(!expanded)}
      style={{ cursor: 'pointer' }}
    >
      {/* Header */}
      <div className="tf-header">
        <span className="tf-label">{tf.label}</span>
        <span className="tf-price">
          ${lastPrice?.toFixed(lastPrice >= 10 ? 2 : 4) ?? '–'}
        </span>
      </div>

      {/* Body stats */}
      <div className="tf-body">
        <div className="tf-stat">
          <span className="tf-stat-label">Promjena</span>
          <span className={`tf-stat-value ${priceChange >= 0 ? 'green' : 'red'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange?.toFixed(3)}%
          </span>
        </div>
        <div className="tf-stat">
          <span className="tf-stat-label">Signali</span>
          <span className="tf-stat-value">
            <span style={{ color: 'var(--green)' }}>↑{votes.buy}</span>
            {' / '}
            <span style={{ color: 'var(--red)' }}>↓{votes.sell}</span>
            {' / '}
            <span style={{ color: 'var(--yellow)' }}>–{votes.neutral}</span>
          </span>
        </div>
        <div className="tf-stat">
          <span className="tf-stat-label">Tačnost</span>
          <span className={`tf-stat-value ${accuracyColor}`}>{accuracyDisplay}</span>
        </div>
        <div className="tf-stat">
          <span className="tf-stat-label">Pouzdanost</span>
          <span className="tf-stat-value">{confidence}%</span>
        </div>
      </div>

      {/* Prediction row */}
      <div className="prediction-row">
        <span className={`prediction-signal ${sigClass}`}>
          <span className="signal-icon">{sigClass === 'bullish' ? '▲' : sigClass === 'bearish' ? '▼' : '▶'}</span>
          {sigLabel}
        </span>
        <span className="prediction-confidence">{confidence}% consensus</span>
      </div>

      {/* Entry / TP / SL Info */}
      {prediction && prediction.signal !== 'NEUTRAL' && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 6,
          padding: '8px 10px',
          marginTop: 8,
          fontSize: 11,
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>🎯 Ulaz:</span>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>
              ${prediction.entryPrice?.toFixed(4) ?? '–'}
            </span>
          </div>
          {prediction.targetTP && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--green)' }}>✅ TP cilj:</span>
              <span style={{ fontWeight: 600, color: 'var(--green)' }}>
                ${prediction.targetTP.toFixed(4)}
              </span>
            </div>
          )}
          {prediction.targetSL && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--red)' }}>🛑 SL stop:</span>
              <span style={{ fontWeight: 600, color: 'var(--red)' }}>
                ${prediction.targetSL.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Indicator chips */}
      <div className="indicators-row">
        {Object.entries(INDICATOR_NAMES).map(([key, name]) => {
          const ind = indicators[key]
          const voteClass = ind ? indicatorVoteLabel(ind.vote) : 'neutral'
          const symbol = ind ? indicatorVoteSymbol(ind.vote) : '–'
          return (
            <span key={key} className={`indicator-chip ${voteClass}`} title={ind?.detail || name}>
              {name} {symbol}
            </span>
          )
        })}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>INDICATOR DETAILS</div>
          {Object.entries(INDICATOR_NAMES).map(([key, name]) => {
            const ind = indicators[key]
            if (!ind) return null
            return (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '3px 0', borderBottom: '1px solid var(--border)', fontSize: 11
              }}>
                <span style={{ color: 'var(--text-secondary)', minWidth: 80 }}>{name}</span>
                <span style={{ color: 'var(--text-muted)', flex: 1, paddingLeft: 8, fontSize: 10 }}>{ind.detail}</span>
                <span className={`indicator-chip ${indicatorVoteLabel(ind.vote)}`} style={{ minWidth: 50, textAlign: 'center' }}>
                  {ind.signal}
                </span>
              </div>
            )
          })}
          {lastCandle && (
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Open: </span><span>${lastCandle.open?.toFixed(2)}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Close: </span><span>${lastCandle.close?.toFixed(2)}</span></div>
              <div><span style={{ color: 'var(--green)' }}>High: </span><span>${lastCandle.high?.toFixed(2)}</span></div>
              <div><span style={{ color: 'var(--red)' }}>Low: </span><span>${lastCandle.low?.toFixed(2)}</span></div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)' }}>Volume: </span>
                <span>{lastCandle.volume?.toFixed(0)}</span>
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
            Klikni za sklapanje ↑
          </div>
        </div>
      )}
      {!expanded && (
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>
          Klikni za detalje ↓
        </div>
      )}
    </div>
  )
}
