import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD9SBw0ZckY3ht0CwH39C5pPRWwkR2zR4M",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "authencation-39485.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://authencation-39485-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "authencation-39485",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "authencation-39485.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "366538675183",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:366538675183:web:8504a18fce2d563c491c1a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0V7B973Q8T",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export const setAuthPersistence = async (rememberMe) => {
  try {
    await setPersistence(
      auth, 
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  } catch (error) {
    console.error("Failed to set auth persistence:", error);
  }
};

// Set default persistence
setPersistence(auth, browserSessionPersistence).catch(console.error);

const db = getFirestore(app);

// Secondary app for admin operations
let secondaryApp;
let secondaryAuth;

try {
  secondaryApp = initializeApp(firebaseConfig, "Secondary");
  secondaryAuth = getAuth(secondaryApp);
  setPersistence(secondaryAuth, browserSessionPersistence).catch(console.error);
} catch (error) {
  console.error("Secondary app initialization failed:", error);
}

export { app, auth, db, secondaryApp, secondaryAuth };