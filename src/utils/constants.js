// SOL/USDT Analyzer — Constants

export const SYMBOL = 'SOLUSDT'
export const SYMBOL_DISPLAY = 'SOL/USDT'
export const BINANCE_REST = 'https://api.binance.com/api/v3'
export const BINANCE_WS = 'wss://stream.binance.com:9443/ws'
export const CANDLES_LIMIT = 250 // enough for all indicator calculations

export const TIMEFRAMES = [
  { id: '1m',  label: '1 Min',     interval: '1m',  ms: 60_000,         group: 'short' },
  { id: '3m',  label: '3 Min',     interval: '3m',  ms: 180_000,        group: 'short' },
  { id: '5m',  label: '5 Min',     interval: '5m',  ms: 300_000,        group: 'short' },
  { id: '15m', label: '15 Min',    interval: '15m', ms: 900_000,        group: 'medium' },
  { id: '30m', label: '30 Min',    interval: '30m', ms: 1_800_000,      group: 'medium' },
  { id: '1h',  label: '1 Sat',     interval: '1h',  ms: 3_600_000,      group: 'medium' },
  { id: '4h',  label: '4 Sata',    interval: '4h',  ms: 14_400_000,     group: 'long' },
  { id: '6h',  label: '6 Sati',    interval: '6h',  ms: 21_600_000,     group: 'long' },
  { id: '8h',  label: '8 Sati',    interval: '8h',  ms: 28_800_000,     group: 'long' },
  { id: '12h', label: '12 Sati',   interval: '12h', ms: 43_200_000,     group: 'long' },
  { id: '1d',  label: '1 Dan',     interval: '1d',  ms: 86_400_000,     group: 'macro' },
  { id: '1w',  label: '1 Sedmica', interval: '1w',  ms: 604_800_000,    group: 'macro' },
  { id: '1M',  label: '1 Mjesec',  interval: '1M',  ms: 2_592_000_000,  group: 'macro' },
  { id: '1y',  label: '1 Godina',  interval: '1w',  ms: 31_536_000_000, group: 'macro', yearView: true },
]

export const TF_GROUPS = {
  short:  { label: 'Kratkoročni',  tfs: ['1m','3m','5m'] },
  medium: { label: 'Srednji',      tfs: ['15m','30m','1h'] },
  long:   { label: 'Dugoročni',    tfs: ['4h','6h','8h','12h'] },
  macro:  { label: 'Makro',        tfs: ['1d','1w','1M','1y'] },
}

// Indicator weights (total ~12.0)
export const INDICATOR_WEIGHTS = {
  RSI:        1.5,
  MACD:       1.5,
  BB:         1.2,
  EMA_FAST:   1.0,
  EMA_SLOW:   1.2,
  STOCH:      1.0,
  ATR:        0.8,
  WILLIAMS:   1.0,
  CCI:        1.0,
  OBV:        1.0,
}

export const TOTAL_WEIGHT = Object.values(INDICATOR_WEIGHTS).reduce((a, b) => a + b, 0)

// Multi-Timeframe weights — longer TF = more reliable = higher weight
// Short TFs are noisy, macro TFs give strong trend direction
export const MTF_WEIGHTS = {
  '1m':  0.5,
  '3m':  0.6,
  '5m':  0.7,
  '15m': 1.0,
  '30m': 1.3,
  '1h':  1.5,
  '4h':  2.0,
  '6h':  2.0,
  '8h':  2.0,
  '12h': 2.5,
  '1d':  3.0,
  '1w':  3.5,
  '1M':  4.0,
  '1y':  3.5,
}
// MTF signal thresholds (stricter than single-TF for higher accuracy)
export const MTF_STRONG_THRESHOLD = 0.55
export const MTF_SIGNAL_THRESHOLD = 0.35

// Confidence thresholds
export const STRONG_SIGNAL_THRESHOLD = 0.65  // 65% weighted consensus
export const SIGNAL_THRESHOLD = 0.50          // 50% for weaker signal

// Admin
export const ADMIN_PASSWORD_KEY = 'sol_admin_pass'
export const DEFAULT_ADMIN_PASS = 'Admin123!'
export const MESSAGES_STORAGE_KEY = 'sol_admin_messages'
export const HISTORY_STORAGE_KEY = 'sol_prediction_history'
export const ENTRY_PRICE_KEY = 'sol_entry_price'
export const ENTRY_TIME_KEY = 'sol_entry_time'
export const FCM_TOKEN_KEY = 'fcm_token'

export const MESSAGE_TYPES = [
  { id: 'price',       label: '💰 Promjena Cijene',  color: '#ffcc00' },
  { id: 'appointment', label: '📅 Termin Promijenjen', color: '#14f195' },
  { id: 'service',     label: '🔧 Servis/Update',     color: '#4488ff' },
  { id: 'alert',       label: '🚨 Upozorenje',        color: '#ff4466' },
  { id: 'info',        label: 'ℹ️ Informacija',       color: '#9945ff' },
]
