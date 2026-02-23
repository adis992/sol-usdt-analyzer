// Formatting utilities

export function fmtPrice(p) {
  if (p === null || p === undefined || isNaN(p)) return '–'
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 1) return '$' + p.toFixed(4)
  return '$' + p.toFixed(6)
}

export function fmtPct(p) {
  if (p === null || p === undefined || isNaN(p)) return '–'
  const sign = p >= 0 ? '+' : ''
  return sign + p.toFixed(2) + '%'
}

export function fmtNum(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '–'
  return Number(n).toFixed(decimals)
}

export function fmtDate(ts) {
  if (!ts) return '–'
  return new Date(ts).toLocaleString('bs-BA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function fmtDateShort(ts) {
  if (!ts) return '–'
  return new Date(ts).toLocaleString('bs-BA', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function fmtTime(ts) {
  if (!ts) return '–'
  return new Date(ts).toLocaleTimeString('bs-BA', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function fmtVolume(v) {
  if (!v) return '–'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toFixed(2)
}

export function calcProfitPct(entry, current) {
  if (!entry || !current || entry === 0) return 0
  return ((current - entry) / entry) * 100
}

export function getChangeClass(val) {
  if (val > 0) return 'green'
  if (val < 0) return 'red'
  return 'yellow'
}

export function signalClass(signal) {
  if (signal === 'BUY' || signal === 'STRONG_BUY') return 'bullish'
  if (signal === 'SELL' || signal === 'STRONG_SELL') return 'bearish'
  return 'neutral'
}

export function signalLabel(signal) {
  switch (signal) {
    case 'STRONG_BUY': return '🚀 STRONG BUY'
    case 'BUY': return '📈 BUY'
    case 'STRONG_SELL': return '💥 STRONG SELL'
    case 'SELL': return '📉 SELL'
    default: return '➡️ NEUTRAL'
  }
}

export function indicatorVoteLabel(v) {
  if (v > 0) return 'up'
  if (v < 0) return 'down'
  return 'neutral'
}

export function indicatorVoteSymbol(v) {
  if (v > 0) return '↑'
  if (v < 0) return '↓'
  return '–'
}

export function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'upravo'
  if (m < 60) return m + 'min'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h'
  return Math.floor(h / 24) + 'd'
}
