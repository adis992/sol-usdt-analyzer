// History Service — LocalStorage-based prediction history
import { HISTORY_STORAGE_KEY, ENTRY_PRICE_KEY, ENTRY_TIME_KEY } from '../utils/constants.js'
import { verifyPrediction } from './predictionService.js'

const MAX_HISTORY = 500

function load() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]')
  } catch { return [] }
}

function save(items) {
  try {
    // Keep only last MAX_HISTORY items
    const trimmed = items.slice(-MAX_HISTORY)
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.error('[History] Save error:', e)
  }
}

/**
 * Add a new prediction to history
 */
export function addPrediction(prediction) {
  const history = load()
  const isNeutral = prediction.signal === 'NEUTRAL'
  const entry = {
    id: `${prediction.tfId}_${prediction.timestamp}`,
    tfId: prediction.tfId,
    signal: prediction.signal,
    confidence: prediction.confidence,
    votes: prediction.votes,
    entryPrice: prediction.entryPrice,
    targetTP: prediction.targetTP ?? null,
    targetSL: prediction.targetSL ?? null,
    timestamp: prediction.timestamp,
    result: isNeutral ? 'NEUTRAL' : 'PENDING',
    resolvedAt: isNeutral ? prediction.timestamp : null,
    resolvedPrice: null,
    profitPct: null,
  }
  history.push(entry)
  save(history)
  return entry
}

/**
 * Update pending predictions with current price
 */
export function updatePendingPredictions(tfId, currentPrice) {
  let history = load()
  let changed = false

  history = history.map(item => {
    if (item.tfId === tfId && item.result === 'PENDING') {
      const result = verifyPrediction(item, currentPrice)
      if (result !== 'PENDING') {
        changed = true
          const isSell = item.signal === 'SELL' || item.signal === 'STRONG_SELL'
          const rawPct = ((currentPrice - item.entryPrice) / item.entryPrice) * 100
          return {
          ...item,
          result,
          resolvedAt: Date.now(),
          resolvedPrice: currentPrice,
          profitPct: isSell ? -rawPct : rawPct,
        }
      }
    }
    return item
  })

  if (changed) save(history)
  return history
}

/**
 * Get all history items
 */
export function getHistory(tfId = null) {
  const history = load()
  if (!tfId) return history.reverse()
  return history.filter(h => h.tfId === tfId).reverse()
}

/**
 * Get stats for a timeframe
 */
export function getTfStats(tfId) {
  const items = load().filter(h => h.tfId === tfId && h.result !== 'PENDING')
  const hits = items.filter(i => i.result === 'HIT').length
  const misses = items.filter(i => i.result === 'MISS').length
  const total = hits + misses
  return {
    total,
    hits,
    misses,
    accuracy: total > 0 ? (hits / total) * 100 : null,
  }
}

/**
 * Clear all history
 */
export function clearHistory() {
  localStorage.removeItem(HISTORY_STORAGE_KEY)
}

// ─── Entry Price Management ───────────────────────────────────────────────────

export function setEntryPrice(price) {
  localStorage.setItem(ENTRY_PRICE_KEY, String(price))
  localStorage.setItem(ENTRY_TIME_KEY, String(Date.now()))
}

export function getEntryPrice() {
  const p = localStorage.getItem(ENTRY_PRICE_KEY)
  return p ? parseFloat(p) : null
}

export function getEntryTime() {
  const t = localStorage.getItem(ENTRY_TIME_KEY)
  return t ? parseInt(t, 10) : null
}

export function resetEntryPrice(price) {
  setEntryPrice(price)
}
