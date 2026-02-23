// Prediction Service — Consensus-based signal generation from 10 indicators
import { runAllIndicators } from './indicatorService.js'
import {
  INDICATOR_WEIGHTS, TOTAL_WEIGHT, STRONG_SIGNAL_THRESHOLD, SIGNAL_THRESHOLD,
  MTF_WEIGHTS, MTF_STRONG_THRESHOLD, MTF_SIGNAL_THRESHOLD,
  TF_GROUPS,
} from '../utils/constants.js'

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
  const ep = lastCandle.close

  // TP/SL targets based on signal strength
  let tpPct = 0, slPct = 0
  if (signal === 'STRONG_BUY')  { tpPct =  0.015; slPct = -0.008 }
  else if (signal === 'BUY')    { tpPct =  0.008; slPct = -0.004 }
  else if (signal === 'STRONG_SELL') { tpPct = -0.015; slPct =  0.008 }
  else if (signal === 'SELL')   { tpPct = -0.008; slPct =  0.004 }

  return {
    signal,
    confidence,
    weightedScore: normalizedScore,
    indicators: details,
    votes,
    entryPrice: ep,
    entryHigh:  lastCandle.high,
    entryLow:   lastCandle.low,
    targetTP: tpPct !== 0 ? parseFloat((ep * (1 + tpPct)).toFixed(4)) : null,
    targetSL: slPct !== 0 ? parseFloat((ep * (1 + slPct)).toFixed(4)) : null,
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
/**
 * Calculate the Multi-Timeframe (MTF) combined signal
 * Uses weighted consensus across all 14 timeframes.
 * Longer TFs get higher weight → higher accuracy.
 *
 * @param {Object} tfData  { [tfId]: { candles, prediction, ... } }
 * @returns {Object|null}
 */
export function calcMultiTFSignal(tfData) {
  if (!tfData) return null

  let weightedSum = 0
  let totalWeight = 0
  let buyCount = 0
  let sellCount = 0
  let neutralCount = 0
  let totalTFs = 0

  const breakdown = {}

  for (const [tfId, data] of Object.entries(tfData)) {
    if (!data?.prediction) continue
    const { prediction } = data
    const weight = MTF_WEIGHTS[tfId] ?? 1.0
    const score = prediction.weightedScore ?? 0

    weightedSum += score * weight
    totalWeight += weight
    totalTFs++

    const vote = score > 0.05 ? 'buy' : score < -0.05 ? 'sell' : 'neutral'
    if (vote === 'buy') buyCount++
    else if (vote === 'sell') sellCount++
    else neutralCount++

    breakdown[tfId] = {
      score,
      weight,
      signal: prediction.signal,
      confidence: prediction.confidence,
      vote,
    }
  }

  if (totalWeight === 0 || totalTFs === 0) return null

  const normalizedScore = weightedSum / totalWeight
  const confidence = Math.min(Math.abs(normalizedScore) * 100, 100)

  // Stricter thresholds for MTF — requires broader agreement
  let signal = 'NEUTRAL'
  if      (normalizedScore >= MTF_STRONG_THRESHOLD)  signal = 'STRONG_BUY'
  else if (normalizedScore >= MTF_SIGNAL_THRESHOLD)  signal = 'BUY'
  else if (normalizedScore <= -MTF_STRONG_THRESHOLD) signal = 'STRONG_SELL'
  else if (normalizedScore <= -MTF_SIGNAL_THRESHOLD) signal = 'SELL'

  // Agreement rate: how many TFs align with the final signal
  const alignedCount = signal.includes('BUY') ? buyCount
                     : signal.includes('SELL') ? sellCount
                     : neutralCount
  const agreementPct = totalTFs > 0 ? (alignedCount / totalTFs) * 100 : 0

  // Group breakdown
  const groupBreakdown = {}
  for (const [groupKey, grp] of Object.entries(TF_GROUPS)) {
    const tfsInGroup = grp.tfs.filter(id => breakdown[id])
    if (tfsInGroup.length === 0) continue

    let gSum = 0, gWeight = 0
    let gBuy = 0, gSell = 0, gNeutral = 0
    for (const id of tfsInGroup) {
      const b = breakdown[id]
      gSum += b.score * b.weight
      gWeight += b.weight
      if (b.vote === 'buy') gBuy++
      else if (b.vote === 'sell') gSell++
      else gNeutral++
    }
    const gScore = gWeight > 0 ? gSum / gWeight : 0
    let gSignal = 'NEUTRAL'
    if      (gScore >= MTF_STRONG_THRESHOLD)  gSignal = 'STRONG_BUY'
    else if (gScore >= MTF_SIGNAL_THRESHOLD)  gSignal = 'BUY'
    else if (gScore <= -MTF_STRONG_THRESHOLD) gSignal = 'STRONG_SELL'
    else if (gScore <= -MTF_SIGNAL_THRESHOLD) gSignal = 'SELL'

    groupBreakdown[groupKey] = {
      label: grp.label,
      signal: gSignal,
      score: gScore,
      buy: gBuy,
      sell: gSell,
      neutral: gNeutral,
      total: tfsInGroup.length,
    }
  }

  return {
    signal,
    confidence,
    weightedScore: normalizedScore,
    buyCount,
    sellCount,
    neutralCount,
    totalTFs,
    alignedCount,
    agreementPct,
    breakdown,
    groupBreakdown,
  }
}