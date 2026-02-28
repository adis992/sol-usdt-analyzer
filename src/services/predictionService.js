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
  volume:   INDICATOR_WEIGHTS.VOLUME,
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

  // For short timeframes (1m-5m), require HIGHER consensus for accuracy
  let strongThreshold = STRONG_SIGNAL_THRESHOLD
  let signalThreshold = SIGNAL_THRESHOLD
  
  if (tfId === '1m' || tfId === '3m' || tfId === '5m') {
    strongThreshold = 0.70  // 70% consensus required for short TFs
    signalThreshold = 0.55  // 55% for regular signal
    
    // Additional validation: at least 7 out of 10 indicators must agree
    const totalIndicators = votes.buy + votes.sell + votes.neutral
    const strongVotes = Math.max(votes.buy, votes.sell)
    if (totalIndicators >= 10 && strongVotes < 7) {
      // Not enough agreement - force NEUTRAL
      return {
        signal: 'NEUTRAL',
        confidence: 0,
        weightedScore: normalizedScore,
        indicators: details,
        votes,
        entryPrice: ep,
        entryHigh: lastCandle.high,
        entryLow: lastCandle.low,
        targetTP: null,
        targetSL: null,
        timestamp: Date.now(),
        tfId,
      }
    }
  }

  let signal = 'NEUTRAL'
  if (normalizedScore >= strongThreshold) signal = 'STRONG_BUY'
  else if (normalizedScore >= signalThreshold)   signal = 'BUY'
  else if (normalizedScore <= -strongThreshold) signal = 'STRONG_SELL'
  else if (normalizedScore <= -signalThreshold)         signal = 'SELL'

  const lastCandle = candles[candles.length - 1]
  const ep = lastCandle.close

  // TP/SL targets based on TIMEFRAME - longer TF = bigger targets
  let tpPct = 0, slPct = 0
  
  // Timeframe-based multipliers for realistic targets
  const tfMultipliers = {
    '1m':  { strong: 0.003, normal: 0.002 },   // 0.3% / 0.2% - micro scalp
    '3m':  { strong: 0.005, normal: 0.003 },   // 0.5% / 0.3%
    '5m':  { strong: 0.008, normal: 0.005 },   // 0.8% / 0.5%
    '15m': { strong: 0.015, normal: 0.010 },   // 1.5% / 1.0%
    '30m': { strong: 0.025, normal: 0.015 },   // 2.5% / 1.5%
    '1h':  { strong: 0.035, normal: 0.020 },   // 3.5% / 2.0%
    '4h':  { strong: 0.060, normal: 0.040 },   // 6.0% / 4.0%
    '6h':  { strong: 0.075, normal: 0.050 },   // 7.5% / 5.0%
    '8h':  { strong: 0.090, normal: 0.060 },   // 9.0% / 6.0%
    '12h': { strong: 0.120, normal: 0.080 },   // 12% / 8%
    '1d':  { strong: 0.850, normal: 0.800 },   // 85% / 80% - dnevni opseg SOL (150$->250$+)
    '1w':  { strong: 3.500, normal: 3.000 },   // 350% / 300% - sedmično (150$->600$+)
    '1M':  { strong: 8.000, normal: 7.000 },   // 800% / 700% - mjesečno (velike swing)
    '1y':  { strong: 15.00, normal: 12.00 },   // 1500% / 1200% - godišnji rast (150$->2000$+)
  }
  
  const mult = tfMultipliers[tfId] || { strong: 0.015, normal: 0.008 }
  
  if (signal === 'STRONG_BUY') {
    tpPct = mult.strong
    slPct = -mult.strong * 0.5  // SL is 50% of TP distance
  } else if (signal === 'BUY') {
    tpPct = mult.normal
    slPct = -mult.normal * 0.5
  } else if (signal === 'STRONG_SELL') {
    tpPct = -mult.strong
    slPct = mult.strong * 0.5
  } else if (signal === 'SELL') {
    tpPct = -mult.normal
    slPct = mult.normal * 0.5
  }

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

  const { signal, entryPrice, tfId } = prediction
  if (!entryPrice) return 'PENDING'

  const priceMoved = currentPrice - entryPrice
  const pctChange = (priceMoved / entryPrice) * 100
  
  // Threshold zavisi od timeframe-a - duži TF = veći threshold
  const thresholds = {
    '1m':  0.05,   // 0.05% za 1min
    '3m':  0.08,   // 0.08%
    '5m':  0.10,   // 0.1%
    '15m': 0.15,   // 0.15%
    '30m': 0.25,   // 0.25%
    '1h':  0.35,   // 0.35%
    '4h':  0.60,   // 0.6%
    '6h':  0.75,   // 0.75%
    '8h':  0.90,   // 0.9%
    '12h': 1.20,   // 1.2%
    '1d':  2.00,   // 2.0% - dnevni pomak
    '1w':  5.00,   // 5.0% - sedmični
    '1M':  10.0,   // 10% - mjesečni
    '1y':  20.0,   // 20% - godišnji
  }
  
  const threshold = thresholds[tfId] || 0.1

  if (Math.abs(pctChange) < threshold) return 'PENDING'

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
}/**
 * Historical Pattern Analysis - predicts tomorrow's direction based on history
 */
export function analyzeHistoricalPattern(candles) {
  if (!candles || candles.length < 30) return null
  
  const closes = candles.map(c => c.close)
  const lastPrice = closes[closes.length - 1]
  
  const last7Days = closes.slice(-7)
  const greenDays = last7Days.filter((c, i) => i > 0 && c > last7Days[i-1]).length
  const redDays = last7Days.filter((c, i) => i > 0 && c < last7Days[i-1]).length
  
  const last14Days = closes.slice(-14)
  const trend14 = ((last14Days[last14Days.length-1] - last14Days[0]) / last14Days[0]) * 100
  
  const last30 = closes.slice(-30)
  const avg30 = last30.reduce((a,b) => a+b, 0) / last30.length
  const volatility = Math.sqrt(last30.reduce((a,b) => a + Math.pow(b - avg30, 2), 0) / last30.length)
  const volatilityPct = (volatility / avg30) * 100
  
  const sma7 = last7Days.reduce((a,b) => a+b, 0) / last7Days.length
  const sma14 = last14Days.reduce((a,b) => a+b, 0) / last14Days.length
  const sma30 = avg30
  
  const aboveSMA7 = lastPrice > sma7
  const aboveSMA14 = lastPrice > sma14
  const aboveSMA30 = lastPrice > sma30
  
  const momentum = ((lastPrice - closes[closes.length-3]) / closes[closes.length-3]) * 100
  
  let prediction = 'NEUTRAL'
  let confidence = 50
  
  if (greenDays >= 5 && trend14 > 5 && aboveSMA7 && aboveSMA14 && momentum > 1) {
    prediction = 'GREEN'; confidence = 85
  } else if (greenDays >= 4 && trend14 > 2 && aboveSMA14 && momentum > 0.5) {
    prediction = 'GREEN'; confidence = 70
  } else if (greenDays > redDays && trend14 > 0 && aboveSMA30) {
    prediction = 'GREEN'; confidence = 60
  } else if (redDays >= 5 && trend14 < -5 && !aboveSMA7 && !aboveSMA14 && momentum < -1) {
    prediction = 'RED'; confidence = 85
  } else if (redDays >= 4 && trend14 < -2 && !aboveSMA14 && momentum < -0.5) {
    prediction = 'RED'; confidence = 70
  } else if (redDays > greenDays && trend14 < 0 && !aboveSMA30) {
    prediction = 'RED'; confidence = 60
  }
  
  return {
    prediction, confidence, greenDays, redDays,
    trend14: trend14.toFixed(2),
    volatility: volatilityPct.toFixed(2),
    momentum: momentum.toFixed(2),
    aboveSMA7, aboveSMA14, aboveSMA30,
    summary: Zadnjih 7 dana: 🟢/🔴 | Trend: %
  }
}
