// Binance Service — REST API + WebSocket for SOL/USDT
import { SYMBOL, BINANCE_REST, BINANCE_WS, CANDLES_LIMIT } from '../utils/constants.js'

// --- REST API ---

/**
 * Fetch OHLCV candles from Binance REST API
 * @param {string} interval  e.g. '1m', '4h', '1d'
 * @param {number} limit     number of candles (max 1000)
 * @returns {Promise<Array>} array of candle objects
 */
export async function fetchCandles(interval, limit = CANDLES_LIMIT) {
  const url = `${BINANCE_REST}/klines?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`)
  const raw = await res.json()
  return raw.map(parseBinanceCandle)
}

/**
 * Fetch current ticker price
 */
export async function fetchCurrentPrice() {
  const url = `${BINANCE_REST}/ticker/price?symbol=${SYMBOL}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Binance price error: ${res.status}`)
  const data = await res.json()
  return parseFloat(data.price)
}

/**
 * Fetch 24h ticker stats
 */
export async function fetch24hStats() {
  const url = `${BINANCE_REST}/ticker/24hr?symbol=${SYMBOL}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Binance 24h error: ${res.status}`)
  const d = await res.json()
  return {
    price:       parseFloat(d.lastPrice),
    priceChange: parseFloat(d.priceChange),
    pctChange:   parseFloat(d.priceChangePercent),
    high24h:     parseFloat(d.highPrice),
    low24h:      parseFloat(d.lowPrice),
    volume24h:   parseFloat(d.volume),
    quoteVolume: parseFloat(d.quoteVolume),
    openPrice:   parseFloat(d.openPrice),
    count:       d.count,
  }
}

function parseBinanceCandle(c) {
  return {
    openTime:  c[0],
    open:      parseFloat(c[1]),
    high:      parseFloat(c[2]),
    low:       parseFloat(c[3]),
    close:     parseFloat(c[4]),
    volume:    parseFloat(c[5]),
    closeTime: c[6],
    quoteVol:  parseFloat(c[7]),
    trades:    c[8],
  }
}

// --- WebSocket ---

const WS_CONNECTIONS = new Map()

/**
 * Subscribe to real-time kline stream for a given interval
 * @param {string} interval
 * @param {Function} onCandle  called with the latest candle
 * @param {Function} onPrice   called with latest close price
 * @returns {Function}  unsubscribe function
 */
export function subscribeKline(interval, onCandle, onPrice) {
  const stream = `${SYMBOL.toLowerCase()}@kline_${interval}`
  const wsKey = stream

  // Reuse existing connection
  if (WS_CONNECTIONS.has(wsKey)) {
    const existing = WS_CONNECTIONS.get(wsKey)
    existing.listeners.push({ onCandle, onPrice })
    return () => {
      existing.listeners = existing.listeners.filter(
        l => l.onCandle !== onCandle || l.onPrice !== onPrice
      )
    }
  }

  const entry = { ws: null, listeners: [{ onCandle, onPrice }], reconnectTimer: null }

  function connect() {
    const ws = new WebSocket(`${BINANCE_WS}/${stream}`)
    entry.ws = ws

    ws.onopen = () => {
      console.log(`[WS] Connected: ${stream}`)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.k) {
          const k = data.k
          const candle = {
            openTime:  k.t,
            open:      parseFloat(k.o),
            high:      parseFloat(k.h),
            low:       parseFloat(k.l),
            close:     parseFloat(k.c),
            volume:    parseFloat(k.v),
            closeTime: k.T,
            quoteVol:  parseFloat(k.q),
            trades:    k.n,
            isClosed:  k.x,
          }
          entry.listeners.forEach(l => {
            if (l.onCandle) l.onCandle(candle, k.x)
            if (l.onPrice) l.onPrice(candle.close)
          })
        }
      } catch (e) {
        console.error('[WS] Parse error:', e)
      }
    }

    ws.onerror = (e) => {
      console.warn(`[WS] Error on ${stream}:`, e)
    }

    ws.onclose = () => {
      console.warn(`[WS] Closed: ${stream} — reconnecting in 3s`)
      entry.reconnectTimer = setTimeout(() => {
        if (WS_CONNECTIONS.has(wsKey)) connect()
      }, 3000)
    }
  }

  connect()
  WS_CONNECTIONS.set(wsKey, entry)

  return () => {
    entry.listeners = entry.listeners.filter(
      l => l.onCandle !== onCandle || l.onPrice !== onPrice
    )
    if (entry.listeners.length === 0) {
      clearTimeout(entry.reconnectTimer)
      entry.ws?.close()
      WS_CONNECTIONS.delete(wsKey)
    }
  }
}

/**
 * Subscribe to aggregated trade stream for best real-time price
 */
export function subscribeAggTrade(onPrice) {
  const stream = `${SYMBOL.toLowerCase()}@aggTrade`

  let ws = null
  let reconnectTimer = null
  let active = true

  function connect() {
    if (!active) return
    ws = new WebSocket(`${BINANCE_WS}/${stream}`)

    ws.onmessage = (event) => {
      try {
        const d = JSON.parse(event.data)
        onPrice(parseFloat(d.p))
      } catch (e) {}
    }

    ws.onclose = () => {
      if (active) {
        reconnectTimer = setTimeout(connect, 2000)
      }
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  connect()

  return () => {
    active = false
    clearTimeout(reconnectTimer)
    ws?.close()
  }
}

/**
 * Close all active WebSocket connections
 */
export function closeAllConnections() {
  WS_CONNECTIONS.forEach((entry) => {
    clearTimeout(entry.reconnectTimer)
    entry.ws?.close()
  })
  WS_CONNECTIONS.clear()
}
