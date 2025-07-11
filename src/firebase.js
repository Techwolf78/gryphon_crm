// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  browserSessionPersistence 
} from "firebase/auth";
import { 
  getFirestore, 
  Timestamp,
  serverTimestamp 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAN10Fly6y1Xss16n5OubDsu_fT3DOGPQU",
  authDomain: "gryphon-crm.firebaseapp.com",
  projectId: "gryphon-crm",
  storageBucket: "gryphon-crm.appspot.com", // Using the more standard appspot.com URL
  messagingSenderId: "738594324730",
  appId: "1:738594324730:web:47a05c8ac1b882b63b8943",
  measurementId: "G-TG10JFFRK4"
};

// Initialize Primary Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Initialize Analytics only if in browser environment and measurementId exists
let analytics;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    }
  });
}

// Set persistence for auth
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("Auth persistence set to LOCAL"))
  .catch((error) => console.error("Error setting auth persistence:", error));

// Initialize Secondary Firebase App for admin operations
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);
setPersistence(secondaryAuth, browserSessionPersistence); // Using session persistence for secondary auth

// Export all Firebase services and utilities
export {
  // Primary app services
  app,
  auth,
  db,
  storage,
  functions,
  analytics,
  
  // Secondary app services
  secondaryApp,
  secondaryAuth,
  
  // Firestore utilities
  Timestamp,
  serverTimestamp,
  
  // Direct Firebase modules for tree-shaking
  initializeApp,
  getAuth,
  getFirestore,
  getStorage,
  getFunctions
};

// Optional: Export additional Firestore types if using TypeScript
export * from "firebase/firestore";