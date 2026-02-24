// Notification Service — Desktop (Electron) + Mobile (FCM/Capacitor) notifications

const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI
const isCapacitor = () => typeof window !== 'undefined' && typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform()

/**
 * Show a notification based on platform
 */
export async function showNotification(title, body, options = {}) {
  // 1. Electron (Windows desktop)
  if (isElectron()) {
    try {
      await window.electronAPI.showNotification(title, body)
      return
    } catch (e) {
      console.warn('[Notif] Electron notification failed:', e)
    }
  }

  // 2. Web Notification API (browser / Electron fallback)
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: options.tag || 'sol-analyzer',
        requireInteraction: options.important || false,
      })
    }
  }

  // 3. Always dispatch in-app event too
  window.dispatchEvent(new CustomEvent('admin-notification', {
    detail: { title, body, type: options.type || 'info' }
  }))
}

/**
 * Local notification for mobile (Capacitor)
 */
export async function showLocalNotification(title, body, options = {}) {
  if (!isCapacitor()) {
    return showNotification(title, body, options)
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: Math.floor(Math.random() * 100000),
        schedule: { at: new Date(Date.now() + 500) },
        sound: null,
        smallIcon: 'ic_stat_icon_config_sample',
        actionTypeId: '',
        extra: options.data || null,
      }]
    })
  } catch (e) {
    console.warn('[LocalNotif] Error:', e)
    showNotification(title, body, options)
  }
}

/**
 * Request notification permissions
 */
export async function requestPermissions() {
  if (isCapacitor()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      return await PushNotifications.requestPermissions()
    } catch (e) {}
  }

  if ('Notification' in window) {
    return await Notification.requestPermission()
  }
}

/**
 * Get FCM token (for admin to target specific devices)
 */
export function getFCMToken() {
  return localStorage.getItem('fcm_token') || null
}

/**
 * Send price alert notification
 */
export function sendPriceAlert(price, change) {
  const direction = change > 0 ? '📈 RASTE' : '📉 PADA'
  showNotification(
    `SOL/USDT ${direction}`,
    `Cijena: $${price.toFixed(2)} | Promjena: ${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
    { type: 'price', tag: 'price-alert' }
  )
}

/**
 * Send prediction result notification
 */
export function sendPredictionResult(tfLabel, result, signal) {
  if (result === 'HIT') {
    showNotification(
      `✅ Pogodak! ${tfLabel}`,
      `Prognoza ${signal} je bila TAČNA!`,
      { type: 'info' }
    )
  } else if (result === 'MISS') {
    showNotification(
      `❌ Promašaj! ${tfLabel}`,
      `Prognoza ${signal} nije bila tačna.`,
      { type: 'alert' }
    )
  }
}

/**
 * Send new trade signal notification
 */
export function sendTradeSignal(tfLabel, signal, entryPrice, targetTP, targetSL, confidence) {
  if (signal === 'NEUTRAL') return
  
  const direction = signal.includes('BUY') ? '🟢 KUPUJ' : '🔴 PRODAJ'
  const strength = signal.includes('STRONG') ? 'JAKO' : ''
  
  let body = `${strength ? strength + ' ' : ''}${direction}\n\n`
  body += `🎯 Ulaz: $${entryPrice?.toFixed(4) ?? '–'}\n`
  if (targetTP) body += `✅ TP: $${targetTP.toFixed(4)}\n`
  if (targetSL) body += `🛑 SL: $${targetSL.toFixed(4)}\n`
  body += `\n📊 Pouzdanost: ${confidence?.toFixed(1)}%`
  
  showNotification(
    `${tfLabel} - NOVI SIGNAL`,
    body,
    { type: 'trade', tag: `trade-${tfLabel}`, important: true }
  )
}
