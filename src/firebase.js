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
  persistentMultipleTabManager,
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCxxJYJwEUDm4O5ZWRC2rLG3F0Q7f-icWA",
  authDomain: "gryphon-sync.firebaseapp.com",
  projectId: "gryphon-sync",
  storageBucket: "gryphon-sync.firebasestorage.app",
  messagingSenderId: "711708349362",
  appId: "1:711708349362:web:e69239dbaafc2971490aab",
  measurementId: "G-M8D2ECH5ZX"
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
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Secondary app for admin operations
let secondaryApp;
let secondaryAuth;

secondaryApp = initializeApp(firebaseConfig, "Secondary");
secondaryAuth = getAuth(secondaryApp);
setPersistence(secondaryAuth, browserSessionPersistence).catch(() => {});

export { app, auth, db, secondaryApp, secondaryAuth };
