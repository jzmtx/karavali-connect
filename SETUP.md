# Karavali Connect - Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. Accounts for:
   - Supabase (free tier)
   - Mapbox (free tier)
   - Telegram Bot (free)
   - Cloudinary (free tier)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to https://supabase.com and create a new project
2. Wait for the project to be ready (takes ~2 minutes)
3. Go to **SQL Editor** in your Supabase dashboard
4. Copy and paste the entire contents of `supabase/schema.sql`
5. Click **Run** to execute the schema
6. Go to **Settings** → **API** and copy:
   - Project URL
   - `anon` public key

## Step 3: Set Up Mapbox

1. Go to https://account.mapbox.com/access-tokens/
2. Create a new access token (or use the default public token)
3. Copy the token

## Step 4: Set Up Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token
5. To get your Chat ID:
   - Send a message to your bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your chat ID in the response

## Step 5: Set Up Cloudinary

1. Go to https://cloudinary.com/users/register/free
2. Sign up for free account
3. Go to **Settings** → **Upload**
4. Create an **Upload Preset**:
   - Name: `karavali-connect`
   - Signing mode: **Unsigned**
   - Save
5. Copy your **Cloud Name**

## Step 6: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_MAPBOX_TOKEN=your_mapbox_token
   VITE_TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   VITE_TELEGRAM_CHAT_ID=your_telegram_chat_id
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=karavali-connect
   ```

## Step 7: Add Sample Data (Optional)

Run this in Supabase SQL Editor to add test bins:

```sql
-- Add sample bins
INSERT INTO bins (bin_id, qr_code, gps_lat, gps_lng, status) VALUES
('BIN-001', 'BIN-001-QR', 13.350000, 74.700000, 'empty'),
('BIN-002', 'BIN-002-QR', 13.351000, 74.701000, 'empty'),
('BIN-003', 'BIN-003-QR', 13.352000, 74.702000, 'empty');
```

## Step 8: Run the Application

```bash
npm run dev
```

The app will open at http://localhost:3000

## Step 9: Test the Application

1. **Login** with any phone number (e.g., `9999999999`)
2. The app will create a user automatically
3. Test features:
   - Report a bin (use QR code: `BIN-001-QR`)
   - Start a beach cleanup
   - Report safety issues
   - View wallet

## Troubleshooting

### Mapbox not loading
- Check if your token is valid
- Ensure Mapbox GL CSS is loaded (check browser console)

### Supabase connection errors
- Verify your URL and anon key
- Check if tables were created successfully
- Ensure RPC functions are created

### Telegram bot not sending messages
- Verify bot token is correct
- Check chat ID is correct
- Test bot manually by sending `/start` to your bot

### AI model not loading
- TensorFlow.js models load from CDN
- Check internet connection
- First load may take time

### Camera not working
- Ensure HTTPS (required for camera access)
- Use `localhost` or deploy to HTTPS
- Check browser permissions

## Production Deployment

### Build for Production

```bash
npm run build
```

### Deploy Options

1. **Vercel** (Recommended)
   - Connect your GitHub repo
   - Add environment variables
   - Deploy automatically

2. **Netlify**
   - Connect your GitHub repo
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Add environment variables

3. **GitHub Pages**
   - Build the project
   - Push `dist` folder to `gh-pages` branch

## Notes

- The app uses **client-side AI** (TensorFlow.js) - no server costs
- All images are stored in Cloudinary (free tier: 25GB)
- Telegram bot is free and unlimited
- Mapbox free tier: 50,000 loads/month
- Supabase free tier: 500MB database, 2GB bandwidth

## Support

For issues or questions, check:
- Supabase docs: https://supabase.com/docs
- Mapbox docs: https://docs.mapbox.com
- TensorFlow.js docs: https://www.tensorflow.org/js

