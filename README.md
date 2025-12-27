# Karavali Connect 🌊

Hey there! Welcome to Karavali Connect - a web app we built to help keep our beautiful coastal areas clean while rewarding people who care about the environment.

## What's This All About?

Imagine getting rewarded for reporting overflowing trash bins or cleaning up beaches. That's exactly what Karavali Connect does! It's a Progressive Web App (works on any device, even offline) that connects citizens, local merchants, and authorities to tackle coastal waste management together.

## Cool Features

### For Regular Users 👥
- **Report Issues**: Spotted an overflowing bin? Snap a photo and report it
- **Beach Cleanup**: Organize or join beach cleanup drives
- **Earn Coins**: Get rewarded with coins for your environmental actions
- **Scan QR Codes**: Scan bins to verify and earn more coins
- **Redeem Rewards**: Use your coins to get discounts at local merchants

### For Merchants 🏪
- **Accept Coins**: Let customers pay with their earned coins
- **Generate QR Codes**: Create payment QR codes for quick transactions
- **Track Redemptions**: See all your coin redemption history

### For Authorities 🏛️
We've built separate portals for different departments:
- **Municipality**: Manage bins, generate QR codes, track bin status
- **Beach Authority**: Handle payment requests, monitor beach reports
- **Forest Department**: Manage ghost net reports and rescue requests

All with real-time updates so everyone stays in sync!

## Tech We're Using

- **React** - Because modern UIs need modern tools
- **Supabase** - Our backend and database (it's like Firebase but cooler)
- **Mapbox** - For all the map features
- **TensorFlow.js** - AI-powered trash detection in photos
- **Firebase** - Push notifications to keep authorities updated
- **Google Gemini AI** - Smart report categorization and analysis

## Getting Started

### What You'll Need

1. **Node.js** - Make sure you have it installed
2. **API Keys** - You'll need accounts on:
   - [Supabase](https://supabase.com) - Free tier works great
   - [Mapbox](https://account.mapbox.com) - For maps
   - [Firebase](https://console.firebase.google.com) - For notifications
   - [Google AI Studio](https://makersuite.google.com/app/apikey) - For Gemini AI (optional)

### Quick Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/jzmtx/karavali-connect.git
   cd karavali-connect
   npm install
   ```

2. **Set Up Your Environment**
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and add your API keys. Don't worry, there are comments explaining what each one does!

3. **Set Up the Database**
   - Go to your Supabase project
   - Open the SQL Editor
   - Run the files in the `supabase` folder in order (they're numbered)

4. **Run It!**
   ```bash
   npm run dev
   ```
   Your app should now be running at `http://localhost:5173`

5. **Build for Production**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/      # Reusable UI pieces (buttons, forms, etc.)
├── pages/          # Main pages (Login, User Portal, Merchant Portal, etc.)
├── lib/            # Helper functions and utilities
├── services/       # External API integrations
└── hooks/          # Custom React hooks
```

## Need Help?

Check out these docs:
- [SETUP.md](./SETUP.md) - Detailed setup instructions
- [QUICKSTART.md](./QUICKSTART.md) - Get running in 5 minutes
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Firebase notification setup
- [TEST_CREDENTIALS.md](./TEST_CREDENTIALS.md) - Test accounts for trying it out

## Contributing

Found a bug? Have an idea? Feel free to open an issue or submit a pull request. We're always happy to improve!

## License

MIT - Feel free to use this for your own coastal cleanup initiatives!

---

Built with ❤️ for cleaner coasts and a better tomorrow 🌊
