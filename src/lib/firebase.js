import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is available
let app = null;
let messaging = null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_firebase_api_key') {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase not configured - notifications disabled');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { messaging, getToken, onMessage };
