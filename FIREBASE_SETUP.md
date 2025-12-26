# 🔔 Firebase Cloud Messaging Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Enter project name (e.g., "Karavali Connect")
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Register Web App

1. In Firebase Console, click the **Web icon** (`</>`)
2. Enter app nickname: "Karavali Connect Web"
3. **Check** "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object

## Step 3: Get Configuration Values

You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Step 4: Generate VAPID Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click on **Cloud Messaging** tab
3. Scroll to **Web Push certificates**
4. Click "Generate key pair"
5. Copy the **Key pair** value (this is your VAPID key)

## Step 5: Update Environment Variables

Create or update `.env` file in your project root:

```bash
# Firebase Cloud Messaging (Push Notifications)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_VAPID_KEY=YOUR_VAPID_KEY_HERE
```

## Step 6: Update Service Worker

Edit `public/firebase-messaging-sw.js` and replace the placeholder config:

```javascript
firebase.initializeApp({
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
});
```

## Step 7: Run Database Migration

Run the SQL migration in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content of:
-- supabase/migrations/20251225_fcm_notifications.sql
```

This will create:
- `fcm_token` column in `users` table
- `notifications` table for notification history
- `pending_fcm_notifications` table for queue
- Database triggers for auto-notifications

## Step 8: Install Dependencies

```bash
npm install
```

This will install the Firebase SDK (already added to package.json).

## Step 9: Test Notifications

### Test Permission Request:
1. Start your dev server: `npm run dev`
2. Login as an authority user
3. You should see a browser notification permission prompt
4. Click "Allow"

### Test Notification Delivery:
1. Open two browser windows
2. Window 1: Login as **tourist** user
3. Window 2: Login as **beach authority** user
4. In Window 1: Create a safety report
5. In Window 2: You should receive a notification!

## Step 10: Verify Setup

### Check FCM Token Storage:
```sql
-- In Supabase SQL Editor
SELECT id, phone_number, role, fcm_token 
FROM users 
WHERE fcm_token IS NOT NULL;
```

### Check Notification History:
```sql
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🎯 Notification Types

Your app will send notifications for:

| Event | Recipients | Notification |
|-------|-----------|--------------|
| **Safety Report** | Beach Authority, Admin | 🚨 New Safety Report |
| **Payment Request** | Beach Authority, Admin | 💰 New Payment Request |
| **Bin Full** | Municipality, Admin | 🗑️ Bin Full Alert |
| **Ghost Net** | Forest Department, Admin | 🌊 New Ghost Net Report |
| **Rescue Request** | Forest Department, Admin | 🆘 New Rescue Request |

---

## 🔧 Troubleshooting

### Notifications Not Working?

1. **Check Browser Support**
   - Chrome, Firefox, Edge: ✅ Supported
   - Safari: ⚠️ Limited support
   - iOS Safari: ❌ Not supported

2. **Check Permission**
   - Browser should show "Notifications: Allowed"
   - Check in browser settings

3. **Check Console**
   - Open browser DevTools → Console
   - Look for Firebase initialization messages
   - Check for any errors

4. **Check FCM Token**
   - Token should be saved in database
   - Check `users.fcm_token` column

5. **Check Service Worker**
   - Open DevTools → Application → Service Workers
   - `firebase-messaging-sw.js` should be registered

### Common Issues:

**"Firebase not configured"**
- Make sure `.env` file has all Firebase variables
- Restart dev server after adding env variables

**"Permission denied"**
- User clicked "Block" on notification prompt
- Clear browser data and try again
- Or manually allow in browser settings

**"Service worker not found"**
- Make sure `firebase-messaging-sw.js` is in `public/` folder
- Check file has correct Firebase config

---

## 📱 Testing on Mobile

1. Deploy your app to Vercel/Netlify
2. Open on mobile browser (Chrome/Firefox)
3. Add to home screen (PWA)
4. Test notifications

**Note**: iOS Safari doesn't support web push notifications yet.

---

## 🚀 Production Deployment

Before deploying:

1. ✅ Update `.env` with production Firebase config
2. ✅ Update `firebase-messaging-sw.js` with production config
3. ✅ Run database migration on production Supabase
4. ✅ Test notification delivery
5. ✅ Monitor Firebase Console for delivery stats

---

## 💰 Cost

- Firebase Cloud Messaging: **100% FREE**
- Unlimited notifications
- No credit card required

---

## 📚 Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Workers Guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Need Help?** Check the Firebase Console → Cloud Messaging for delivery statistics and debugging.
