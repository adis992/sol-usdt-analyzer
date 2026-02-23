// Prediction Service — Consensus-based signal generation from 10 indicators
import { runAllIndicators } from './indicatorService.js'
import { INDICATOR_WEIGHTS, TOTAL_WEIGHT, STRONG_SIGNAL_THRESHOLD, SIGNAL_THRESHOLD } from '../utils/constants.js'

const WEIGHT_MAP = {
  rsi:      INDICATOR_WEIGHTS.RSI,
  macd:     INDICATOR_WEIGHTS.MACD,
  bb:       INDICATOR_WEIGHTS.BB,
  emaFast:  INDICATOR_WEIGHTS.EMA_FAST,
  emaSlow:  INDICATOR_WEIGHTS.EMA_SLOW,
  stoch:    INDICATOR_WEIGHTS.STOCH,
  atr:      INDICATOR_WEIGHTS.ATR,
  williams: INDICATOR_WEIGHTS.WILLIAMS,
  cci:      INDICATOR_WEIGHTS.CCI,
  obv:      INDICATOR_WEIGHTS.OBV,
}

function signalToVote(signal) {
  if (signal === 'BUY' || signal === 'STRONG_BUY') return 1
  if (signal === 'SELL' || signal === 'STRONG_SELL') return -1
  return 0
}

/**
 * Generate prediction from candle data
 * @param {Array} candles
 * @param {string} tfId  timeframe ID
 * @returns {Object} prediction result
 */
export function generatePrediction(candles, tfId) {
  if (!candles || candles.length < 50) {
    return {
      signal: 'NEUTRAL',
      confidence: 0,
      weightedScore: 0,
      indicators: {},
      votes: { buy: 0, sell: 0, neutral: 0 },
      entryPrice: candles?.[candles.length - 1]?.close ?? null,
      timestamp: Date.now(),
      tfId,
    }
  }

  const indicators = runAllIndicators(candles)

  let weightedSum = 0
  let totalWeightUsed = 0
  const votes = { buy: 0, sell: 0, neutral: 0 }
  const details = {}

  for (const [key, ind] of Object.entries(indicators)) {
    if (!ind) continue
    const vote = signalToVote(ind.signal)
    const weight = WEIGHT_MAP[key] ?? 1.0
    weightedSum += vote * weight
    totalWeightUsed += weight
    votes[vote > 0 ? 'buy' : vote < 0 ? 'sell' : 'neutral']++
    details[key] = { signal: ind.signal, vote, weight, detail: ind.detail, value: ind.value }
  }

  const normalizedScore = totalWeightUsed > 0 ? weightedSum / totalWeightUsed : 0
  const confidence = Math.abs(normalizedScore) * 100

  let signal = 'NEUTRAL'
  if (normalizedScore >= STRONG_SIGNAL_THRESHOLD) signal = 'STRONG_BUY'
  else if (normalizedScore >= SIGNAL_THRESHOLD)   signal = 'BUY'
  else if (normalizedScore <= -STRONG_SIGNAL_THRESHOLD) signal = 'STRONG_SELL'
  else if (normalizedScore <= -SIGNAL_THRESHOLD)         signal = 'SELL'

  const lastCandle = candles[candles.length - 1]

  return {
    signal,
    confidence,
    weightedScore: normalizedScore,
    indicators: details,
    votes,
    entryPrice: lastCandle.close,
    entryHigh:  lastCandle.high,
    entryLow:   lastCandle.low,
    timestamp: Date.now(),
    tfId,
  }
}

/**
 * Verify a previous prediction against actual price movement
 * @param {Object} prediction  previous prediction object
 * @param {number} currentPrice  current close price
 * @returns {'HIT'|'MISS'|'PENDING'}
 */
export function verifyPrediction(prediction, currentPrice) {
  if (!prediction || !currentPrice) return 'PENDING'

  const { signal, entryPrice } = prediction
  if (!entryPrice) return 'PENDING'

  const priceMoved = currentPrice - entryPrice
  const threshold = entryPrice * 0.001 // 0.1% minimum movement to count

  if (Math.abs(priceMoved) < threshold) return 'PENDING'

  if (signal === 'BUY' || signal === 'STRONG_BUY') {
    return priceMoved > 0 ? 'HIT' : 'MISS'
  }

  if (signal === 'SELL' || signal === 'STRONG_SELL') {
    return priceMoved < 0 ? 'HIT' : 'MISS'
  }

  return 'PENDING' // NEUTRAL predictions not counted
}

/**
 * Calculate accuracy stats from history
 */
export function calcAccuracyStats(historyItems) {
  const verifiable = historyItems.filter(
    h => h.result === 'HIT' || h.result === 'MISS'
  )
  if (verifiable.length === 0) return { total: 0, hits: 0, misses: 0, accuracy: 0, lastN: 0 }

  const hits = verifiable.filter(h => h.result === 'HIT').length
  const misses = verifiable.filter(h => h.result === 'MISS').length

  // Last 10 accuracy
  const last10 = verifiable.slice(-10)
  const hitsLast10 = last10.filter(h => h.result === 'HIT').length

  return {
    total: verifiable.length,
    hits,
    misses,
    accuracy: (hits / verifiable.length) * 100,
    last10: last10.length,
    hitsLast10,
    accuracyLast10: last10.length > 0 ? (hitsLast10 / last10.length) * 100 : 0,
  }
}
