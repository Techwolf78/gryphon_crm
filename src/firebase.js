import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
// ...existing code...

const devFirebaseConfig = {
  apiKey: "AIzaSyD9SBw0ZckY3ht0CwH39C5pPRWwkR2zR4M",
  authDomain: "authencation-39485.firebaseapp.com",
  databaseURL: "https://authencation-39485-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "authencation-39485",
  storageBucket: "authencation-39485.firebasestorage.app",
  messagingSenderId: "366538675183",
  appId: "1:366538675183:web:8504a18fce2d563c491c1a",
  measurementId: "G-0V7B973Q8T"
};

const prodFirebaseConfig = {
  apiKey: "AIzaSyCxxJYJwEUDm4O5ZWRC2rLG3F0Q7f-icWA",
  authDomain: "gryphon-sync.firebaseapp.com",
  projectId: "gryphon-sync",
  storageBucket: "gryphon-sync.firebasestorage.app",
  messagingSenderId: "711708349362",
  appId: "1:711708349362:web:e69239dbaafc2971490aab",
  measurementId: "G-M8D2ECH5ZX"
};

const firebaseConfig = window.location.hostname === 'localhost' ? devFirebaseConfig : prodFirebaseConfig;


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize App Check (disabled for now due to configuration issues)
// if (import.meta.env.PROD) {
//   initializeAppCheck(app, {
//     provider: new ReCaptchaV3Provider('6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'), // Test reCAPTCHA key
//     isTokenAutoRefreshEnabled: true
//   });
// }

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
const storage = getStorage(app);

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

const rtdb = getDatabase(app);

export { app, auth, db, storage, secondaryApp, secondaryAuth, rtdb };