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
  apiKey: "AIzaSyD9SBw0ZckY3ht0CwH39C5pPRWwkR2zR4M",
  authDomain: "authencation-39485.firebaseapp.com",
  databaseURL: "https://authencation-39485-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "authencation-39485",
  storageBucket: "authencation-39485.firebasestorage.app",
  messagingSenderId: "366538675183",
  appId: "1:366538675183:web:8504a18fce2d563c491c1a",
  measurementId: "G-0V7B973Q8T"
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
    console.error("Error setting auth persistence:", error);
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