import { config } from '../lib/config'
import axios from 'axios'

/**
 * Send alert to Telegram
 * @param {string} type - Alert type (net, danger, bin, etc.)
 * @param {object} data - Alert data (location, photo, etc.)
 */
export async function sendTelegramAlert(type, data) {
  if (!config.telegramBotToken || !config.telegramChatId) {
    console.warn('Telegram bot not configured')
    return
  }

  try {
    const message = formatAlertMessage(type, data)
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`

    const payload = {
      chat_id: config.telegramChatId,
      text: message,
      parse_mode: 'HTML'
    }

    // If there's a photo URL, send it as a photo
    if (data.imageUrl) {
      const photoUrl = `https://api.telegram.org/bot${config.telegramBotToken}/sendPhoto`
      await axios.post(photoUrl, {
        chat_id: config.telegramChatId,
        photo: data.imageUrl,
        caption: message,
        parse_mode: 'HTML'
      })
    } else {
      await axios.post(url, payload)
    }
  } catch (error) {
    console.error('Failed to send Telegram alert:', error)
  }
}

function formatAlertMessage(type, data) {
  const emoji = {
    net: '🕸️',
    danger: '⚠️',
    bin: '🗑️',
    cleanup: '🧹',
    drowning: '🚨'
  }[type] || '📢'

  const typeName = {
    net: 'Ghost Net',
    danger: 'Danger Report',
    bin: 'Overflowing Bin',
    cleanup: 'Beach Cleanup',
    drowning: 'Drowning Alert'
  }[type] || 'Alert'

  const mapsLink = `https://www.google.com/maps?q=${data.lat},${data.lng}`

  return `
${emoji} <b>CRITICAL ALERT</b>

<b>Type:</b> ${typeName}
<b>Location:</b> ${data.lat?.toFixed(6)}, ${data.lng?.toFixed(6)}
<b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

${data.description ? `<b>Details:</b> ${data.description}\n` : ''}
<a href="${mapsLink}">📍 Open in Google Maps</a>
  `.trim()
}

