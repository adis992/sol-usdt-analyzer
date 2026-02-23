// Indicator Service — 10 Technical Indicators for SOL/USDT
// Each indicator returns: { value, signal: 'BUY'|'SELL'|'NEUTRAL', detail }

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function closes(candles) { return candles.map(c => c.close) }
function highs(candles)  { return candles.map(c => c.high) }
function lows(candles)   { return candles.map(c => c.low) }
function volumes(candles){ return candles.map(c => c.volume) }

function sma(arr, period) {
  if (arr.length < period) return NaN
  const slice = arr.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function ema(arr, period) {
  if (!arr || arr.length < period) return NaN
  const k = 2 / (period + 1)
  let e = arr.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < arr.length; i++) {
    e = arr[i] * k + e * (1 - k)
  }
  return e
}

function emaAll(arr, period) {
  // Returns array of EMA values, one per input point (starting after period-1)
  if (arr.length < period) return []
  const k = 2 / (period + 1)
  const result = []
  let e = arr.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(e)
  for (let i = period; i < arr.length; i++) {
    e = arr[i] * k + e * (1 - k)
    result.push(e)
  }
  return result
}

function stddev(arr) {
  const n = arr.length
  const mean = arr.reduce((a, b) => a + b, 0) / n
  const sq = arr.map(x => (x - mean) ** 2)
  return Math.sqrt(sq.reduce((a, b) => a + b, 0) / n)
}

// ─── 1. RSI (14) ─────────────────────────────────────────────────────────────
export function calcRSI(candles, period = 14) {
  const cls = closes(candles)
  if (cls.length < period + 1) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka' }

  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const d = cls[i] - cls[i - 1]
    if (d > 0) gains += d; else losses -= d
  }
  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < cls.length; i++) {
    const d = cls[i] - cls[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
  }

  const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss
  const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs))

  let signal = 'NEUTRAL'
  if (rsi < 30)  signal = 'BUY'
  if (rsi < 20)  signal = 'BUY'   // oversold
  if (rsi > 70)  signal = 'SELL'
  if (rsi > 80)  signal = 'SELL'  // overbought

  return { value: rsi, signal, detail: `RSI(${period}): ${rsi.toFixed(1)}` }
}

// ─── 2. MACD (12, 26, 9) ─────────────────────────────────────────────────────
export function calcMACD(candles, fast = 12, slow = 26, signal = 9) {
  const cls = closes(candles)
  if (cls.length < slow + signal) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka' }

  const emaFastAll = emaAll(cls, fast)
  const emaSlowAll = emaAll(cls, slow)

  // Align: emaFastAll starts at index (fast-1), emaSlowAll starts at (slow-1)
  const offset = slow - fast
  const macdLine = emaSlowAll.map((s, i) => emaFastAll[i + offset] - s)

  const signalLine = emaAll(macdLine, signal)
  const lastMACD = macdLine[macdLine.length - 1]
  const lastSignal = signalLine[signalLine.length - 1]
  const prevMACD = macdLine[macdLine.length - 2]
  const prevSignal = signalLine[signalLine.length - 2]
  const histogram = lastMACD - lastSignal
  const prevHistogram = prevMACD - prevSignal

  let sig = 'NEUTRAL'
  if (lastMACD > lastSignal && prevMACD <= prevSignal) sig = 'BUY'   // golden cross
  else if (lastMACD < lastSignal && prevMACD >= prevSignal) sig = 'SELL' // death cross
  else if (lastMACD > lastSignal && histogram > prevHistogram) sig = 'BUY'
  else if (lastMACD < lastSignal && histogram < prevHistogram) sig = 'SELL'

  return {
    value: { macd: lastMACD, signal: lastSignal, histogram },
    signal: sig,
    detail: `MACD: ${lastMACD.toFixed(4)} | Sig: ${lastSignal.toFixed(4)} | Hist: ${histogram.toFixed(4)}`
  }
}

// ─── 3. Bollinger Bands (20, 2) ───────────────────────────────────────────────
export function calcBB(candles, period = 20, multiplier = 2) {
  const cls = closes(candles)
  if (cls.length < period) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka' }

  const recent = cls.slice(-period)
  const middle = sma(cls, period)
  const std = stddev(recent)
  const upper = middle + multiplier * std
  const lower = middle - multiplier * std
  const last = cls[cls.length - 1]
  const pctB = ((last - lower) / (upper - lower)) * 100

  let signal = 'NEUTRAL'
  if (last < lower) signal = 'BUY'
  else if (last > upper) signal = 'SELL'
  else if (pctB < 20) signal = 'BUY'
  else if (pctB > 80) signal = 'SELL'

  return {
    value: { upper, middle, lower, pctB, bandwidth: ((upper - lower) / middle) * 100 },
    signal,
    detail: `BB: U=${upper.toFixed(2)} M=${middle.toFixed(2)} L=${lower.toFixed(2)} %B=${pctB.toFixed(0)}%`
  }
}

// ─── 4. EMA Cross Fast (9 / 21) ──────────────────────────────────────────────
export function calcEMAFast(candles, fastP = 9, slowP = 21) {
  const cls = closes(candles)
  if (cls.length < slowP + 2) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka' }

  const fastAll = emaAll(cls, fastP)
  const slowAll = emaAll(cls, slowP)

  const offset = slowP - fastP
  const fastLast = fastAll[fastAll.length - 1]
  const fastPrev = fastAll[fastAll.length - 2]
  const slowLast = slowAll[slowAll.length - 1]
  const slowPrev = slowAll[slowAll.length - 2]

  let signal = 'NEUTRAL'
  if (fastLast > slowLast && fastPrev <= slowPrev) signal = 'BUY'   // bullish cross
  else if (fastLast < slowLast && fastPrev >= slowPrev) signal = 'SELL' // bearish cross
  else if (fastLast > slowLast) signal = 'BUY'   // trending up
  else if (fastLast < slowLast) signal = 'SELL'  // trending down

  return {
    value: { fast: fastLast, slow: slowLast, diff: fastLast - slowLast },
    signal,
    detail: `EMA(${fastP}/${slowP}): ${fastLast.toFixed(2)}/${slowLast.toFixed(2)}`
  }
}

// ─── 5. EMA Cross Slow (50 / 200) ────────────────────────────────────────────
export function calcEMASlow(candles, fastP = 50, slowP = 200) {
  const cls = closes(candles)
  if (cls.length < slowP + 2) {
    // fallback to 20/50 if not enough data
    return calcEMAFastFallback(candles, Math.min(20, Math.floor(cls.length * 0.15)), Math.min(50, Math.floor(cls.length * 0.4)))
  }
  return calcEMAFast(candles, fastP, slowP)
}

function calcEMAFastFallback(candles, fastP, slowP) {
  const cls = closes(candles)
  if (cls.length < slowP + 2 || slowP < 2 || fastP < 2) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka (EMA slow)' }
  return calcEMAFast(candles, fastP, slowP)
}

// ─── 6. Stochastic (14, 3) ────────────────────────────────────────────────────
export function calcStochastic(candles, kPeriod = 14, dPeriod = 3) {
  if (candles.length < kPeriod + dPeriod) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka' }

  const hh = highs(candles)
  const ll = lows(candles)
  const cls = closes(candles)

  const kValues = []
  for (let i = kPeriod - 1; i < cls.length; i++) {
    const sliceH = hh.slice(i - kPeriod + 1, i + 1)
    const sliceL = ll.slice(i - kPeriod + 1, i + 1)
    const highestH = Math.max(...sliceH)
    const lowestL = Math.min(...sliceL)
    const range = highestH - lowestL
    kValues.push(range === 0 ? 50 : ((cls[i] - lowestL) / range) * 100)
  }

  const dValues = []
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    dValues.push(kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod)
  }

  const lastK = kValues[kValues.length - 1]
  const lastD = dValues[dValues.length - 1]
  const prevK = kValues[kValues.length - 2]
  const prevD = dValues[dValues.length - 2]

  let signal = 'NEUTRAL'
  if (lastK < 20 && lastD < 20) signal = 'BUY'
  else if (lastK > 80 && lastD > 80) signal = 'SELL'
  else if (lastK < 20) signal = 'BUY'
  else if (lastK > 80) signal = 'SELL'
  else if (lastK > lastD && prevK <= prevD && lastK < 50) signal = 'BUY'
  else if (lastK < lastD && prevK >= prevD && lastK > 50) signal = 'SELL'

  return {
    value: { k: lastK, d: lastD },
    signal,
    detail: `Stoch: %K=${lastK.toFixed(1)} %D=${lastD.toFixed(1)}`
  }
}

// ─── 7. ATR (14) with Trend ───────────────────────────────────────────────────
export function calcATR(candles, period = 14) {
  if (candles.length < period + 1) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka' }

  const trValues = []
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high
    const l = candles[i].low
    const pc = candles[i - 1].close
    trValues.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)))
  }

  const atr = ema(trValues, period)
  const lastClose = candles[candles.length - 1].close

  // Trend via consecutive direction
  let upCount = 0, downCount = 0
  for (let i = Math.max(1, candles.length - 6); i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) upCount++
    else if (candles[i].close < candles[i - 1].close) downCount++
  }

  // Volume confirmation
  const recentVols = volumes(candles).slice(-6)
  const avgVol = recentVols.reduce((a, b) => a + b, 0) / recentVols.length
  const lastVol = recentVols[recentVols.length - 1]
  const highVolume = lastVol > avgVol * 1.3

  let signal = 'NEUTRAL'
  if (upCount >= 4) signal = highVolume ? 'BUY' : 'BUY'
  else if (downCount >= 4) signal = highVolume ? 'SELL' : 'SELL'

  const atrPct = (atr / lastClose) * 100

  return {
    value: { atr, atrPct, upCount, downCount },
    signal,
    detail: `ATR: ${atr.toFixed(4)} (${atrPct.toFixed(2)}%) ↑${upCount} ↓${downCount}`
  }
}

// ─── 8. Williams %R (14) ─────────────────────────────────────────────────────
export function calcWilliams(candles, period = 14) {
  if (candles.length < period) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka' }

  const recentH = highs(candles).slice(-period)
  const recentL = lows(candles).slice(-period)
  const lastC = closes(candles).slice(-1)[0]
  const highestH = Math.max(...recentH)
  const lowestL = Math.min(...recentL)
  const range = highestH - lowestL

  const wr = range === 0 ? -50 : ((highestH - lastC) / range) * -100

  let signal = 'NEUTRAL'
  if (wr <= -80) signal = 'BUY'
  else if (wr >= -20) signal = 'SELL'
  else if (wr <= -60) signal = 'BUY'
  else if (wr >= -40) signal = 'SELL'

  return {
    value: wr,
    signal,
    detail: `W%R(${period}): ${wr.toFixed(1)}`
  }
}

// ─── 9. CCI (20) ──────────────────────────────────────────────────────────────
export function calcCCI(candles, period = 20) {
  if (candles.length < period) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka' }

  const tp = candles.map(c => (c.high + c.low + c.close) / 3)
  const recent = tp.slice(-period)
  const smaTp = recent.reduce((a, b) => a + b, 0) / period
  const meanDev = recent.reduce((a, b) => a + Math.abs(b - smaTp), 0) / period
  const cci = meanDev === 0 ? 0 : (recent[recent.length - 1] - smaTp) / (0.015 * meanDev)

  let signal = 'NEUTRAL'
  if (cci <= -100) signal = 'BUY'
  if (cci <= -150) signal = 'BUY'
  if (cci >= 100)  signal = 'SELL'
  if (cci >= 150)  signal = 'SELL'

  return {
    value: cci,
    signal,
    detail: `CCI(${period}): ${cci.toFixed(1)}`
  }
}

// ─── 10. OBV (On-Balance Volume) Trend ───────────────────────────────────────
export function calcOBV(candles) {
  if (candles.length < 20) return { value: null, signal: 'NEUTRAL', detail: 'Nema dovoljno podataka' }

  let obv = 0
  const obvArr = [0]
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) obv += candles[i].volume
    else if (candles[i].close < candles[i - 1].close) obv -= candles[i].volume
    obvArr.push(obv)
  }

  // OBV trend: compare EMA of OBV
  const obvEmaFast = ema(obvArr, 9)
  const obvEmaSlow = ema(obvArr, 21)

  // Recent OBV slope
  const recent = obvArr.slice(-10)
  const firstHalf = recent.slice(0, 5).reduce((a, b) => a + b, 0) / 5
  const secondHalf = recent.slice(5).reduce((a, b) => a + b, 0) / 5
  const slope = secondHalf - firstHalf

  let signal = 'NEUTRAL'
  if (obvEmaFast > obvEmaSlow && slope > 0) signal = 'BUY'
  else if (obvEmaFast < obvEmaSlow && slope < 0) signal = 'SELL'
  else if (slope > 0) signal = 'BUY'
  else if (slope < 0) signal = 'SELL'

  return {
    value: { obv, slope, emaFast: obvEmaFast, emaSlow: obvEmaSlow },
    signal,
    detail: `OBV: ${obv > 0 ? '+' : ''}${(obv / 1000).toFixed(1)}K slope: ${slope > 0 ? '↑' : '↓'}`
  }
}

// ─── MASTER: Run all 10 indicators ───────────────────────────────────────────
export function runAllIndicators(candles) {
  if (!candles || candles.length < 30) {
    return {
      rsi: null, macd: null, bb: null, emaFast: null, emaSlow: null,
      stoch: null, atr: null, williams: null, cci: null, obv: null
    }
  }

  return {
    rsi:      calcRSI(candles),
    macd:     calcMACD(candles),
    bb:       calcBB(candles),
    emaFast:  calcEMAFast(candles),
    emaSlow:  calcEMASlow(candles),
    stoch:    calcStochastic(candles),
    atr:      calcATR(candles),
    williams: calcWilliams(candles),
    cci:      calcCCI(candles),
    obv:      calcOBV(candles),
  }
}
