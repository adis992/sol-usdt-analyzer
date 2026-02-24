// useSolData — Central React hook / Context for all SOL/USDT data
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { TIMEFRAMES, SYMBOL } from '../utils/constants.js'
import { fetchCandles, fetchCurrentPrice, fetch24hStats, subscribeAggTrade, subscribeKline } from '../services/binanceService.js'
import { generatePrediction } from '../services/predictionService.js'
import {
  addPrediction, updatePendingPredictions, getEntryPrice,
  setEntryPrice, getHistory
} from '../services/historyService.js'
import { sendTradeSignal } from '../services/notificationService.js'

const SolDataContext = createContext(null)

export function SolDataProvider({ children }) {
  const [currentPrice, setCurrentPrice] = useState(null)
  const [stats24h, setStats24h] = useState(null)
  const [tfData, setTfData] = useState({})          // { [tfId]: { candles, prediction, lastUpdate } }
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [entryPrice, setEntryPriceState] = useState(() => getEntryPrice())
  const [history, setHistory] = useState(() => getHistory())
  const [lastPriceTs, setLastPriceTs] = useState(null)
  const [error, setError] = useState(null)

  const unsubsRef = useRef([])
  const priceRef = useRef(null)
  const tfDataRef = useRef({})

  // ── Set entry price on first load ────────────────────────────────────────
  useEffect(() => {
    if (!getEntryPrice()) {
      fetchCurrentPrice().then(p => {
        setEntryPrice(p)
        setEntryPriceState(p)
      }).catch(() => {})
    }
  }, [])

  // ── Load initial data for all timeframes ──────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError(null)

      try {
        // Load 24h stats
        const s = await fetch24hStats()
        if (!cancelled) {
          setStats24h(s)
          setCurrentPrice(s.price)
          priceRef.current = s.price

          // Set entry price if not set
          if (!getEntryPrice()) {
            setEntryPrice(s.price)
            setEntryPriceState(s.price)
          }
        }

        // Load each timeframe candles in parallel (batch of 4 to avoid rate limit)
        const batches = []
        for (let i = 0; i < TIMEFRAMES.length; i += 4) {
          batches.push(TIMEFRAMES.slice(i, i + 4))
        }

        for (const batch of batches) {
          if (cancelled) break
          await Promise.all(
            batch.map(async (tf) => {
              try {
                const interval = tf.interval
                const candles = await fetchCandles(interval, 250)
                if (cancelled) return

                const prediction = generatePrediction(candles, tf.id)

                const newEntry = {
                  candles,
                  prediction,
                  lastUpdate: Date.now(),
                  priceChange: candles.length >= 2
                    ? ((candles[candles.length - 1].close - candles[candles.length - 2].close) /
                       candles[candles.length - 2].close) * 100
                    : 0,
                }

                tfDataRef.current[tf.id] = newEntry
                setTfData(prev => ({ ...prev, [tf.id]: newEntry }))

                // Always store initial prediction (including NEUTRAL)
                addPrediction(prediction)
                
                // Send notification for non-NEUTRAL signals
                if (prediction.signal !== 'NEUTRAL') {
                  sendTradeSignal(
                    tf.label,
                    prediction.signal,
                    prediction.entryPrice,
                    prediction.targetTP,
                    prediction.targetSL,
                    prediction.confidence
                  )
                }
              } catch (e) {
                console.warn(`[Data] Failed to load ${tf.id}:`, e.message)
              }
            })
          )
          // Small delay between batches to avoid Binance rate limit
          if (!cancelled) await new Promise(r => setTimeout(r, 200))
        }

        if (!cancelled) {
          setLoading(false)
          setConnected(true)
          setHistory(getHistory())
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [])

  // ── Subscribe to real-time aggTrade for live price ────────────────────────
  useEffect(() => {
    const unsub = subscribeAggTrade((price) => {
      setCurrentPrice(price)
      setLastPriceTs(Date.now())
      priceRef.current = price
      setConnected(true)

      // Check all pending predictions with current price
      TIMEFRAMES.forEach(tf => {
        updatePendingPredictions(tf.id, price)
      })
      setHistory(getHistory())
    })
    unsubsRef.current.push(unsub)
    return () => unsub()
  }, [])

  // ── Subscribe to kline streams for each timeframe ─────────────────────────
  useEffect(() => {
    if (loading) return

    const unsubs = TIMEFRAMES.map(tf => {
      return subscribeKline(
        tf.interval,
        (candle, isClosed) => {
          const current = tfDataRef.current[tf.id]
          if (!current) return

          // Update last candle with live data
          const candles = [...current.candles]
          const last = candles[candles.length - 1]

          if (candle.openTime === last.openTime) {
            // Update the current candle
            candles[candles.length - 1] = { ...last, ...candle }
          } else if (isClosed) {
            // Add new closed candle
            candles.push(candle)
            if (candles.length > 260) candles.shift()
          }

          // Recalculate prediction logic:
          // - Short TF (1m-5m): every closed candle
          // - Medium TF (15m-1h): every closed candle
          // - Long TF (4h-12h): every closed candle
          // - Macro TF (1d+): only on significant price moves (>3%)
          let shouldRecalc = false
          
          if (isClosed) {
            const isMacro = ['1d', '1w', '1M', '1y'].includes(tf.id)
            
            if (isMacro && current.prediction) {
              // Only recalc macro TF on significant move (>3% from last prediction)
              const lastEntry = current.prediction.entryPrice
              const pctChange = Math.abs((candle.close - lastEntry) / lastEntry)
              shouldRecalc = pctChange >= 0.03 // 3% threshold
            } else {
              // All other TFs: recalc every closed candle
              shouldRecalc = true
            }
          }
          
          const prediction = shouldRecalc
            ? generatePrediction(candles, tf.id)
            : current.prediction

          // On closed candle: resolve pending + store new prediction
          if (isClosed && current.prediction) {
            // Always try to resolve ALL pending predictions for this TF
            updatePendingPredictions(tf.id, candle.close)

            // Always store new prediction on closed candle
            if (shouldRecalc) {
              addPrediction(prediction)
              setHistory(getHistory())
              
              // Send notification for non-NEUTRAL signals
              if (prediction.signal !== 'NEUTRAL') {
                sendTradeSignal(
                  tf.label,
                  prediction.signal,
                  prediction.entryPrice,
                  prediction.targetTP,
                  prediction.targetSL,
                  prediction.confidence
                )
              }
            }
          }

          const priceChange = candles.length >= 2
            ? ((candles[candles.length - 1].close - candles[candles.length - 2].close) /
               candles[candles.length - 2].close) * 100
            : 0

          const updated = {
            candles,
            prediction,
            lastUpdate: Date.now(),
            lastPredictionTs: shouldRecalc ? Date.now() : current.lastPredictionTs,
            priceChange,
          }
          tfDataRef.current[tf.id] = updated
          setTfData(prev => ({ ...prev, [tf.id]: updated }))
        },
        null
      )
    })

    unsubsRef.current.push(...unsubs)
    return () => unsubs.forEach(u => u())
  }, [loading])

  // ── Periodic refresh of history ───────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      // Refresh history from storage
      setHistory(getHistory())

      // Also check pending predictions with current price
      if (priceRef.current) {
        TIMEFRAMES.forEach(tf => {
          updatePendingPredictions(tf.id, priceRef.current)
        })
        setHistory(getHistory())
      }
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // ── Handle set entry price ─────────────────────────────────────────────────
  const updateEntryPrice = useCallback((price) => {
    setEntryPrice(price)
    setEntryPriceState(price)
  }, [])

  return (
    <SolDataContext.Provider value={{
      currentPrice,
      stats24h,
      tfData,
      loading,
      connected,
      entryPrice,
      setEntryPrice: updateEntryPrice,
      history,
      refreshHistory: () => setHistory(getHistory()),
      error,
      symbol: SYMBOL,
    }}>
      {children}
    </SolDataContext.Provider>
  )
}

export function useSolData() {
  const ctx = useContext(SolDataContext)
  if (!ctx) throw new Error('useSolData must be inside SolDataProvider')
  return ctx
}
