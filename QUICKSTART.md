# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Minimum required for basic functionality
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_MAPBOX_TOKEN=your_mapbox_token

# Optional (features will work with fallbacks)
VITE_TELEGRAM_BOT_TOKEN=your_telegram_token
VITE_TELEGRAM_CHAT_ID=your_chat_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
```

### 3. Set Up Database

1. Go to your Supabase project
2. Open SQL Editor
3. Copy and paste `supabase/schema.sql`
4. Click Run

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 🧪 Testing Without Full Setup

The app will work with minimal setup:

- **Without Supabase**: Some features won't work, but UI will load
- **Without Mapbox**: Map won't load, but other features work
- **Without Telegram**: Alerts won't send, but reports will be saved
- **Without Cloudinary**: Images will use base64 (works for testing)

## 📱 Test Accounts

Use these phone numbers for quick testing:
- `9999999999` - User Portal
- `8888888888` - Merchant Portal  
- `7777777777` - Authority Portal

## 🎯 Key Features to Test

1. **Report Bin**: Use QR code `BIN-001-QR`
2. **Beach Cleanup**: Takes photos, uses AI verification
3. **Safety Report**: Sends Telegram alerts
4. **Wallet**: Shows dynamic QR code
5. **Merchant**: Scan user QR to redeem coins

## ⚠️ Important Notes

- Camera requires HTTPS (use `localhost` for development)
- GPS permissions needed for location features
- First AI model load takes 10-20 seconds
- Telegram bot needs to be started first (send `/start`)

## 🐛 Common Issues

**"Camera not working"**
- Use HTTPS or localhost
- Check browser permissions

**"Map not loading"**
- Verify Mapbox token
- Check browser console for errors

**"Database errors"**
- Ensure schema.sql was run
- Check Supabase project is active

**"AI model not loading"**
- Check internet connection
- First load takes time (10-20s)
- Check browser console

## 📚 Next Steps

See `SETUP.md` for detailed configuration of all services.

