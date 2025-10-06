import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD9SBw0ZckY3ht0CwH39C5pPRWwkR2zR4M",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "authencation-39485.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "authencation-39485",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "authencation-39485.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "366538675183",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:366538675183:web:8504a18fce2d563c491c1a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0V7B973Q8T",
};
// Initialize main app
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Auth
const auth = getAuth(app);

// Auth persistence helper
export const setAuthPersistence = async (rememberMe) => {
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  } catch (error) {

  }
};

// Default: session persistence
setPersistence(auth, browserSessionPersistence).catch(() => {});

// Firestore with built-in persistence (recommended way)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache(), // replaces enableIndexedDbPersistence
});

// Secondary app for admin operations
let secondaryApp;
let secondaryAuth;

secondaryApp = initializeApp(firebaseConfig, "Secondary");
secondaryAuth = getAuth(secondaryApp);
setPersistence(secondaryAuth, browserSessionPersistence).catch(() => {});

export { app, auth, db, secondaryApp, secondaryAuth };
