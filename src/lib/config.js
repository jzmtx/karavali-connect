// Configuration file for API keys and settings

export const config = {
  // Mapbox - Get from https://account.mapbox.com/access-tokens/
  mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN',
  
  // Telegram Bot - Create bot via @BotFather on Telegram
  telegramBotToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN',
  telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID || 'YOUR_TELEGRAM_CHAT_ID',
  
  // Cloudinary - Get from https://cloudinary.com/console
  cloudinary: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME',
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'YOUR_UPLOAD_PRESET'
  },
  
  // Open-Meteo API (No key needed, but rate limited)
  openMeteoUrl: 'https://marine-api.open-meteo.com/v1/marine',
  
  // App Settings
  binReportCooldown: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
  cleanupMinTime: 10 * 1000, // 10 seconds for testing (was 5 mins)
  disposeCooldown: 10 * 60 * 1000, // 10 minutes in milliseconds
  gpsAccuracy: 10, // meters
  qrCodeRefreshInterval: 30 * 1000, // 30 seconds
}

