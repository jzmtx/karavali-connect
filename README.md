# Karavali Connect 🌊

A Progressive Web App (PWA) for coastal civic engagement, rewards, and safety reporting.

## Features

- **User Portal**: Report overflowing bins, clean beaches, earn coins
- **Merchant Portal**: Scan QR codes and redeem coins for discounts
- **Authority Portal**: View reports, manage alerts, monitor cleanup status

## Tech Stack

- **Frontend**: React + Vite + PWA
- **Backend**: Supabase (PostgreSQL)
- **Maps**: Mapbox GL JS
- **AI**: TensorFlow.js (COCO-SSD) for trash detection
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Alerts**: Telegram Bot API
- **Storage**: Cloudinary
- **Weather**: Open-Meteo Marine API

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

**Required Services:**
- **Supabase**: Create project at https://supabase.com
- **Mapbox**: Get token from https://account.mapbox.com/access-tokens/
- **Firebase**: Create project at https://console.firebase.google.com (for push notifications)
- **Telegram Bot**: Create via @BotFather on Telegram (optional)
- **Cloudinary**: Sign up at https://cloudinary.com (optional)

### 3. Set Up Firebase Cloud Messaging (Optional)

For real-time push notifications to authorities:

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed setup instructions.

### 4. Set Up Supabase Database

Run the SQL schema in `supabase/schema.sql` in your Supabase SQL editor.

**For FCM notifications**, also run:
```bash
supabase/migrations/20251225_fcm_notifications.sql
```

### 5. Run Development Server

```bash
npm run dev
```

### 6. Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Main portal pages
├── lib/            # Utilities and services
├── services/       # API services (Telegram, Cloudinary, etc.)
└── hooks/          # Custom React hooks
```

## License

MIT

